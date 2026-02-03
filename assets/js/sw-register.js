if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${document.body?.dataset?.root || ""}sw.js`).catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}
