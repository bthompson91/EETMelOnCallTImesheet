"use strict";
(() => {
  const version = "0.5.5";
  const page = new URL(location.href);
  const refreshKey = page.searchParams.get("_refresh");
  const assetKey = version + (refreshKey ? "-" + refreshKey : "");
  const sheet = document.querySelector('link[rel="stylesheet"]');
  sheet.href = "styles.css?v=" + encodeURIComponent(assetKey);

  const refresh = document.getElementById("refresh");
  refresh.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const formOpen = ["startPage", "finishPage", "editPage"].some(id => !document.getElementById(id).classList.contains("hidden"));
    if (formOpen && !confirm("Reload the app? Unsaved form changes will be lost. Saved entries and any running call will be kept.")) return;
    const target = new URL(location.href);
    target.searchParams.set("_refresh", Date.now().toString());
    location.replace(target.href);
  }, true);

  function load(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = path + "?v=" + encodeURIComponent(assetKey);
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load " + path + ". Check your connection and tap refresh."));
      document.body.append(script);
    });
  }
  load("app.js").then(() => load("drive-fix.js")).catch(error => {
    const box = document.getElementById("error");
    box.textContent = error.message;
    box.classList.remove("hidden");
  });
})();
