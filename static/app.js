const $ = (id) => document.getElementById(id);
const expectedInstance = new URLSearchParams(location.search).get("instance");
const translations = {
  fr: {
    campus: "UNIVERSITÉ D’OTTAWA", finish: "Terminer", eyebrow: "GUIDE DU CAMPUS", heading: "Bonjour, je suis Innova.",
    description: "Un pavillon à trouver, un service à découvrir ? Posez-moi votre question sur le campus de l’Université d’Ottawa.",
    suggest: "PAR OÙ COMMENCER ?", map: "Trouver un pavillon", mapNote: "Pavillons et carte", library: "Bibliothèque", libraryNote: "Trouver Morisset",
    food: "Où manger", foodNote: "Cafés et restaurants", services: "Vie étudiante", servicesNote: "Services et activités",
    privacy: "Sur cette borne, votre conversation s’efface à la fin de la session.", prototype: "PROTOTYPE U-GUIDE", standby: "Mode borne",
    officialMap: "Carte officielle du campus", recap: "Récapitulatif", reset: "Nouvelle session", camera: "Activer la détection de présence",
    placeholder: "Écrivez votre question…", send: "Envoyer", mic: "Dicter la question", keyboard: "Clavier tactile", sound: "Activer la voix",
    mute: "Couper la voix", ready: "Prêt à vous aider", working: "Recherche en cours…", micStarting: "Micro en préparation…", speechStarting: "Préparation de la voix…", listening: "Je vous écoute…", speaking: "Gee-Gee parle…",
    failure: "La réponse est indisponible. Réessayez dans un instant.", micFailure: "La dictée est indisponible. Vous pouvez écrire la question.",
    verified: "Vérifié le", source: "Source officielle", route: "Itinéraire", scan: "Scannez pour emporter vos réponses vérifiées. Lien utilisable une fois, pendant 15 minutes.",
    noQr: "Aucune réponse vérifiée à emporter.", qrWait: "Préparation du code QR…", qrFailure: "Le code QR est indisponible.",
    waiting: "Détection active. Placez-vous devant la borne.", cameraFailure: "La détection est indisponible. Touchez l’écran pour commencer.",
    studentCard: "Carte étudiante", studentCardNote: "Obtenir ou remplacer", timetable: "Horaires de cours", timetableNote: "Chercher par code de cours",
    topics: {studentCard: "Comment obtenir ma carte étudiante ?", library: "Où se trouve la bibliothèque Morisset ?", food: "Où manger sur le campus ?", services: "Quels sont les services étudiants ?"},
  },
  en: {
    campus: "UNIVERSITY OF OTTAWA", finish: "End session", eyebrow: "CAMPUS GUIDE", heading: "Hi, I’m Innova.",
    description: "Looking for a building or a service? Ask me about the University of Ottawa campus.",
    suggest: "WHERE TO START?", map: "Find a building", mapNote: "Buildings and maps", library: "Library", libraryNote: "Find Morisset",
    food: "Where to eat", foodNote: "Cafés and restaurants", services: "Student life", servicesNote: "Services and activities",
    privacy: "Your conversation clears from this kiosk when the session ends.", prototype: "U-GUIDE PROTOTYPE", standby: "Kiosk mode",
    officialMap: "Official campus map", recap: "Your recap", reset: "New session", camera: "Enable presence detection",
    placeholder: "Type your question…", send: "Send", mic: "Dictate question", keyboard: "Touch keyboard", sound: "Enable speech",
    mute: "Mute speech", ready: "Ready to help", working: "Looking that up…", micStarting: "Preparing microphone…", speechStarting: "Preparing speech…", listening: "Listening…", speaking: "Gee-Gee is speaking…",
    failure: "The answer is unavailable. Please try again shortly.", micFailure: "Dictation is unavailable. You can type your question.",
    verified: "Verified on", source: "Official source", route: "Directions", scan: "Scan to take your verified answers with you. This link works once, within 15 minutes.",
    noQr: "There are no verified answers to take with you.", qrWait: "Preparing the QR code…", qrFailure: "The QR code is unavailable.",
    waiting: "Detection is active. Stand in front of the kiosk.", cameraFailure: "Presence detection is unavailable. Tap the screen to start.",
    studentCard: "Student card", studentCardNote: "Get or replace your card", timetable: "Course timetable", timetableNote: "Search using a course code",
    topics: {studentCard: "How do I get my student card?", library: "Where is Morisset Library?", food: "Where can I eat on campus?", services: "What student services are available?"},
  },
};
const paths = {
  arrow: '<path d="M6 18 18 6M8 6h10v10"/>',
  pin: '<path d="M20 10c0 5-8 10-8 10s-8-5-8-10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  book: '<path d="M12 6v14m0-14C9 4 6 4 3 5v13c3-1 6-1 9 2 3-3 6-3 9-2V5c-3-1-6-1-9 1Z"/>',
  food: '<path d="M3 8h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Zm14 1h2a2.5 2.5 0 0 1 0 5h-2M5 22h13M8 3v2m5-2v2"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  keys: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 16h8"/>',
  mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3"/>',
  send: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  sound: '<path d="M3 9h4l5-4v14l-5-4H3Zm13 0a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/>',
  mute: '<path d="M3 9h4l5-4v14l-5-4H3Zm13 1 5 5m0-5-5 5"/>',
};
const maps = {
  fr: "https://www.uottawa.ca/notre-universite/administration-services/immeubles/cartes-campus",
  en: "https://www.uottawa.ca/about-us/administration-services/facilities/campus-maps",
};
const names = {crx: "CRX", ucu: "UCU", site: "SITE", stem: "STEM", mrt: "Morisset", food: "food", campus: "services", admission: "Admission"};
let lang = "fr", sound = true, state = "ready", items = [], lastTopic, confirmation, generalExchange, activity, pending, recognition, stream;
let cameraCycle = 0, transferCycle = 0;
let automatic = false, waitForDeparture = false, listenTimer, voiceBlocked = false, utterance;
let cameraBackground, microphoneSetup = 0, dictationStream;
let audioActive = false, recentSpeech, revealTimer;
let speechLocale = "fr-CA", speechReveal;
try {
  speechLocale = localStorage.getItem("innova-speech-locale") || speechLocale;
} catch {}
const ABSENCE_MS = 5000;
const SPEECH_PAUSE_MS = 1200;
const REPLY_TARGET_MS = 1900;
window.speechSynthesis?.getVoices();
let voiceDraft = "", voiceDraftTimer, voiceRevision = 0;
const microphone = {
  audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true},
  video: false,
};
try { automatic = localStorage.getItem("innova-auto-v2") === "true"; } catch {}
const copy = () => translations[lang];
const speechPreview = document.createElement("div");
speechPreview.id = "speechPreview";
$("notice").before(speechPreview);

