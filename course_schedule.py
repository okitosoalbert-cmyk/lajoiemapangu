"""Small, read-only client for uOttawa's public class-search form."""

from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from http.cookiejar import CookieJar
import re
from time import monotonic
import unicodedata
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPCookieProcessor, HTTPRedirectHandler, Request, build_opener

from bs4 import BeautifulSoup

SEARCH = "https://uocampus.public.uottawa.ca/psc/csprpr9pub/EMPLOYEE/SA/c/UO_SR_AA_MODS.UO_PUB_CLSSRCH.GBL"
FORM_TERM = "CLASS_SRCH_WRK2_STRM$35$"
COURSE = re.compile(r"\b([a-z]{3})[\s-]*(\d{4}[a-z]?)\b", re.I)
TERM = re.compile(r"\b(automne|fall|hiver|winter|printemps|spring|ete|summer)\b", re.I)
SEASONS = {"automne":"fall", "hiver":"winter", "printemps":"summer", "spring":"summer", "ete":"summer"}
SKIP_PREFIX = {"for","and","the","aux","les","des","ses","son","par","sur","est","ete","may","oct","nov","dec","jan","feb","mar","apr","jun","jul","aug","sep"}


def fold(value):
    return "".join(c for c in unicodedata.normalize("NFKD", value.casefold()) if not unicodedata.combining(c))


def course_request(text, previous=None, *, today=None):
    plain = fold(text)
    match = next((m for m in COURSE.finditer(text) if m[1].lower() not in SKIP_PREFIX), None)
    code = (match[1] + match[2]).upper() if match else ""
    season = TERM.search(plain)
    year = re.search(r"\b20\d{2}\b", plain)
    if match and year and match.start() <= year.start() < match.end():
        year = re.search(r"\b20\d{2}\b", plain[:match.start()] + " " + plain[match.end():])
    current_term = re.search(
        r"\b(?:ce trimestre(?: ci)?|cette session(?: ci)?|trimestre (?:actuel|en cours)|"
        r"session (?:actuelle|en cours)|this (?:term|semester)|current (?:term|semester))\b", plain
    )
    section = re.search(r"(?:section|groupe|group)\s+([a-z]{1,3}\d{1,3})\b", plain)
    is_schedule = re.search(r"\b(cours|course[s]?|class(?:es)?|enseigne\w*|teach\w*|offert\w*|horaire|prof\w*|instructor)\b", plain)
    instructor = ""
    if not code and is_schedule:
        name = re.search(
            r"\b(?:professeure?|prof|le professeur|professor|instructor|cours donne(?:s)? par|courses taught by|cours donne|cours enseigne)\.?\s+"
            r"([\w’'-]+(?:\s+[\w’'-]+){0,3}?)(?=\s+(?:a |au |l |en |pour |cet |cette |this |in |for |enseigne|donne|teach|et |at )|[?.!,]|$)",
            plain,
        )
        if name:
            instructor = name[1].strip()
        else:
            name = re.search(r"\b(?:quels cours|quel cours)\s+(?:donne|enseigne)\s+([\w’'-]+(?:\s+[\w’'-]+){0,3}?)(?=\s+(?:a |au |l |en |pour |cet |cette )|[?.!,]|$)", plain)
            if name:
                instructor = name[1].strip()
        if instructor in {"donne","enseigne","pour","de","ce","du"} or not re.search(r"[a-z]{2}", instructor):
            instructor = ""
    previous_code = previous[7:] if isinstance(previous,str) and previous.startswith("course:") else ""
    if not code and previous_code and COURSE.fullmatch(previous_code) and (
        season or current_term or section or re.search(r"\b(et lui|le prof|et le prof|quel prof|quelle session|which term|who teaches it)\b", plain)
    ):
        code = previous_code
    if not code and not instructor:
        return None
    season_name = SEASONS.get(season[1], season[1]) if season else ""
    year_text = year[0] if year else ""
    if today and current_term and not season_name and not year_text:
        season_name = "winter" if today.month <= 4 else "summer" if today.month <= 8 else "fall"
        year_text = str(today.year)
    return code, instructor, season_name, year_text, section[1].upper() if section else ""


