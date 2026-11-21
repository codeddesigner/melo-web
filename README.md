# Melo for Business — web

The marketing site, sign-in/sign-up and the Melo app (Mail, Team, Work, Calendar, Settings) at business.melo.to.

- **Stack:** React 19 + TypeScript (strict) + Tailwind CSS v4, bundled with esbuild (code-split, hashed assets).
- **Backend:** Supabase (auth, Postgres + RPCs) and the `email-code` edge function for codes, invites and sending mail.
- **Routing:** History-API router with clean URLs; `vercel.json` rewrites every app route to `index.html` and redirects old `*.html` links.

```sh
npm install
npm run build        # → dist/
npm run typecheck
node build.mjs --local   # unminified build for local testing
```

Vercel builds from this repo (`npm run build`, output `dist`).
