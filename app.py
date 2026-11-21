import base64
import io
import json
import math
import os
import re
import secrets
import sqlite3
import time
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

import qrcode
from flask import Flask, Response, jsonify, render_template, request

from course_schedule import course_request, lookup_course
from official_site import lookup as lookup_uottawa

ROOT = Path(__file__).resolve().parent
DB = Path(os.getenv("INNOVA_DB", ROOT / "innova.sqlite3"))
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8192
MAP = {
    "fr": "https://www.uottawa.ca/notre-universite/administration-services/immeubles/cartes-campus",
    "en": "https://www.uottawa.ca/about-us/administration-services/facilities/campus-maps",
}
VERIFIED = "2026-11-20"
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"
BUILD = "2026.11.21-r10"
SPEECH_MODEL = "gemini-3.8-flash-tts"
LANGUAGES = {item["locale"]: item["name"] for item in json.loads((ROOT / "static" / "languages.json").read_text(encoding="utf-8"))}
INSTANCE = secrets.token_hex(6)
PLACES = json.loads((ROOT / "static" / "campus-map.json").read_text(encoding="utf-8"))["places"]
DIRECTIONS = {
    "fr": ("nord", "nord-est", "est", "sud-est", "sud", "sud-ouest", "ouest", "nord-ouest"),
    "en": ("north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"),
}


def orientation(topic, lang, fact=None):
    if fact and fact.get("wayfinding", {}).get(lang):
        return fact["wayfinding"][lang]
    place = PLACES[topic]
    if topic == "crx":
        return ("Le Carrefour des apprentissages (CRX) est le point de repère sur la carte."
                if lang == "fr" else "Learning Crossroads (CRX) is the reference point on the map.")
    region = place.get("region", "campus")
    if region not in ("campus", "north"):
        labels = {"lees": ("au campus Lees", "at the Lees campus"),
                  "health": ("au campus Alta Vista", "at the Alta Vista campus")}
        label = labels[region][lang == "en"]
        return (f"Tu trouveras {place[lang]} {label}. La carte affiche le secteur autour de ta destination."
                if lang == "fr" else f"You’ll find {place[lang]} {label}. The map shows the area around your destination.")
    x, y = place["point"]
    ox, oy = PLACES["crx"]["point"]
    sector = round(math.atan2(x - ox, oy - y) / (math.pi / 4)) % 8
    direction = DIRECTIONS[lang][sector]
    if lang == "fr":
        return f"Depuis le CRX, cherche le repère {place[lang]} au {direction} sur la carte."
    return f"From CRX, look {direction} on the map for {place[lang]}."


def find_mentions(text, catalog):
    found = sorted((match.start(), match.end(), key)
                   for key, fact in catalog.items()
                   for alias in fact["aliases"]
                   for match in re.finditer(r"(?<!\w)" + re.escape(alias) + r"(?!\w)", text))
    return [(start, end, key) for start, end, key in found if not any(
        left <= start and right >= end and right - left > end - start
        for left, right, _ in found
    )]


def similar_buildings(text, catalog):
    words = text.split()
    if not words or len(words) > 20:
        return []
    scores = {}
    for topic in PLACES:
        for alias in catalog[topic]["aliases"]:
            # Avoid fuzzy guesses for codes, addresses and common short words.
            if len(alias) < 6 or not alias.replace(" ", "").isalpha():
                continue
            size = len(alias.split())
            for i in range(len(words) - size + 1):
                candidate = " ".join(words[i:i + size])
                if candidate[0] != alias[0] or abs(len(candidate) - len(alias)) > 2:
                    continue
                score = SequenceMatcher(None, candidate, alias, autojunk=False).ratio()
                if score >= .84:
                    scores[topic] = max(scores.get(topic, 0), score)
    ranked = sorted(scores, key=scores.get, reverse=True)
    return [topic for topic in ranked[:3] if scores[ranked[0]] - scores[topic] <= .08]


def route_between(text, mentions):
    if len(mentions) != 2 or any(mention[2] not in PLACES for mention in mentions):
        return None
    first, second = mentions
    if first[2] == second[2]:
        return None
    before, between = text[:first[0]], text[first[1]:second[0]]
    if re.search(r"\b(depuis|from|a partir de)\b", between):
        return second[2], first[2]
    if re.search(r"\b(de|du|depuis|from|a partir de)\b", before) and re.search(r"\b(a|au|aux|vers|to)\b", between):
        return first[2], second[2]
    return None


def describe_route(origin, destination, lang, catalog):
    start, end = PLACES[origin], PLACES[destination]
    dx, dy = (b - a for a, b in zip(start["point"], end["point"]))
    direction = DIRECTIONS[lang][round(math.atan2(dx, -dy) / (math.pi / 4)) % 8]
    metres = max(25, round(math.hypot(dx, dy) / 25) * 25)
    result = format_fact(catalog[destination], lang)
    result["origin"] = origin
    result["text"] = (
        f"Depuis {start[lang]}, {end[lang]} est au {direction}, à environ {metres} mètres à vol d’oiseau. Ouvre l’itinéraire pour voir le chemin à pied."
        if lang == "fr" else
        f"From {start[lang]}, {end[lang]} is {direction}, about {metres} metres as the crow flies. Open directions to see the walking route."
    )
    result["route"] = "https://www.google.com/maps/dir/?" + urlencode({
        "api": 1, "origin": catalog[origin].get("address") or start[lang] + ", University of Ottawa",
        "destination": catalog[destination].get("address") or end[lang] + ", University of Ottawa",
        "travelmode": "walking",
    })
    return result