const voiceSettings = document.createElement("div");
voiceSettings.className = "voice-settings";
const languageLabel = document.createElement("label");
const languageName = document.createElement("span");
const languageSelect = document.createElement("select");
languageSelect.id = "speechLocale";
languageLabel.append(languageName, languageSelect);
voiceSettings.append(languageLabel);
$("messages").before(voiceSettings);
$("question").dir = "auto";

function speechOptions() {
  languageName.textContent = lang === "fr" ? "Langue parlée" : "Spoken language";
}

function chooseSpeechLocale(value) {
  if (speechLocale === value) return;
  speechLocale = value;
  languageSelect.value = value;
  try { localStorage.setItem("innova-speech-locale", value); } catch {}
  stopListening();
  if (["listening", "micStarting"].includes(state)) status("ready");
  voiceBlocked = false;
  scheduleListening();
}

languageSelect.onchange = () => {
  chooseSpeechLocale(languageSelect.value);
  if (speechLocale === "fr-CA") locale("fr");
  if (speechLocale === "en-CA") locale("en");
};
fetch("/static/languages.json").then(response => response.json()).then(languages => {
  const display = new Intl.DisplayNames(["fr"], {type:"language"});
  for (const item of languages) {
    const native = new Intl.DisplayNames([item.locale], {type:"language"}).of(item.locale);
    const title = { "fr-CA":"Français", "en-CA":"English", "zh-CN":"普通话 · Mandarin", "ja-JP":"日本語 · Japonais" }[item.locale]
      || (display.of(item.locale) || item.name) + (native ? " · " + native : "");
    languageSelect.add(new Option(title, item.locale));
  }
  if (![...languageSelect.options].some(option => option.value === speechLocale)) speechLocale = lang === "fr" ? "fr-CA" : "en-CA";
  languageSelect.value = speechLocale;
}).catch(() => { languageLabel.hidden = true; });

function updateAutomatic() {
  const button = $("camera");
  button.textContent = lang === "fr"
    ? (automatic ? "Désactiver le mode automatique" : "Activer le mode automatique")
    : (automatic ? "Disable automatic mode" : "Enable automatic mode");
  button.setAttribute("aria-pressed", String(automatic));
}

function clearVoiceDraft() {
  clearTimeout(voiceDraftTimer);
  voiceDraft = "";
  voiceRevision++;
  speechPreview.textContent = "";
}

function sendVoiceDraftAfter(lastSpeechAt = performance.now()) {
  clearTimeout(voiceDraftTimer);
  if (!voiceDraft) return;
  voiceDraftTimer = setTimeout(() => {
    const text = normalizeDictation(voiceDraft).slice(0, 500);
    clearVoiceDraft();
    if (!document.hidden && !$("idle").open && !$("summary").open && !$("kiosk-location").open &&
        !pending && !utterance && !$("question").value.trim()) {
      ask(text, lastSpeechAt);
    }
  }, Math.max(0, lastSpeechAt + SPEECH_PAUSE_MS - performance.now()));
}

function stopListening() {
  clearTimeout(listenTimer);
  const active = recognition;
  recognition = undefined;
  audioActive = false;
  active?.abort();
  releaseDictationStream();
  clearVoiceDraft();
}

function releaseDictationStream() {
  dictationStream?.getTracks().forEach(track => track.stop());
  dictationStream = undefined;
}

function scheduleListening(delay = 500) {
  clearTimeout(listenTimer);
  if (!automatic || voiceBlocked) return;
  listenTimer = setTimeout(() => {
    if (!document.hidden && !$("idle").open && !$("summary").open && !$("kiosk-location").open &&
        !recognition) {
      startListening(true);
    }
  }, delay);
}
const svg = (name) => '<svg aria-hidden="true" viewBox="0 0 24 24">' + paths[name] + '</svg>';
$("volume").value = "0.65";
const viewer = document.querySelector("model-viewer");
const mascot = window.createMascot($("avatar"));

