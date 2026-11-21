import {showCampusMap} from "./campus-map.js";

const byId = id => document.getElementById(id);
const dialog = byId("kiosk-location");
const detect = byId("location-detect");
const select = byId("location-building");
const status = byId("location-status");
const preview = byId("location-preview");
const save = byId("location-save");
const dismiss = byId("location-close");
const settings = [...document.querySelectorAll("[data-location-settings]")];
const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
let places, selectionCycle = 0;
const text = (fr, en) => document.documentElement.lang === "en" ? en : fr;

function renderLabels() {
  const title = text("Emplacement de la borne", "Kiosk location");
  settings.forEach(button => { button.textContent = title; });
  byId("location-heading").textContent = title;
  detect.textContent = text("Détecter l’emplacement", "Detect location");
  dialog.querySelector("label").textContent = text("Pavillon où se trouve la borne", "Building where the kiosk is installed");
  save.textContent = text("Confirmer le pavillon", "Confirm building");
  dismiss.textContent = text("Fermer", "Close");
}

function previewSelection() {
  const container = document.createElement("div");
  preview.replaceChildren(container);
  if (places?.[select.value]) showCampusMap(container, select.value, document.documentElement.lang);
}

async function openSettings() {
  if (dialog.open) return;
  renderLabels();
  status.textContent = "";
  preview.replaceChildren();
  select.disabled = save.disabled = detect.disabled = true;
  dialog.showModal();
  dialog.dispatchEvent(new Event("innova:settings-open"));
  try {
    if (!places) {
      const response = await fetch("/static/campus-map.json");
      if (!response.ok) throw Error("Map unavailable");
      places = (await response.json()).places;
    }
    if (!dialog.open) return;
    const lang = document.documentElement.lang;
    select.replaceChildren(new Option(text("Choisir un pavillon", "Choose a building"), ""));
    const entries = Object.entries(places).sort((a, b) => a[1][lang].localeCompare(b[1][lang], lang));
    for (const [id, place] of entries) select.add(new Option(place[lang] + " (" + place.code + ")", id));
    select.value = document.body.dataset.kioskOrigin || "";
    select.disabled = save.disabled = detect.disabled = false;
    previewSelection();
  } catch {
    status.textContent = text("La liste des pavillons est indisponible.", "The building list is unavailable.");
  }
}

function nearestBuilding({latitude, longitude, accuracy}) {
  const x = (longitude + 75.6805) * 111320 * Math.cos(45.42185 * Math.PI / 180);
  const y = (45.42185 - latitude) * 111320;
  let result, distance = Infinity;
  for (const [key, {point}] of Object.entries(places)) {
    const metres = Math.hypot(point[0] - x, point[1] - y);
    if (metres < distance) { result = key; distance = metres; }
  }
  return Number.isFinite(accuracy) && accuracy <= 100 && distance <= 150 ? result : undefined;
}

detect.onclick = () => {
  if (!navigator.geolocation) {
    status.textContent = text("La localisation est indisponible. Choisis un pavillon.", "Location is unavailable. Choose a building.");
    return;
  }
  const cycle = ++selectionCycle;
  detect.disabled = true;
  status.textContent = text("Recherche de l’emplacement…", "Detecting location…");
  const finish = result => {
    if (cycle !== selectionCycle || !dialog.open) return;
    detect.disabled = false;
    if (!result) {
      status.textContent = text("Aucun pavillon fiable détecté. Choisis-le dans la liste.", "No reliable building match. Choose one from the list.");
      return;
    }
    select.value = result;
    const name = places[result][document.documentElement.lang];
    status.textContent = text(`Pavillon proposé · ${name}. Vérifie puis confirme.`, `Suggested building · ${name}. Check it, then confirm.`);
    previewSelection();
  };
  navigator.geolocation.getCurrentPosition(
    ({coords}) => finish(nearestBuilding(coords)), () => finish(),
    {enableHighAccuracy: true, timeout: 10000, maximumAge: 0}
  );
};

select.onchange = () => {
  selectionCycle++;
  detect.disabled = false;
  status.textContent = "";
  previewSelection();
};
dialog.querySelector("form").onsubmit = async event => {
  event.preventDefault();
  if (!places?.[select.value]) return;
  const building = select.value;
  selectionCycle++;
  save.disabled = select.disabled = detect.disabled = dismiss.disabled = true;
  try {
    const response = await fetch("/api/kiosk-location", {
      method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({building}),
    });
    if (!response.ok) throw Error("Save failed");
    document.body.dataset.kioskOrigin = (await response.json()).building;
    dialog.close();
  } catch {
    status.textContent = text("Impossible d’enregistrer le pavillon. Réessaie.", "Could not save the building. Try again.");
  } finally {
    save.disabled = select.disabled = detect.disabled = dismiss.disabled = false;
  }
};
dialog.addEventListener("close", () => { selectionCycle++; preview.replaceChildren(); });
dialog.addEventListener("cancel", event => { if (dismiss.disabled) event.preventDefault(); });
dismiss.onclick = () => dialog.close();
settings.forEach(button => {
  button.hidden = !local;
  button.onclick = openSettings;
});
renderLabels();
new MutationObserver(renderLabels).observe(document.documentElement, {attributeFilter: ["lang"]});
if (local && new URLSearchParams(location.search).has("borne") && !document.body.dataset.kioskOrigin) {
  openSettings();
}
