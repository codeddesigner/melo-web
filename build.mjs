// Builds the Melo site: React + TypeScript (esbuild) and Tailwind v4, into dist/.
//   node build.mjs          production build (minified, everything bundled)
//   node build.mjs --local  unminified build for local browser tests
import { build } from "esbuild";
import { compile } from "tailwindcss";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LOCAL = process.argv.includes("--local");
const root = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(root, "dist");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });
fs.cpSync(path.join(root, "public"), out, { recursive: true });

const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
const write = (name, content) => { const f = name.replace("[hash]", hash(content)); fs.writeFileSync(path.join(out, "assets", f), content); return `/assets/${f}`; };

/* ---- Tailwind: scan every source file for class candidates ---- */
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const sources = walk(path.join(root, "src")).filter((f) => /\.(tsx?|css)$/.test(f));
const candidates = new Set();
for (const f of sources) for (const m of fs.readFileSync(f, "utf8").matchAll(/[A-Za-z0-9_:\-\[\]\/.#%(),!@&>*=+']+/g)) candidates.add(m[0].replace(/^['"`]+|['"`,]+$/g, ""));
const twBase = path.join(root, "node_modules/tailwindcss");
const loadStylesheet = async (id, base) => {
  const p = id === "tailwindcss" ? path.join(twBase, "index.css") : id.startsWith("tailwindcss/") ? path.join(twBase, id.slice(12)) : path.resolve(base, id);
  return { path: p, base: path.dirname(p), content: fs.readFileSync(p, "utf8") };
};
const cssEntry = path.join(root, "src/styles/app.css");
const tw = await compile(fs.readFileSync(cssEntry, "utf8"), { base: path.dirname(cssEntry), loadStylesheet });
let appCss = tw.build([...candidates]);
const minifyCss = async (css) => (await build({ stdin: { contents: css, loader: "css" }, write: false, minify: true, lineLimit: 200, logLevel: "silent" })).outputFiles[0].text;
appCss = await minifyCss(appCss);
const appCssUrl = write("app-[hash].css", appCss);

/* ---- Marketing stylesheets (homepage, sign-in and onboarding) — served as-is so unchanged files never need re-uploading ---- */
const SITE_CSS = ["styles.css", "fixes.css", "features.css", "motion.css", "signup.css"];
for (const f of SITE_CSS) fs.copyFileSync(path.join(root, "src/styles/marketing", f), path.join(out, f));
// Imported into the lowest cascade layer ("site") so Tailwind utilities in the app always win over the site's element rules.
const siteLinks = `<style>@layer site, theme, base, components, utilities;\n${SITE_CSS.map((f) => `@import url("/${f}?v=${hash(fs.readFileSync(path.join(out, f)))}") layer(site);`).join("\n")}</style>`;

/* ---- JavaScript ---- */
const res = await build({
  entryPoints: [path.join(root, "src/main.tsx")],
  bundle: true, splitting: true, format: "esm", minify: !LOCAL, lineLimit: 200, sourcemap: false, target: "es2020",
  jsx: "automatic", outdir: path.join(out, "assets"), entryNames: "[name]-[hash]", chunkNames: "[name]-[hash]",
  external: [], /* React is bundled: no runtime CDN dependency */
  define: { "process.env.NODE_ENV": '"production"' },
  metafile: true, logLevel: "warning", legalComments: "none",
});
const entry = Object.entries(res.metafile.outputs).find(([, o]) => o.entryPoint?.endsWith("src/main.tsx"))?.[0];
const entryUrl = "/assets/" + path.basename(entry);

/* ---- HTML: one page per site, each with its own search and sharing details ---- */
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/* FAQ answers come straight from the pages, so structured data never drifts from what visitors read */
const faqFrom = (file, name) => {
  const src = fs.readFileSync(path.join(root, file), "utf8");
  const block = src.slice(src.indexOf(name)); const body = block.slice(0, block.indexOf("];"));
  return [...body.matchAll(/\[\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\s*\]/g)].map((m) => [m[1], m[2]]);
};
const SITES = {
  business: {
    file: "business.html", url: "https://business.melo.to/", name: "Melo for Business", color: "#1b87f5",
    title: "MeloBusiness: Relatable Email for the modern workforce",
    description: "Melo for Business brings your company email, team chat, tasks and calendar together — with workspace rules that keep the noise out for everyone. Free to start with a @melo.to address.",
    og: "Company email, team chat, tasks and calendar in one calm place.", image: "https://business.melo.to/og-business.jpg",
    imageAlt: "Melo for Business — Relatable email for the modern workforce.",
    h1: "Relatable email for the modern workforce.",
    lede: "Melo for Business brings your company email, chats, tasks and calendar together — with workspace rules that keep the noise out for everyone.",
    links: [["/product", "Product"], ["/rules", "Workspace rules"], ["/booking", "Booking pages"], ["/vs-slack", "Melo vs. Slack"], ["/faq", "FAQ"], ["/signup", "Create an account"], ["/signin", "Sign in"], ["https://melo.to/", "Melo for personal email"]],
    faq: faqFrom("src/marketing/data.ts", "export const FAQ"),
    app: { name: "Melo for Business", category: "BusinessApplication", offers: [["Free", "0"]] },
  },
  personal: {
    file: "personal.html", url: "https://melo.to/", name: "Melo", color: "#f1e289",
    title: "Melo | Relatable Email for the modern world",
    description: "Melo is a calm inbox for your personal email. Claim a free @melo.to address or bring Gmail, Outlook and iCloud — mail from people first, everything else later. No ads, ever.",
    og: "A calm inbox for your personal email. Free @melo.to address, forever.", image: "https://melo.to/og-personal.jpg",
    imageAlt: "Melo Mail — Relatable email for the modern world.",
    h1: "Relatable email for the modern world.",
    lede: "Melo is a calm inbox for your personal email. Claim a free @melo.to address, or bring Gmail, Outlook and iCloud.",
    links: [["/signup", "Get Melo free"], ["/signin", "Sign in"], ["https://business.melo.to/", "Melo for Business"]],
    faq: faqFrom("src/pages/PersonalHome.tsx", "const QA"),
    app: { name: "Melo Mail", category: "CommunicationApplication", offers: [["Free", "0"], ["Plus", "4"], ["Family", "8"]] },
  },
};
const ORG = { "@type": "Organization", "@id": "https://melo.to/#org", name: "Melo", url: "https://melo.to/", logo: "https://melo.to/icon-512.png", email: "hello@melo.to" };
const jsonLd = (x) => JSON.stringify({ "@context": "https://schema.org", "@graph": [
  ORG,
  { "@type": "WebSite", "@id": x.url + "#site", name: x.name, url: x.url, publisher: { "@id": ORG["@id"] }, inLanguage: "en" },
  { "@type": "WebPage", "@id": x.url + "#page", url: x.url, name: x.title, description: x.description, isPartOf: { "@id": x.url + "#site" }, primaryImageOfPage: x.image },
  { "@type": "SoftwareApplication", name: x.app.name, applicationCategory: x.app.category, operatingSystem: "Web", url: x.url, publisher: { "@id": ORG["@id"] },
    offers: x.app.offers.map(([n, p]) => ({ "@type": "Offer", name: n, price: p, priceCurrency: "USD" })) },
  ...(x.faq.length ? [{ "@type": "FAQPage", "@id": x.url + "#faq", mainEntity: x.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }] : []),
] }).replace(/</g, "\\u003c");
const page = (x) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(x.title)}</title>
<meta name="description" content="${esc(x.description)}">
<link rel="canonical" href="${x.url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="${x.color}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(x.name)}">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="${x.url}">
<meta property="og:title" content="${esc(x.title)}">
<meta property="og:description" content="${esc(x.og)}">
<meta property="og:image" content="${x.image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(x.imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(x.title)}">
<meta name="twitter:description" content="${esc(x.og)}">
<meta name="twitter:image" content="${x.image}">
<meta name="twitter:image:alt" content="${esc(x.imageAlt)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/Calamantus-Regular.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/fonts/SoapOpera-Medium.woff" as="font" type="font/woff" crossorigin>
<script type="application/ld+json">${jsonLd(x)}</script>
<style>.seo-static{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}</style>

${siteLinks}
<link rel="stylesheet" href="${appCssUrl}">
<script type="module" src="${entryUrl}"></script>
</head>
<body>
<div id="root"><main class="seo-static"><h1>${esc(x.h1)}</h1><p>${esc(x.lede)}</p><nav aria-label="Melo">${x.links.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join(" · ")}</nav>${x.faq.length ? `<section><h2>Questions</h2>${x.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}</section>` : ""}</main></div>
<noscript>Melo needs JavaScript turned on.</noscript>
</body>
</html>
`;
/* No index.html on purpose: Vercel serves static files before rewrites, so "/" must come from a rewrite to pick the right site per host */
fs.writeFileSync(path.join(out, "business.html"), page(SITES.business));
fs.writeFileSync(path.join(out, "personal.html"), page(SITES.personal));
/* Unknown URLs: a real 404 status, the app shows its "can't find that page" screen */
fs.writeFileSync(path.join(out, "404.html"), page({ ...SITES.business, title: "Page not found — Melo", description: "This page doesn’t exist." })
  .replace('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">', '<meta name="robots" content="noindex">').replace(/<link rel="canonical"[^>]*>\n/, ""));

/* ---- Crawlers: robots.txt and one sitemap per site ---- */
const today = new Date().toISOString().slice(0, 10);
const sitemap = (urls) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, pr]) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><priority>${pr}</priority></url>`).join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(out, "sitemap.xml"), sitemap([["https://melo.to/", "1.0"], ["https://melo.to/signup", "0.6"], ["https://melo.to/signin", "0.3"]]));
fs.writeFileSync(path.join(out, "sitemap-business.xml"), sitemap([["https://business.melo.to/", "1.0"], ["https://business.melo.to/signup", "0.6"], ["https://business.melo.to/signin", "0.3"]]));
fs.writeFileSync(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /book/\nDisallow: /signup?\n\nSitemap: https://melo.to/sitemap.xml\nSitemap: https://business.melo.to/sitemap-business.xml\n`);
fs.writeFileSync(path.join(out, "site.webmanifest"), JSON.stringify({ name: "Melo", short_name: "Melo", start_url: "/app", display: "standalone", background_color: "#ffffff", theme_color: "#1f1f1f",
  icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }] }, null, 2));

/* Routing (clean URLs, old .html redirects, SPA fallback) lives in ../vercel.json; a copy goes in dist for the local test server. */
fs.copyFileSync(path.join(root, "vercel.json"), path.join(out, "vercel.json"));

const files = walk(out).map((f) => [path.relative(out, f), fs.statSync(f).size]);
console.log(files.map(([f, s]) => `${String(s).padStart(8)}  ${f}`).join("\n"));