function status(value) {
  state = value;
  mascot?.speak(value === "speaking");
  $("state").textContent = copy()[value];
  $("avatar").classList.toggle("active", value === "speaking" || value === "listening");
}

function animate(pattern) {
  if (!viewer?.availableAnimations?.length) return;
  const clip = viewer.availableAnimations.find((name) => pattern.test(name));
  if (!clip) return;
  viewer.animationName = clip;
  viewer.play();
}

viewer?.addEventListener("load", () => {
  $("avatar").classList.add("loaded");
  mascot?.pause(true);
  animate(/idle|repos/i);
});

function labelButton(id, icon, label) {
  const button = $(id);
  button.innerHTML = svg(icon);
  button.setAttribute("aria-label", label);
  button.title = label;
}

function locale(value) {
  lang = value;
  document.documentElement.lang = lang;
  document.title = lang === "fr" ? "INNOVA | Guide du campus" : "INNOVA | Campus guide";
  $("volume").setAttribute("aria-label", lang === "fr" ? "Volume de la voix" : "Speech volume");
  for (const node of document.querySelectorAll("[data-copy]")) node.textContent = copy()[node.dataset.copy];
  for (const code of ["fr", "en"]) $(code).setAttribute("aria-pressed", String(code === lang));
  $("question").placeholder = copy().placeholder;
  $("question").setAttribute("aria-label", copy().placeholder);
  $("keyboard").setAttribute("aria-label", copy().keyboard);
  $("campusMap").href = maps[lang];
  labelButton("keys", "keys", copy().keyboard);
  labelButton("mic", "mic", copy().mic);
  labelButton("send", "send", copy().send);
  labelButton("sound", sound ? "sound" : "mute", sound ? copy().mute : copy().sound);
  status(state);
  updateAutomatic();
  speechOptions();
  buildKeyboard();
}

function buildKeyboard() {
  const keyboard = $("keyboard");
  keyboard.replaceChildren();
  const letters = [..."QWERTYUIOPASDFGHJKLZXCVBNM", ...(lang === "fr" ? "ÉÈÀÇÙ" : ""), "?", "␣", "⌫"];
  for (const key of letters) {
    const button = document.createElement("button");
    button.textContent = key;
    if (key === "␣" || key === "⌫") {
      button.setAttribute("aria-label", key === "␣" ? (lang === "fr" ? "Espace" : "Space") : (lang === "fr" ? "Effacer" : "Delete"));
    }
    button.onclick = () => {
      const input = $("question");
      const begin = key === "⌫" && input.selectionStart === input.selectionEnd ? Math.max(0, input.selectionStart - 1) : input.selectionStart;
      const value = key === "⌫" ? "" : key === "␣" ? " " : key.toLowerCase();
      if (input.value.length - input.selectionEnd + begin + value.length <= 500) {
        input.setRangeText(value, begin, input.selectionEnd, "end");
        input.dispatchEvent(new Event("input", {bubbles: true}));
      }
      input.focus();
    };
    keyboard.append(button);
  }
}

function listeningStatus() {
  if (audioActive) status("listening");
  else if (recognition) status("micStarting");
  else status("ready");
}

function touch() {
  clearTimeout(activity);
  if (automatic && stream) return;
  activity = setTimeout(() => enterStandby(), 120000);
}

function bubble(text, user = false, spoken = null, hidden = false) {
  const article = document.createElement("div");
  article.className = user ? "bubble user" : "bubble";
  article.hidden = hidden;
  const p = document.createElement("p");
  p.textContent = text;
  p.dir = "auto";
  if (spoken) p.lang = spoken;
  article.append(p);
  $("messages").append(article);
  $("messages").scrollTop = $("messages").scrollHeight;
  return article;
}

function link(container, url, label) {
  const a = document.createElement("a");
  a.href = url;
  a.textContent = label;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  container.append(a);
}

function releaseCloudPlayback(job) {
  job.controller.abort();
  if (job.audio) {
    job.audio.pause();
    job.audio.removeAttribute("src");
  }
  if (job.url) URL.revokeObjectURL(job.url);
}

function revealSpeechReply() {
  clearTimeout(revealTimer);
  const reveal = speechReveal;
  speechReveal = undefined;
  reveal?.();
}

function stopVoice() {
  revealSpeechReply();
  if (!utterance) return;
  const job = utterance;
  utterance = undefined;
  if (job.started) recentSpeech = {text: job.text, until: performance.now() + 2000};
  if (job.local) {
    clearTimeout(job.watchdog);
    window.speechSynthesis.cancel();
  } else {
    releaseCloudPlayback(job);
  }
}

function finishVoice() {
  stopVoice();
  listeningStatus();
  animate(/idle|repos/i);
  scheduleListening();
}

