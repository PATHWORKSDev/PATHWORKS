import { $, el, readJson, qsParam } from "../core.js";
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

function setHeroBgImage(url){
  const hero = document.querySelector(".hero");
  if (!hero) return;
  hero.style.setProperty("--hero-bg-image", url);
}

function setHeroTitleImage(url, alt, fallback){
  const img = document.getElementById("gameTitleImg");
  if (!img || !url) return;
  img.src = url;
  if (fallback) img.onerror = () => { img.src = fallback; };
  if (typeof alt === "string") img.alt = alt;
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

async function main(){
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

  const fallbackBanner = toAbs(`${root}assets/img/placeholders/banner.jpg`);
  const banner = game.banner
    ? resolvePath(root, game.banner)
    : gameAsset(root, game.id, "banner", "png");
  const bannerJpg = gameAsset(root, game.id, "banner", "jpg");
  const bannerPngAbs = toAbs(banner);
  const bannerJpgAbs = toAbs(bannerJpg);
  if (banner) setHeroBgImage(`url('${bannerPngAbs}'), url('${bannerJpgAbs}'), url('${fallbackBanner}')`);
  const titleImage = game.titleImage
    ? resolvePath(root, game.titleImage)
    : gameAsset(root, game.id, "title", "png");
  const fallbackTitle = `${root}assets/img/placeholders/title.png`;
  setHeroTitleImage(titleImage || fallbackTitle, game.title || "Game", fallbackTitle);

  $("#gameTitle")?.replaceChildren(document.createTextNode(game.title || "Untitled Game"));
  await loadBodyHtml(root, game.id);

  // re-bind for dynamically created media buttons
  initUi();

  const dock = document.querySelector(".pageDock");
  const backTopBtn = document.getElementById("backTopBtn");
  const onScroll = () => {
    if (!dock) return;
    const atTop = window.scrollY <= 10;
    dock.dataset.top = atTop ? "1" : "0";
    if (backTopBtn) backTopBtn.setAttribute("aria-hidden", atTop ? "true" : "false");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  if (backTopBtn){
    backTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
}

main().catch((err) => {
  console.error(err);
  const elErr = document.getElementById("fatalError");
  if (elErr) elErr.textContent = String(err?.message || err);
});
