const $ = (id) => document.getElementById(id);
const translations = {
  fr: {
    campus: "UNIVERSITÉ D’OTTAWA", finish: "Terminer", eyebrow: "GUIDE DU CAMPUS", heading: "Bonjour, je suis Innova.",
    description: "Un pavillon à trouver, un service à découvrir ? Posez-moi votre question sur le campus de l’Université d’Ottawa.",
    suggest: "PAR OÙ COMMENCER ?", map: "Se repérer", mapNote: "Pavillons et carte", library: "Bibliothèque", libraryNote: "Trouver Morisset",
    food: "Où manger", foodNote: "Cafés et restaurants", services: "Vie étudiante", servicesNote: "Services et activités",
    privacy: "Sur cette borne, votre conversation s’efface à la fin de la session.", prototype: "PROTOTYPE U-GUIDE", standby: "Mode borne",
    officialMap: "Carte officielle du campus", recap: "Récapitulatif", reset: "Nouvelle session", camera: "Activer la détection de présence",
    placeholder: "Écrivez votre question…", send: "Envoyer", mic: "Dicter la question", keyboard: "Clavier tactile", sound: "Activer la voix",
    mute: "Couper la voix", ready: "Prêt à vous aider", working: "Recherche en cours…", listening: "Je vous écoute…", speaking: "Gee-Gee parle…",
    failure: "La réponse est indisponible. Réessayez dans un instant.", micFailure: "La dictée est indisponible. Vous pouvez écrire la question.",
    verified: "Vérifié le", source: "Source officielle", route: "Itinéraire", scan: "Scannez pour emporter vos réponses vérifiées. Lien utilisable une fois, pendant 15 minutes.",
    noQr: "Aucune réponse vérifiée à emporter.", qrWait: "Préparation du code QR…", qrFailure: "Le code QR est indisponible.",
    waiting: "Détection active. Placez-vous devant la borne.", cameraFailure: "La détection est indisponible. Touchez l’écran pour commencer.",
    topics: {map: "Où se trouve le pavillon SITE ?", library: "Où se trouve la bibliothèque Morisset ?", food: "Où manger sur le campus ?", services: "Quels sont les services étudiants ?"},
  },
  en: {
    campus: "UNIVERSITY OF OTTAWA", finish: "End session", eyebrow: "CAMPUS GUIDE", heading: "Hi, I’m Innova.",
    description: "Looking for a building or a service? Ask me about the University of Ottawa campus.",
    suggest: "WHERE TO START?", map: "Find your way", mapNote: "Buildings and maps", library: "Library", libraryNote: "Find Morisset",
    food: "Where to eat", foodNote: "Cafés and restaurants", services: "Student life", servicesNote: "Services and activities",
    privacy: "Your conversation clears from this kiosk when the session ends.", prototype: "U-GUIDE PROTOTYPE", standby: "Kiosk mode",
    officialMap: "Official campus map", recap: "Your recap", reset: "New session", camera: "Enable presence detection",
    placeholder: "Type your question…", send: "Send", mic: "Dictate question", keyboard: "Touch keyboard", sound: "Enable speech",
    mute: "Mute speech", ready: "Ready to help", working: "Looking that up…", listening: "Listening…", speaking: "Gee-Gee is speaking…",
    failure: "The answer is unavailable. Please try again shortly.", micFailure: "Dictation is unavailable. You can type your question.",
    verified: "Verified on", source: "Official source", route: "Directions", scan: "Scan to take your verified answers with you. This link works once, within 15 minutes.",
    noQr: "There are no verified answers to take with you.", qrWait: "Preparing the QR code…", qrFailure: "The QR code is unavailable.",
    waiting: "Detection is active. Stand in front of the kiosk.", cameraFailure: "Presence detection is unavailable. Tap the screen to start.",
    topics: {map: "Where is the SITE building?", library: "Where is Morisset Library?", food: "Where can I eat on campus?", services: "What student services are available?"},
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
let lang = "fr", sound = false, state = "ready", items = [], activity, pending, recognition, stream, detector, session = 0;
let cameraCycle = 0, transferCycle = 0;
const copy = () => translations[lang];
const svg = (name) => '<svg aria-hidden="true" viewBox="0 0 24 24">' + paths[name] + '</svg>';
const speech = window.speechSynthesis;
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
      }
      input.focus();
    };
    keyboard.append(button);
  }
}

function touch() {
  clearTimeout(activity);
  activity = setTimeout(() => enterStandby(), 120000);
}

function bubble(text, user = false) {
  const article = document.createElement("div");
  article.className = user ? "bubble user" : "bubble";
  const p = document.createElement("p");
  p.textContent = text;
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

function say(text, replyLang) {
  if (!sound || !speech) return;
  speech.cancel();
  const current = session;
  const voice = new SpeechSynthesisUtterance(text);
  voice.lang = replyLang === "fr" ? "fr-CA" : "en-CA";
  voice.volume = Number($("volume").value);
  voice.onstart = () => {
    if (current !== session) return;
    status("speaking");
    animate(/speak|talk|parl|mouth/i);
  };
  voice.onend = voice.onerror = () => {
    if (current !== session || state !== "speaking") return;
    status("ready");
    animate(/idle|repos/i);
  };
  speech.speak(voice);
}

async function ask(text) {
  text = text.trim();
  if (!text || pending) return;
  touch();
  recognition?.abort();
  speech?.cancel();
  $("notice").textContent = "";
  $("question").value = "";
  $("suggestions").hidden = true;
  bubble(text, true);
  const controller = new AbortController();
  pending = controller;
  $("send").disabled = true;
  status("working");
  const timeout = setTimeout(() => controller.abort(), 3900);
  try {
    const response = await fetch("/api/ask", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({text, lang}), signal: controller.signal});
    if (!response.ok) throw Error("Request failed");
    const result = await response.json();
    if (pending !== controller) return;
    const words = translations[result.lang];
    const article = bubble(result.text);
    const links = document.createElement("div");
    links.className = "links";
    if (result.source) link(links, result.source, words.source);
    if (result.map) link(links, result.map, words.officialMap);
    if (result.route) link(links, result.route, words.route);
    if (result.verified) {
      const date = document.createElement("span");
      date.className = "source-date";
      date.textContent = words.verified + " " + result.verified;
      links.append(date);
    }
    for (const id of result.options || []) {
      const option = document.createElement("button");
      option.textContent = words[names[id]] || names[id];
      option.onclick = () => ask(option.textContent);
      links.append(option);
    }
    if (links.childNodes.length) article.append(links);
    $("messages").scrollTop = $("messages").scrollHeight;
    if (result.id && !items.includes(result.id)) items.push(result.id);
    mascot?.play("nod");
    say(result.text, result.lang);
  } catch {
    if (pending === controller) $("notice").textContent = copy().failure;
  } finally {
    clearTimeout(timeout);
    if (pending === controller) {
      pending = undefined;
      $("send").disabled = false;
      if (state === "working") status("ready");
    }
  }
}