function playLocalVoice(text, locale) {
  const synth = window.speechSynthesis;
  const tag = locale.toLowerCase();
  const language = tag.split("-")[0];
  const voices = synth?.getVoices().filter(voice => voice.localService) || [];
  const voice = voices.find(item => item.lang.toLowerCase() === tag) ||
    voices.find(item => item.lang.toLowerCase().split("-")[0] === language);
  if (!voice || !window.SpeechSynthesisUtterance) return false;

  const job = {local: true, text};
  utterance = job;
  const chunks = new Intl.Segmenter(locale, {granularity: "sentence"}).segment(text);
  const segments = Array.from(chunks, ({segment}) => segment.trim()).filter(Boolean);
  function failed() {
    if (utterance !== job) return;
    $("notice").textContent = lang === "fr"
      ? "Lecture vocale indisponible. La réponse reste affichée."
      : "Speech is unavailable. The written reply is still shown.";
    finishVoice();
  }
  function play(index) {
    if (utterance !== job) return;
    clearTimeout(job.watchdog);
    if (index >= segments.length) {
      finishVoice();
      return;
    }
    const clip = new SpeechSynthesisUtterance(segments[index]);
    clip.voice = voice;
    clip.lang = voice.lang;
    clip.volume = Number($("volume").value);
    clip.rate = .94;
    clip.onstart = () => {
      if (utterance !== job) return;
      job.started = true;
      status("speaking");
      animate(/speak|talk|parl|mouth/i);
    };
    clip.onend = () => play(index + 1);
    clip.onerror = failed;
    job.watchdog = setTimeout(failed, Math.max(12000, segments[index].length * 130));
    try { synth.speak(clip); } catch { failed(); }
  }
  play(0);
  return true;
}

async function say(text, replyLang, spoken, reveal, replyDeadline) {
  stopVoice();
  speechReveal = reveal;
  if (!sound) { revealSpeechReply(); return; }
  if (replyDeadline) {
    revealTimer = setTimeout(revealSpeechReply, Math.max(0, replyDeadline - performance.now()));
  }
  const target = spoken || (replyLang === "fr" ? "fr-CA" : "en-CA");
  const job = {controller: new AbortController(), text};
  utterance = job;
  status("speechStarting");
  const unavailable = () => {
    if (utterance !== job) return;
    stopVoice();
    if (playLocalVoice(text, target)) return;
    $("notice").textContent = lang === "fr"
      ? "Voix Gemini indisponible et aucune voix locale pour cette langue. La réponse reste affichée."
      : "Gemini voice is unavailable and there is no local voice for this language. The written reply is still shown.";
    listeningStatus();
    scheduleListening();
  };
  const limit = setTimeout(unavailable, 13000);
  try {
    const response = await fetch("/api/speech", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({text, locale: target}), signal: job.controller.signal,
    });
    if (!response.ok) throw Error("Voice unavailable");
    const audio = await response.blob();
    if (utterance !== job) return;
    job.url = URL.createObjectURL(audio);
    job.audio = new Audio(job.url);
    job.audio.volume = Number($("volume").value);
    job.audio.onplaying = () => {
      if (utterance !== job) return;
      job.started = true;
      status("speaking");
      revealSpeechReply();
      animate(/speak|talk|parl|mouth/i);
    };
    job.audio.onwaiting = () => {
      if (utterance === job) status("speechStarting");
    };
    job.audio.onended = () => {
      if (utterance !== job) return;
      finishVoice();
    };
    job.audio.onerror = unavailable;
    await job.audio.play();
  } catch {
    unavailable();
  } finally {
    clearTimeout(limit);
  }
}

function playbackWords(text) {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];
}

function spellingDistance(left, right) {
  let row = Array.from({length:right.length + 1}, (_, i) => i);
  for (const [i, letter] of [...left].entries()) {
    const next = [i + 1];
    for (let j = 1; j <= right.length; j++) {
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (letter !== right[j - 1]));
    }
    row = next;
  }
  return row[right.length];
}

function resemblesPlayback(transcript, playback, isFinal) {
  if (!playback) return false;
  const words = playbackWords(transcript);
  const spoken = playbackWords(playback);
  const heard = words.join("");
  if (!heard) return true;
  if (spoken.join("").includes(heard)) return true;
  if (!isFinal && heard.length < 8 && words.length < 2) return true;
  if (heard.length < 9) return false;
  const tolerance = Math.floor(heard.length * .22);
  for (let start = 0; start < spoken.length; start++) {
    let fragment = "";
    for (let i = start; i < spoken.length; i++) {
      fragment += spoken[i];
      if (fragment.length > heard.length + tolerance) break;
      if (fragment.length >= heard.length - tolerance && spellingDistance(heard, fragment) <= tolerance) return true;
    }
  }
  return false;
}

function interruptForSpeech() {
  if (pending) {
    const previous = pending;
    pending = undefined;
    previous.abort();
    $("send").disabled = false;
  }
  stopVoice();
  touch();
  listeningStatus();
  animate(/idle|repos/i);
}

