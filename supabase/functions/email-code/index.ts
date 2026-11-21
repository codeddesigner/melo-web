// Melo email: sends sign-in codes and workspace invites through Delivrie, and exchanges a correct code for a Supabase session.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const FROM = Deno.env.get("MAIL_FROM") ?? "Melo <hello@melo.to>";
const FALLBACK_FROM = Deno.env.get("MAIL_FROM_FALLBACK") ?? "Melo <melo@delivrie.io>";

const ORIGINS = new Set(["https://melo.to", "https://www.melo.to", "https://business.melo.to", "https://melo-business.vercel.app", "http://localhost:8767"]);
const cors = (req: Request) => {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.has(o) || o.endsWith("-getchidera-5359s-projects.vercel.app") ? o : "https://business.melo.to",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

let delivrieKey = Deno.env.get("DELIVRIE_API_KEY") ?? "";
async function getKey() {
  if (delivrieKey) return delivrieKey;
  const { data } = await admin.rpc("get_app_secret", { p_name: "delivrie_api_key" });
  delivrieKey = (data as string) ?? "";
  return delivrieKey;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const pepper = SERVICE.slice(-24);

function mail(code: string, signin: boolean | string = false) {
  const c = `${code.slice(0, 3)} ${code.slice(3)}`;
  return `<!doctype html><html><body style="margin:0;background:#f6f6f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#202020">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" style="max-width:440px;background:#fff;border-radius:20px" cellpadding="0" cellspacing="0"><tr><td style="padding:36px 32px">
<div style="font-size:20px;font-weight:600;letter-spacing:-.2px">melo <span style="font-weight:400;color:#5f5f5f">business</span></div>
<h1 style="font-size:22px;line-height:30px;font-weight:600;margin:28px 0 8px">Your Melo code</h1>
<p style="font-size:15px;line-height:22px;color:#5f5f5f;margin:0 0 24px">${typeof signin === "string" ? signin : signin ? "Enter this code to sign in to Melo." : "Enter this code to continue setting up your account."} It expires in 10 minutes.</p>
<div style="font-size:34px;letter-spacing:6px;font-weight:600;background:#f3f3f3;border-radius:14px;padding:18px 0;text-align:center">${c}</div>
<p style="font-size:13px;line-height:19px;color:#8a8a8a;margin:24px 0 0">If you didn’t ask for this code, you can ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`;
}

async function deliver(to: string, subject: string, html: string, text: string) {
  const key = await getKey();
  if (!key) throw new Error("Email sending isn’t set up yet.");
  const post = (from: string) => fetch("https://delivrie.io/api/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  let r = await post(FROM);
  if (!r.ok) { console.error("delivrie primary", r.status, await r.text()); if (FALLBACK_FROM && FALLBACK_FROM !== FROM) r = await post(FALLBACK_FROM); }
  if (!r.ok) { console.error("delivrie", r.status, await r.text()); throw new Error("We couldn’t send the email. Try again in a minute."); }
}
const send = (to: string, code: string, signin: boolean | string = false) =>
  deliver(to, `${code.slice(0, 3)} ${code.slice(3)} is your Melo code`, mail(code, signin), `Your Melo code is ${code}. It expires in 10 minutes.`);

const escHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
function inviteMail(inviter: string, ws: string, link: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#202020">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" style="max-width:440px;background:#fff;border-radius:20px" cellpadding="0" cellspacing="0"><tr><td style="padding:36px 32px">
<div style="font-size:20px;font-weight:600;letter-spacing:-.2px">melo <span style="font-weight:400;color:#5f5f5f">business</span></div>
<h1 style="font-size:22px;line-height:30px;font-weight:600;margin:28px 0 8px">Join ${escHtml(ws)} on Melo</h1>
<p style="font-size:15px;line-height:22px;color:#5f5f5f;margin:0 0 24px">${escHtml(inviter)} invited you to ${escHtml(ws)} — email, team chat, tasks and calendar in one place.</p>
<a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-size:14px;font-weight:500;line-height:20px;padding:10px 18px;border-radius:999px">Accept invite</a>
<p style="font-size:13px;line-height:19px;color:#8a8a8a;margin:24px 0 0">This invite expires in 7 days. If you weren’t expecting it, you can ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`;
}

// Owners and admins only. Returns the caller and the workspace, or a Response to send back.
async function adminOf(req: Request, workspaceId: string, token: string) {
  const { data: u, error: ue } = await admin.auth.getUser(token);
  if (ue || !u.user) return json(req, { error: "Your session expired. Sign in again." }, 401);
  const { data: ws } = await admin.from("workspaces").select("id, name, owner_id, domain, dns_token, domain_verified_at").eq("id", workspaceId).maybeSingle();
  const { data: m } = await admin.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", u.user.id).maybeSingle();
  if (!ws || !m || !["owner", "admin"].includes(m.role)) return json(req, { error: "Only owners and admins can do that." }, 403);
  return { user: u.user, ws };
}

// Emails invites that haven't gone out yet (or one specific invite, to resend it).
async function sendInvites(req: Request, workspaceId: string, token: string, inviteId?: string) {
  const a = await adminOf(req, workspaceId, token);
  if (a instanceof Response) return a;
  const { user, ws } = a;
  const { data: prof } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const inviter = prof?.full_name || user.email || "A teammate";
  let q = admin.from("invites").select("id, email").eq("workspace_id", ws.id).limit(50);
  q = inviteId ? q.eq("id", inviteId) : q.is("sent_at", null);
  const { data: invites } = await q;
  let sent = 0;
  for (const inv of invites ?? []) {
    const link = `https://business.melo.to/signup.html?join=${inv.id}`;
    try {
      await deliver(inv.email, `${inviter} invited you to ${ws.name} on Melo`, inviteMail(inviter, ws.name, link), `${inviter} invited you to ${ws.name} on Melo. Accept: ${link}`);
      await admin.from("invites").update({ sent_at: new Date().toISOString() }).eq("id", inv.id);
      sent++;
    } catch (e) { console.error("invite", inv.email, e); }
  }
  return json(req, { sent });
}

// Looks up the ownership TXT record over public DNS and marks the domain verified when it's there.
async function verifyDomain(req: Request, workspaceId: string, token: string) {
  const a = await adminOf(req, workspaceId, token);
  if (a instanceof Response) return a;
  const { ws } = a;
  if (!ws.domain || !ws.dns_token) return json(req, { error: "Add a domain first." }, 400);
  const want = `melo-verification=${ws.dns_token}`;
  let found = false;
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(ws.domain)}&type=TXT`, { headers: { accept: "application/dns-json" } });
    const d = await r.json();
    found = (d.Answer ?? []).some((x: { data?: string }) => String(x.data ?? "").replace(/"\s*"/g, "").includes(want));
  } catch (e) { console.error("dns", e); return json(req, { error: "We couldn’t reach DNS just now. Try again in a minute." }, 502); }
  const verified_at = found ? (ws.domain_verified_at ?? new Date().toISOString()) : null;
  if (found && !ws.domain_verified_at) await admin.from("workspaces").update({ domain_verified_at: verified_at }).eq("id", ws.id);
  return json(req, { found, verified_at, checked_at: new Date().toISOString() });
}

// Real sending for people with a @melo.to address. Replies go to their sign-in email until Melo inboxes open.
function plainMail(body: string, name: string, addr: string) {
  const paras = escHtml(body).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:22px;color:#202020">${paras}<p style="margin:24px 0 0;font-size:12px;color:#8a8a8a">Sent with Melo by ${escHtml(name)} · ${escHtml(addr)}</p></body></html>`;
}
async function sendMail(req: Request, token: string, p: { to?: unknown; subject?: unknown; body?: unknown; workspace_id?: unknown }) {
  const { data: ud, error: ue } = await admin.auth.getUser(token);
  if (ue || !ud.user) return json(req, { error: "Your session expired. Sign in again." }, 401);
  const u = ud.user;
  const { data: prof } = await admin.from("profiles").select("full_name, melo_address").eq("id", u.id).maybeSingle();
  if (!prof?.melo_address) return json(req, { error: "Sending needs a @melo.to address. Claim one in Settings → Profile." }, 400);
  const to = (Array.isArray(p.to) ? p.to : String(p.to ?? "").split(/[\s,;]+/)).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  if (!to.length || to.some((x) => !isEmail(x))) return json(req, { error: "Check the recipients." }, 400);
  if (to.length > 10) return json(req, { error: "Send to 10 people or fewer at a time." }, 400);
  const subject = String(p.subject ?? "").trim().slice(0, 200);
  const body = String(p.body ?? "").trim().slice(0, 20000);
  if (!subject && !body) return json(req, { error: "Write a subject or a message." }, 400);
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin.from("mail_messages").select("id", { count: "exact", head: true }).eq("user_id", u.id).eq("folder", "sent").gte("created_at", since);
  if ((count ?? 0) >= 50) return json(req, { error: "You’ve reached today’s limit of 50 emails." }, 429);
  const addr = `${prof.melo_address}@melo.to`;
  const name = (prof.full_name || prof.melo_address).replace(/[<>"]/g, "");
  const key = await getKey();
  const r = await fetch("https://delivrie.io/api/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ from: `${name} <${addr}>`, to, subject: subject || "(no subject)", html: plainMail(body, name, addr), text: body }),
  });
  if (!r.ok) { console.error("send_mail", r.status, await r.text()); return json(req, { error: "We couldn’t send that email. Try again in a minute." }, 502); }
  const ws = typeof p.workspace_id === "string" && p.workspace_id ? p.workspace_id : null;
  const { data: row } = await admin.from("mail_messages").insert({ user_id: u.id, workspace_id: ws, folder: "sent", from_addr: addr, to_addrs: to, subject: subject || "(no subject)", body }).select("id, created_at").single();
  return json(req, { ok: true, id: row?.id, created_at: row?.created_at });
}


// A melo.to address has no mailbox yet, so codes go to the email the account was created with.
async function resolveEmail(email: string) {
  const m = email.match(/^([a-z0-9.]+)@melo\.to$/);
  if (!m) return email;
  const { data: prof } = await admin.from("profiles").select("id").eq("melo_address", m[1]).maybeSingle();
  if (!prof) return "";
  const { data } = await admin.auth.admin.getUserById(prof.id);
  return (data?.user?.email ?? "").toLowerCase();
}
async function accountExists(email: string) {
  const { data } = await admin.rpc("account_email_exists", { p_email: email });
  return data === true;
}
async function mintSession(email: string) {
  let last: unknown = null;
  for (let i = 0; i < 2; i++) {
    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) { last = link.error; continue; }
    const p = link.data.properties;
    const type = (p.verification_type === "signup" ? "signup" : "magiclink") as "signup" | "magiclink";
    let r = await anon.auth.verifyOtp({ type, token_hash: p.hashed_token });
    if ((r.error || !r.data.session) && p.email_otp) r = await anon.auth.verifyOtp({ type: "email", email, token: p.email_otp });
    if (!r.error && r.data.session) return r.data.session;
    last = r.error; console.error("mintSession", i, p.verification_type, r.error);
  }
  throw last ?? new Error("No session");
}
const mask = (e: string) => e.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + "•".repeat(Math.min(Math.max(b.length, 2), 6)) + c);

