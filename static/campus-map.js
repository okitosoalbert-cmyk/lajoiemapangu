import {walkingRoute} from "./pedestrian-route.js";

let pedestrianMap;
const campus = fetch("/static/campus-map.json").then(response => {
  if (!response.ok) throw Error("Campus map unavailable");
  return response.json();
});

// Inverse of the local metre projection used by campus-map.json.
function coordinates([x, y]) {
  const latitude = 45.42185 - y / 111320;
  const longitude = -75.6805 + x / (111320 * Math.cos(45.42185 * Math.PI / 180));
  return latitude.toFixed(6) + "," + longitude.toFixed(6);
}

function photoViews(destination, paths, fr) {
  const location = coordinates(destination);
  let nearest = destination, best = 65 ** 2;
  for (const [points, type] of paths) {
    if (type !== "road") continue;
    for (let i = 1; i < points.length; i++) {
      const [x, y] = points[i - 1];
      const dx = points[i][0] - x, dy = points[i][1] - y;
      const length = dx * dx + dy * dy;
      if (!length) continue;
      const fraction = Math.max(0, Math.min(1, ((destination[0] - x) * dx + (destination[1] - y) * dy) / length));
      const point = [x + fraction * dx, y + fraction * dy];
      const distance = (destination[0] - point[0]) ** 2 + (destination[1] - point[1]) ** 2;
      if (distance < best) {
        nearest = point;
        best = distance;
      }
    }
  }
  const street = new URL("https://www.google.com/maps/@");
  street.search = new URLSearchParams({api: "1", map_action: "pano", viewpoint: coordinates(nearest)});
  if (nearest !== destination) {
    const bearing = Math.atan2(destination[0] - nearest[0], nearest[1] - destination[1]);
    street.searchParams.set("heading", Math.round(bearing * 180 / Math.PI + 360) % 360);
  }
  const views = document.createElement("div");
  views.className = "campus-photo-views";
  const choices = [
    [fr ? "Vue aérienne 3D" : "3D aerial view", "https://earth.google.com/web/@" + location + ",70a,420d,35y,0h,60t,0r"],
    [fr ? "Voir depuis la rue" : "View from the street", street.href],
  ];
  for (const [title, url] of choices) {
    const link = document.createElement("a");
    link.textContent = title;
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    views.append(link);
  }
  const note = document.createElement("small");
  note.textContent = fr ? "S’ouvre dans un autre onglet. Images selon la couverture Google."
    : "Opens in a new tab. Image availability depends on Google coverage.";
  views.append(note);
  return views;
}