async function ask(text, lastSpeechAt) {
  text = text.trim();
  if (!text || pending) return;
  touch();
  if (!automatic) stopListening();
  clearVoiceDraft();
  stopVoice();
  $("notice").textContent = "";
  $("question").value = "";
  $("suggestions").hidden = true;
  bubble(text, true, speechLocale);
  const controller = new AbortController();
  pending = controller;
  $("send").disabled = true;
  status("working");
  const timeout = setTimeout(() => controller.abort(), speechLocale === "fr-CA" || speechLocale === "en-CA" ? 18000 : 23500);
  try {
    const response = await fetch("/api/ask", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({text, lang, previous: lastTopic, confirmation, exchange: generalExchange, speech_locale: speechLocale}), signal: controller.signal});
    if (expectedInstance && response.headers.get("X-INNOVA-Instance") !== expectedInstance) {
      if (pending === controller) {
        $("notice").textContent = lang === "fr"
          ? "Cet onglet ne reçoit pas les réponses du serveur qui l’a ouvert. Ferme-le et relance INNOVA."
          : "This tab is receiving replies from a different server. Close it and restart INNOVA.";
      }
      return;
    }
    if (!response.ok) throw Error("Request failed");
    const result = await response.json();
    if (pending !== controller) return;
    if (result.gemini_notice) $("notice").textContent = result.gemini_notice;
    generalExchange = result.general ? {question: text, answer: result.text} : undefined;
    if (result.general || lastTopic?.startsWith("course:")) lastTopic = undefined;
    if (result.course_context) lastTopic = result.course_context;
    confirmation = result.option_queries && result.options?.length === 1 ? result.options[0] : undefined;
    const words = translations[result.lang];
    const article = bubble(result.text, false, result.voice_locale || result.lang, sound);
    const scrollToReply = () => {
      if (!article.isConnected || article.hidden) return;
      const viewport = $("messages");
      const map = article.querySelector(".campus-map");
      if (map) {
        viewport.scrollTop += map.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
      } else {
        viewport.scrollTop = viewport.scrollHeight;
      }
    };
    if (result.courses?.length) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = result.lang === "fr" ? "Voir les sections et leurs horaires" : "View sections and meeting times";
      const list = document.createElement("ul");
      for (const row of result.courses) {
        const item = document.createElement("li");
        const staff = row.names.join(", ") || (result.lang === "fr" ? "Enseignant à confirmer" : "Instructor to be confirmed");
        item.textContent = [row.term, row.code + " " + row.title, row.section, staff, row.hours].filter(Boolean).join(" · ");
        list.append(item);
      }
      details.className = "course-sections";
      details.append(summary, list);
      article.append(details);
    }
    const links = document.createElement("div");
    links.className = "links";
    if (result.source) link(links, result.source, result.source_title || words.source);
    for (const related of result.related || []) link(links, related.url, related.title);
    if (result.map) {
      link(links, result.map, words.officialMap);
      import("/static/campus-map.js")
        .then(({showCampusMap}) => showCampusMap(article, result.map_destination || result.id, result.lang, result.origin, document.body.dataset.kioskOrigin))
        .then(scrollToReply)
        .catch(() => {});
    }
    if (result.route) link(links, result.route, words.route);
    if (result.verified) {
      const date = document.createElement("span");
      date.className = "source-date";
      date.textContent = words.verified + " " + result.verified;
      links.append(date);
    }
    for (const id of result.options || []) {
      const option = document.createElement("button");
      option.textContent = result.option_labels?.[id] || words[names[id]] || names[id] || id;
      option.onclick = () => ask(result.option_queries?.[id] || option.textContent);
      links.append(option);
    }
    if (links.childNodes.length) article.append(links);
    $("messages").scrollTop = $("messages").scrollHeight;
    if (result.id) {
      lastTopic = result.id;
      if (!items.includes(result.id)) items.push(result.id);
    }
    say(result.text, result.lang, result.voice_locale, () => {
      if (!article.isConnected) return;
      article.hidden = false;
      mascot?.play("nod");
      scrollToReply();
    }, lastSpeechAt && lastSpeechAt + REPLY_TARGET_MS);
  } catch {
    if (pending === controller) $("notice").textContent = copy().failure;
  } finally {
    clearTimeout(timeout);
    if (pending === controller) {
      pending = undefined;
      $("send").disabled = false;
      if (state === "working") listeningStatus();
      scheduleListening();
    }
  }
}

function clearSession() {
  mascot?.play("");
  const controller = pending;
  pending = undefined;
  controller?.abort();
  stopListening();
  speechReveal = undefined;
  stopVoice();
  recentSpeech = undefined;
  $("send").disabled = false;
  $("messages").replaceChildren();
  $("suggestions").hidden = false;
  $("notice").textContent = "";
  $("question").value = "";
  $("keyboard").hidden = true;
  $("keys").setAttribute("aria-expanded", "false");
  items = [];
  lastTopic = undefined;
  confirmation = undefined;
  generalExchange = undefined;
  status("ready");
  animate(/idle|repos/i);
}

function hideSummary() {
  transferCycle++;
  $("summary").close();
  $("qr").removeAttribute("src");
  $("qr").hidden = true;
}

async function finish() {
  const verifiedItems = items;
  const cycle = ++transferCycle;
  clearSession();
  clearTimeout(activity);
  activity = setTimeout(enterStandby, 120000);
  $("qrStatus").textContent = verifiedItems.length ? copy().qrWait : copy().noQr;
  $("summary").showModal();
  if (!verifiedItems.length) return;
  try {
    const response = await fetch("/api/transfer", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({items: verifiedItems, lang}), signal: AbortSignal.timeout(4500)});
    if (!response.ok) throw Error("Transfer failed");
    const result = await response.json();
    if (cycle !== transferCycle) return;
    $("qr").src = result.qr;
    $("qr").hidden = false;
    $("qrStatus").textContent = copy().scan;
  } catch {
    if (cycle === transferCycle) $("qrStatus").textContent = copy().qrFailure;
  }
}

function stopCamera() {
  cameraCycle++;
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  $("preview").srcObject = null;
  $("camera").disabled = false;
}

