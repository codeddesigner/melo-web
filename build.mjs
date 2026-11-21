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

/* ---- index.html (every route is served by this one page) ---- */
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Melo for Business — Mail, team chat and work in one calm place</title>
<meta name="description" content="Melo for Business brings your company email, chats, tasks and calendar together — with workspace rules that keep the noise out for everyone.">
<meta name="theme-color" content="#1b87f5">
<meta property="og:title" content="Melo for Business">
<meta property="og:description" content="Mail, team chat and work. Finally in one calm place.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://business.melo.to/">
<meta property="og:site_name" content="Melo for Business">
<meta property="og:image" content="https://uvlcltwmlemqzdupxgkb.supabase.co/storage/v1/object/public/site/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="696">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://uvlcltwmlemqzdupxgkb.supabase.co/storage/v1/object/public/site/og.jpg">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preload" href="/fonts/Calamantus-Regular.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/fonts/SoapOpera-Medium.woff" as="font" type="font/woff" crossorigin>

${siteLinks}
<link rel="stylesheet" href="${appCssUrl}">
<script type="module" src="${entryUrl}"></script>
</head>
<body>
<div id="root"></div>
<noscript>Melo needs JavaScript turned on.</noscript>
</body>
</html>
`;
fs.writeFileSync(path.join(out, "index.html"), html);
fs.writeFileSync(path.join(out, "404.html"), html);

/* Routing (clean URLs, old .html redirects, SPA fallback) lives in ../vercel.json; a copy goes in dist for the local test server. */
fs.copyFileSync(path.join(root, "vercel.json"), path.join(out, "vercel.json"));

const files = walk(out).map((f) => [path.relative(out, f), fs.statSync(f).size]);
console.log(files.map(([f, s]) => `${String(s).padStart(8)}  ${f}`).join("\n"));
