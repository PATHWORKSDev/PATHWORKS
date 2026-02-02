import { $, $$, debounce, el, readJson } from "../core.js";
import { initUi } from "../ui.js";

function normalize(str){
  return String(str ?? "").toLowerCase().trim();
}

function uniqueSorted(arr){
  const set = new Set();
  for (const a of arr){
    if (!a) continue;
    set.add(String(a));
  }
  return Array.from(set).sort((a,b) => a.localeCompare(b));
}

function resolvePath(root, path){
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  return `${root}${path}`;
}

function buildGameCard(game, root){
  const banner = resolvePath(root, game.banner);
  const style = banner ? `--card-image: url('${banner}')` : "";
  const status = game.status ? el("span", { class: "badge badge--solid" }, [game.status]) : null;

  const badges = [
    status,
    ...(Array.isArray(game.tags) ? game.tags.slice(0, 3).map(t => el("span", { class: "badge" }, [t])) : [])
  ].filter(Boolean);

  const href = `${root}pages/game.html?id=${encodeURIComponent(game.id)}`;
  return el("a", { class: "card gameCard", href, style }, [
    el("div", { class: "gameCardBody" }, [
      el("div", {}, [
        el("div", { class: "gameCardTitle" }, [game.title || "Untitled Game"]),
        el("div", { class: "cardSub" }, [game.oneLiner || ""])
      ]),
      el("div", { class: "gameCardMeta" }, badges)
    ])
  ]);
}

function applyFilters(games, q, tag){
  const nq = normalize(q);
  const ntag = normalize(tag);

  return games.filter(g => {
    const hay = [
      g.title,
      g.oneLiner,
      g.status,
      ...(Array.isArray(g.tags) ? g.tags : []),
      ...(Array.isArray(g.platforms) ? g.platforms : [])
    ].map(normalize).join(" ");

    const qOk = !nq || hay.includes(nq);
    const tagOk = !ntag || (Array.isArray(g.tags) && g.tags.some(t => normalize(t) === ntag));
    return qOk && tagOk;
  });
}

async function main(){
  initUi();

  const root = document.body?.dataset?.root || "";
  const games = await readJson(new URL("../../data/games.json", import.meta.url));

  const grid = $("#gamesGrid");
  const search = $("#gamesSearch");
  const tagRow = $("#tagRow");
  const count = $("#gamesCount");
  const clear = $("#clearFilters");

  let currentTag = "";
  let currentQuery = "";

  const tags = uniqueSorted(games.flatMap(g => Array.isArray(g.tags) ? g.tags : []));

  const setTag = (tag) => {
    currentTag = tag || "";
    for (const b of $$("#tagRow button")){
      const t = b.getAttribute("data-tag") || "";
      b.setAttribute("aria-selected", t === currentTag ? "true" : "false");
    }
    render();
  };

  const render = () => {
    if (!grid) return;

    const filtered = applyFilters(games, currentQuery, currentTag);
    grid.innerHTML = "";
    for (const g of filtered){
      grid.appendChild(buildGameCard(g, root));
    }

    if (count) count.textContent = `${filtered.length} / ${games.length}`;

    const empty = $("#gamesEmpty");
    if (empty) empty.classList.toggle("hidden", filtered.length > 0);
  };

  if (tagRow){
    tagRow.appendChild(el("button", { class: "btn btn--sm", "data-tag": "", "aria-selected": "true", onclick: () => setTag("") }, ["All"]));
    for (const t of tags){
      tagRow.appendChild(el("button", { class: "btn btn--sm btn--ghost", "data-tag": t, "aria-selected": "false", onclick: () => setTag(t) }, [t]));
    }
  }

  if (search){
    search.addEventListener("input", debounce(() => {
      currentQuery = search.value || "";
      render();
    }, 80));
  }

  if (clear){
    clear.addEventListener("click", () => {
      currentQuery = "";
      currentTag = "";
      if (search) search.value = "";
      setTag("");
      render();
      search?.focus();
    });
  }

  render();
}

main().catch((err) => {
  console.error(err);
  const elErr = document.getElementById("fatalError");
  if (elErr) elErr.textContent = String(err?.message || err);
});
