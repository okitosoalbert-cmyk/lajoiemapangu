import base64
import io
import json
import os
import re
import secrets
import sqlite3
import time
import unicodedata
from pathlib import Path
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

import qrcode
from flask import Flask, jsonify, render_template, request

ROOT = Path(__file__).resolve().parent
DB = Path(os.getenv("INNOVA_DB", ROOT / "innova.sqlite3"))
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8192
MAP = {
    "fr": "https://www.uottawa.ca/notre-universite/administration-services/immeubles/cartes-campus",
    "en": "https://www.uottawa.ca/about-us/administration-services/facilities/campus-maps",
}
VERIFIED = "2026-11-20"


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
    fr = words & set("ou trouve est je peux comment adresse chercher quels quelle les des une pour bonjour manger horaires bibliotheque".split())
    en = words & set("where is what how i can the to find near hours library hello get food address are".split())
    return "fr" if len(fr) > len(en) else "en" if len(en) > len(fr) else default


def facts():
    with connect() as db:
        return {key: json.loads(data) for key, data in db.execute("SELECT id, data FROM facts")}


def format_fact(fact, lang):
    result = {"id": fact["id"], "text": fact[lang], "source": fact.get("source_fr", fact["source"]) if lang == "fr" else fact["source"], "verified": VERIFIED}
    if fact.get("address"):
        result["map"] = MAP[lang]
        result["route"] = "https://www.google.com/maps/dir/?api=1&destination=" + quote(fact["address"])
    return result


def select_with_gemini(question, catalog):
    key = os.getenv("GEMINI_API_KEY")
    if not key or os.getenv("INNOVA_GEMINI_SEND_QUESTIONS") != "1":
        return None

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    glossary = {key: fact["aliases"] for key, fact in catalog.items()}
    payload = {
        "systemInstruction": {"parts": [{"text": (
            "Classify the user question using only a topic ID from this campus glossary. "
            "Return NONE if the question is ambiguous or asks for a detail other than "
            "a building location or a general service link. Output only the ID or NONE. "
            + json.dumps(glossary, ensure_ascii=False)
        )}]},
        "contents": [{"parts": [{"text": question}]}],
        "generationConfig": {"maxOutputTokens": 32, "thinkingConfig": {"thinkingBudget": 0}},
    }
    req = Request(f"https://generativelanguage.googleapis.com/v1beta/models/{quote(model, safe='')}:generateContent",
                  json.dumps(payload).encode(), {"Content-Type": "application/json", "x-goog-api-key": key})
    try:
        with urlopen(req, timeout=2) as response:
            result = json.load(response)
        selected = result["candidates"][0]["content"]["parts"][0]["text"].strip()
        return selected if selected in catalog else None
    except (OSError, URLError, ValueError, KeyError, IndexError, TypeError):
        return None


def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def preferred(data):
    return "en" if data.get("lang") == "en" else "fr"


@app.after_request
def no_cache(response):
    if request.path.startswith(("/api/", "/reprise/")):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.get("/")
def home():
    return render_template("index.html", has_glb=(ROOT / "static" / "mascotte.glb").is_file())


@app.post("/api/ask")
def ask():
    data = body()
    question = data.get("text")
    if not isinstance(question, str) or not question.strip() or len(question) > 500:
        return jsonify(error="invalid_question"), 400
    lang = language(question, preferred(data))
    text = f" {normalize(question)} "
    catalog = facts()
    matches = {key: [word for word in fact["aliases"] if f" {word} " in text] for key, fact in catalog.items()}
    matches = {key: words for key, words in matches.items() if words}
    if re.search(r"\b(horaire[s]?|ouvr[ei]\w*|hours|open|close[s]?|frais|prix|fee[s]?|deadline[s]?|ferme[es]?|holiday[s]?|date limite|aujourd hui|today|tomorrow|demain)\b", text):
        message = ("Cette information peut changer. Je ne peux pas la confirmer ici. Vérifiez la page officielle.",
                   "This information can change. I can’t confirm it here. Check the official page.")
        source = format_fact(catalog[next(iter(matches))], lang)["source"] if len(matches) == 1 else MAP[lang]
        return jsonify(lang=lang, text=message[lang == "en"], source=source)
    if re.search(r"\b(courriel|email|e mail|telephone|phone|number|numero|password|mot de passe|wifi|wi fi|passwords)\b", text):
        message = ("Je ne peux pas confirmer ce renseignement. Consultez la fiche officielle.",
                   "I can’t confirm that detail. Check the official page.")
        source = format_fact(catalog[next(iter(matches))], lang)["source"] if len(matches) == 1 else MAP[lang]
        return jsonify(lang=lang, text=message[lang == "en"], source=source)
    if len(matches) > 1:
        return jsonify(lang=lang, text="De quel lieu ou service voulez-vous parler ?" if lang == "fr" else "Which place or service do you mean?", options=list(matches))
    if not matches and re.search(r"\b(bibliotheque|library)\b", text):
        return jsonify(lang=lang, text="Quelle bibliothèque cherchez-vous ?" if lang == "fr" else "Which library are you looking for?", options=["mrt"])
    selected = next(iter(matches)) if matches else select_with_gemini(question, catalog)
    if selected:
        return jsonify(lang=lang, **format_fact(catalog[selected], lang))
    return jsonify(lang=lang, text="Je n’ai pas de réponse vérifiée pour cette question. Consultez le site officiel de l’Université d’Ottawa." if lang == "fr" else "I don’t have a verified answer to this question. Check the University of Ottawa’s official website.", source="https://www.uottawa.ca/fr" if lang == "fr" else "https://www.uottawa.ca/en")


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
    return render_template("recap.html", lang=row[2], items=[format_fact(catalog[key], row[2]) for key in json.loads(row[0]) if key in catalog])


initialize()


if __name__ == "__main__":
    from werkzeug.serving import WSGIRequestHandler

    class KioskRequestHandler(WSGIRequestHandler):
        def log_request(self, code="-", size="-"):
            if self.path.startswith("/reprise/"):
                self.log("info", "%s /reprise/ [redacted] %s %s", self.command, code, size)
                return
            super().log_request(code, size)

    app.run(
        host=os.getenv("INNOVA_HOST", "127.0.0.1"),
        port=int(os.getenv("INNOVA_PORT", "5100")),
        request_handler=KioskRequestHandler,
    )
