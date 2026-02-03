import { initUi } from "./ui.js";

const pageInitLoaders = {
  home: () => import("./pages/home.js"),
  game: () => import("./pages/game.js")
};

let currentCleanup = null;
let navInProgress = false;
const htmlCache = new Map();
const imgHashCache = new Map();

function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getPageRoot(doc = document){
  return doc.getElementById("page-root") || doc.querySelector("main");
}

function getScrollRoot(){
  return document.getElementById("page-root") || document.scrollingElement || document.documentElement;
}

function normalizeUrl(value, base){
  if (!value) return "";
  try{
    return new URL(value, base).href;
  }catch{
    return value;
  }
}

function toFetchUrl(url){
  const u = new URL(url, window.location.href);
  u.hash = "";
  return u.href;
}

async function ensureImageReady(img){
  if (img.complete && img.naturalWidth > 0) return true;
  if (img.loading === "lazy") return false;
  if (typeof img.decode === "function"){
    try{
      await img.decode();
    }catch{
      // ignore decode errors, fallback to load listeners
    }
    if (img.complete && img.naturalWidth > 0) return true;
  }
  const loadPromise = new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      resolve(img.complete && img.naturalWidth > 0);
    };
    const onLoad = () => done();
    const onError = () => done();
    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", onError, { once: true });
  });
  const timeoutPromise = new Promise((resolve) => {
    window.setTimeout(() => resolve(false), 250);
  });
  return await Promise.race([loadPromise, timeoutPromise]);
}

async function getImageHash(img, cacheKey){
  if (!cacheKey) return "";
  const cached = imgHashCache.get(cacheKey);
  if (typeof cached === "string") return cached;
  if (cached && typeof cached.then === "function") return cached;

  const promise = (async () => {
    const ready = await ensureImageReady(img);
    if (!ready) return "";
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return "";

    const size = 16;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "";

    try{
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let sum = 0;
      const grays = new Array(size * size);
      for (let i = 0, j = 0; i < data.length; i += 4, j += 1){
        const gray = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
        grays[j] = gray;
        sum += gray;
      }
      const avg = sum / grays.length;
      let bits = "";
      for (const g of grays) bits += g >= avg ? "1" : "0";
      const ratio = w / h;
      const ratioKey = Number.isFinite(ratio) ? ratio.toFixed(3) : "0";
      return `${ratioKey}:${bits}`;
    }catch{
      return "";
    }
  })();

  imgHashCache.set(cacheKey, promise);
  try{
    const hash = await promise;
    imgHashCache.set(cacheKey, hash);
    return hash;
  }catch (err){
    imgHashCache.delete(cacheKey);
    return "";
  }
}

async function getImageKey(img, baseUrl){
  const explicit = img.getAttribute("data-transition-id");
  if (explicit) return `id:${explicit}`;
  const srcAttr = img.getAttribute("src") || img.currentSrc || img.src;
  const srcKey = normalizeUrl(srcAttr, baseUrl);
  const hash = await getImageHash(img, srcKey);
  if (hash) return `hash:${hash}`;
  return srcKey;
}