def connect():
    return sqlite3.connect(DB)


def initialize():
    entries = json.loads((ROOT / "campus.json").read_text(encoding="utf-8"))
    with connect() as db:
        db.execute("CREATE TABLE IF NOT EXISTS facts (id TEXT PRIMARY KEY, data TEXT NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS transfers (token TEXT PRIMARY KEY, items TEXT NOT NULL, expires INTEGER NOT NULL, lang TEXT NOT NULL)")
        db.executemany("INSERT OR REPLACE INTO facts VALUES (?, ?)", [(x["id"], json.dumps(x)) for x in entries])
        db.execute("DELETE FROM transfers WHERE expires <= ?", (time.time(),))


def normalize(text):
    text = unicodedata.normalize("NFKD", text.lower())
    return " ".join(re.findall(r"[a-z0-9]+", "".join(c for c in text if not unicodedata.combining(c))))


def language(text, default):
    words = set(normalize(text).split())
    fr = words & set("ou trouve est je peux comment histoire quand defaites victoires fondee adresse chercher quels quelle les des une pour bonjour salut aide manger horaires bibliotheque merci loin depuis oui exactement carte etudiante".split())
    en = words & set("where is what how when history losses victories founded i can the to find near hours library hello get food address are thanks thank far list building buildings hi help from yes exactly card student".split())
    return "fr" if len(fr) > len(en) else "en" if len(en) > len(fr) else default


def facts():
    with connect() as db:
        return {key: json.loads(data) for key, data in db.execute("SELECT id, data FROM facts")}


def format_fact(fact, lang):
    result = {"id": fact["id"], "text": fact[lang], "source": fact.get("source_fr", fact["source"]) if lang == "fr" else fact["source"], "verified": fact.get("verified", VERIFIED)}
    if fact["id"] in PLACES:
        result["map"] = MAP[lang]
    if fact.get("address"):
        result["route"] = "https://www.google.com/maps/dir/?api=1&destination=" + quote(fact["address"])
    return result


def gemini_key():
    if os.getenv("INNOVA_GEMINI_SEND_QUESTIONS") == "1":
        return os.getenv("GEMINI_API_KEY")
    if os.getenv("INNOVA_GEMINI_SEND_QUESTIONS") == "0" or os.getenv("GEMINI_API_KEY"):
        return None
    local_app_data = os.getenv("LOCALAPPDATA")
    if local_app_data:
        try:
            return (Path(local_app_data) / "INNOVA" / "gemini-key.txt").read_text(encoding="utf-8-sig").strip()
        except OSError:
            pass
    return None


class GeminiError(Exception):
    pass


def gemini_notice(reason, lang):
    messages = {
        "no_key": ("Aucune clé Gemini chargée. Ouvre Configurer-Gemini.bat.", "No Gemini key loaded. Open Configurer-Gemini.bat."),
        "key": ("Google a refusé la clé ou son autorisation. Vérifie la clé dans Google AI Studio.", "Google rejected the key or its permissions. Check it in Google AI Studio."),
        "quota": ("Le quota Gemini est atteint. Réessaie plus tard ou vérifie tes limites dans Google AI Studio.", "Gemini’s quota is exhausted. Try later or check your limits in Google AI Studio."),
        "model": ("Ce modèle Gemini est inaccessible avec ta clé. Vérifie le modèle dans Google AI Studio.", "This Gemini model is unavailable with your key. Check the model in Google AI Studio."),
        "network": ("INNOVA n’a pas pu joindre Gemini. Vérifie ta connexion Internet et réessaie.", "INNOVA could not reach Gemini. Check your connection and try again."),
        "response": ("Gemini n’a pas renvoyé de réponse exploitable. Essaie Tester-Gemini.bat pour vérifier la connexion.", "Gemini did not return a usable answer. Run Tester-Gemini.bat to check the connection."),
        "blocked": ("Gemini a bloqué cette demande. Tu peux essayer une autre formulation.", "Gemini blocked this request. Try a different phrasing."),
    }
    return messages[reason][lang == "en"]


def gemini_http_error(error):
    if error.code == 429:
        return "quota"
    if error.code in (401, 403):
        return "key"
    if error.code == 404:
        return "model"
    if error.code == 400:
        try:
            details = json.load(error)["error"].get("details", [])
            if any(isinstance(item, dict) and item.get("reason") in {"API_KEY_INVALID", "API_KEY_EXPIRED"}
                   for item in details):
                return "key"
        except (OSError, ValueError, KeyError, TypeError, AttributeError):
            pass
    return "network" if error.code >= 500 else "response"


