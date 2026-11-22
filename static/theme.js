(() => {
  const key = "innova-theme";
  const choices = ["auto", "light", "dark"];
  const clock = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Toronto", hour:"2-digit", hourCycle:"h23"});
  let preference = "auto";
  try {
    const saved = localStorage.getItem(key);
    if (choices.includes(saved)) preference = saved;
  } catch {}

  function apply() {
    const hour = Number(clock.format(new Date()));
    document.documentElement.dataset.theme =
      preference === "dark" || (preference === "auto" && (hour >= 18 || hour < 6)) ? "dark" : "light";
  }
  apply();
  setInterval(apply, 15000);
  document.addEventListener("visibilitychange", apply);
  document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("theme-setting");
    function labels() {
      const fr = document.documentElement.lang !== "en";
      select.setAttribute("aria-label", fr ? "Apparence" : "Appearance");
      const names = fr ? ["Auto", "Clair", "Sombre"] : ["Auto", "Light", "Dark"];
      select.replaceChildren(...choices.map((value, index) => new Option(names[index], value)));
      select.value = preference;
    }
    select.onchange = () => {
      preference = select.value;
      try { localStorage.setItem(key, preference); } catch {}
      apply();
    };
    new MutationObserver(labels).observe(document.documentElement, {attributeFilter:["lang"]});
    labels();
  });
})();