/* ---------- Melo-only accounts: address + password, no other email needed ---------- */
const MELO = /^[a-z0-9]([a-z0-9.]{1,28}[a-z0-9])$/;
const meloAuthEmail = (addr: string) => `${addr}@melo.to`;
const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
async function throttled(key: string, kind: string, max: number, minutes: number) {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { count } = await admin.from("auth_attempts").select("key", { count: "exact", head: true }).eq("key", key).eq("kind", kind).gte("at", since);
  return (count ?? 0) >= max;
}
const note = (key: string, kind: string) => admin.from("auth_attempts").insert({ key, kind });
const pwProblem = (pw: string) => pw.length < 8 ? "Use at least 8 characters." : pw.length > 72 ? "Use 72 characters or fewer." : /^(.)\1+$/.test(pw) || /^(password|12345678|123456789|qwerty123|11111111)$/i.test(pw) ? "Pick a less common password." : "";
const sessionOut = (s: { access_token: string; refresh_token: string; expires_at?: number; user: { id: string; email?: string } }) =>
  ({ session: { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, user: { id: s.user.id, email: s.user.email } } });
/* Resolve "alex", "alex@melo.to" → the profile and its auth user */
async function meloAccount(typed: string) {
  const addr = typed.trim().toLowerCase().replace(/@melo\.to$/, "");
  if (!MELO.test(addr)) return null;
  const { data: prof } = await admin.from("profiles").select("id, full_name, recovery_email").eq("melo_address", addr).maybeSingle();
  if (!prof) return { addr, prof: null, authEmail: "" };
  const { data } = await admin.auth.admin.getUserById(prof.id);
  return { addr, prof, authEmail: (data?.user?.email ?? "").toLowerCase() };
}
/* One-time codes for recovery / reset, stored hashed like sign-in codes */
async function issueCode(key: string, to: string, line: string) {
  const { data: row } = await admin.from("email_codes").select("*").eq("email", key).maybeSingle();
  const now = Date.now();
  let sends = 1, windowStart = new Date().toISOString();
  if (row) {
    const inWindow = now - new Date(row.window_start).getTime() < 3600_000;
    if (inWindow && row.sends >= 5) throw new Error("Too many codes requested. Try again in an hour.");
    if (inWindow) { sends = row.sends + 1; windowStart = row.window_start; }
  }
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  await send(to, code, line);
  await admin.from("email_codes").upsert({ email: key, code_hash: await sha(`${key}:${code}:${pepper}`), expires_at: new Date(now + 600_000).toISOString(), attempts: 0, sends, window_start: windowStart });
}
async function checkCode(key: string, code: string) {
  const c = code.replace(/\D/g, "");
  if (c.length !== 6) return "Enter all 6 digits.";
  const { data: row } = await admin.from("email_codes").select("*").eq("email", key).maybeSingle();
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return "That code has expired. Request a new one.";
  if (row.attempts >= 5) return "Too many tries. Request a new code.";
  if (row.code_hash !== await sha(`${key}:${c}:${pepper}`)) { await admin.from("email_codes").update({ attempts: row.attempts + 1 }).eq("email", key); return "That code doesn’t match. Check the latest email we sent."; }
  await admin.from("email_codes").delete().eq("email", key);
  return "";
}