function wake() {
  if ($("start").disabled || !$("idle").open || $("kiosk-location").open) return;
  if (!automatic) stopCamera();
  $("idle").close();
  if (automatic) {
    waitForDeparture = true;
    voiceBlocked = false;
  }
  mascot?.pause(false);
  mascot?.play("wave");
  touch();
  $("question").focus();
  animate(/wave|greet|salut/i);
  if (automatic) startListening(true);
  else say(copy().heading, lang);
}

function enterStandby() {
  mascot?.pause(true);
  clearTimeout(activity);
  hideSummary();
  clearSession();
  if (!stream) $("cameraStatus").textContent = "";
  if (!$("idle").open) $("idle").showModal();
  if (automatic && !document.hidden) camera();
}

async function camera() {
  if (stream || $("camera").disabled) return;
  const cycle = ++cameraCycle;
  $("camera").disabled = true;
  try {
    const next = await navigator.mediaDevices.getUserMedia({video: {width: 320, height: 240, facingMode: "user"}, audio: false});
    if (cycle !== cameraCycle) {
      next.getTracks().forEach((track) => track.stop());
      return;
    }
    stream = next;
    const video = $("preview");
    video.srcObject = stream;
    await video.play();
    if (cycle !== cameraCycle) return;
    const sample = document.createElement("canvas");
    sample.width = 48;
    sample.height = 36;
    const pixels = sample.getContext("2d", {willReadFrequently: true});
    $("camera").disabled = false;
    $("cameraStatus").textContent = lang === "fr"
      ? "Caméra active. Avancez vers le centre du cadre."
      : "Camera active. Step into the center of the frame.";
    if (!$("idle").open && !$("summary").open) clearTimeout(activity);
    let consecutive = 0, clear = 0, videoTime = -1, absentSince;
    next.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (cycle === cameraCycle) cameraFailed();
    });
    const check = () => {
      if (cycle !== cameraCycle) return;
      try {
        if (video.readyState >= 2 && video.currentTime !== videoTime) {
          videoTime = video.currentTime;
          pixels.drawImage(video, 0, 0, sample.width, sample.height);
          const data = pixels.getImageData(0, 0, sample.width, sample.height).data;
          const frame = new Float32Array(32 * 28);
          for (let y = 0; y < 28; y++) {
            for (let x = 0; x < 32; x++) {
              const i = ((y + 5) * sample.width + x + 8) * 4;
              frame[y * 32 + x] = (data[i] + 2 * data[i + 1] + data[i + 2]) / 4;
            }
          }
          if (!cameraBackground) cameraBackground = frame;
          const histogram = new Uint16Array(511);
          const offsets = frame.map((value, i) => value - cameraBackground[i]);
          let borderSamples = 0;
          for (let y = 0; y < 28; y++) {
            for (let x = 0; x < 32; x++) {
              if (x >= 4 && x < 28 && y >= 3) continue;
              histogram[Math.round(offsets[y * 32 + x]) + 255]++;
              borderSamples++;
            }
          }
          // Estimate exposure from the edges, where an approaching visitor is less likely to fill the frame.
          let pivot = 0, seen = 0;
          for (; pivot < histogram.length; pivot++) {
            seen += histogram[pivot];
            if (seen >= borderSamples / 2) break;
          }
          const exposure = pivot - 255;
          const tiles = new Uint8Array(16);
          let changed = 0, centerChanged = 0;
          for (let y = 0; y < 28; y++) {
            for (let x = 0; x < 32; x++) {
              if (Math.abs(offsets[y * 32 + x] - exposure) <= 17) continue;
              changed++;
              tiles[Math.floor(y / 7) * 4 + Math.floor(x / 8)]++;
              if (x >= 8 && x < 24) centerChanged++;
            }
          }
          const spread = tiles.filter(count => count >= 8).length;
          const footprint = changed / frame.length;
          const approach = footprint >= .075 && centerChanged >= 22 && spread >= 3;
          if (!$("idle").open && !$("summary").open) {
            // Keep comparing with the empty frame while a visitor stands still.
            if (approach) absentSince = undefined;
            else absentSince ??= performance.now();
            if (absentSince !== undefined && performance.now() - absentSince >= ABSENCE_MS) {
              waitForDeparture = false;
              absentSince = undefined;
              consecutive = 0;
              enterStandby();
            }
          } else if ($("idle").open && waitForDeparture) {
            clear = footprint < .065 ? clear + 1 : 0;
            if (clear >= 9) waitForDeparture = false;
          } else if ($("idle").open && approach) {
            consecutive++;
            if (consecutive >= 3) {
              consecutive = 0;
              absentSince = undefined;
              wake();
            }
          } else if ($("idle").open) {
            consecutive = 0;
            if (footprint < .065) {
              cameraBackground = cameraBackground.map((value, i) => .95 * value + .05 * frame[i]);
            }
          }
        }
        setTimeout(check, 65);
      } catch {
        cameraFailed();
      }
    };
    check();
  } catch {
    if (cycle === cameraCycle) {
      cameraFailed();
    }
  }
}

function cameraFailed() {
  stopCamera();
  $("cameraStatus").textContent = copy().cameraFailure;
  if (!$("idle").open && !$("summary").open) touch();
}

