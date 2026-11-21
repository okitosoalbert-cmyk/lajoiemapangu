// Draw an articulated, 2D Gee-Gee from a small set of shapes.
window.createMascot = function (panel) {
  const canvas = panel.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const palette = {
    outline: "#312331", grey: "#9d9aa8", light: "#c2bec9", muzzle: "#aaa5b3",
    wine: "#841c43", darkWine: "#56142f", red: "#d74d68", white: "#fff2f6",
  };
  let frame, start = 0, last = 0, speechStart = 0;
  let gesture = "", speaking = false, paused = false;
  canvas.width = canvas.height = 600;
  canvas.setAttribute("aria-hidden", "true");

  function ellipse(x, y, rx, ry, color, border = false) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (border) ctx.stroke();
  }

  function shape(color, trace, border = true) {
    ctx.beginPath();
    trace();
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (border) ctx.stroke();
  }

  function arm(side, angle) {
    ctx.save();
    ctx.translate(side * 43, -19);
    ctx.scale(side, 1);
    ctx.rotate(angle);
    shape(palette.wine, () => {
      ctx.moveTo(-8, -14);
      ctx.quadraticCurveTo(23, -25, 46, -19);
      ctx.lineTo(49, 6);
      ctx.quadraticCurveTo(28, 14, -6, 16);
    });
    ellipse(51, -8, 13, 14, palette.red, true);
    ctx.restore();
  }

  function head(angle, blink, mouth) {
    ctx.save();
    ctx.translate(0, -56);
    ctx.rotate(angle);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      shape(palette.grey, () => {
        ctx.moveTo(18, -42);
        ctx.quadraticCurveTo(18, -76, 44, -82);
        ctx.quadraticCurveTo(47, -52, 33, -38);
      });
      shape("#d18c9d", () => {
        ctx.moveTo(28, -51);
        ctx.quadraticCurveTo(30, -66, 39, -72);
        ctx.quadraticCurveTo(38, -56, 33, -49);
      }, false);
      ctx.restore();
    }
    shape(palette.grey, () => {
      ctx.moveTo(0, -66);
      ctx.bezierCurveTo(47, -68, 56, -34, 43, 9);
      ctx.bezierCurveTo(40, 42, 24, 53, 0, 53);
      ctx.bezierCurveTo(-27, 53, -45, 37, -47, 7);
      ctx.bezierCurveTo(-59, -36, -42, -67, 0, -66);
    });
    for (const [x, y, r] of [[-25,-59,15],[-12,-69,16],[4,-72,17],[21,-65,16],[34,-55,12]]) {
      ellipse(x, y, r, r, palette.red, true);
    }
    ellipse(0, 24, 37, 25, palette.muzzle, true);
    for (const side of [-1, 1]) {
      ellipse(side * 20, -21, 10, Math.max(1.5, 13 * (1 - blink)), palette.white, true);
      if (blink < .65) {
        ellipse(side * 20 + 2, -20, 4.5, 6, palette.outline);
        ellipse(side * 20 + 3, -22, 1.5, 2, "white");
      }
      ellipse(side * 15, 19, 4, 3, palette.outline);
    }
    if (mouth > .12) {
      ellipse(0, 34, 13, 2 + 7 * mouth, palette.outline);
      if (mouth > .40) ellipse(0, 37, 7, 2 * mouth, "#e8899c");
    } else {
      ctx.beginPath();
      ctx.moveTo(-12, 30);
      ctx.quadraticCurveTo(0, 40, 12, 30);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(time, animate) {
    const t = animate ? time / 1000 : 0;
    const age = (time - start) / 1000;
    const envelope = (duration) => age >= 0 && age < duration ? Math.sin(Math.PI * age / duration) : 0;
    const wave = animate && gesture === "wave" ? envelope(1.65) : 0;
    const nod = animate && gesture === "nod" ? envelope(.8) : 0;
    const mouth = animate && speaking ? .15 + .85 * (.5 + .5 * Math.sin((time - speechStart) / 42)) : 0;
    const blink = animate ? Math.max(0, 1 - Math.abs(time % 4200 - 4000) / 90) : 0;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 300, 300);
    ellipse(150, 273, 68, 10, "#210b2266");
    ctx.translate(150, 187 + Math.sin(t * 2) * 1.6);
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 3;
    ctx.lineJoin = ctx.lineCap = "round";
    arm(-1, .68);
    arm(1, .70 + wave * (-1.55 + Math.sin(age * 24) * .50));
    for (const side of [-1, 1]) {
      ellipse(side * 22, 55, 15, 24, palette.grey, true);
      ellipse(side * 23, 74, 21, 12, palette.red, true);
    }
    shape(palette.wine, () => {
      ctx.moveTo(-40, -37);
      ctx.quadraticCurveTo(0, -49, 40, -37);
      ctx.quadraticCurveTo(52, -4, 39, 39);
      ctx.quadraticCurveTo(0, 51, -39, 39);
      ctx.quadraticCurveTo(-53, -4, -40, -37);
    });
    shape(palette.darkWine, () => {
      ctx.moveTo(-41, 27);
      ctx.quadraticCurveTo(0, 37, 41, 27);
      ctx.lineTo(39, 39);
      ctx.quadraticCurveTo(0, 50, -39, 39);
    }, false);
    ctx.fillStyle = palette.white;
    ctx.font = "bold 24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("GG", 0, 19);
    head(Math.sin(t * 1.7) * .03 + wave * -.08 + nod * .16, blink, mouth);
  }

  function tick(time) {
    if (time - last >= 30) {
      last = time;
      draw(time, true);
    }
    frame = requestAnimationFrame(tick);
  }

  function refresh() {
    cancelAnimationFrame(frame);
    const active = !paused && !motion.matches && !document.hidden && !panel.classList.contains("loaded");
    draw(performance.now(), active);
    if (active) frame = requestAnimationFrame(tick);
  }

  panel.classList.add("illustrated");
  motion.addEventListener("change", refresh);
  document.addEventListener("visibilitychange", refresh);
  refresh();

  return {
    play(name) {
      gesture = name;
      start = performance.now();
      panel.dataset.gesture = name || "idle";
    },
    speak(active) {
      if (active && !speaking) speechStart = performance.now();
      speaking = active;
      panel.dataset.speaking = String(active);
    },
    pause(value) { paused = value; refresh(); },
  };
};