export async function showCampusMap(container, destination, lang, originId, kioskId) {
  const labels = lang === "fr"
    ? {title:"Carte 3D du campus", plan:"Vue schématique · CRX comme point de repère", left:"Tourner à gauche", right:"Tourner à droite", closer:"Agrandir", farther:"Réduire", reset:"Vue du campus", fail:"Carte intégrée indisponible. Ouvre la carte officielle dans la réponse."}
    : {title:"3D campus map", plan:"Schematic view · CRX reference point", left:"Rotate left", right:"Rotate right", closer:"Zoom in", farther:"Zoom out", reset:"Campus view", fail:"The embedded map is unavailable. Open the official map in the answer."};
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
    map.append(heading, canvas, controls, photoViews(target.point, data.paths, lang === "fr"), caption);
    container.append(map);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas unavailable");
    const region = target.region || "campus";
    const fr = lang === "fr";
    const area = place => place.region === "north" ? "campus" : place.region || "campus";
    const places = Object.entries(data.places).filter(([, place]) => area(place) === area(target));
    const localOrigin = places.some(([key]) => key === kioskId) ? kioskId : "";
    let originKey = places.some(([key]) => key === originId) ? originId : localOrigin;
    const here = fr ? "Vous êtes ici" : "You are here";
    const departureName = (key, place) => (key === localOrigin ? here + " · " : "") + place[lang];
    const departure = document.createElement("label");
    departure.className = "map-departure";
    departure.textContent = fr ? "Point de départ" : "Starting point";
    const select = document.createElement("select");
    select.add(new Option(fr ? "Choisir un repère" : "Choose a landmark", ""));
    for (const [key, place] of places.sort((a,b) => a[1][lang].localeCompare(b[1][lang], lang))) {
      if (key !== destination || key === localOrigin) select.add(new Option(departureName(key, place) + " (" + place.code + ")", key));
    }

    select.value = originKey;
    departure.append(select);
    const guide = document.createElement("p");
    guide.className = "map-guide";
    guide.setAttribute("aria-live", "polite");
    const share = document.createElement("details");
    share.className = "map-qr";
    const shareTitle = document.createElement("summary");
    shareTitle.textContent = fr ? "Emporter le trajet sur mon téléphone" : "Take the route on my phone";
    const qr = document.createElement("img");
    qr.alt = fr ? "Code QR du trajet Google Maps" : "Google Maps walking route QR code";
    qr.width = qr.height = 160;
    share.append(shareTitle, qr);
    share.addEventListener("toggle", () => {
      if (share.open && originKey && originKey !== destination) {
        qr.src = "/api/route-qr?" + new URLSearchParams({origin:originKey, destination});
      } else qr.removeAttribute("src");
    });
    controls.after(departure, guide, share);
    caption.firstChild.textContent = (fr ? "Maquette du campus · " : "Campus model · ");
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
    const footprint = data.buildings.filter(([, , id]) => id === destination);
    const peak = Math.max(0, ...footprint.map(([, height]) => height));
    const detailRadius = Math.max(14, ...footprint.flatMap(([points]) =>
      points.map(([x, y]) => Math.hypot(x - target.point[0], y - target.point[1]))));
    let angle, tilt, zoom, center, route;
    function focusBuilding() {
      map.dataset.view = "building";
      center = target.point;
      angle = -.55;
      tilt = .66;
      zoom = Math.min(3.4, 110 / Math.max(detailRadius, peak * 1.6));
    }
    focusBuilding();
    pedestrianMap ||= fetch("/static/pedestrian-map.json").then(response => response.ok ? response.json() : null).catch(() => null);
    const graph = await pedestrianMap;
    if (!map.isConnected) return;
    const reference = () => data.places[originKey];
    function focusRoute() {
      map.dataset.view = "route";
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
      share.open = false;
      share.hidden = !start || originKey === destination;
      qr.removeAttribute("src");
      const length = route ? Math.max(10, Math.round(route.metres / 10) * 10) : 0;
      const minutes = Math.max(1, Math.round(length / 75));
      const arrival = (fr ? "Arrivée · " : "Destination · ") + target[lang];
      const directions = fr ? ["nord","nord-est","est","sud-est","sud","sud-ouest","ouest","nord-ouest"]
        : ["north","northeast","east","southeast","south","southwest","west","northwest"];
      let firstStep = "";
      if (route?.path.length > 1) {
        const [x, y] = route.path[0];
        const next = route.path.find(([a, b]) => Math.hypot(a - x, b - y) >= 18);
        if (next) {
          const sector = (Math.round(Math.atan2(next[0] - x, y - next[1]) / (Math.PI / 4)) + 8) % 8;
          firstStep = fr ? " Commence sur le chemin en direction " + directions[sector] + "."
            : " Start along the path heading " + directions[sector] + ".";
        }
      }
      guide.textContent = originKey === destination
        ? here + " · " + target[lang]
        : arrival + (route
        ? (fr ? ` · Environ ${length} m à pied (${minutes} min). Le tracé rejoint les chemins cartographiés près des pavillons.`
              : ` · About ${length} m on foot (${minutes} min). The route connects mapped paths near the buildings.`) + firstStep
        : start ? (fr ? " · Aucun trajet piéton cartographié entre ces repères." : " · No mapped walking route between these landmarks.")
                : (fr ? " · Choisis un point de départ pour voir le trajet." : " · Choose a starting point to see the route."));
      render();
    }
    select.onchange = () => {
      updateRoute();
      focusRoute();
      render();
    };
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
      const ground = ctx.createLinearGradient(0, 0, width, height);
      ground.addColorStop(0, "#f6f2e9");
      ground.addColorStop(1, "#d8e3d8");
      ctx.fillStyle = ground;
      ctx.fillRect(0,0,width,height);
      for (const [points, kind] of data.paths) {
        ctx.beginPath();
        points.forEach((point,i) => {
          const [x,y] = project(point);
          if (i) ctx.lineTo(x,y);
          else ctx.moveTo(x,y);
        });
        ctx.lineWidth = kind === "road" ? Math.max(4, 3 * scale) : Math.max(1.25, scale);
        ctx.strokeStyle = kind === "road" ? "#fffdfb" : "#c5cec1";
        ctx.stroke();
      }
      if (route && map.dataset.view !== "building") {
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
      const frontDepth = ([points]) => Math.max(...points.map(depth));
      visible.sort((a,b) => frontDepth(a) - frontDepth(b));
      if (tilt !== 1) {
        for (const [border, z, id] of visible) {
          const offset = z * .55;
          polygon(border.map(([x, y]) => project([x + offset, y + offset])),
            id === destination ? "#65334038" : "#344c4926");
        }
      }
      for (const [border, z, id] of visible) {
        const active = id === destination;
        const lower = border.map(point => project(point)), upper = border.map(point => project(point,z));
        if (tilt !== 1) {
          const faces = border.map((_, i) => i);
          faces.sort((a,b) => depth(border[a]) - depth(border[b]));
          for (const i of faces) {
            const next = (i + 1) % border.length;
            const dx = upper[next][0] - upper[i][0], dy = upper[next][1] - upper[i][1];
            const shade = Math.round(7 * dy / (Math.hypot(dx, dy) || 1));
            const fill = active ? `hsl(342 44% ${44 + shade}%)` : `hsl(152 8% ${71 + shade}%)`;
            polygon([lower[i], lower[next], upper[next], upper[i]], fill,
              active ? "#6f2c4533" : "#50635c20");
          }
        }
        polygon(upper, active ? "#b9627f" : id ? "#e8ded3" : "#e4e9e1", active ? "#812a4b" : "#a8b1a8");
      }
      function marker(point, title, color, elevation = 18) {
        const [x,y] = project(point, elevation);
        ctx.font = "bold 12px system-ui";
        const labelWidth = ctx.measureText(title).width + 20;
        if (x < 0 || x > width || y < 8 || y > height) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x - labelWidth / 2, y - 24, labelWidth, 21, 6);
        ctx.fill();
        polygon([[x-4,y-3],[x+4,y-3],[x,y+4]], color);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(title,x,y-9);
      }
      const key = reference();
      if (key && originKey !== destination && map.dataset.view !== "building") {
        marker(key.point, (originKey === localOrigin ? here + " · " : fr ? "Départ · " : "Start · ") + key.code, "#245c5b");
      }
      marker(target.point, (localOrigin === destination ? here + " · " : fr ? "Arrivée · " : "Destination · ") + target.code, "#721538", peak + 8);

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
    addButton("+", labels.closer, () => { zoom = Math.min(zoom * 1.3, 4.5); });
    addButton("−", labels.farther, () => { zoom = Math.max(zoom / 1.3, .35); });
    addButton(fr ? "Pavillon" : "Building", fr ? "Recentrer sur le pavillon" : "Center on the building", focusBuilding);
    addButton(fr ? "Trajet" : "Route", fr ? "Afficher le trajet" : "Show walking route", focusRoute);
    addButton(labels.reset, labels.reset, () => {
      map.dataset.view = "campus";
      center = data.regions?.[region] || data.center;
      zoom = .38;
    });
    addButton(fr ? "Vue 2D / 3D" : "2D / 3D view", fr ? "Basculer entre 2D et 3D" : "Switch between 2D and 3D", () => {
      tilt = tilt === 1 ? .66 : 1;
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