def generate_gemini(key, instruction, contents, schema=None):
    model = os.getenv("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL
    config = {"maxOutputTokens": 400}
    if schema:
        config.update(responseMimeType="application/json", responseSchema=schema)
    payload = {
        "systemInstruction": {"parts": [{"text": instruction}]},
        "contents": contents,
        "generationConfig": config,
    }
    req = Request(f"https://generativelanguage.googleapis.com/v1beta/models/{quote(model, safe='')}:generateContent",
                  json.dumps(payload).encode(), {"Content-Type": "application/json", "x-goog-api-key": key})
    try:
        with urlopen(req, timeout=7) as response:
            result = json.load(response)
        if result.get("promptFeedback", {}).get("blockReason"):
            raise GeminiError("blocked")
        candidate = result["candidates"][0]
        if candidate.get("finishReason") in {"SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"}:
            raise GeminiError("blocked")
        parts = candidate["content"]["parts"]
        answer = "".join(part.get("text", "") for part in parts if not part.get("thought")).strip()
        if answer:
            return answer
        raise GeminiError("response")
    except HTTPError as error:
        raise GeminiError(gemini_http_error(error)) from None
    except (OSError, URLError):
        raise GeminiError("network") from None
    except (ValueError, KeyError, IndexError, TypeError, AttributeError):
        raise GeminiError("response") from None


def answer_with_gemini(question, catalog, lang, topic, previous, *, allow_general=False, exchange=None):
    key = gemini_key()
    if not key:
        return None
    language_name = "Canadian French using tu" if lang == "fr" else "plain Canadian English"
    contents = []
    if allow_general and isinstance(exchange, dict):
        question_before, answer_before = exchange.get("question"), exchange.get("answer")
        if all(isinstance(value, str) and 0 < len(value) <= limit
               for value, limit in ((question_before, 500), (answer_before, 640))):
            contents.extend([
                {"role": "user", "parts": [{"text": question_before}]},
                {"role": "model", "parts": [{"text": answer_before}]},
            ])
    contents.append({"role": "user", "parts": [{"text": question}]})

    if allow_general:
        instruction = (
            f"You are Gee-Gee, a friendly guide. Reply in {language_name} in one to three short sentences. "
            "Answer the student's everyday question directly and naturally. Use a brief example if useful. "
            "For arithmetic give the answer as a number. Avoid Markdown, links, personal information and unverified "
            "uOttawa facts or live information. If information is missing, ask a short follow-up question. "
            "Write the spoken reply as plain text."
        )
        answer = generate_gemini(key, instruction, contents)
        if len(answer) <= 640 and not re.search(r"https?://", answer):
            return "GENERAL", answer
        raise GeminiError("response")

    relevant = {topic: catalog[topic]} if topic else catalog
    glossary = {
        code: {"aliases": fact["aliases"], "guidance": orientation(code, lang, fact) if code in PLACES else fact[lang]}
        for code, fact in relevant.items()
    }
    instruction = (
        f"You are Gee-Gee, a friendly guide at the University of Ottawa. Reply in {language_name}. "
        "Use up to three natural sentences. For campus facts use only the verified guidance below. "
        "A map appears for locations. Never invent a route, address, schedule, price, contact or URL. "
        "Use topic NONE when none of the entries can answer the question. "
        + (f"The topic is {topic}. " if topic else "")
        + (f"The previous topic was {previous}. Use it only for a clear follow-up. " if previous else "")
        + json.dumps(glossary, ensure_ascii=False)
    )
    schema = {
        "type": "OBJECT",
        "properties": {
            "topic": {"type": "STRING", "enum": [*relevant, "NONE"]},
            "answer": {"type": "STRING"},
        },
        "required": ["topic", "answer"],
    }
    try:
        draft = json.loads(generate_gemini(key, instruction, contents, schema))
        picked, answer = draft["topic"], draft["answer"].strip()
        if picked == "NONE":
            return None
        if picked in relevant and 0 < len(answer) <= 400 and not re.search(r"https?://|\d", answer):
            return picked, answer
    except (ValueError, KeyError, TypeError, AttributeError):
        pass
    raise GeminiError("response")


def student_card_answer(text, lang, catalog):
    result = format_fact(catalog["student-card"], lang)
    result["source_title"] = "Obtenir ou remplacer ta carte étudiante" if lang == "fr" else "Get or replace your student card"
    destination = "res-90-university"
    if re.search(r"\b(changement de nom|change(?:d)? (?:my |your )?(?:legal )?name|nom legal|legal name)\b", text):
        destination = "tabaret-hall"
        result["text"] = (
            "Pour remplacer ta carte après un changement de nom légal, va à InfoService au pavillon Tabaret. Consulte la liste officielle des pièces d’identité à apporter."
            if lang == "fr" else
            "For a replacement after a legal name change, go to InfoService in Tabaret Hall. Check the official list of ID you’ll need to bring."
        )
    elif re.search(r"\b(perdu[e]?|vol[eé]e?|endommage[e]?|remplac\w*|lost|stolen|damaged|replac\w*)\b", text):
        result["text"] = (
            "Si ta carte est perdue ou volée, tu peux la désactiver pour protéger les fonds. Pour un remplacement, consulte les consignes et les frais sur la page officielle du Service de la carte."
            if lang == "fr" else
            "If your card was lost or stolen, you can deactivate it to protect your balance. Check the official Card Service page for replacement steps and fees."
        )
    elif re.search(r"\b(recuper\w*|retir\w*|ramass\w*|pick up|pickup|collect|pre[te]+|ready|horaires?|hours|open)\b", text):
        result["text"] = (
            "Pour récupérer ta carte, attends le courriel qui confirme qu’elle est prête. Ensuite, va au 90 Université, local 145, avec une pièce d’identité valide. Vérifie les heures du Service de la carte sur la page officielle."
            if lang == "fr" else
            "Wait for the email confirming your card is ready. Then go to 90 University, room 145, with valid ID. Check the official page for Card Service hours."
        )
    location = format_fact(catalog[destination], lang)
    result.update(map=location["map"], map_destination=destination, route=location["route"])
    return result


def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def preferred(data):
    return "en" if data.get("lang") == "en" else "fr"


@app.after_request
def no_cache(response):
    response.headers["X-INNOVA-Instance"] = INSTANCE
    if request.path.startswith(("/api/", "/reprise/")) or request.path == "/version":
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.get("/")
def home():
    return render_template("index.html", has_glb=(ROOT / "static" / "mascotte.glb").is_file(), build=BUILD)



@app.get("/version")
def version():
    return f"INNOVA {BUILD}\n", 200, {"Content-Type": "text/plain; charset=utf-8"}

@app.post("/api/ask")
def ask():
    data = body()
    question = data.get("text")
    if not isinstance(question, str) or not question.strip() or len(question) > 500:
        return jsonify(error="invalid_question"), 400
    spoken = data.get("speech_locale")
    if isinstance(spoken, str) and spoken in LANGUAGES and spoken not in ("fr-CA", "en-CA"):
        return answer_multilingual(question, data, spoken)
    return answer_question(question, data)


def answer_multilingual(question, data, locale):
    key = gemini_key()
    name = LANGUAGES[locale]
    if not key:
        messages = {
            "zh-CN": "请先在这台电脑上配置 Gemini，才能使用普通话。",
            "ja-JP": "日本語を使うには、このパソコンで Gemini を設定してください。",
        }
        if locale in messages:
            return jsonify(lang=preferred(data), text=messages[locale], voice_locale=locale)
        return jsonify(lang=preferred(data), text=gemini_notice("no_key", preferred(data)))

    context = data.get("exchange")
    contents = []
    if isinstance(context, dict):
        before, reply = context.get("question"), context.get("answer")
        if all(isinstance(value, str) and 0 < len(value) <= limit
               for value, limit in ((before, 500), (reply, 640))):
            contents.extend([
                {"role": "user", "parts": [{"text": before}]},
                {"role": "model", "parts": [{"text": json.dumps({"mode": "general", "text": reply}, ensure_ascii=False)}]},
            ])
    contents.append({"role": "user", "parts": [{"text": question}]})
    previous = data.get("previous")
    known_previous = previous if isinstance(previous, str) and previous in facts() else None
    schema = {
        "type": "OBJECT",
        "properties": {
            "mode": {"type": "STRING", "enum": ["campus", "general"]},
            "text": {"type": "STRING"},
        },
        "required": ["mode", "text"],
    }
    try:
        outcome = json.loads(generate_gemini(key, (
            f"You are the University of Ottawa kiosk language bridge for {name} ({locale}). "
            "For specific questions about University of Ottawa buildings, directions, services, documents, "
            "student cards, university history, Gee-Gees results or a follow-up about the last campus topic, use mode campus and translate "
            "the question into English. Keep place names, codes and intent. Otherwise use mode general "
            f"and answer naturally in {name} in one to three short sentences. Do not invent campus facts. "
            + (f"The last campus topic was {known_previous}. " if known_previous else "")
        ), contents, schema))
        text = outcome["text"].strip()
        if not 0 < len(text) <= 640:
            raise GeminiError("response")
        if outcome["mode"] == "general":
            return jsonify(lang=preferred(data), text=text, voice_locale=locale, general=True)
        if outcome["mode"] != "campus" or len(text) > 500:
            raise GeminiError("response")
        result = answer_question(text, dict(data, lang="en"), use_gemini=False).get_json()
        translated = generate_gemini(key, (
            f"Translate the following verified kiosk reply into natural {name} ({locale}). Return only its "
            "translation. Preserve building names, codes, all numbers, distances and instructions. Do not add facts."
        ), [{"role": "user", "parts": [{"text": result["text"]}]}])
        if not 0 < len(translated) <= 800:
            raise GeminiError("response")
        result.update(text=translated, voice_locale=locale)
        return jsonify(result)
    except GeminiError as error:
        return jsonify(lang=preferred(data), text=gemini_notice(str(error), preferred(data)))
    except (ValueError, KeyError, TypeError, AttributeError):
        return jsonify(lang=preferred(data), text=gemini_notice("response", preferred(data)))


@app.post("/api/speech")
def natural_speech():
    data = body()
    text, locale = data.get("text"), data.get("locale")
    if not isinstance(locale, str) or locale not in LANGUAGES or not isinstance(text, str) or not 0 < len(text.strip()) <= 800:
        return jsonify(error="invalid_speech"), 400
    if request.remote_addr not in {"127.0.0.1", "::1", "::ffff:127.0.0.1"}:
        return jsonify(error="local_speech_only"), 403
    key = gemini_key()
    if not key:
        return jsonify(error="no_key"), 503
    payload = {
        "model": SPEECH_MODEL,
        "input": [{
            "type": "user_input",
            "content": [{"type": "text", "text": text, "annotations": [{
                "type": "speech_metadata",
                "style": f"Speak in {LANGUAGES[locale]} with a warm conversational tone, natural pauses and clear pronunciation.",
            }]}],
        }],
        "response_format": {"type": "audio", "mime_type": "audio/wav"},
        "generation_config": {"speech_config": [{"voice": "Kore"}]},
    }
    request_data = Request("https://generativelanguage.googleapis.com/v1beta/interactions",
                           json.dumps(payload).encode(), {"Content-Type": "application/json", "x-goog-api-key": key})
    try:
        with urlopen(request_data, timeout=12) as upstream:
            voice = json.loads(upstream.read(12_000_000))
        clips = [part["data"] for step in voice.get("steps", []) if step.get("type") == "model_output"
                 for part in step.get("content", []) if part.get("type") == "audio"]
        wav = base64.b64decode(clips[-1], validate=True)
        if len(wav) < 44 or not wav.startswith(b"RIFF") or wav[8:12] != b"WAVE":
            raise ValueError("Expected WAV")
        return Response(wav, mimetype="audio/wav")
    except (OSError, ValueError, KeyError, IndexError, TypeError, AttributeError):
        return jsonify(error="speech_unavailable"), 502


def history_answer(text, lang, catalog, matches, previous):
    records = [catalog[key] for key in matches if catalog[key].get("history")]
    earlier = catalog.get(previous, {})
    university = bool(re.search(r"\b(uottawa|universite|university|college bytown|college of bytown)\b", text))
    sports = bool(re.search(r"\b(gee gees|geegees|carleton|match panda|panda game|coupe vanier|vanier cup)\b", text))
    history_context = university or sports or bool(earlier.get("history"))
    years = {int(year) for year in re.findall(r"\b(?:18|19|20)\d{2}\b", text)}
    if (sports or any(record.get("history_group") in {"panda", "rugby", "soccer", "vanier"} for record in records)) and not years and re.search(
        r"\b(prochain(?:e)?|upcoming|next game|next match|today|aujourd hui|billets?|tickets?)\b", text
    ):
        return {
            "text": ("Le calendrier et la billetterie des Gee-Gees se trouvent sur le site officiel des équipes."
                     if lang == "fr" else "The official Gee-Gees site has the team schedules and ticket information."),
            "source": "https://www.geegees.ca/",
            "source_title": "Site officiel des Gee-Gees" if lang == "fr" else "Official Gee-Gees website",
        }
    if history_context:
        if not records and re.search(r"\b(fond\w*|founded|established|a ouvert|a ete ouverte?|a ete creee?|did it open|did the university open)\b", text):
            records = [catalog["history-foundation"]]
        if not records and re.search(r"\b(revers|defaites?|perdu|losses|defeats?|setbacks?)\b", text):
            records = [catalog["history-revers"]]
        if not records and re.search(r"\b(victoires?|palmares|wins|championships|titles)\b", text):
            records = [catalog["history-sports"]]
        if not records and re.search(r"\b(histoire|history|historique|origines)\b", text):
            records = [catalog["history-overview"]]
    if not records and re.fullmatch(r" (histoire|history|palmares sportif) ", text):
        records = [catalog["history-overview"]]
    group = next((record.get("history_group") for record in records if record.get("history_group")), None)
    if years and not group:
        group = earlier.get("history_group") if not records else None
        if group is None and (university or earlier.get("id") == "history-overview"):
            group = "university"
    if not records and len(years) == 1 and earlier.get("id") == "history-sports":
        topic = {1975: "vanier", 2000: "vanier", 2017: "rugby", 2026: "soccer"}.get(next(iter(years)))
        if topic:
            records = [catalog["history-" + topic]]
    if group == "panda" and len(years) == 1:
        event = catalog["history-panda"]
        year = str(next(iter(years)))
        specific = event.get("year_results", {}).get(year)
        if specific:
            return dict(format_fact(event, lang), text=specific[lang], source_title=event["source_label"][lang])
    if years and group:
        exact = [record for record in catalog.values() if record.get("history_group") == group
                 and years <= set(record.get("history_years", []))]
        if exact:
            records = [next((record for record in records if record in exact), exact[0])]
        elif group != "university":
            reference = records[0] if records else earlier
            result = format_fact(reference, lang)
            result["text"] = ("Je n’ai pas de résultat vérifié pour cette année. La source ci-dessous couvre les résultats historiques que je peux confirmer."
                              if lang == "fr" else "I don’t have a verified result for that year. The source below covers the historical results I can confirm.")
            return result
    if not records:
        return None
    record = records[0]
    result = format_fact(record, lang)
    result["source_title"] = record["source_label"][lang]
    result["related"] = record.get("history_links", {}).get(lang, [])
    return result


def answer_question(question, data, *, use_gemini=True):
    lang = language(question, preferred(data))
    arithmetic = re.fullmatch(
        r"\s*(?:(?:combien\s+(?:font|fait)|calcule|what\s+is|calculate)\s+)?"
        r"([+-]?\d{1,9})\s*(×|x|\*|fois|times|\+|plus|−|-|moins|minus)\s*([+-]?\d{1,9})\s*[?=.!]?\s*",
        question, re.I,
    )
    if arithmetic:
        left, op, right = arithmetic.groups()
        a, b = int(left), int(right)
        if op.lower() in {"×", "x", "*", "fois", "times"}:
            operator, total = "×", a * b
        elif op.lower() in {"+", "plus"}:
            operator, total = "+", a + b
        else:
            operator, total = "−", a - b
        return jsonify(lang=lang, text=f"{a} {operator} {b} = {total}.", general=True)
    text = f" {normalize(question)} "
    schedule = course_request(question, data.get("previous"))
    if schedule:
        return jsonify(lookup_course(schedule, lang))
    catalog = facts()
    previous = data.get("previous")
    previous = previous if isinstance(previous, str) and previous in catalog else None
    if re.fullmatch(r" (merci(?: beaucoup)?|thanks(?: a lot)?|thank you(?: very much)?) ", text):
        return jsonify(lang=lang, text="Avec plaisir ! Tu cherches un autre endroit ou un service ?" if lang == "fr"
                       else "You’re welcome! Are you looking for another place or service?")
    mentions = find_mentions(text, catalog)
    matches = dict.fromkeys(key for _, _, key in mentions)
    historical = history_answer(text, lang, catalog, matches, previous)
    if historical:
        return jsonify(lang=lang, **historical)
    if "student-card" in matches or (not matches and previous == "student-card" and re.search(
        r"\b(carte|la recuperer|la remplacer|l obtenir|la retirer|ou je vais|c est ou|pick it up|replace it|is it ready|where do i go)\b", text
    )):
        return jsonify(lang=lang, **student_card_answer(text, lang, catalog))
    selected = next(iter(matches)) if len(matches) == 1 else None
    confirmation = data.get("confirmation")
    if not matches and isinstance(confirmation, str) and confirmation in PLACES and re.fullmatch(
        r" (oui|oui c est ca|c est ca|exactement|yes|yes please|that s right|exactly) ", text
    ):
        return jsonify(lang=lang, **dict(format_fact(catalog[confirmation], lang), text=orientation(confirmation, lang, catalog[confirmation])))
    if not matches and previous and re.search(
        r"\b(c est loin|est ce loin|is it far|how far|combien de temps|how long(?: does it take)?|comment j y vais|comment y aller|how do i get there|where is it|c est ou|son adresse|what is its address|est ce ouvert|is it open)\b", text
    ):
        selected = previous
    entrance_terms = re.search(
        r"\b(entree[s]?|entrer|rampe|accessible|accessibilite|fauteuil roulant|entrance[s]?|enter|wheelchair|ramp|accessibility)\b", text
    )
    entrance_target = next((key for key in matches if key in PLACES), None)
    if entrance_target is None and not any(key in PLACES for key in matches):
        entrance_target = previous
    entrance = catalog.get(entrance_target, {}).get("entrance", {}).get(lang)
    if entrance_terms and entrance and sum(key in PLACES for key in matches) <= 1:
        return jsonify(lang=lang, **dict(format_fact(catalog[entrance_target], lang), text=entrance))
    if selected in PLACES and re.search(r"\b(loin|distance|how far|combien de temps|how long)\b", text):
        x, y = PLACES[selected]["point"]
        ox, oy = PLACES["crx"]["point"]
        metres = round(math.hypot(x - ox, y - oy) / 25) * 25
        response = format_fact(catalog[selected], lang)
        if selected == "crx":
            response["text"] = orientation(selected, lang)
        else:
            response["text"] = (f"Depuis le CRX, compte environ {metres} mètres à vol d’oiseau. Regarde les deux repères sur la carte pour te situer."
                                if lang == "fr" else f"It’s about {metres} metres from CRX as the crow flies. Use the two markers to get your bearings.")
        if selected != "crx" and re.search(r"\b(combien de temps|how long)\b", text):
            response["text"] += (" Je ne peux pas confirmer le temps de marche. Ouvre l’itinéraire pour l’estimer."
                                 if lang == "fr" else " Open directions for an estimate of the walking time.")
        return jsonify(lang=lang, **response)
    campus_inquiry = bool(selected or matches or re.search(
        r"\b(uottawa|universite d ottawa|university of ottawa|campus|pavillon|library|bibliotheque|residence|uozone|releve de notes|transcripts?|t2202|droits universitaires|tuition|preuve d etudes|academic documents|attestation d etudes|changement de nom legal|student records|calendrier universitaire|academic calendar)\b", text
    ))
    if campus_inquiry and re.search(r"\b(horaire[s]?|ouvert[es]*|ouvr[ei]\w*|hours|open|close[s]?|frais|prix|fee[s]?|deadline[s]?|ferme[es]?|holiday[s]?|date limite|aujourd hui|today|tomorrow|demain)\b", text):
        message = ("Cette information peut changer. Je ne peux pas la confirmer ici. Vérifiez la page officielle.",
                   "This information can change. I can’t confirm it here. Check the official page.")
        if selected == "mrt" or re.search(r"\b(library|bibliotheque)\b", text):
            source = ("https://www.uottawa.ca/bibliotheque/bibliotheques-heures-ouverture" if lang == "fr"
                      else "https://www.uottawa.ca/library/locations-hours")
        else:
            source = format_fact(catalog[selected], lang)["source"] if selected else MAP[lang]
        return jsonify(lang=lang, text=message[lang == "en"], source=source)
    if campus_inquiry and re.search(r"\b(courriel|email|e mail|telephone|phone|number|numero|password|mot de passe|wifi|wi fi|passwords)\b", text):
        message = ("Je ne peux pas confirmer ce renseignement. Consultez la fiche officielle.",
                   "I can’t confirm that detail. Check the official page.")
        source = format_fact(catalog[selected], lang)["source"] if selected else MAP[lang]
        return jsonify(lang=lang, text=message[lang == "en"], source=source)
    route = route_between(text, mentions)
    if not route and selected in PLACES and previous in PLACES and previous != selected and re.search(
        r"\b(si je pars de|si je pars du|en partant de|et depuis|what if i start (?:at|from)|starting from)\b", text
    ):
        route = (selected, previous)
    if route:
        return jsonify(lang=lang, **describe_route(*route, lang, catalog))
    if not matches and re.fullmatch(r" (bonjour|salut|hello|hi|aide|help|que peux tu faire|what can you do) ", text):
        return jsonify(lang=lang, text=(
            "Salut ! Donne-moi un lieu à trouver, deux pavillons à comparer, ou un service étudiant dont tu as besoin."
            if lang == "fr" else "Hi! Tell me where you want to go, which buildings you want to compare, or what student support you need."
        ))
    if not matches and re.search(r"\b(liste des (?:pavillons|batiments)|repertoire des (?:batiments|pavillons)|building directory|list of buildings)\b", text):
        directory = ("https://www.uottawa.ca/notre-universite/administration-services/immeubles/cartes-campus/batiments"
                     if lang == "fr" else MAP["en"] + "/building")
        return jsonify(lang=lang, source=directory,
                       text="Voici le répertoire officiel. Tu peux aussi me donner le nom ou le code du bâtiment que tu veux trouver."
                       if lang == "fr" else "Here’s the official building directory. You can also give me a building name or code.")
    if len(matches) > 1:
        return jsonify(lang=lang, text="De quel lieu ou service voulez-vous parler ?" if lang == "fr" else "Which place or service do you mean?", options=list(matches),
                       option_labels={key: catalog[key]["aliases"][0] if key not in PLACES else PLACES[key]["code"] for key in matches})
    gemini_status = None
    try:
        natural = answer_with_gemini(
            question, catalog, lang, selected, previous,
            allow_general=not campus_inquiry, exchange=data.get("exchange"),
        ) if use_gemini else None
    except GeminiError as error:
        natural = None
        gemini_status = str(error)
    if use_gemini and not campus_inquiry and natural is None and not gemini_key():
        gemini_status = "no_key"
    if natural:
        selected, answer = natural
        if selected == "GENERAL":
            return jsonify(lang=lang, text=answer, general=True)
        if catalog[selected].get("wayfinding") and not re.search(r"\bcopernicus\b", answer, re.I):
            natural = None
    if not selected and (
        re.search(r"\b(ou|where|pavillon|building|residence|localiser|trouver|bibliotheque|library)\b", text)
        or len(text.split()) <= 3
    ):
        suggestions = similar_buildings(text, catalog)
        if suggestions:
            return jsonify(lang=lang, options=suggestions,
                           option_labels={key: PLACES[key][lang] for key in suggestions},
                           option_queries={key: catalog[key]["aliases"][0] for key in suggestions},
                           text="Tu parles de l’un de ces bâtiments ?" if lang == "fr" else "Did you mean one of these buildings?")
    if not selected and re.search(r"\b(bibliotheque|library)\b", text):
        return jsonify(lang=lang, text="Tu cherches la bibliothèque Morisset ?" if lang == "fr" else "Are you looking for Morisset Library?", options=["mrt"])
    if selected:
        result = format_fact(catalog[selected], lang)
        if natural:
            result["text"] = answer
        elif selected in PLACES and not re.search(r"\b(adresse|address)\b", text):
            result["text"] = orientation(selected, lang, catalog[selected])
        return jsonify(lang=lang, **result, gemini_notice=gemini_notice(gemini_status, lang) if gemini_status else None)
    if not campus_inquiry:
        return jsonify(lang=lang, text=gemini_notice(gemini_status or "response", lang))
    official = lookup_uottawa(question, lang)
    if official:
        return jsonify(lang=lang, **official, gemini_notice=gemini_notice(gemini_status, lang) if gemini_status else None)
    guide = ("Je ne trouve pas de réponse vérifiée pour cette question sur le campus. Essaie le répertoire officiel d’uOttawa."
             if lang == "fr" else "I can’t find a verified campus answer for this question. Try uOttawa’s official site.")
    return jsonify(lang=lang, text=guide, source="https://www.uottawa.ca/fr" if lang == "fr" else "https://www.uottawa.ca/en",
                   gemini_notice=gemini_notice(gemini_status, lang) if gemini_status else None)


@app.post("/api/transfer")
def transfer():
    data = body()
    items = data.get("items")
    catalog = facts()
    if not isinstance(items, list) or not 1 <= len(items) <= 20:
        return jsonify(error="invalid_items"), 400
    if any(not isinstance(key, str) or key not in catalog for key in items):
        return jsonify(error="invalid_items"), 400
    token = secrets.token_urlsafe(24)
    lang = preferred(data)
    with connect() as db:
        db.execute("DELETE FROM transfers WHERE expires <= ?", (time.time(),))
        db.execute("INSERT INTO transfers VALUES (?, ?, ?, ?)", (token, json.dumps(list(dict.fromkeys(items))), int(time.time()) + 900, lang))
    origin = os.getenv("INNOVA_PUBLIC_ORIGIN", request.host_url).rstrip("/")
    url = f"{origin}/reprise/{token}"
    image = io.BytesIO()
    qrcode.make(url).save(image, format="PNG")
    return jsonify(qr="data:image/png;base64," + base64.b64encode(image.getvalue()).decode())


@app.get("/reprise/<token>")
def recap(token):
    with connect() as db:
        row = db.execute("DELETE FROM transfers WHERE token = ? RETURNING items, expires, lang", (token,)).fetchone()
    if row is None or row[1] <= time.time():
        return render_template("recap.html", lang="fr", items=[]), 410
    catalog = facts()
    return render_template("recap.html", lang=row[2], items=[
        dict(format_fact(catalog[key], row[2]), text=orientation(key, row[2], catalog[key]) if key in PLACES else catalog[key][row[2]])
        for key in json.loads(row[0]) if key in catalog
    ])


initialize()


if __name__ == "__main__":
    from contextlib import redirect_stderr
    import socket
    from subprocess import Popen
    import sys
    import webbrowser

    from werkzeug.serving import ThreadedWSGIServer, WSGIRequestHandler, make_server

    class KioskRequestHandler(WSGIRequestHandler):
        def log_request(self, code="-", size="-"):
            if self.path.startswith("/reprise/"):
                self.log("info", "%s /reprise/ [redacted] %s %s", self.command, code, size)
                return
            super().log_request(code, size)

    class ExclusiveKioskServer(ThreadedWSGIServer):
        allow_reuse_address = False

        def server_bind(self):
            if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
                self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            super().server_bind()

    def bind_kiosk(host, port):
        if sys.platform == "win32":
            return ExclusiveKioskServer(host, port, app, handler=KioskRequestHandler)
        return make_server(host, port, app, threaded=True, request_handler=KioskRequestHandler)

    if "--check-gemini" in sys.argv:
        model = os.getenv("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL
        print(f"Modele teste : {model}", flush=True)
        try:
            if not gemini_key():
                raise GeminiError("no_key")
            result = answer_with_gemini("Combien font douze fois huit ?",
                                        facts(), "fr", None, None, allow_general=True)
            if not result or result[0] != "GENERAL" or not re.search(r"\b96\b|quatre.vingt.seize", result[1], re.I):
                raise GeminiError("response")
        except GeminiError as error:
            print(gemini_notice(str(error), "fr"), flush=True)
            sys.exit(1)
        print("Gemini repond correctement : douze fois huit = 96.", flush=True)
        sys.exit(0)

    print(f"INNOVA {BUILD}", flush=True)
    print(f"Dossier : {ROOT}", flush=True)
    print("Cle Gemini chargee. Connexion a verifier." if gemini_key() else "INNOVA local mode.", flush=True)
    host = os.getenv("INNOVA_HOST", "127.0.0.1")
    port = int(os.getenv("INNOVA_PORT", "5100"))

    if "--open-browser" not in sys.argv:
        app.run(host=host, port=port, request_handler=KioskRequestHandler)
    else:
        try:
            with redirect_stderr(io.StringIO()) as setup_error:
                server = bind_kiosk(host, port)
        except SystemExit:
            if os.getenv("INNOVA_PUBLIC_ORIGIN"):
                print(setup_error.getvalue(), file=sys.stderr)
                raise
            # Bind the actual server directly so there is no gap between finding
            # an available port and starting to listen on it.
            for fallback in (port + 1 if port < 65535 else 0, 0):
                try:
                    with redirect_stderr(io.StringIO()):
                        server = bind_kiosk(host, fallback)
                    break
                except SystemExit:
                    continue
            else:
                print(setup_error.getvalue(), file=sys.stderr)
                raise
            print(f"Port {port} indisponible. INNOVA utilise le port {server.server_port}.", flush=True)

        browser_host = "127.0.0.1" if host == "0.0.0.0" else "[::1]" if host == "::" else host
        if ":" in browser_host and not browser_host.startswith("["):
            browser_host = f"[{browser_host}]"
        address = f"http://{browser_host}:{server.server_port}/?borne&version={BUILD}&instance={INSTANCE}"
        print(f"INNOVA est prete sur {address}", flush=True)
        chrome = next((
            Path(folder) / "Google" / "Chrome" / "Application" / "chrome.exe"
            for folder in (os.getenv("ProgramFiles"), os.getenv("ProgramFiles(x86)"), os.getenv("LOCALAPPDATA"))
            if folder and (Path(folder) / "Google" / "Chrome" / "Application" / "chrome.exe").is_file()
        ), None) if sys.platform == "win32" else None
        opened = False
        if chrome:
            try:
                Popen([str(chrome), address])
                opened = True
            except OSError:
                pass
        if not opened:
            try:
                webbrowser.open(address, new=2)
            except webbrowser.Error:
                pass
        server.serve_forever()