function clearSession() {
  mascot?.play("");
  session++;
  const controller = pending;
  pending = undefined;
  controller?.abort();
  recognition?.abort();
  speech?.cancel();
  $("send").disabled = false;
  $("messages").replaceChildren();
  $("suggestions").hidden = false;
  $("notice").textContent = "";
  $("question").value = "";
  $("keyboard").hidden = true;
  $("keys").setAttribute("aria-expanded", "false");
  items = [];
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
  stopCamera();
  $("idle").close();
  mascot?.pause(false);
  mascot?.play("wave");
  touch();
  $("question").focus();
  animate(/wave|greet|salut/i);
  say(copy().heading, lang);
}

function enterStandby() {
  mascot?.pause(true);
  clearTimeout(activity);
  hideSummary();
  clearSession();
  $("cameraStatus").textContent = "";
  if (!$("idle").open) $("idle").showModal();
}

async function camera() {
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
    if (!detector) {
      const cdn = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304";
      const { FaceDetector, FilesetResolver } = await import(cdn + "/vision_bundle.mjs");
      const files = await FilesetResolver.forVisionTasks(cdn + "/wasm");
      detector = await FaceDetector.createFromOptions(files, {
        baseOptions: {modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"},
        runningMode: "VIDEO",
      });
    }
    if (cycle !== cameraCycle) return;
    $("cameraStatus").textContent = copy().waiting;
    let consecutive = 0;
    const check = () => {
      if (cycle !== cameraCycle) return;
      try {
        const faces = detector.detectForVideo(video, performance.now()).detections;
        const centered = faces.some(({boundingBox: box}) => box.width > video.videoWidth * 0.20 &&
          Math.abs((box.originX + box.width / 2) / video.videoWidth - 0.5) < 0.22);
        consecutive = centered ? consecutive + 1 : 0;
        if (consecutive >= 4) wake();
        else setTimeout(check, 250);
      } catch {
        stopCamera();
        $("cameraStatus").textContent = copy().cameraFailure;
      }
    };
    check();
  } catch {
    if (cycle === cameraCycle) {
      stopCamera();
      $("cameraStatus").textContent = copy().cameraFailure;
    }
  }
}

$("ask").onsubmit = (event) => { event.preventDefault(); ask($("question").value); };
for (const id of ["fr", "en"]) $(id).onclick = () => locale(id);
for (const node of document.querySelectorAll("[data-icon]")) node.innerHTML = svg(node.dataset.icon);
for (const button of document.querySelectorAll("[data-topic]")) button.onclick = () => ask(copy().topics[button.dataset.topic]);
$("sound").onclick = () => {
  sound = !sound;
  if (!sound) speech?.cancel();
  $("volume").hidden = !sound;
  $("sound").setAttribute("aria-pressed", String(sound));
  locale(lang);
};
$("keys").onclick = () => {
  const keyboard = $("keyboard");
  keyboard.hidden = !keyboard.hidden;
  $("keys").setAttribute("aria-expanded", String(!keyboard.hidden));
};
$("mic").onclick = () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    $("notice").textContent = copy().micFailure;
    return;
  }
  if (recognition) { recognition.stop(); return; }
  speech?.cancel();
  const current = session;
  const active = new Recognition();
  recognition = active;
  active.lang = lang === "fr" ? "fr-CA" : "en-CA";
  active.onstart = () => { if (current === session) status("listening"); };
  active.onresult = (event) => { if (current === session) $("question").value = event.results[0][0].transcript.slice(0, 500); };
  active.onerror = (event) => { if (current === session && event.error !== "aborted") $("notice").textContent = copy().micFailure; };
  active.onend = () => {
    if (recognition === active) recognition = undefined;
    if (current === session && state === "listening") status("ready");
  };
  try { active.start(); } catch { recognition = undefined; $("notice").textContent = copy().micFailure; }
};
$("finish").onclick = finish;
$("reset").onclick = () => { hideSummary(); enterStandby(); };
$("summary").addEventListener("cancel", (event) => { event.preventDefault(); enterStandby(); });
$("standby").onclick = enterStandby;
$("start").onclick = wake;
$("idle").addEventListener("cancel", (event) => { event.preventDefault(); wake(); });
$("camera").onclick = camera;
for (const event of ["pointerdown", "keydown"]) document.addEventListener(event, () => {
  if (!$("idle").open && !$("summary").open) touch();
});
locale("fr");
touch();
if (new URLSearchParams(location.search).has("borne")) enterStandby();
