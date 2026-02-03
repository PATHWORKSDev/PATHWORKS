import { $, el, readJson } from "../core.js";
import { initUi } from "../ui.js";

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

function setHomeHeroBanner(games, root){
  const fallbackBanner = toAbs(`${root}assets/img/placeholders/banner.jpg`);
  const homeBanner = toAbs(`${root}assets/img/main/PathworksBanner.png`);
  const mods = games?.[0]?.modifiers || {};
  const heroOffset = mods.offset?.hero || {};
  const heroFilters = mods.filters?.hero || {};
  const heroBgX = Number(heroOffset.x);
  const heroBgY = Number(heroOffset.y);
  if (homeBanner){
    setHeroBgImage([homeBanner, fallbackBanner]);
    const heroImg = document.querySelector(".heroBgImg");
    if (heroImg){
      if (Number.isFinite(heroBgX)) heroImg.style.setProperty("--hero-bg-x", `${heroBgX}%`);
      if (Number.isFinite(heroBgY)) heroImg.style.setProperty("--hero-bg-y", `${heroBgY}%`);
      if (Number.isFinite(heroFilters.contrast)) heroImg.style.setProperty("--hero-contrast", String(heroFilters.contrast));
      if (Number.isFinite(heroFilters.saturation)) heroImg.style.setProperty("--hero-saturation", String(heroFilters.saturation));
      if (Number.isFinite(heroFilters.brightness)) heroImg.style.setProperty("--hero-brightness", String(heroFilters.brightness));
      if (Number.isFinite(heroFilters.opacity)) heroImg.style.setProperty("--hero-opacity", String(heroFilters.opacity));
    }
    return;
  }
  if (!games || games.length === 0) return;
  const game = games[0];
  if (!game || !game.id) return;
  const banner = game.banner
    ? resolvePath(root, game.banner)
    : gameAsset(root, game.id, "banner", "png");
  const bannerJpg = gameAsset(root, game.id, "banner", "jpg");
  const bannerPngAbs = toAbs(banner);
  const bannerJpgAbs = toAbs(bannerJpg);
  if (banner) setHeroBgImage([bannerPngAbs, bannerJpgAbs, fallbackBanner]);
  const heroImg = document.querySelector(".heroBgImg");
  if (heroImg){
    if (Number.isFinite(heroBgX)) heroImg.style.setProperty("--hero-bg-x", `${heroBgX}%`);
    if (Number.isFinite(heroBgY)) heroImg.style.setProperty("--hero-bg-y", `${heroBgY}%`);
  }
}

function buildGameCard(game, root){
  const fallbackBanner = `${root}assets/img/placeholders/banner.jpg`;
  const banner = game.banner ? resolvePath(root, game.banner) : "";
  const bannerPng = gameAsset(root, game.id, "banner", "png");
  const bannerJpg = gameAsset(root, game.id, "banner", "jpg");
  const sources = [
    ...(banner ? [banner] : []),
    bannerPng,
    bannerJpg,
    fallbackBanner
  ].map(toAbs).filter(Boolean);
  const titleImage = game.titleImage
    ? resolvePath(root, game.titleImage)
    : gameAsset(root, game.id, "title", "png");
  const mods = game.modifiers || {};
  const titleScale = Number(mods.titleScale || game.titleScale || game.titleScaleMultiplier || 1);
  const cardOffset = mods.offset?.card || {};
  const cardFilters = mods.filters?.card || {};
  const cardBgX = Number(cardOffset.x);
  const cardBgY = Number(cardOffset.y);
  const fallbackTitle = `${root}assets/img/placeholders/title.png`;

  const href = `${root}pages/game.html?id=${encodeURIComponent(game.id)}`;
  const bgWrapAttrs = { class: "gameCardBgWrap" };
  if (game?.id) bgWrapAttrs["data-transition-id"] = `game-banner:${game.id}`;
  const card = el("a", { class: "card gameCard", href }, [
    el("div", bgWrapAttrs, [
        el("img", {
          class: "gameCardBg",
          src: sources[0] || fallbackBanner,
          alt: "",
          "aria-hidden": "true",
          "data-morph-skip": "1",
          "data-src-idx": "0",
          style: [
            Number.isFinite(cardBgX) ? `--card-bg-x:${cardBgX}%` : "",
            Number.isFinite(cardBgY) ? `--card-bg-y:${cardBgY}%` : "",
            Number.isFinite(cardFilters.contrast) ? `--card-contrast:${cardFilters.contrast}` : "",
            Number.isFinite(cardFilters.saturation) ? `--card-saturation:${cardFilters.saturation}` : "",
            Number.isFinite(cardFilters.brightness) ? `--card-brightness:${cardFilters.brightness}` : "",
            Number.isFinite(cardFilters.opacity) ? `--card-opacity:${cardFilters.opacity}` : ""
          ].filter(Boolean).join(";"),
          onerror: (e) => {
            const img = e.currentTarget;
            const next = Number(img.dataset.srcIdx || "0") + 1;
            if (next < sources.length){
              img.dataset.srcIdx = String(next);
              img.src = sources[next];
            }
          }
        }),
      el("div", { class: "gameCardBgOverlay", "aria-hidden": "true" })
    ]),
    el("div", { class: "gameCardBody" }, [
      el("div", { class: "gameCardTitleWrap" }, [
        el("img", {
          class: "gameCardTitleImg",
          src: titleImage || fallbackTitle,
          alt: game.title || "Game",
          style: Number.isFinite(titleScale) && titleScale > 0 ? `--title-scale:${titleScale}` : "",
          onerror: (e) => { e.currentTarget.src = fallbackTitle; }
        }),
        el("span", { class: "srOnly" }, [game.title || "Untitled Game"])
      ])
    ])
  ]);
  return card;
}

export async function initHomePage(){
  try{
    initUi();

    const root = document.body?.dataset?.root || "";
    const games = await readJson(new URL("../../data/games.json", import.meta.url));

    setHomeHeroBanner(games, root);

    const grid = $("#gamesGrid");

    const render = () => {
      if (!grid) return;
      grid.innerHTML = "";
      for (const g of games){
        grid.appendChild(buildGameCard(g, root));
      }

      const empty = $("#gamesEmpty");
      if (empty) empty.classList.toggle("hidden", games.length > 0);
    };

    render();
  }catch (err){
    console.error(err);
    const elErr = document.getElementById("fatalError");
    if (elErr) elErr.textContent = String(err?.message || err);
  }
}

export const initPage = initHomePage;
export const cleanupPage = () => {};
