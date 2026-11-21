// Melo inbound mail: Delivrie calls this for every email that reaches @melo.to.
// It verifies the webhook signature, fetches the full message, and files a copy in each recipient's Melo inbox.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const ok = (body: unknown = { ok: true }, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let cache: Record<string, string> = {};
async function secret(name: string) {
  if (cache[name]) return cache[name];
  const { data } = await admin.rpc("get_app_secret", { p_name: name });
  cache[name] = (data as string) ?? "";
  return cache[name];
}

/* Standard Webhooks: HMAC-SHA256 over `${id}.${timestamp}.${body}`, key = base64 part after "whsec_" */
async function verified(req: Request, raw: string) {
  const id = req.headers.get("webhook-id"), ts = req.headers.get("webhook-timestamp"), sig = req.headers.get("webhook-signature");
  if (!id || !ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const whsec = await secret("delivrie_webhook_secret");
  if (!whsec) return false;
  const keyBytes = Uint8Array.from(atob(whsec.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${raw}`)));
  const expected = btoa(String.fromCharCode(...mac));
  return sig.split(" ").some((part) => {
    const [, value] = part.split(",");
    if (!value || value.length !== expected.length) return false;
    let diff = 0; for (let i = 0; i < value.length; i++) diff |= value.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

const addrOf = (v: string) => (v.match(/<([^>]+)>/)?.[1] ?? v).trim().toLowerCase();
const nameOf = (v: string) => { const m = v.match(/^\s*"?([^"<]*?)"?\s*</); return m && m[1].trim() ? m[1].trim() : null; };
const textFromHtml = (html: string) => html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\n{3,}/g, "\n\n").trim();
/* Where Melo files a message. People you know stay in Primary; the rest is sorted, never deleted. */
type Prefs = { filters?: { newsletters?: boolean; receipts?: boolean; updates?: boolean; screener?: boolean; senders?: { match: string; to: string; on?: boolean }[] } };
const NEWS = /(newsletter|digest|weekly|news@|noreply|no-reply|donotreply|marketing|promo|offers|deals@|hello@|team@|updates@|info@|mailer|substack|mailchimp|beehiiv)/i;
const RECEIPT = /(receipt|invoice|your order|order (confirmed|#|no)|payment (received|confirmation)|paid|purchase|shipped|shipping|delivery|booking confirm|reservation confirm|statement)/i;
const UPDATE = /(security alert|new sign-?in|verify|verification|password|one-time|your code|is your .* code|login|notification|reminder|account update)/i;
function classify(from: string, subject: string, text: string, prefs: Prefs, status: string | null, me: string) {
  const f = prefs.filters ?? {};
  const rule = (f.senders ?? []).find((r) => r.on !== false && r.match && from.includes(r.match.toLowerCase()));
  if (rule) return rule.to === "primary" ? "primary" : rule.to === "screener" ? "screener" : rule.to === "receipts" ? "receipts" : rule.to === "updates" ? "updates" : "newsletters";
  if (status === "allowed" || from.endsWith("@melo.to") && from.split("@")[0] === me) return "primary";
  if (f.newsletters !== false && (NEWS.test(from) || /unsubscribe/i.test(text.slice(-3000)))) return "newsletters";
  if (f.receipts !== false && RECEIPT.test(subject)) return "receipts";
  if (f.updates !== false && UPDATE.test(subject)) return "updates";
  if (f.screener === true && status !== "allowed") return "screener";
  return "primary";
}
const list = (v: unknown): string[] => Array.isArray(v) ? v.map((x) => typeof x === "string" ? x : String((x as { email?: string; address?: string })?.email ?? (x as { address?: string })?.address ?? "")) : typeof v === "string" ? v.split(",") : [];

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok({ error: "Method not allowed" }, 405);
  const raw = await req.text();
  if (!(await verified(req, raw))) return ok({ error: "Bad signature" }, 401);
  let evt: { type?: string; data?: Record<string, unknown> };
  try { evt = JSON.parse(raw); } catch { return ok({ error: "Bad JSON" }, 400); }
  if (evt.type !== "email.received" || !evt.data) return ok({ ignored: evt.type });
  const d = evt.data;
  const emailId = String(d.email_id ?? d.id ?? "");

  /* The webhook has the envelope only; fetch the message body */
  let full: Record<string, unknown> = {};
  if (emailId) {
    /* Reading needs a full-access key (vault: delivrie_read_key); the sending key can't read */
    const readKey = await secret("delivrie_read_key");
    if (readKey) {
      const r = await fetch(`https://delivrie.io/api/emails/${encodeURIComponent(emailId)}`, { headers: { Authorization: `Bearer ${readKey}` } });
      if (r.ok) { const j = await r.json(); full = (j && typeof j === "object" && "data" in j && j.data && typeof j.data === "object") ? j.data as Record<string, unknown> : j; }
      else console.error("fetch email", emailId, r.status, await r.text());
    } else console.error("delivrie_read_key missing: filing envelope only for", emailId);
  }
  const pick = (...keys: string[]) => { for (const k of keys) { const v = full[k] ?? d[k]; if (typeof v === "string" && v) return v; } return ""; };
  const from = pick("from");
  const html = pick("html", "html_body");
  const text = pick("text", "text_body", "plain") || (html ? textFromHtml(html) : "") || (Object.keys(full).length ? "" : "This message arrived, but its contents couldn’t be loaded yet.");
  const subject = pick("subject") || "(no subject)";
  const recipients = [...new Set([...list(full.to ?? d.to), ...list(full.cc ?? d.cc)].map(addrOf).filter(Boolean))];
  const created_at = pick("created_at") || new Date().toISOString();

  /* Route each @melo.to recipient to its owner (or an alias such as hello@) */
  let filed = 0;
  for (const rcpt of recipients) {
    const m = rcpt.match(/^([^@]+)@melo\.to$/); if (!m) continue;
    const local = m[1].split("+")[0];
    let owner: string | null = null;
    const { data: prof } = await admin.from("profiles").select("id").eq("melo_address", local).maybeSingle();
    if (prof) owner = prof.id;
    else { const { data: alias } = await admin.from("mail_aliases").select("user_id").eq("address", local).maybeSingle(); owner = alias?.user_id ?? null; }
    if (!owner) { console.log("no mailbox for", rcpt); continue; }
    const sender = addrOf(from);
    const [{ data: owned }, { data: known }] = await Promise.all([
      admin.from("profiles").select("prefs, melo_address").eq("id", owner).maybeSingle(),
      admin.from("mail_senders").select("status").eq("user_id", owner).eq("address", sender).maybeSingle(),
    ]);
    const status = known?.status ?? null;
    const category = classify(sender, subject, text, (owned?.prefs ?? {}) as Prefs, status, owned?.melo_address ?? "");
    const { error } = await admin.from("mail_messages").insert({
      user_id: owner, folder: status === "blocked" ? "trash" : "inbox", category, from_addr: sender || "unknown", from_name: nameOf(from),
      to_addrs: recipients, subject: subject.slice(0, 500), body: text.slice(0, 200_000), html: html ? html.slice(0, 1_000_000) : null,
      message_id: pick("message_id") || null, provider_id: emailId || null, created_at,
    });
    if (error && !/duplicate|unique/i.test(error.message)) console.error("file mail", rcpt, error); else filed++;
  }
  return ok({ ok: true, filed });
});