async function collectMorphables(root, baseUrl){
  const map = new Map();
  if (!root) return map;

  const explicit = Array.from(root.querySelectorAll("[data-transition-id]"))
    .filter((el) => el.closest("[data-transition-id]") === el);
  for (const el of explicit){
    const id = el.getAttribute("data-transition-id");
    if (!id) continue;
    const key = `id:${id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(el);
  }

  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(imgs.map(async (img) => {
    if (img.hasAttribute("data-morph-skip")) return;
    if (img.closest("[data-transition-id]")) return;
    const key = await getImageKey(img, baseUrl);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(img);
  }));

  return map;
}

async function buildImagePairs(oldRoot, oldUrl){
  const oldMap = await collectMorphables(oldRoot, oldUrl);
  const pairs = [];
  let counter = 0;
  for (const [key, oldList] of oldMap){
    for (let i = 0; i < oldList.length; i += 1){
      counter += 1;
      pairs.push({ name: `pw-img-${counter}`, key, index: i });
    }
  }
  return { pairs, oldMap };
}

async function applyTransitionNames(root, baseUrl, pairs){
  const map = await collectMorphables(root, baseUrl);
  const applied = [];
  for (const pair of pairs){
    const el = map.get(pair.key)?.[pair.index];
    if (!el) continue;
    el.style.viewTransitionName = pair.name;
    applied.push(el);
  }
  return applied;
}

function collectImagesFromElements(els){
  const set = new Set();
  for (const el of els){
    if (!el || !el.querySelectorAll) continue;
    if (el.tagName === "IMG") set.add(el);
    const imgs = el.querySelectorAll("img");
    for (const img of imgs) set.add(img);
  }
  return Array.from(set);
}

async function waitForElementImages(els){
  const imgs = collectImagesFromElements(els);
  if (imgs.length === 0) return;
  await Promise.all(imgs.map((img) => ensureImageReady(img)));
}

function cleanupTransitions(els){
  for (const el of els){
    if (el && el.style) el.style.viewTransitionName = "";
  }
}

function isBannerElement(el){
  if (!el || !el.classList) return false;
  return el.classList.contains("heroBgWrap") || el.classList.contains("gameCardBgWrap");
}

function isTitleElement(el){
  if (!el || !el.classList) return false;
  return el.classList.contains("heroTitleImg") || el.classList.contains("gameCardTitleImg");
}

function applyTransitionLayerRules({ bannerNames, titleNames, footerNames }){
  const styleId = "pw-vt-layer";
  const existing = document.getElementById(styleId);
  const allNames = [...(bannerNames || []), ...(titleNames || []), ...(footerNames || [])];
  if (allNames.length === 0){
    if (existing) existing.remove();
    return () => {};
  }
  const style = existing || document.createElement("style");
  style.id = styleId;
  const base = "::view-transition-group(root){z-index:0}" +
    "::view-transition-old(root){z-index:0}" +
    "::view-transition-new(root){z-index:0}";
  const bannerRules = (bannerNames || []).map((name) => (
    `::view-transition-group(${name}){z-index:10}` +
    `::view-transition-old(${name}){z-index:11;border-radius:var(--r-lg);overflow:hidden}` +
    `::view-transition-new(${name}){z-index:12;border-radius:var(--r-lg);overflow:hidden}`
  )).join("");
  const titleRules = (titleNames || []).map((name) => (
    `::view-transition-group(${name}){z-index:20}` +
    `::view-transition-old(${name}){z-index:21}` +
    `::view-transition-new(${name}){z-index:22}`
  )).join("");
  const footerRules = (footerNames || []).map((name) => (
    `::view-transition-group(${name}){z-index:90}` +
    `::view-transition-old(${name}){z-index:91}` +
    `::view-transition-new(${name}){z-index:92}`
  )).join("");
  style.textContent = base + bannerRules + titleRules + footerRules;
  if (!style.parentNode) document.head.appendChild(style);
  return () => {
    if (style && style.parentNode) style.remove();
  };
}

function collectEnterTargets(root){
  if (!root) return [];
  const selectors = [".heroInner", ".section .container", ".pageDock"];
  return Array.from(root.querySelectorAll(selectors.join(",")));
}

function applyEnterTransitionRules(names){
  const styleId = "pw-vt-enter";
  const existing = document.getElementById(styleId);
  if (!names || names.length === 0){
    if (existing) existing.remove();
    return () => {};
  }
  const style = existing || document.createElement("style");
  style.id = styleId;
  const keyframes = "@keyframes pw-enter-rise{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}";
  style.textContent = keyframes + names.map((name) => (
    `::view-transition-old(${name}){opacity:1}` +
    `::view-transition-new(${name}){animation:pw-enter-rise 320ms var(--ease) both}`
  )).join("");
  if (!style.parentNode) document.head.appendChild(style);
  return () => {
    if (style && style.parentNode) style.remove();
  };
}

function applyEnterTransitions(root){
  const targets = collectEnterTargets(root);
  const names = [];
  for (let i = 0; i < targets.length; i += 1){
    const name = `pw-enter-${i + 1}`;
    targets[i].style.viewTransitionName = name;
    names.push(name);
  }
  const clearRules = applyEnterTransitionRules(names);
  return { targets, clearRules };
}

function startTransitionClasses(){
  if (!document.body) return;
  document.body.classList.add("is-transitioning");
}

function finishTransitionClasses(){
  if (!document.body) return;
  document.body.classList.remove("is-transitioning");
}

async function initTemplatePage(){
  initUi();
  const btns = Array.from(document.querySelectorAll(".tabBtn"));
  const panels = Array.from(document.querySelectorAll(".tabPanel"));
  if (btns.length === 0 || panels.length === 0) return;
  const set = (name) => {
    for (const b of btns) b.setAttribute("aria-selected", b.dataset.tab === name ? "true" : "false");
    for (const p of panels) p.classList.toggle("hidden", p.dataset.panel !== name);
  };
  for (const b of btns) b.addEventListener("click", () => set(b.dataset.tab));
}

async function init404Page(){
  initUi();
}

async function runPageInit(){
  const page = document.body?.dataset?.page || "";
  if (currentCleanup){
    currentCleanup();
    currentCleanup = null;
  }

  if (page === "template"){
    await initTemplatePage();
    return;
  }
  if (page === "404"){
    await init404Page();
    return;
  }

  const loader = pageInitLoaders[page];
  if (!loader) return;
  const mod = await loader();
  if (typeof mod.cleanupPage === "function"){
    currentCleanup = mod.cleanupPage;
  }
  if (typeof mod.initPage === "function"){
    await mod.initPage();
  }
}

function shouldHandleLink(a, event){
  if (!a || !(a instanceof HTMLAnchorElement)) return false;
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (a.hasAttribute("download")) return false;
  if (a.target && a.target !== "_self") return false;
  if (a.getAttribute("data-no-spa") !== null) return false;

  const href = a.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return false;

  let url;
  try{
    url = new URL(href, window.location.href);
  }catch{
    return false;
  }
  if (url.origin !== window.location.origin) return false;

  const current = new URL(window.location.href);
  if (url.pathname === current.pathname && url.search === current.search && url.hash === current.hash){
    return false;
  }
  if (url.pathname === current.pathname && url.search === current.search && url.hash){
    return false;
  }
  return true;
}

function shouldPrefetchLink(a){
  if (!a || !(a instanceof HTMLAnchorElement)) return false;
  if (a.hasAttribute("download")) return false;
  if (a.target && a.target !== "_self") return false;
  if (a.getAttribute("data-no-spa") !== null) return false;

  const href = a.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return false;

  let url;
  try{
    url = new URL(href, window.location.href);
  }catch{
    return false;
  }
  if (url.origin !== window.location.origin) return false;

  const current = new URL(window.location.href);
  if (url.pathname === current.pathname && url.search === current.search && url.hash === current.hash){
    return false;
  }
  if (url.pathname === current.pathname && url.search === current.search && url.hash){
    return false;
  }
  return true;
}

async function fetchPageHtml(targetUrl){
  const fetchUrl = toFetchUrl(targetUrl);
  const cached = htmlCache.get(fetchUrl);
  if (typeof cached === "string") return cached;
  if (cached && typeof cached.then === "function") return cached;

  const promise = (async () => {
    const res = await fetch(fetchUrl, { headers: { "X-PW-Nav": "1" } });
    if (!res.ok) throw new Error(`Failed to load ${fetchUrl} (${res.status})`);
    return await res.text();
  })();

  htmlCache.set(fetchUrl, promise);
  try{
    const html = await promise;
    htmlCache.set(fetchUrl, html);
    return html;
  }catch (err){
    htmlCache.delete(fetchUrl);
    throw err;
  }
}

function prefetchPage(url){
  const fetchUrl = toFetchUrl(url);
  if (htmlCache.has(fetchUrl)) return;
  fetchPageHtml(fetchUrl).catch(() => {});
}

function updateHeadFrom(doc){
  const title = doc.querySelector("title")?.textContent;
  if (title) document.title = title;

  const newTheme = doc.querySelector('meta[name="theme-color"]')?.getAttribute("content");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta && newTheme) themeMeta.setAttribute("content", newTheme);
}

function updateBodyDatasetFrom(doc){
  const body = doc.body;
  if (!body) return;
  const root = body.dataset?.root ?? "";
  const page = body.dataset?.page ?? "";
  document.body.dataset.root = root;
  document.body.dataset.page = page;
}

function scrollToHash(hash){
  if (!hash) return;
  const id = hash.replace("#", "");
  if (!id) return;
  const target = document.getElementById(id);
  if (target) target.scrollIntoView();
}

async function navigateTo(url, options = {}){
  if (navInProgress) return;
  navInProgress = true;
  let clearLayerRules = () => {};
  let clearEnterRules = () => {};

  const target = new URL(url, window.location.href);
  const targetUrl = target.href;
  const fetchUrl = toFetchUrl(targetUrl);
  const isPop = options.isPop === true;
  const replace = options.replace === true;

  try{
    const html = await fetchPageHtml(fetchUrl);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const newRoot = getPageRoot(doc);
    const currentRoot = getPageRoot(document);

    if (!newRoot || !currentRoot){
      window.location.href = targetUrl;
      return;
    }

    const oldUrl = toFetchUrl(window.location.href);
    const newUrl = fetchUrl;
    let allowTransition = typeof document.startViewTransition === "function" && !prefersReducedMotion();

    const { pairs, oldMap } = allowTransition
      ? await buildImagePairs(currentRoot, oldUrl)
      : { pairs: [], oldMap: new Map() };

    if (allowTransition && pairs.length === 0){
      allowTransition = false;
    }

    let newApplied = [];
    let enterApplied = [];
    let footerApplied = [];
    const bannerNames = [];
    const titleNames = [];
    const footerNames = [];
    if (allowTransition){
      const footer = document.querySelector(".footer");
      if (footer){
        footer.style.viewTransitionName = "pw-footer";
        footerApplied = [footer];
        footerNames.push("pw-footer");
      }
      for (const pair of pairs){
        const el = oldMap.get(pair.key)?.[pair.index];
        if (isBannerElement(el)) bannerNames.push(pair.name);
        if (isTitleElement(el)) titleNames.push(pair.name);
      }
      clearLayerRules = applyTransitionLayerRules({ bannerNames, titleNames, footerNames });
    }
    const doSwap = async () => {
      if (!isPop){
        if (replace) history.replaceState({}, "", targetUrl);
        else history.pushState({}, "", targetUrl);
      }

      updateHeadFrom(doc);
      updateBodyDatasetFrom(doc);

      const imported = document.importNode(newRoot, true);
      currentRoot.replaceWith(imported);

      await runPageInit();
      if (allowTransition) document.body.classList.remove("is-transitioning");

      if (allowTransition && !prefersReducedMotion()){
        const enter = applyEnterTransitions(getPageRoot(document));
        enterApplied = enter.targets;
        clearEnterRules = enter.clearRules;
      }

      newApplied = allowTransition
        ? await applyTransitionNames(getPageRoot(document), newUrl, pairs)
        : [];
      if (allowTransition && newApplied.length > 0){
        await waitForElementImages(newApplied);
      }

      const scroller = getScrollRoot();
      if (scroller === document.documentElement || scroller === document.body) window.scrollTo(0, 0);
      else scroller.scrollTo({ top: 0, left: 0 });
      scrollToHash(new URL(targetUrl).hash);
    };

    if (!allowTransition){
      startTransitionClasses();
      await doSwap();
      finishTransitionClasses();
      return;
    }

    const oldApplied = [];
    for (const pair of pairs){
      const el = oldMap.get(pair.key)?.[pair.index];
      if (!el) continue;
      el.style.viewTransitionName = pair.name;
      oldApplied.push(el);
    }
    startTransitionClasses();
    const transition = document.startViewTransition(doSwap);
    transition.finished.finally(() => {
      finishTransitionClasses();
      cleanupTransitions(oldApplied);
      cleanupTransitions(newApplied);
      cleanupTransitions(enterApplied);
      cleanupTransitions(footerApplied);
    });
    await transition.finished.catch(() => {});
  }catch (err){
    console.error(err);
    window.location.href = targetUrl;
  }finally{
    clearLayerRules();
    clearEnterRules();
    navInProgress = false;
  }
}

function handleLinkClick(event){
  const a = event.target?.closest?.("a");
  if (!shouldHandleLink(a, event)) return;
  event.preventDefault();
  navigateTo(a.href);
}

function handleLinkHover(event){
  const a = event.target?.closest?.("a");
  if (!shouldPrefetchLink(a)) return;
  prefetchPage(a.href);
}

function handlePopState(){
  navigateTo(window.location.href, { isPop: true, replace: true });
}

function initSpa(){
  document.addEventListener("click", handleLinkClick);
  document.addEventListener("pointerenter", handleLinkHover, true);
  window.addEventListener("popstate", handlePopState);
}

window.__PW_APP__ = { spaEnabled: true };
initSpa();
runPageInit().catch((err) => console.error(err));
