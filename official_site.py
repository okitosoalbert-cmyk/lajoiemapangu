"""Look up public uOttawa pages by their indexed URLs and read the source on demand."""

import base64
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from html import unescape
from pathlib import Path
import re
from time import monotonic
import unicodedata
from urllib.parse import unquote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import zlib

HOST = "www.uottawa.ca"
INDEX = Path(__file__).with_name("uottawa-index.b85")
STOP = set("""
a au aux ce cet cette ces c est ici ca dans de des du el elle en et eux faire fait faut
i il ils je la le les leur ma me mes moi mon ne nos notre nous on ou par pas peut peu
pour pourquoi qu quand que quel quelle quelles quels qui s sa se ses si son sur t ta
te tes toi ton tu un une vos votre vous veux voudrais trouve trouver besoin comment
comment savoir puis peux doit dois avoir obtenir demande etudiant etudiante universite uottawa
about am an and are at be can could do does for from get give go have help how i in
is it me my of on or our please should show tell that the their there these this to
uottawa us want was what when where which who will with would you your university ottawa
study studies programme programmes program programs request official apply find obtenir demander consulte trouver documentation
""".split())
SKIP = re.compile(r"/(?:admin|core|profiles|sitemap|search|node|media|user|publisher|editeur)(?:/|$)")


def terms(value):
    value = unicodedata.normalize("NFKD", unquote(value).lower())
    value = "".join(c for c in value if not unicodedata.combining(c))
    return {word.removesuffix("s") if len(word) > 4 else word
            for word in re.findall(r"[a-z0-9]+", value)
            if len(word) > 2 and word not in STOP}


def is_official(url):
    parsed = urlsplit(url)
    return parsed.scheme == "https" and parsed.netloc == HOST and parsed.path.startswith("/") and not parsed.query and not SKIP.search(unquote(parsed.path))


class OfficialRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not is_official(newurl):
            return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


@lru_cache(maxsize=1)
def search_index():
    if not INDEX.is_file():
        return {}, {}
    compressed = base64.b85decode(b"".join(INDEX.read_bytes().split()))
    documents, frequencies = {"fr": [], "en": []}, Counter()
    for line in zlib.decompress(compressed).decode("utf-8").splitlines():
        lang, path = line.split("\t", 1)
        if lang not in documents or not path.startswith("/") or SKIP.search(path):
            continue
        leaf = terms(path.rstrip("/").rsplit("/", 1)[-1])
        tokens = terms(path)
        if not leaf:
            continue
        documents[lang].append((path, leaf, tokens))
        frequencies.update(tokens)
    return documents, frequencies


def candidates(question, lang):
    words = terms(question)
    if not words or len(words) > 18:
        return []
    documents, frequency = search_index()
    weights = {word: 1 / (1 + frequency[word] / 75) for word in words}
    ranked = []
    for path, leaf, tokens in documents.get(lang, ()):
        hits = words & tokens
        leaf_hits = words & leaf
        if not leaf_hits or (len(hits) < min(2, len(words)) and (len(words) > 2 or max(weights[word] for word in leaf_hits) < .6)):
            continue
        score = sum(weights[word] for word in hits) + 1.4 * sum(weights[word] for word in leaf_hits)
        score += .5 * len(leaf_hits) / len(leaf)
        if path.startswith(("/study/", "/etudes/", "/campus-life/", "/vie-campus/", "/current-students/", "/bibliotheque/", "/library/")):
            score += .65
        if re.search(r"/(?:news-all|toutes-nouvelles|events-all)(?:/|$)", path):
            score *= .65
        ranked.append((score, path))
    ranked.sort(reverse=True)
    return ["https://" + HOST + path for _, path in ranked[:3]]


def plain(fragment):
    return " ".join(unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


@lru_cache(maxsize=96)
def read_page(url, cache_window):
    if not is_official(url):
        return None
    request = Request(url, headers={"User-Agent": "INNOVA-UOttawa-Guide/1.0", "Accept": "text/html"})
    try:
        with build_opener(OfficialRedirect()).open(request, timeout=3) as response:
            final_url = response.geturl()
            if not is_official(final_url) or response.headers.get_content_type() != "text/html":
                return None
            raw = response.read(2_500_001)
            if len(raw) > 2_500_000:
                return None
            page = raw.decode(response.headers.get_content_charset() or "utf-8", errors="replace")
    except (OSError, ValueError, LookupError):
        return None
    main = re.search(r"<main\b[^>]*>(.*?)</main>", page, re.I | re.S)
    if not main:
        return None
    body = re.sub(r"<(?:script|style|nav)\b[^>]*>.*?</(?:script|style|nav)>", " ", main[1], flags=re.I | re.S)
    title = re.search(r"<h1\b[^>]*>(.*?)</h1>", body, re.I | re.S)
    if not title:
        return None
    title = plain(title[1])
    if not title or title.lower() in {"page not found", "page introuvable", "access denied"}:
        return None
    description = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', page, re.I)
    segments = [plain(description[1])] if description else []
    segments += [plain(block) for block in re.findall(r"<(?:p|li)\b[^>]*>(.*?)</(?:p|li)>", body, re.I | re.S)]
    return final_url, title, list(dict.fromkeys(text for text in segments if 70 <= len(text) <= 520))[:140]


def lookup(question, lang):
    urls = candidates(question, lang)
    if not urls:
        return None
    window = int(monotonic() // 900)
    with ThreadPoolExecutor(max_workers=3) as pool:
        pages = list(pool.map(lambda url: read_page(url, window), urls))
    pages = [page for page in pages if page]
    if not pages:
        return None
    search = terms(question)
    best = None
    for position, (url, title, blocks) in enumerate(pages):
        topic = len(search & terms(title))
        for block in blocks:
            overlap = len(search & terms(block))
            if overlap < min(2, len(search)) and not (topic >= min(2, len(search)) and overlap):
                continue
            score = 3 * overlap + 2 * topic - position * .7
            if re.search(r"\b(uozone|commander|cliquez|connectez|soumettez|submit|order|sign in|log in|click)\b", block, re.I):
                score += 1.6
            if re.search(r"voici tout ce|voici ce qu|vous trouverez ici|here.s what you need to know", block, re.I):
                score -= 1
            if best is None or score > best[0]:
                best = score, url, title, block
    if best:
        _, url, title, block = best
        message = (f'La page uOttawa « {title} » indique ceci. « {block} »'
                   if lang == "fr" else f'The uOttawa page “{title}” says, “{block}”')
    else:
        url, title, _ = pages[0]
        message = (f"J’ai trouvé la page officielle « {title} ». Ouvre-la pour consulter les détails."
                   if lang == "fr" else f"I found the official page “{title}.” Open it to check the details.")
    return {
        "text": message, "source": url, "source_title": title,
        "related": [{"url": page_url, "title": page_title}
                    for page_url, page_title in dict.fromkeys((p[0], p[1]) for p in pages) if page_url != url],
    }