def same_service(url):
    link = urlsplit(url)
    return link.scheme == "https" and link.netloc == "uocampus.public.uottawa.ca"


class PublicRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return super().redirect_request(req, fp, code, msg, headers, newurl) if same_service(newurl) else None


def read(opener, target):
    with opener.open(target, timeout=5) as response:
        if not same_service(response.geturl()):
            raise OSError("Unexpected timetable host")
        return BeautifulSoup(response.read(2_000_000), "html.parser")


def session():
    opener = build_opener(PublicRedirect(), HTTPCookieProcessor(CookieJar()))
    document = read(opener, SEARCH + "?languageCd=ENG")
    form = document.find("form", id="UO_PUB_CLSSRCH")
    term = form.find("select", attrs={"name": FORM_TERM}) if form else None
    if not term:
        raise OSError("Missing timetable form")
    choices = [(o["value"], " ".join(o.stripped_strings)) for o in term.find_all("option") if o.get("value")]
    if not choices:
        raise OSError("No published terms")
    return opener, form, choices


def form_values(form):
    values = {}
    for field in form.select("input[name],select[name]"):
        if field.has_attr("disabled"):
            continue
        if field.name == "select":
            option = field.find("option", selected=True) or field.find("option")
            values[field["name"]] = option.get("value", "") if option else ""
        elif field.get("type") not in {"checkbox", "radio", "button", "submit"} or field.has_attr("checked"):
            values[field["name"]] = field.get("value", "")
    return values


def parse_rows(page, term, course, instructor):
    heading = page.find(id="DERIVED_CLSRCH_SSS_PAGE_KEYDESCR")
    if not heading or term.casefold() not in heading.get_text(" ", strip=True).casefold():
        return None
    groups = page.find_all("div", id=re.compile(r"^win0divSSR_CLSRSLT_WRK_GROUPBOX2\$\d+$"))
    found = []
    for group in groups:
        title_node = group.find("a", id=re.compile(r"^SSR_CLSRSLT_WRK_GROUPBOX2\$\d+$"))
        label = title_node.get("title", "") if title_node else ""
        matched = COURSE.search(label)
        if not matched:
            continue
        code = (matched[1] + matched[2]).upper()
        if course and code != course:
            continue
        title = label[matched.end():].lstrip(" -–")
        for name in group.find_all("a", id=re.compile(r"^MTG_CLASSNAME\$\d+$")):
            index = name["id"].rsplit("$", 1)[1]
            instructor_node = group.find(id="MTG_INSTR$" + index)
            names = list(dict.fromkeys(instructor_node.stripped_strings)) if instructor_node else []
            names = [n for n in names if fold(n) not in {"staff", "tba", "to be announced", "-"}]
            if instructor and not any(set(instructor.split()) <= set(fold(n).split()) for n in names):
                continue
            hours = group.find(id="MTG_DAYTIME$" + index)
            found.append({"code":code, "title":title, "term":term, "section":name.get_text(" ", strip=True),
                          "names":names, "hours":" · ".join(dict.fromkeys(hours.stripped_strings)) if hours else ""})
    if not groups and not re.search(r"no classes|no results|not found|returned no|no class|search did not return",
                                   page.get_text(" ", strip=True), re.I):
        return None
    return found


def search_term(choice, code, instructor, initial=None):
    term_id, term_label = choice
    try:
        opener, form, _ = initial or session()
        values = form_values(form)
        values.update({
            "ICAction":"CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH",
            FORM_TERM:term_id,
            "SSR_CLSRCH_WRK_SUBJECT$0":code[:3],
            "SSR_CLSRCH_WRK_CATALOG_NBR$0":code[3:],
            "SSR_CLSRCH_WRK_LAST_NAME$0":instructor.split()[-1] if instructor else "",
            "SSR_CLSRCH_WRK_SSR_EXACT_MATCH2$0":"C",
            "SSR_CLSRCH_WRK_SSR_OPEN_ONLY$chk$0":"N",
        })
        values.pop("SSR_CLSRCH_WRK_SSR_OPEN_ONLY$0", None)
        target = Request(SEARCH, urlencode(values).encode(), {
            "Content-Type":"application/x-www-form-urlencoded", "Referer":SEARCH + "?languageCd=ENG",
            "User-Agent":"INNOVA-uOttawa-public-timetable/1.0",
        })
        return parse_rows(read(opener,target), term_label, code, instructor)
    except (OSError, ValueError):
        return None


