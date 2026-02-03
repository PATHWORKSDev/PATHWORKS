import { $, el, readJson, qsParam } from "../core.js";
import { initUi } from "../ui.js";

let cleanupFns = [];

function resolvePath(root, path){
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  return `${root}${path}`;
}

function toAbs(path){
  if (!path) return "";
  try{
    return new URL(path, window.location.href).href;
  }catch{
    return path;
  }
}

function gameAsset(root, id, keyword, ext){
  if (!id) return "";
  return `${root}assets/data/games-data/${id}/${keyword}.${ext}`;
}

function getScrollRoot(){
  return document.getElementById("page-root") || document.scrollingElement || document.documentElement;
}

function setImgSources(img, sources){
  if (!img) return;
  const list = (Array.isArray(sources) ? sources : [sources]).filter(Boolean);
  if (list.length === 0) return;
  let idx = 0;
  img.dataset.srcIdx = "0";
  img.onerror = () => {
    idx += 1;
    if (idx < list.length){
      img.dataset.srcIdx = String(idx);
      img.src = list[idx];
    }
  };
  img.src = list[0];
}

function setHeroBgImage(sources){
  const img = document.querySelector(".heroBgImg");
  setImgSources(img, sources);
}

function setHeroTitleImage(url, alt, fallback, scale){
  const img = document.getElementById("gameTitleImg");
  if (!img || !url) return;
  img.src = url;
  if (fallback) img.onerror = () => { img.src = fallback; };
  if (typeof alt === "string") img.alt = alt;
  if (Number.isFinite(scale) && scale > 0){
    img.style.setProperty("--title-scale", String(scale));
  }else{
    img.style.removeProperty("--title-scale");
  }
}

async function loadBodyHtml(root, id){
  const target = $("#gameBodyContainer");
  if (!target || !id) return;
  const path = `${root}assets/data/games-data/${id}/body.html`;
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok){
    target.innerHTML = "<p>Missing game body content.</p>";
    return;
  }
  const html = await res.text();
  target.innerHTML = html;
}

export function cleanupGamePage(){
  for (const fn of cleanupFns) fn();
  cleanupFns = [];
}

export async function initGamePage(){
  cleanupGamePage();
  try{
    initUi();

    const root = document.body?.dataset?.root || "";
    const id = qsParam("id") || "";
    const games = await readJson(new URL("../../data/games.json", import.meta.url));
    const game = games.find(g => String(g.id) === String(id));

    if (!game){
      document.title = `Game not found — PATHWORKS`;
      $("#gameTitle")?.replaceChildren(document.createTextNode("Game not found"));

      const body = $("#gameBodyContainer");
      if (body){
        body.innerHTML = "";
        body.appendChild(el("p", {}, ["Missing or invalid game id."]));
        body.appendChild(el("a", { class: "btn btn--sm", href: `${root}index.html` }, ["Back to Our games"]));
      }
      return;
    }

    document.title = `PATHWORKS - ${game.title}`;

    const heroBgWrap = document.querySelector(".heroBgWrap");
    if (heroBgWrap && game?.id) heroBgWrap.setAttribute("data-transition-id", `game-banner:${game.id}`);

    const fallbackBanner = toAbs(`${root}assets/img/placeholders/banner.jpg`);
    const mods = game.modifiers || {};
    const heroOffset = mods.offset?.hero || {};
    const heroFilters = mods.filters?.hero || {};
    const banner = game.banner
      ? resolvePath(root, game.banner)
      : gameAsset(root, game.id, "banner", "png");
    const bannerJpg = gameAsset(root, game.id, "banner", "jpg");
    const bannerPngAbs = toAbs(banner);
    const bannerJpgAbs = toAbs(bannerJpg);
    if (banner) setHeroBgImage([bannerPngAbs, bannerJpgAbs, fallbackBanner]);
    const titleImage = game.titleImage
      ? resolvePath(root, game.titleImage)
      : gameAsset(root, game.id, "title", "png");
    const fallbackTitle = `${root}assets/img/placeholders/title.png`;
    const titleScale = Number(mods.titleScale || game.titleScale || game.titleScaleMultiplier || 1);
    setHeroTitleImage(titleImage || fallbackTitle, game.title || "Game", fallbackTitle, titleScale);
    const heroBgX = Number(heroOffset.x);
    const heroBgY = Number(heroOffset.y);
    const heroImg = document.querySelector(".heroBgImg");
    if (heroImg){
      if (Number.isFinite(heroBgX)) heroImg.style.setProperty("--hero-bg-x", `${heroBgX}%`);
      if (Number.isFinite(heroBgY)) heroImg.style.setProperty("--hero-bg-y", `${heroBgY}%`);
      if (Number.isFinite(heroFilters.contrast)) heroImg.style.setProperty("--hero-contrast", String(heroFilters.contrast));
      if (Number.isFinite(heroFilters.saturation)) heroImg.style.setProperty("--hero-saturation", String(heroFilters.saturation));
      if (Number.isFinite(heroFilters.brightness)) heroImg.style.setProperty("--hero-brightness", String(heroFilters.brightness));
      if (Number.isFinite(heroFilters.opacity)) heroImg.style.setProperty("--hero-opacity", String(heroFilters.opacity));
    }

    $("#gameTitle")?.replaceChildren(document.createTextNode(game.title || "Untitled Game"));
    await loadBodyHtml(root, game.id);

    // re-bind for dynamically created media buttons
    initUi();

    const dock = document.querySelector(".pageDock");
    const backTopBtn = document.getElementById("backTopBtn");
    const scroller = getScrollRoot();
    const scrollTarget = scroller === document.documentElement || scroller === document.body ? window : scroller;
    const getScrollTop = () => (scrollTarget === window ? window.scrollY : scrollTarget.scrollTop);
    const onScroll = () => {
      if (!dock) return;
      const atTop = getScrollTop() <= 10;
      dock.dataset.top = atTop ? "1" : "0";
      if (backTopBtn) backTopBtn.setAttribute("aria-hidden", atTop ? "true" : "false");
    };
    onScroll();
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    cleanupFns.push(() => scrollTarget.removeEventListener("scroll", onScroll));
    if (backTopBtn){
      const onBackTop = () => {
        if (scrollTarget === window) window.scrollTo({ top: 0, behavior: "smooth" });
        else scrollTarget.scrollTo({ top: 0, behavior: "smooth" });
      };
      backTopBtn.addEventListener("click", onBackTop);
      cleanupFns.push(() => backTopBtn.removeEventListener("click", onBackTop));
    }
  }catch (err){
    console.error(err);
    const elErr = document.getElementById("fatalError");
    if (elErr) elErr.textContent = String(err?.message || err);
  }
}

export const initPage = initGamePage;
export const cleanupPage = cleanupGamePage;