type Body = Record<string, unknown>;
async function meloActions(req: Request, p: Body): Promise<Response | null> {
  const a = String(p.action ?? "");
  const ip = clientIp(req);

  if (a === "signin_method") {
    const typed = String(p.email ?? "").trim().toLowerCase();
    if (/@melo\.to$/.test(typed) || (!typed.includes("@") && typed)) {
      const acct = await meloAccount(typed);
      if (!acct?.prof) return json(req, { error: "We couldn’t find a Melo account for that address.", code: "no_account" }, 404);
      return json(req, { method: acct.authEmail === meloAuthEmail(acct.addr) ? "password" : "code", address: meloAuthEmail(acct.addr) });
    }
    return json(req, { method: "code" });
  }

  if (a === "melo_signup") {
    const name = String(p.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const addr = String(p.address ?? "").trim().toLowerCase().replace(/@melo\.to$/, "");
    const pw = String(p.password ?? "");
    if (name.length < 2) return json(req, { error: "Enter your name." }, 400);
    const bad = pwProblem(pw); if (bad) return json(req, { error: bad }, 400);
    const { data: free } = await admin.rpc("melo_address_available", { p_user: addr });
    if (free !== true) return json(req, { error: `${addr}@melo.to isn’t available. Try another.` }, 409);
    if (await throttled(ip, "signup", 5, 60)) return json(req, { error: "Too many new accounts from this network. Try again in an hour." }, 429);
    await note(ip, "signup");
    const created = await admin.auth.admin.createUser({ email: meloAuthEmail(addr), password: pw, email_confirm: true, user_metadata: { full_name: name } });
    if (created.error || !created.data.user) { console.error("melo_signup", created.error); return json(req, { error: `${addr}@melo.to isn’t available. Try another.` }, 409); }
    const uid = created.data.user.id;
    const { error: pe } = await admin.from("profiles").upsert({ id: uid, full_name: name, melo_address: addr });
    if (pe) { await admin.auth.admin.deleteUser(uid); console.error("melo_signup profile", pe); return json(req, { error: `${addr}@melo.to isn’t available. Try another.` }, 409); }
    if (p.personal === true) await admin.rpc("create_personal_space", { p_user: uid, p_name: "Personal" });
    const { data: si, error: se } = await anon.auth.signInWithPassword({ email: meloAuthEmail(addr), password: pw });
    if (se || !si.session) { console.error("melo_signup signin", se); return json(req, { error: "Your account is ready — sign in to continue." }, 500); }
    return json(req, sessionOut(si.session));
  }

  if (a === "password_signin") {
    const acct = await meloAccount(String(p.email ?? ""));
    const pw = String(p.password ?? "");
    if (!acct?.prof) return json(req, { error: "We couldn’t find a Melo account for that address.", code: "no_account" }, 404);
    if (acct.authEmail !== meloAuthEmail(acct.addr)) return json(req, { error: "This account signs in with a code.", code: "use_code" }, 400);
    if (await throttled(acct.addr, "pw_fail", 8, 15) || await throttled(ip, "pw_fail", 30, 15)) return json(req, { error: "Too many attempts. Wait 15 minutes, or reset your password." }, 429);
    const { data, error } = await anon.auth.signInWithPassword({ email: acct.authEmail, password: pw });
    if (error || !data.session) { await note(acct.addr, "pw_fail"); await note(ip, "pw_fail"); return json(req, { error: "That password isn’t right." }, 401); }
    return json(req, sessionOut(data.session));
  }

  if (a === "reset_send") {
    const acct = await meloAccount(String(p.email ?? ""));
    if (!acct?.prof || acct.authEmail !== meloAuthEmail(acct.addr)) return json(req, { error: "We couldn’t find a Melo account for that address.", code: "no_account" }, 404);
    const rec = acct.prof.recovery_email;
    if (!rec) return json(req, { error: "This account has no recovery email, so we can’t reset the password by email. Contact support@melo.to from another address.", code: "no_recovery" }, 400);
    try { await issueCode(`reset:${acct.addr}`, rec, `Enter this code to reset the password for ${acct.addr}@melo.to.`); } catch (e) { return json(req, { error: (e as Error).message }, 429); }
    return json(req, { ok: true, to: mask(rec) });
  }

  if (a === "reset_verify") {
    const acct = await meloAccount(String(p.email ?? ""));
    if (!acct?.prof || acct.authEmail !== meloAuthEmail(acct.addr)) return json(req, { error: "We couldn’t find a Melo account for that address." }, 404);
    const pw = String(p.password ?? ""); const bad = pwProblem(pw); if (bad) return json(req, { error: bad }, 400);
    const err = await checkCode(`reset:${acct.addr}`, String(p.code ?? "")); if (err) return json(req, { error: err }, 400);
    const { error: ue } = await admin.auth.admin.updateUserById(acct.prof.id, { password: pw });
    if (ue) { console.error("reset", ue); return json(req, { error: "We couldn’t update the password. Try again." }, 500); }
    const { data } = await anon.auth.signInWithPassword({ email: acct.authEmail, password: pw });
    return data.session ? json(req, sessionOut(data.session)) : json(req, { ok: true });
  }

  /* Signed-in actions */
  if (["set_password", "recovery_send", "recovery_verify", "security_info"].includes(a)) {
    const { data: ud, error: ue } = await admin.auth.getUser(String(p.access_token ?? ""));
    if (ue || !ud.user) return json(req, { error: "Your session expired. Sign in again." }, 401);
    const u = ud.user;
    const { data: prof } = await admin.from("profiles").select("melo_address, recovery_email").eq("id", u.id).maybeSingle();
    const passwordAccount = Boolean(prof?.melo_address && (u.email ?? "").toLowerCase() === meloAuthEmail(prof.melo_address));
    if (a === "security_info") return json(req, { password_account: passwordAccount, recovery_email: prof?.recovery_email ?? null, sign_in_email: u.email });
    if (a === "set_password") {
      if (!passwordAccount) return json(req, { error: "Your account signs in with a code sent to your email." }, 400);
      const pw = String(p.password ?? ""); const bad = pwProblem(pw); if (bad) return json(req, { error: bad }, 400);
      if (await throttled(u.id, "pw_change", 6, 15)) return json(req, { error: "Too many attempts. Try again in 15 minutes." }, 429);
      const { error: ce } = await anon.auth.signInWithPassword({ email: u.email!, password: String(p.current ?? "") });
      if (ce) { await note(u.id, "pw_change"); return json(req, { error: "Your current password isn’t right." }, 401); }
      const { error } = await admin.auth.admin.updateUserById(u.id, { password: pw });
      return error ? json(req, { error: "We couldn’t update the password." }, 500) : json(req, { ok: true });
    }
    const email = String(p.email ?? "").trim().toLowerCase();
    if (!isEmail(email) || email.endsWith("@melo.to")) return json(req, { error: "Use an email outside Melo, like Gmail or Outlook." }, 400);
    if (a === "recovery_send") {
      try { await issueCode(`recovery:${u.id}:${email}`, email, "Enter this code to use this address as your Melo recovery email."); } catch (e) { return json(req, { error: (e as Error).message }, 429); }
      return json(req, { ok: true });
    }
    const err = await checkCode(`recovery:${u.id}:${email}`, String(p.code ?? "")); if (err) return json(req, { error: err }, 400);
    await admin.from("profiles").update({ recovery_email: email }).eq("id", u.id);
    return json(req, { ok: true, recovery_email: email });
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  let p: { action?: string; email?: string; code?: string; workspace_id?: string; access_token?: string; mode?: string; invite_id?: string; to?: unknown; subject?: unknown; body?: unknown };
  try { p = await req.json(); } catch { return json(req, { error: "Bad request" }, 400); }
  try { const r = await meloActions(req, p as Body); if (r) return r; }
  catch (e) { console.error("melo action", p.action, e); return json(req, { error: "Something went wrong. Try again." }, 500); }
  if (p.action === "invites") {
    try { return await sendInvites(req, String(p.workspace_id ?? ""), String(p.access_token ?? ""), p.invite_id ? String(p.invite_id) : undefined); }
    catch (e) { console.error(e); return json(req, { error: "We couldn’t send the invites." }, 500); }
  }
  if (p.action === "send_mail") {
    try { return await sendMail(req, String(p.access_token ?? ""), p); }
    catch (e) { console.error(e); return json(req, { error: "We couldn’t send that email." }, 500); }
  }
  if (p.action === "verify_domain") {
    try { return await verifyDomain(req, String(p.workspace_id ?? ""), String(p.access_token ?? "")); }
    catch (e) { console.error(e); return json(req, { error: "We couldn’t check the domain." }, 500); }
  }
  const typed = String(p.email ?? "").trim().toLowerCase();
  if (!isEmail(typed)) return json(req, { error: "Enter a valid email address." }, 400);
  const signin = p.mode === "signin";
  const email = await resolveEmail(typed);
  if (email && /@melo\.to$/.test(email)) return json(req, { error: "This account signs in with a password.", code: "use_password" }, 400);
  if (!email && !signin) return json(req, { error: "@melo.to addresses can’t receive mail yet. Use an email you already have." }, 400);
  if (!email || (signin && !(await accountExists(email)))) {
    return json(req, { error: "We couldn’t find a Melo account for that email.", code: "no_account" }, 404);
  }

  try {
    if (p.action === "send") {
      const { data: row } = await admin.from("email_codes").select("*").eq("email", email).maybeSingle();
      const now = Date.now();
      let sends = 1, windowStart = new Date().toISOString();
      if (row) {
        const inWindow = now - new Date(row.window_start).getTime() < 60 * 60 * 1000;
        if (inWindow && row.sends >= 5) return json(req, { error: "Too many codes requested. Try again in an hour." }, 429);
        if (inWindow) { sends = row.sends + 1; windowStart = row.window_start; }
      }
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
      await send(email, code, signin);
      const { error } = await admin.from("email_codes").upsert({
        email, code_hash: await sha(`${email}:${code}:${pepper}`), expires_at: new Date(now + 10 * 60 * 1000).toISOString(),
        attempts: 0, sends, window_start: windowStart,
      });
      if (error) throw error;
      return json(req, { ok: true, to: email === typed ? typed : mask(email) });
    }

    if (p.action === "verify") {
      const code = String(p.code ?? "").replace(/\D/g, "");
      if (code.length !== 6) return json(req, { error: "Enter all 6 digits." }, 400);
      const { data: row } = await admin.from("email_codes").select("*").eq("email", email).maybeSingle();
      if (!row || new Date(row.expires_at).getTime() < Date.now()) return json(req, { error: "That code has expired. Request a new one." }, 400);
      if (row.attempts >= 5) return json(req, { error: "Too many tries. Request a new code." }, 429);
      if (row.code_hash !== await sha(`${email}:${code}:${pepper}`)) {
        await admin.from("email_codes").update({ attempts: row.attempts + 1 }).eq("email", email);
        return json(req, { error: "That code doesn’t match. Check the latest email we sent." }, 400);
      }
      // Make sure the account exists and is confirmed first, so the link below is always a plain magic link.
      if (!(await accountExists(email))) {
        const created = await admin.auth.admin.createUser({ email, email_confirm: true });
        if (created.error && !(await accountExists(email))) throw created.error;
      }
      const s = await mintSession(email);
      // Only spend the code once the session exists, so a hiccup here can be retried with the same code.
      await admin.from("email_codes").delete().eq("email", email);
      return json(req, { session: { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, user: { id: s.user.id, email: s.user.email } } });
    }
    return json(req, { error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json(req, { error: e instanceof Error && /couldn|isn/.test(e.message) ? e.message : "Something went wrong. Try again." }, 500);
  }
});