@lru_cache(maxsize=48)
def cached_search(code, instructor, season, year, window):
    first = session()
    terms = first[2]
    selected = [(term,label) for term,label in terms if (not season or season in label.casefold())
                and (not year or year in label)]
    if not selected:
        return [], [label for _,label in terms], False
    # The public form normally exposes current and next term. Use independent
    # sessions because its form tokens are tied to one request history.
    selected = selected[:3]
    with ThreadPoolExecutor(max_workers=len(selected)) as pool:
        futures = [pool.submit(search_term, term, code, instructor, first if i == 0 else None)
                   for i,term in enumerate(selected)]
        results = [future.result() for future in futures]
    return [row for result in results if result for row in result], [label for _,label in selected], any(r is None for r in results)


def lookup_course(query, lang):
    code, instructor, season, year, section = query
    fr = lang == "fr"
    response = {
        "lang": lang, "source": SEARCH + ("?languageCd=CFR" if fr else "?languageCd=ENG"),
        "source_title": "Horaire officiel des cours" if fr else "Official course timetable",
    }
    if code:
        response["course_context"] = "course:" + code
    try:
        records, published, incomplete = cached_search(code, instructor, season, year, int(monotonic() / 300))
    except (OSError, ValueError):
        records, published, incomplete = [], [], True
    if section:
        records = [row for row in records if row["section"].upper().split("-")[0] == section]
    if fr:
        def label(term):
            match = re.fullmatch(r"(20\d{2}) (Fall|Winter|Spring/Summer|Summer|Spring) Term",term)
            if not match: return term
            return {"Fall":"Automne","Winter":"Hiver","Spring/Summer":"Printemps-été","Summer":"Été","Spring":"Printemps"}[match[2]]+" "+match[1]
    else:
        def label(term): return term
    if not records:
        available = ", ".join(label(term) for term in published)
        if incomplete:
            message = "La recherche publique n’a pas abouti. Ouvre l’horaire officiel pour vérifier." if fr else "The public search did not complete. Open the official timetable to verify."
        elif season or year:
            message = (f"Aucune section confirmée pour ces filtres. Trimestres affichés par le service : {available}."
                       if fr else f"No sections confirmed for those filters. Terms listed by the service: {available}.")
        else:
            message = "Je n’ai trouvé aucune section pour cette recherche dans les trimestres consultés." if fr else "I found no matching sections in the terms checked."
        response["text"] = message
        return response
    terms = ", ".join(dict.fromkeys(label(row["term"]) for row in records))
    subject = code or ("les cours correspondant à " if fr else "courses matching ") + instructor.title()
    message = f"Pour {subject}, l’horaire public indique des sections en {terms}." if fr else f"The public timetable lists sections for {subject} in {terms}."
    for term in dict.fromkeys(row["term"] for row in records):
        rows = [row for row in records if row["term"] == term]
        lectures = [row for row in rows if "-LEC" in row["section"]] or rows
        names = list(dict.fromkeys(name for row in lectures for name in row["names"]))
        if names:
            staff = ", ".join(names[:3])
            if len(names) > 3:
                staff += " et d’autres" if fr else " and others"
        else:
            staff = "enseignant à confirmer" if fr else "instructor to be confirmed"
        message += f" {label(term)} · {staff}."
    if len(records) > 32:
        message += " Les 32 premières sections sont affichées ici." if fr else " The first 32 sections are shown here."
    if incomplete:
        message += " Certains trimestres n’ont pas pu être vérifiés." if fr else " Some terms could not be verified."
    response["text"] = message
    response["courses"] = [{**row, "term":label(row["term"])} for row in records[:32]]
    return response
