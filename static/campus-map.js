import {walkingRoute} from "./pedestrian-route.js";

let pedestrianMap;
const campus = fetch("/static/campus-map.json").then(response => {
  if (!response.ok) throw Error("Campus map unavailable");
  return response.json();
});

export async function showCampusMap(container, destination, lang, originId) {
  const labels = lang === "fr"
    ? {title:"Carte 3D du campus", plan:"Vue schématique · CRX comme point de repère", left:"Tourner à gauche", right:"Tourner à droite", closer:"Agrandir", farther:"Réduire", reset:"Vue du campus", focus:"Recentrer", fail:"Carte intégrée indisponible. Ouvre la carte officielle dans la réponse."}
    : {title:"3D campus map", plan:"Schematic view · CRX reference point", left:"Rotate left", right:"Rotate right", closer:"Zoom in", farther:"Zoom out", reset:"Campus view", focus:"Recenter", fail:"The embedded map is unavailable. Open the official map in the answer."};
  try {
    const data = await campus;
    const target = data.places[destination];
    if (!target || !container.isConnected) return;
    const map = document.createElement("section");
    map.className = "campus-map";
    const heading = document.createElement("h3");
    heading.textContent = labels.title + " · " + target[lang];
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", heading.textContent);
    const controls = document.createElement("div");
    controls.className = "campus-controls";
    const caption = document.createElement("div");
    caption.className = "campus-credit";
    const credit = document.createElement("a");
    credit.href = "https://www.openstreetmap.org/copyright";
    credit.target = "_blank";
    credit.rel = "noopener noreferrer";
    credit.textContent = "© OpenStreetMap contributors";
    caption.append(labels.plan + " · ", credit);
    map.append(heading, canvas, controls, caption);
    container.append(map);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas unavailable");
    const region = target.region || "campus";
    const fr = lang === "fr";
    const area = place => place.region === "north" ? "campus" : place.region || "campus";
    const places = Object.entries(data.places).filter(([, place]) => area(place) === area(target));
    let originKey = places.some(([key]) => key === originId) ? originId
      : area(target) === "campus" && destination !== "crx" ? "crx" : "";
    const departure = document.createElement("label");
    departure.className = "map-departure";
    departure.textContent = fr ? "Point de départ" : "Starting point";
    const select = document.createElement("select");
    select.add(new Option(fr ? "Choisir un repère" : "Choose a landmark", ""));
    for (const [key, place] of places.sort((a,b) => a[1][lang].localeCompare(b[1][lang], lang))) {
      if (key !== destination) select.add(new Option(place[lang] + " (" + place.code + ")", key));
    }
    if (originKey === destination) originKey = "";
    select.value = originKey;
    departure.append(select);
    const guide = document.createElement("p");
    guide.className = "map-guide";
    guide.setAttribute("aria-live", "polite");
    heading.after(departure, guide);
    caption.firstChild.textContent = (fr ? "Carte interactive · " : "Interactive map · ");
    const dialog = document.createElement("dialog");
    dialog.className = "campus-dialog";
    dialog.setAttribute("aria-label", heading.textContent);
    map.after(dialog);
    // Keep the dialog nested in the reply so clearing the session also clears it.
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = fr ? "Fermer la carte" : "Close map";
    close.onclick = () => dialog.close();
    dialog.addEventListener("close", () => {
      dialog.before(map);
      render();
    });
    let angle = -.35, tilt = .57, zoom = 1, center = target.point, route;
    pedestrianMap ||= fetch("/static/pedestrian-map.json").then(response => response.ok ? response.json() : null).catch(() => null);
    const graph = await pedestrianMap;
    if (!map.isConnected) return;
    const reference = () => data.places[originKey];
    function focusRoute() {
      const points = [target.point, ...(reference() ? [reference().point] : []), ...(route?.path || [])];
      const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      center = [(minX + maxX) / 2, (minY + maxY) / 2];
      zoom = Math.min(1.15, 200 / Math.max(1, Math.hypot(maxX - minX, maxY - minY)));
    }
    function updateRoute() {
      originKey = select.value;
      route = graph && walkingRoute(graph, originKey, destination);
      const start = reference();
      const length = route ? Math.max(10, Math.round(route.metres / 10) * 10) : 0;
      const minutes = Math.max(1, Math.round(length / 75));
      const arrival = (fr ? "Arrivée · " : "Destination · ") + target[lang];
      guide.textContent = arrival + (route
        ? (fr ? ` · Environ ${length} m à pied (${minutes} min). Le tracé rejoint les chemins cartographiés près des pavillons.`
              : ` · About ${length} m on foot (${minutes} min). The route connects mapped paths near the buildings.`)
        : start ? (fr ? " · Aucun trajet piéton cartographié entre ces repères." : " · No mapped walking route between these landmarks.")
                : (fr ? " · Choisis un point de départ pour voir le trajet." : " · Choose a starting point to see the route."));
      focusRoute();
      render();
    }
    select.onchange = updateRoute;
    function render() {
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height) return;
      const density = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
      ctx.setTransform(density, 0, 0, density, 0, 0);
      const scale = Math.min(width / 330, height / 205) * zoom;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const depth = ([x,y]) => (x - center[0]) * sin + (y - center[1]) * cos;
      const project = ([x,y], z = 0) => [
        width / 2 + ((x - center[0]) * cos - (y - center[1]) * sin) * scale,
        height * .55 + (depth([x,y]) * tilt - z * (tilt === 1 ? 0 : .82)) * scale,
      ];
      function polygon(points, color, stroke) {
        ctx.beginPath();
        points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
      }
      ctx.fillStyle = "#eef1ec";
      ctx.fillRect(0,0,width,height);
      for (const [points, kind] of data.paths) {
        ctx.beginPath();
        points.forEach((point,i) => {
          const [x,y] = project(point);
          if (i) ctx.lineTo(x,y);
          else ctx.moveTo(x,y);
        });
        ctx.lineWidth = kind === "road" ? 4 : 1.25;
        ctx.strokeStyle = kind === "road" ? "#fffdfb" : "#c5cec1";
        ctx.stroke();
      }
      if (route) {
        ctx.beginPath();
        route.path.forEach((point, index) => {
          const [x, y] = project(point);
          if (index) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 9;
        ctx.stroke();
        ctx.strokeStyle = "#047981";
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      ctx.lineWidth = .7;
      const visible = data.buildings.filter(([points]) =>
        points.some(point => Math.hypot(point[0] - center[0], point[1] - center[1]) < 540 / zoom));
      visible.sort((a,b) => depth(a[0][0]) - depth(b[0][0]));
      for (const [border, z, id] of visible) {
        const active = id === destination;
        const lower = border.map(point => project(point)), upper = border.map(point => project(point,z));
        for (let i = 0; i < border.length; i++) {
          const next = (i + 1) % border.length;
          polygon([lower[i], lower[next], upper[next], upper[i]], active ? "#77163a" : "#a1a9ab");
        }
        polygon(upper, active ? "#ae315b" : id ? "#d8c3ce" : "#cdd2d0", active ? "#77163a" : "#a6afaa");
      }
      function marker(point, title, color) {
        const [x,y] = project(point, 34);
        ctx.font = "bold 12px system-ui";
        const labelWidth = ctx.measureText(title).width + 20;
        if (x < 0 || x > width || y < 8 || y > height) return;
        ctx.fillStyle = color;
        ctx.fillRect(x - labelWidth / 2, y - 24, labelWidth, 21);
        polygon([[x-4,y-3],[x+4,y-3],[x,y+4]], color);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(title,x,y-9);
      }
      const key = reference();
      if (key) marker(key.point, (fr ? "Départ · " : "Start · ") + key.code, "#245c5b");
      marker(target.point, (fr ? "Arrivée · " : "Destination · ") + target.code, "#721538");

      const [nx, ny] = [width-24, 30];
      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(Math.atan2(sin, tilt * cos));
      polygon([[0,-12],[-4,2],[0,0],[4,2]], "#334754");
      ctx.restore();
      ctx.fillStyle = "#334754";
      ctx.textAlign = "center";
      ctx.font = "bold 10px system-ui";
      ctx.fillText("N", nx, ny + 15);
    }
    function addButton(text, label, handler) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.title = label;
      button.setAttribute("aria-label", label);
      button.onclick = () => { handler(); render(); };
      controls.append(button);
    }
    addButton("↶", labels.left, () => { angle -= .28; });
    addButton("↷", labels.right, () => { angle += .28; });
    addButton("+", labels.closer, () => { zoom = Math.min(zoom * 1.3, 2.5); });
    addButton("−", labels.farther, () => { zoom = Math.max(zoom / 1.3, .35); });
    addButton(labels.reset, labels.reset, () => { center = data.regions?.[region] || data.center; zoom = .38; });
    addButton(labels.focus, labels.focus, focusRoute);
    addButton(fr ? "Vue 2D / 3D" : "2D / 3D view", fr ? "Basculer entre 2D et 3D" : "Switch between 2D and 3D", () => {
      tilt = tilt === 1 ? .57 : 1;
      angle = tilt === 1 ? 0 : -.35;
    });
    addButton(fr ? "Agrandir la carte" : "Expand map", fr ? "Agrandir la carte" : "Expand map", () => {
      if (dialog.open) { dialog.close(); return; }
      dialog.replaceChildren(close, map);
      dialog.showModal();
      close.focus();
    });
    let drag;
    canvas.addEventListener("pointerdown", event => {
      canvas.setPointerCapture(event.pointerId);
      drag = [event.clientX, event.clientY];
    });
    canvas.addEventListener("pointermove", event => {
      if (!drag) return;
      const scale = Math.min(canvas.clientWidth / 330, canvas.clientHeight / 205) * zoom;
      const dx = (event.clientX - drag[0]) / scale;
      const dy = (event.clientY - drag[1]) / (scale * tilt);
      center = [center[0] - dx * Math.cos(angle) - dy * Math.sin(angle),
                center[1] + dx * Math.sin(angle) - dy * Math.cos(angle)];
      drag = [event.clientX, event.clientY];
      render();
    });
    canvas.addEventListener("lostpointercapture", () => { drag = null; });
    updateRoute();
    const observer = new ResizeObserver(() => {
      if (canvas.isConnected) render();
      else observer.disconnect();
    });
    observer.observe(canvas);
  } catch {
    if (!container.isConnected) return;
    const hint = document.createElement("p");
    hint.textContent = labels.fail;
    container.append(hint);
  }
}
