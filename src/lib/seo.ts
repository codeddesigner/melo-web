/* Keeps the page's search details right as you move around without reloading:
   one canonical address per page (Personal on melo.to, Business on business.melo.to), and app or private pages kept out of search. */
const BUSINESS = "https://business.melo.to", PERSONAL = "https://melo.to";
const SECTIONS = new Set(["product", "rules", "booking", "vs-slack", "faq", "demo"]);

function tag<T extends HTMLElement>(sel: string, make: () => T): T {
  let el = document.head.querySelector<T>(sel);
  if (!el) { el = make(); document.head.appendChild(el); }
  return el;
}
const link = (rel: string) => tag<HTMLLinkElement>(`link[rel="${rel}"]`, () => Object.assign(document.createElement("link"), { rel }));
const meta = (attr: "name" | "property", key: string) => tag<HTMLMetaElement>(`meta[${attr}="${key}"]`, () => { const m = document.createElement("meta"); m.setAttribute(attr, key); return m; });

export function updateSeo(kind: "personal" | "business" | "auth" | "private" | "missing", path: string, personalHost: boolean) {
  const canon = kind === "personal" ? `${PERSONAL}/`
    : kind === "business" ? `${BUSINESS}/`
    : kind === "auth" ? `${personalHost ? PERSONAL : BUSINESS}/${path.split("/")[1]}`
    : null;
  const c = link("canonical");
  if (canon) { c.href = canon; meta("property", "og:url").content = canon; } else c.remove();
  meta("name", "robots").content = kind === "private" || kind === "missing" ? "noindex" : "index, follow, max-image-preview:large, max-snippet:-1";
}
export const isBusinessSection = (top: string) => top === "" || top === "business" || SECTIONS.has(top);