$("ask").onsubmit = (event) => { event.preventDefault(); ask($("question").value); };
for (const id of ["fr", "en"]) $(id).onclick = () => {
  chooseSpeechLocale(id + "-CA");
  locale(id);
};
for (const node of document.querySelectorAll("[data-icon]")) node.innerHTML = svg(node.dataset.icon);
for (const button of document.querySelectorAll("[data-topic]")) button.onclick = () => {
  const topic = button.dataset.topic;
  if (topic !== "map" && topic !== "timetable") {
    ask(copy().topics[topic]);
    return;
  }
  const field = $("question");
  field.value = "";
  field.placeholder = topic === "map" ? (lang === "fr" ? "Ex. Pavillon Fauteux" : "E.g. Fauteux Hall")
    : (lang === "fr" ? "Ex. GNG1503" : "E.g. GNG1503");
  if (!automatic) {
    $("keyboard").hidden = false;
    $("keys").setAttribute("aria-expanded", "true");
  }
  field.focus();

};
function setSound(value) {
  sound = value;
  if (!sound) {
    stopVoice();
    if (["speaking", "speechStarting"].includes(state)) listeningStatus();
    scheduleListening();
  }
  $("volume").hidden = !sound;
  $("sound").setAttribute("aria-pressed", String(sound));
  locale(lang);
}
$("sound").onclick = () => setSound(!sound);
$("keys").onclick = () => {
  const keyboard = $("keyboard");
  keyboard.hidden = !keyboard.hidden;
  $("keys").setAttribute("aria-expanded", String(!keyboard.hidden));
};
function showMicrophoneError(reason, target = $("notice")) {
  const denied = ["not-allowed", "service-not-allowed", "NotAllowedError", "SecurityError"].includes(reason);
  const missing = ["NotFoundError", "NotReadableError", "audio-capture"].includes(reason);
  const messages = lang === "fr" ? {
    denied: "Micro bloqué. Dans Chrome, ouvre les paramètres du site à gauche de l’adresse et règle Microphone sur Autoriser.",
    missing: "Chrome ne peut pas ouvrir le micro. Vérifie le périphérique d’entrée dans Paramètres Windows → Système → Son.",
    network: "Le service de dictée de Chrome est inaccessible. Vérifie ta connexion Internet.",
    timeout: "Chrome n’a pas démarré la capture du micro. Vérifie le micro sélectionné dans les paramètres de Chrome.",
  } : {
    denied: "Microphone blocked. In Chrome site settings, set Microphone to Allow.",
    missing: "Chrome could not open a microphone. Check the input device in Windows Settings → System → Sound.",
    network: "Chrome’s speech recognition service is unavailable. Check your internet connection.",
    timeout: "Chrome did not start audio capture. Check the selected microphone in Chrome settings.",
  };
  target.textContent = (denied ? messages.denied : missing ? messages.missing : messages[reason]) || copy().micFailure;
}

async function prepareMicrophone() {
  const id = ++microphoneSetup;
  $("camera").disabled = true;
  $("start").disabled = true;
  $("cameraStatus").textContent = lang === "fr" ? "Autorise le micro dans Chrome…" : "Allow microphone access in Chrome…";
  try {
    const input = await navigator.mediaDevices.getUserMedia(microphone);
    input.getTracks().forEach(track => track.stop());
    if (id !== microphoneSetup) return;
    try { localStorage.setItem("innova-auto-v2", "true"); } catch {}
  } catch (error) {
    if (id !== microphoneSetup) return;
    automatic = false;
    updateAutomatic();
    showMicrophoneError(error.name, $("cameraStatus"));
    return;
  } finally {
    if (id === microphoneSetup) {
      $("camera").disabled = false;
      $("start").disabled = false;
    }
  }
  if ($("idle").open && !document.hidden) camera();
  else scheduleListening();
}

function normalizeDictation(text) {
  return text
    .replace(/\bc[ .-]+r[ .-]+x\b/gi, "CRX")
    .replace(/\bu[ .-]+c[ .-]+u\b/gi, "UCU")
    .replace(/\bm[ .-]+r[ .-]+t\b/gi, "MRT")
    .replace(/\bs[ .-]+i[ .-]+t[ .-]+e\b/gi, "SITE")
    .replace(/\b(?:Maurisset|Mauricet|Moricet|Maurice est)\b/gi, "Morisset");
}

