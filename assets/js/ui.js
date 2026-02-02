// PATHWORKS UI Library behaviors (progressive enhancement)
import { $, $$, throttle, clamp } from "./core.js";

function initActiveNav(){
  const path = window.location.pathname.replace(/\/+$/,"");
  for (const a of $$(".navLink")){
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("http")) continue;
    const target = new URL(href, window.location.origin).pathname.replace(/\/+$/,"");
    if (target === path) a.setAttribute("aria-current","page");
  }
}

function initDrawer(){
  const mask = $("#drawerMask");
  const drawer = $("#drawer");
  const btn = $("#navMobileBtn");
  const close = $("#drawerClose");

  const setOpen = (open) => {
    const v = open ? "1" : "0";
    if (mask) mask.dataset.open = v;
    if (drawer) drawer.dataset.open = v;
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (!open && btn) btn.focus();
  };

  const toggle = () => setOpen(!(drawer && drawer.dataset.open === "1"));

  if (btn) btn.addEventListener("click", toggle);
  if (mask) mask.addEventListener("click", () => setOpen(false));
  if (close) close.addEventListener("click", () => setOpen(false));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer && drawer.dataset.open === "1") setOpen(false);
  });

  // close on navigation
  for (const link of $$("#drawer a")){
    link.addEventListener("click", () => setOpen(false));
  }
}

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
  initActiveNav();
  initDrawer();
  initScrollRails();
  initMediaModal();
}
