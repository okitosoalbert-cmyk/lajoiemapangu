const campus = fetch("/static/campus-map.json").then(response => {
  if (!response.ok) throw Error("Campus map unavailable");
  return response.json();
});

export async function showCampusMap(container, destination, lang) {
  const labels = lang === "fr"
    ? {title:"Carte 3D du campus", plan:"Vue schématique · bâtiments en relief", left:"Tourner à gauche", right:"Tourner à droite", closer:"Agrandir", farther:"Réduire", reset:"Vue du campus", focus:"Recentrer", fail:"Carte intégrée indisponible. Ouvre la carte officielle dans la réponse."}
    : {title:"3D campus map", plan:"Schematic view · raised building footprints", left:"Rotate left", right:"Rotate right", closer:"Zoom in", farther:"Zoom out", reset:"Campus view", focus:"Recenter", fail:"The embedded map is unavailable. Open the official map in the answer."};
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
    let angle = -.35, zoom = 1, center = target.point;
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
      const [x,y] = project(target.point, 34);
      ctx.font = "bold 12px system-ui";
      const title = target.code;
      const labelWidth = ctx.measureText(title).width + 22;
      if (x > -10 && x < width + 10 && y > 10 && y < height) {
        ctx.fillStyle = "#721538";
        ctx.fillRect(x - labelWidth / 2, y - 24, labelWidth, 21);
        polygon([[x-4,y-3],[x+4,y-3],[x,y+4]], "#721538");
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(title,x,y-9);
      }
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
    addButton(labels.reset, labels.reset, () => { center = data.center; zoom = .38; });
    addButton(labels.focus, labels.focus, () => { center = target.point; zoom = 1; });
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
