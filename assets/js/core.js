// PATHWORKS core utilities (no dependencies)
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function clamp(v, a, b){
  return Math.max(a, Math.min(b, v));
}

export function debounce(fn, ms){
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
}

export function throttle(fn, ms){
  let last = 0;
  let t = 0;
  return (...args) => {
    const now = performance.now();
    const remaining = ms - (now - last);
    if (remaining <= 0){
      last = now;
      fn(...args);
      return;
    }
    clearTimeout(t);
    t = window.setTimeout(() => {
      last = performance.now();
      fn(...args);
    }, remaining);
  };
}

export function qsParam(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export function setText(node, value){
  if (!node) return;
  node.textContent = value ?? "";
}

export function el(tag, attrs = {}, children = []){
  const node = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)){
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else if (v !== false && v != null) node.setAttribute(k, String(v));
  }
  for (const child of children){
    if (child == null) continue;
    if (typeof child === "string") node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

export async function readJson(path){
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${path} (${res.status})`);
  return await res.json();
}
