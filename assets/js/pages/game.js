import { $, el, readJson, qsParam } from "../core.js";
import { initUi } from "../ui.js";

function fmtList(arr){
  if (!Array.isArray(arr) || arr.length === 0) return "—";
  return arr.join(", ");
}

function resolvePath(root, path){
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  return `${root}${path}`;
}

function setHeroImage(url){
  const hero = document.querySelector(".hero");
  if (!hero) return;
  hero.style.setProperty("--hero-image", `url('${url}')`);
}

function buildMediaThumb(src, alt){
  return el("div", { class: "mediaThumb" }, [
    el("button", { type: "button", "data-open-media": "1", "data-src": src, "data-alt": alt || "Media" }, [
      el("img", { src, alt: alt || "" })
    ])
  ]);
}

async function main(){
  initUi();

  const root = document.body?.dataset?.root || "";
  const id = qsParam("id") || "";
  const games = await readJson(new URL("../../data/games.json", import.meta.url));
  const game = games.find(g => String(g.id) === String(id));

  if (!game){
    document.title = `Game not found — PATHWORKS`;
    $("#kicker")?.replaceChildren(document.createTextNode("Game"));
    $("#gameTitle")?.replaceChildren(document.createTextNode("Game not found"));
    $("#gameSub")?.replaceChildren(document.createTextNode(""));

    const body = $("#gameBody");
    if (body){
      body.innerHTML = "";
      body.appendChild(el("p", {}, ["Missing or invalid game id."]));
      body.appendChild(el("a", { class: "btn btn--sm", href: `${root}index.html` }, ["Back to Our games"]));
    }
    return;
  }

  document.title = `${game.title} — PATHWORKS`;

  const banner = resolvePath(root, game.banner);
  if (banner) setHeroImage(banner);

  $("#kicker")?.replaceChildren(document.createTextNode(game.status || "Game"));
  $("#gameTitle")?.replaceChildren(document.createTextNode(game.title || "Untitled Game"));
  $("#gameSub")?.replaceChildren(document.createTextNode(game.oneLiner || ""));

  const chips = $("#heroChips");
  if (chips){
    chips.innerHTML = "";
    for (const c of [
      ...(Array.isArray(game.platforms) ? game.platforms.map(p => ({ label: p })) : []),
      ...(Array.isArray(game.tags) ? game.tags.slice(0,4).map(t => ({ label: t })) : []),
    ]){
      chips.appendChild(el("span", { class: "chip" }, [c.label]));
    }
  }

  $("#gameLongDesc")?.replaceChildren(document.createTextNode(game.description || "—"));
  $("#kvPlatforms")?.replaceChildren(document.createTextNode(fmtList(game.platforms)));
  $("#kvStatus")?.replaceChildren(document.createTextNode(game.status || "—"));
  $("#kvRelease")?.replaceChildren(document.createTextNode(game.release || "—"));
  $("#kvGenre")?.replaceChildren(document.createTextNode(fmtList(game.genres)));

  const links = $("#kvLinks");
  if (links){
    links.innerHTML = "";
    if (!Array.isArray(game.links) || game.links.length === 0){
      links.textContent = "—";
    }else{
      for (const l of game.links){
        if (!l?.href) continue;
        links.appendChild(el("a", { class: "btn btn--sm", href: l.href, target: "_blank", rel: "noreferrer" }, [l.label || "Link"]));
      }
    }
  }

  const gallery = $("#mediaGrid");
  if (gallery){
    gallery.innerHTML = "";
    if (Array.isArray(game.media)){
      for (const m of game.media.slice(0, 12)){
        const src = resolvePath(root, m?.src);
        if (src) gallery.appendChild(buildMediaThumb(src, m.alt));
      }
    }
  }

  // re-bind for dynamically created media buttons
  initUi();
}

main().catch((err) => {
  console.error(err);
  const elErr = document.getElementById("fatalError");
  if (elErr) elErr.textContent = String(err?.message || err);
});
