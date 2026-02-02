// PATHWORKS UI Library behaviors (progressive enhancement)
import { $, $$, throttle } from "./core.js";

function initScrollRails(){
  const rails = $$(".scrollRail");
  const update = (rail) => {
    const vp = rail.querySelector(".scrollRailViewport");
    if (!vp) return;

    const canLeft = vp.scrollLeft > 2;
    const canRight = vp.scrollLeft < (vp.scrollWidth - vp.clientWidth - 2);
    rail.dataset.canLeft = canLeft ? "1" : "0";
    rail.dataset.canRight = canRight ? "1" : "0";
  };

  for (const rail of rails){
    const vp = rail.querySelector(".scrollRailViewport");
    if (!vp) continue;

    const onScroll = throttle(() => update(rail), 66);
    vp.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => update(rail));
    ro.observe(vp);

    update(rail);
  }
}

function initMediaModal(){
  const dialog = $("#mediaDialog");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const img = $("#mediaDialogImg");
  const title = $("#mediaDialogTitle");
  const close = $("#mediaDialogClose");

  const open = (src, alt) => {
    if (img) img.src = src;
    if (img) img.alt = alt || "";
    if (title) title.textContent = alt || "Media";
    dialog.showModal();
  };

  if (close) close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    const rect = dialog.getBoundingClientRect();
    const inDialog = (
      rect.top <= e.clientY && e.clientY <= rect.bottom &&
      rect.left <= e.clientX && e.clientX <= rect.right
    );
    if (!inDialog) dialog.close();
  });

  for (const btn of $$("[data-open-media]")){
    btn.addEventListener("click", () => {
      const src = btn.getAttribute("data-src");
      const alt = btn.getAttribute("data-alt") || "";
      if (src) open(src, alt);
    });
  }
}

export function initUi(){
  initScrollRails();
  initMediaModal();
}