async function startListening(auto = false) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const fail = (reason) => {
    if (auto) voiceBlocked = true;
    showMicrophoneError(reason);
  };
  if (!Recognition || recognition || (!auto && (utterance || pending))) {
    if (!Recognition) fail();
    return;
  }
  const active = new Recognition();
  recognition = active;
  if (!utterance && !pending) status("micStarting");
  active.lang = speechLocale;
  active.interimResults = true;
  active.continuous = auto;
  let offset = 0, nextOffset = 0, revision = voiceRevision;
  let committed = voiceDraft, finalized = "", interim = "";
  let endOfSpeech = false, lastSpeechAt = performance.now();
  function updateDraft(includeInterim) {
    voiceDraft = [committed, finalized, includeInterim ? interim : ""].filter(Boolean).join(" ").slice(0, 500);
  }
  active.onspeechstart = () => {
    endOfSpeech = false;
    if (auto) clearTimeout(voiceDraftTimer);
  };
  active.onspeechend = () => {
    endOfSpeech = true;
    if (!auto) return;
    updateDraft(true);
    sendVoiceDraftAfter(lastSpeechAt);
  };
  const startup = setTimeout(() => {
    if (recognition !== active) return;
    stopListening();
    status("ready");
    fail("timeout");
  }, 8000);
  active.onaudiostart = () => {
    clearTimeout(startup);
    if (recognition === active) {
      audioActive = true;
      if (!pending && !utterance) {
        status("listening");
      }
    }
  };
  active.onresult = (event) => {
    clearTimeout(startup);
    if (recognition !== active) return;
    if (auto && $("question").value.trim()) return;
    if (revision !== voiceRevision) {
      offset = nextOffset;
      revision = voiceRevision;
      committed = finalized = interim = "";
    }
    const confirmed = [], partial = [];
    const start = auto ? offset : event.resultIndex || 0;
    const playback = auto && (utterance?.started ? utterance.text :
      recentSpeech?.until > performance.now() ? recentSpeech.text : "");
    let nextIndex = start;
    for (let i = start; i < event.results.length; i++) {
      const result = event.results[i];
      const fragment = result[0].transcript.trim();
      if (resemblesPlayback(fragment, playback, result.isFinal)) {
        if (result.isFinal && i === nextIndex) nextIndex++;
        continue;
      }
      (result.isFinal ? confirmed : partial).push(fragment);
    }
    const text = confirmed.join(" ").trim();
    if (auto) {
      const hypothesis = partial.join(" ").trim();
      const candidate = [text, hypothesis].filter(Boolean).join(" ");
      if (!candidate) {
        offset = nextIndex;
        nextOffset = offset;
        return;
      }
      if (pending || utterance) interruptForSpeech();
      if (candidate !== [finalized, interim].filter(Boolean).join(" ") && !endOfSpeech) {
        lastSpeechAt = performance.now();
      }
      finalized = text;
      interim = hypothesis;
      nextOffset = event.results.length;
      updateDraft(endOfSpeech);
      speechPreview.textContent = normalizeDictation([committed, text, hypothesis].filter(Boolean).join(" "));
      clearTimeout(voiceDraftTimer);
      if (!interim || endOfSpeech) sendVoiceDraftAfter(lastSpeechAt);
    } else {
      speechPreview.textContent = normalizeDictation(partial.join(" ").trim());
      if (text) $("question").value = normalizeDictation(text).slice(0, 500);
    }
  };
  active.onerror = (event) => {
    clearTimeout(startup);
    if (recognition !== active) return;
    if (!["aborted", "no-speech"].includes(event.error)) fail(event.error);
  };
  active.onend = () => {
    clearTimeout(startup);
    if (recognition !== active) return;
    recognition = undefined;
    releaseDictationStream();
    audioActive = false;
    if (auto && revision === voiceRevision) {
      updateDraft(true);
      sendVoiceDraftAfter(lastSpeechAt);
    }
    speechPreview.textContent = auto ? normalizeDictation(voiceDraft) : "";
    if (["listening", "micStarting"].includes(state)) status("ready");
    if (auto) scheduleListening(150);
  };
  try {
    if (!auto) {
      active.start();
      return;
    }
    // Use the processed microphone track for recognition when Chrome supports it.
    const input = await navigator.mediaDevices.getUserMedia(microphone);
    if (recognition !== active) {
      input.getTracks().forEach(track => track.stop());
      return;
    }
    dictationStream = input;
    active.start(input.getAudioTracks()[0]);
  } catch (error) {
    clearTimeout(startup);
    if (recognition !== active) return;
    recognition = undefined;
    releaseDictationStream();
    status("ready");
    fail(error.name);
  }
}

$("mic").onclick = () => {
  voiceBlocked = false;
  if (utterance || pending) {
    interruptForSpeech();
    if (!recognition) startListening(automatic);
    return;
  }
  if (recognition) {
    stopListening();
    if (["listening", "micStarting"].includes(state)) status("ready");
  } else {
    startListening(automatic);
  }
};
$("question").addEventListener("input", () => {
  if (automatic) clearVoiceDraft();
});
$("finish").onclick = finish;
$("reset").onclick = () => { hideSummary(); enterStandby(); };
$("summary").addEventListener("cancel", (event) => { event.preventDefault(); enterStandby(); });
$("standby").onclick = enterStandby;
$("start").onclick = wake;
$("idle").addEventListener("cancel", (event) => { event.preventDefault(); wake(); });
$("camera").onclick = () => {
  automatic = !automatic;
  voiceBlocked = false;
  waitForDeparture = false;
  cameraBackground = undefined;
  updateAutomatic();
  if (automatic) {
    setSound(true);
    prepareMicrophone();
  } else {
    microphoneSetup++;
    try { localStorage.removeItem("innova-auto-v2"); } catch {}
    stopCamera();
    stopListening();
    $("cameraStatus").textContent = "";
  }
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopCamera();
    stopListening();
    if (["listening", "micStarting"].includes(state)) status("ready");
  } else if (automatic) {
    camera();
    scheduleListening();
  }
});
for (const event of ["pointerdown", "keydown"]) document.addEventListener(event, () => {
  if (!$("idle").open && !$("summary").open) touch();
});
locale(speechLocale === "en-CA" ? "en" : "fr");
setSound(sound);
touch();
if (new URLSearchParams(location.search).has("borne")) enterStandby();

$("kiosk-location").addEventListener("innova:settings-open", () => {
  if (pending || utterance) interruptForSpeech();
  stopListening();
  listeningStatus();
});
$("kiosk-location").addEventListener("close", () => scheduleListening());
