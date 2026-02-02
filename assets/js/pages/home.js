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
  ].map(toAbs);
  const style = `--card-image: ${sources.map(s => `url('${s}')`).join(", ")}`;
  const titleImage = game.titleImage
    ? resolvePath(root, game.titleImage)
    : gameAsset(root, game.id, "title", "png");
  const fallbackTitle = `${root}assets/img/placeholders/title.png`;

  const href = `${root}pages/game.html?id=${encodeURIComponent(game.id)}`;
  const card = el("a", { class: "card gameCard", href, style }, [
    el("div", { class: "gameCardBody" }, [
      el("div", { class: "gameCardTitleWrap" }, [
        el("img", {
          class: "gameCardTitleImg",
          src: titleImage || fallbackTitle,
          alt: game.title || "Game",
          onerror: (e) => { e.currentTarget.src = fallbackTitle; }
        }),
        el("span", { class: "srOnly" }, [game.title || "Untitled Game"])
      ])
    ])
  ]);
  return card;
}

async function main(){
  initUi();

  const root = document.body?.dataset?.root || "";
  const games = await readJson(new URL("../../data/games.json", import.meta.url));

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
}

main().catch((err) => {
  console.error(err);
  const elErr = document.getElementById("fatalError");
  if (elErr) elErr.textContent = String(err?.message || err);
});
