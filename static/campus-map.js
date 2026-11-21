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
    const mainCampus = region === "campus" || region === "north";
    const reference = data.places[originId] || (mainCampus ? data.places.crx : target);
    const area = place => (place.region === "north" ? "campus" : place.region || "campus");
    const sameArea = area(reference) === area(target);
    const origin = sameArea ? reference.point : target.point;
    if (originId && sameArea) {
      caption.firstChild.textContent = (lang === "fr" ? "Départ " : "Start ") + reference.code + " · ";
    } else if (!mainCampus || !sameArea) {
      caption.firstChild.textContent = (lang === "fr" ? "Vue du secteur" : "Area view") + " · ";
    }
    const routeCenter = origin.map((value, i) => (value + target.point[i]) / 2);
    const separation = Math.hypot(target.point[0] - origin[0], target.point[1] - origin[1]);
    const focusZoom = Math.min(1, 240 / Math.max(1, separation));
    let angle = -.35, zoom = focusZoom, center = routeCenter;
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
        height * .55 + (depth([x,y]) * .57 - z * .82) * scale,
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
      if (sameArea && target !== reference) marker(origin, reference.code, "#245c5b");
      marker(target.point, target.code, "#721538");

      const [nx, ny] = [width-24, 30];
      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(Math.atan2(sin, .57 * cos));
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
    addButton(labels.focus, labels.focus, () => { center = routeCenter; zoom = focusZoom; });
    render();
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
