import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, type MailCategory, type MailMessage } from "../lib/api";
import { Link, navigate, useLocation } from "../lib/router";
import { cx, dayLabel, fmtShort, fmtTime, isEmail } from "../lib/util";
import { Icon } from "../components/icons";
import { Avatar, Button, Empty, IconButton, Menu, Skeleton, Tag, useAsync, useExitGhost, useToast } from "../components/ui";
import { useApp } from "./context";
import { Panel, SideItem, SideLabel, SideNav, SideSearch } from "./AppRoot";

type Folder = "inbox" | "later" | "newsletters" | "receipts" | "screener" | "updates" | "sent" | "drafts";
const SORTED: { key: MailCategory; label: string; dot: string; blurb: string }[] = [
  { key: "newsletters", label: "Newsletters", dot: "#1e5a96", blurb: "Newsletters and digests wait here, out of Primary." },
  { key: "receipts", label: "Receipts", dot: "#1f6b3a", blurb: "Orders, invoices and shipping updates, all in one place." },
  { key: "screener", label: "Screener", dot: "#5b3fbf", blurb: "First-time senders wait here until you say yes." },
  { key: "updates", label: "Updates", dot: "#9a4b0f", blurb: "Sign-in alerts, codes and account notices." },
];
const INBOXISH = new Set<Folder>(["inbox", "later", "newsletters", "receipts", "screener", "updates"]);
const snoozed = (m: MailMessage) => Boolean(m.snoozed_until && Date.parse(m.snoozed_until) > Date.now());
const cat = (m: MailMessage) => m.category ?? "primary";
/* Snooze presets (Figma: Later → H / T / W / D) */
export function snoozeOptions(now = new Date()) {
  const at = (d: Date, h: number) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x; };
  const add = (n: number) => { const x = new Date(now); x.setDate(x.getDate() + n); return x; };
  const later = new Date(now.getTime() + 3 * 3600_000); later.setMinutes(0, 0, 0);
  const sat = add(((6 - now.getDay() + 7) % 7) || 7), mon = add(((1 - now.getDay() + 7) % 7) || 7);
  const fmt = (d: Date) => d.toLocaleString("en-US", { weekday: "short", hour: "numeric" });
  return [
    { key: "H", label: "Later today", at: later }, { key: "T", label: "Tomorrow", at: at(add(1), 8) },
    { key: "W", label: "This weekend", at: at(sat, 9) }, { key: "D", label: "Next week", at: at(mon, 8) },
  ].map((o) => ({ ...o, when: fmt(o.at) }));
}
const PROVIDER: Record<string, string> = { google: "Google Workspace", microsoft: "Microsoft 365", imap: "your mail server", melodomain: "your domain" };

export default function Mail() {
  const { account, ws, people, personal } = useApp();
  const { parts } = useLocation();
  const toast = useToast();
  const folder = (["inbox", "sent", "drafts", ...(personal ? ["later", "newsletters", "receipts", "screener", "updates"] : ["later"])].includes(parts[2] ?? "") ? parts[2] : "inbox") as Folder;
  const [tab, setTab] = useState<"primary" | "other">("primary");
  const openId = parts[3];
  const [q, setQ] = useState("");
  const [compose, setCompose] = useState<Partial<MailMessage> | null>(null);
  const inbox = useAsync<MailMessage[]>(() => api.mail("inbox"), []);
  const sent = useAsync<MailMessage[]>(() => api.mail("sent"), []);
  /* New mail shows up without a refresh */
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") api.mail("inbox").then((rows) => inbox.set(() => rows), () => {}); }, 20_000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line
  const drafts = useAsync<MailMessage[]>(() => api.mail("draft"), []);
  const addr = account.profile?.melo_address ? `${account.profile.melo_address}@melo.to` : null;
  const src = INBOXISH.has(folder) ? inbox : folder === "sent" ? sent : drafts;
  const list = src.data ?? [];
  const all = inbox.data ?? [];
  const awake = all.filter((m) => !snoozed(m));
  const primary = personal ? awake.filter((m) => cat(m) === "primary") : awake;
  const other = awake.filter((m) => ["newsletters", "receipts", "updates"].includes(cat(m)));
  const byCat = (c: MailCategory) => awake.filter((m) => cat(m) === c);
  const view = folder === "inbox" ? (personal && tab === "other" ? other : primary) : folder === "later" ? all.filter(snoozed).sort((a, b) => Date.parse(a.snoozed_until!) - Date.parse(b.snoozed_until!)) : INBOXISH.has(folder) ? byCat(folder as MailCategory) : list;
  const shown = view.filter((m) => !q || `${m.subject} ${m.body} ${m.from_addr} ${m.from_name ?? ""} ${m.to_addrs.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  const open = list.find((m) => m.id === openId);
  const loading = src.loading && !src.data;
  const unread = primary.filter((m) => !m.read_at).length;
  const { setUnread } = useApp();
  useEffect(() => { if (inbox.data) setUnread((u) => (u.mail === unread ? u : { ...u, mail: unread })); }, [unread, inbox.data, setUnread]);
  const patch = (id: string, p: Partial<MailMessage>) => inbox.set((d) => (d ?? []).map((m) => (m.id === id ? { ...m, ...p } : m)));
  /* Opening an unread message marks it read */
  useEffect(() => {
    if (!open || !INBOXISH.has(folder) || open.read_at) return;
    const at = new Date().toISOString();
    inbox.set((d) => (d ?? []).map((m) => (m.id === open.id ? { ...m, read_at: at } : m)));
    api.markRead(open.id).catch(() => {});
  }, [open?.id]); // eslint-disable-line
  const remove = async (m: MailMessage, to: "archive" | "trash") => {
    inbox.set((d) => (d ?? []).filter((x) => x.id !== m.id)); navigate(`/app/mail/${folder}`);
    try { await api.moveMail(m.id, to); toast(to === "archive" ? "Archived" : "Moved to trash"); } catch (e) { toast((e as Error).message, "bad"); inbox.reload(); }
  };
  const snooze = async (m: MailMessage, until: Date | null) => {
    const v = until ? until.toISOString() : null;
    patch(m.id, { snoozed_until: v }); if (until) navigate(`/app/mail/${folder}`);
    try { await api.snooze(m.id, v); toast(until ? `Snoozed until ${until.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}` : "Back in your inbox"); } catch (e) { toast((e as Error).message, "bad"); inbox.reload(); }
  };
  const recategorize = async (m: MailMessage, c: MailCategory) => {
    patch(m.id, { category: c });
    try { await api.setCategory(m.id, c); toast(c === "primary" ? "Moved to Primary" : `Moved to ${c[0].toUpperCase()}${c.slice(1)}`); } catch (e) { toast((e as Error).message, "bad"); inbox.reload(); }
  };
  const screen = async (addr: string, status: "allowed" | "blocked") => {
    const a = addr.toLowerCase();
    inbox.set((d) => status === "blocked" ? (d ?? []).filter((m) => m.from_addr.toLowerCase() !== a) : (d ?? []).map((m) => (m.from_addr.toLowerCase() === a && cat(m) === "screener" ? { ...m, category: "primary" } : m)));
    if (open && open.from_addr.toLowerCase() === a) navigate(`/app/mail/${folder}`);
    try { await api.setSender(a, status); toast(status === "allowed" ? `${addr} can reach your Primary inbox` : `Blocked ${addr}`); } catch (e) { toast((e as Error).message, "bad"); inbox.reload(); }
  };
  const nameFor = (email: string) => people.find((p) => p.email === email || (p.melo_address && `${p.melo_address}@melo.to` === email))?.name || email;

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && !compose && !document.querySelector("[aria-modal='true']") && !(e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")) { e.preventDefault(); setCompose({}); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [compose]);

  return (
    <>
      <SideNav title="Mail" action={<Button size="s" icon="plus" onClick={() => setCompose({})}>Compose</Button>}>
        <SideSearch value={q} onChange={setQ} placeholder="Search mail" />
        <SideItem to="/app/mail/inbox" icon="inbox" label="Inbox" count={unread || undefined} accent active={folder === "inbox"} />
        <SideItem to="/app/mail/later" icon="clock" label="Later" count={all.filter(snoozed).length || undefined} active={folder === "later"} />
        <SideItem to="/app/mail/sent" icon="send" label="Sent" count={sent.data?.length} active={folder === "sent"} />
        <SideItem to="/app/mail/drafts" icon="doc" label="Drafts" count={drafts.data?.length} active={folder === "drafts"} />
        {personal && <><SideLabel>Sorted by Melo</SideLabel>
          {SORTED.map((c) => <SideItem key={c.key} to={`/app/mail/${c.key}`} dot={c.dot} label={c.label} count={byCat(c.key).filter((m) => c.key === "screener" || !m.read_at).length || undefined} active={folder === c.key} />)}</>}
        <SideLabel>Accounts</SideLabel>
        {addr && <SideItem icon="mail" label={addr} onClick={() => navigate("/app/mail/sent")} />}
        {account.email !== addr && <SideItem icon="mail" label={account.email} onClick={() => navigate("/app/mail/inbox")} />}
        <span className="flex-1" />
        {personal && <SortedCard count={all.filter((m) => cat(m) !== "primary" && Date.now() - Date.parse(m.created_at) < 86400_000).length} />}
        {!personal && <Link to="/app/settings/rules" className="mt-6 flex gap-2.5 rounded-2xl bg-white p-3.5 text-sm shadow-[0_0_0_1px_var(--color-line)] hover:-translate-y-px hover:shadow-pop">
          <Icon name="shield" className="mt-0.5 text-icon" /><span><b className="block font-medium">Workspace rules</b><span className="text-accent-ink">Review what gets filtered</span></span>
        </Link>}
      </SideNav>
      <Panel className="flex-row">
        <div className={cx("flex min-w-0 flex-col", open ? "hidden min-w-[360px] flex-1 border-r border-line lg:flex" : "flex-1")}>
          <header className="flex h-16 shrink-0 items-center gap-3 px-4 md:px-6">
            <h2 className="text-[20px] leading-[26px] font-medium tracking-[-.3px] capitalize">{folder}</h2>
            {personal && folder === "inbox" && <div role="tablist" aria-label="Inbox view" className="flex rounded-full bg-subtle p-0.5 text-[13px] shadow-[inset_0_0_0_1px_var(--color-line)]">
              {([["primary", "Primary", primary.filter((m) => !m.read_at).length], ["other", "Everything else", other.filter((m) => !m.read_at).length]] as const).map(([k, l, n]) => (
                <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => { setTab(k); if (openId) navigate("/app/mail/inbox"); }} className={cx("flex h-7 items-center gap-1.5 rounded-full px-3", tab === k ? "bg-white font-medium shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-ink-2 hover:text-ink")}>{l}{n > 0 && <span className="text-[11px] text-ink-3">{n}</span>}</button>))}
            </div>}
            <span className="flex-1" />
            <IconButton icon="refresh" label="Refresh" onClick={() => src.reload()} />
          </header>
          <div className="melo-scroll flex-1 overflow-y-auto px-3 pb-6">
            {loading ? <div className="flex flex-col gap-2 px-3"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
              : folder === "screener" && shown.length ? <ScreenerList items={shown} openId={openId} onDecide={screen} />
              : !["inbox", "sent", "drafts"].includes(folder) && !shown.length && !q ? <Empty icon={folder === "later" ? "clock" : "inbox"} title={folder === "later" ? "Nothing snoozed" : `No ${folder} right now`} body={folder === "later" ? "Snooze a message from the reader and it comes back at the time you pick." : SORTED.find((c) => c.key === folder)?.blurb} />
              : folder === "inbox" && tab === "other" && !shown.length && !q ? <Empty icon="inbox" title="Nothing else right now" body="Newsletters, receipts and updates land here so Primary stays about people." />
              : folder === "inbox" && !shown.length && !q ? <InboxState addr={addr} provider={ws.mail_provider} email={account.email} personal={personal} onCompose={() => setCompose({})} />
              : !shown.length ? <Empty icon={folder === "sent" ? "send" : "doc"} title={q ? "No mail matches that" : folder === "sent" ? "Nothing sent yet" : "No drafts"}
                  body={folder === "sent" ? (addr ? `Mail you send from ${addr} shows up here.` : "Claim a @melo.to address to send mail from Melo.") : "Close the composer before sending and your draft is saved here."}
                  action={!q && <Button icon="plus" onClick={() => setCompose({})}>Compose</Button>} />
              : <MailList items={shown} folder={folder} openId={openId} nameFor={nameFor} onDraft={(m) => setCompose(m)} showCat={personal && folder === "inbox" && tab === "other"} />}
          </div>
        </div>
        {open && folder !== "drafts" && <Reader m={open} nameFor={nameFor} onClose={() => navigate(`/app/mail/${folder}`)} personal={personal}
          onSnooze={open.folder === "inbox" ? (d) => snooze(open, d) : undefined} onMove={personal && open.folder === "inbox" ? (c) => recategorize(open, c) : undefined} onScreen={personal && open.folder === "inbox" && cat(open) === "screener" ? (st) => screen(open.from_addr, st) : undefined}
          onForward={() => setCompose({ subject: `Fwd: ${open.subject}`, body: `\n\n---------- Forwarded message ----------\nFrom: ${open.from_name ? `${open.from_name} <${open.from_addr}>` : open.from_addr}\n\n${open.body}` })}
          onReply={open.folder === "inbox" ? () => setCompose({ to_addrs: [open.from_addr], subject: /^re:/i.test(open.subject) ? open.subject : `Re: ${open.subject}`, body: `\n\nOn ${new Date(open.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}, ${open.from_name || open.from_addr} wrote:\n${open.body.split("\n").map((l) => `> ${l}`).join("\n")}` }) : undefined}
          onArchive={open.folder === "inbox" ? () => remove(open, "archive") : undefined} onTrash={open.folder === "inbox" ? () => remove(open, "trash") : undefined} />}
      </Panel>
      {compose && <Composer initial={compose} from={addr} onClose={(saved) => { setCompose(null); drafts.reload(); if (saved) toast("Draft saved"); }}
        onSent={() => { setCompose(null); sent.reload(); drafts.reload(); toast("Email sent"); navigate("/app/mail/sent"); }} />}
    </>
  );
}

function InboxState({ addr, provider, email, personal, onCompose }: { addr: string | null; provider: string | null; email: string; personal: boolean; onCompose: () => void }) {
  const external = provider && provider !== "melo" ? PROVIDER[provider] : null;
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center animate-fade-up">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink"><Icon name="inbox" className="size-6" /></span>
      <h3 className="mt-4 text-[19px] font-medium">{addr ? "You’re all caught up" : "Get your Melo inbox"}</h3>
      <p className="mt-2 max-w-md text-sm text-ink-2">
        {addr ? <>Mail sent to <b className="font-medium">{addr}</b> arrives here.</>
          : <>Claim a free @melo.to address to send and receive mail in Melo. You’ll keep signing in with <b className="font-medium">{email}</b>.</>}
      </p>
      {external && <p className="mt-3 max-w-md text-sm text-ink-3">Connecting {external} so your existing mail appears here is on the way — we’ll email you when it’s ready.</p>}
      <div className="mt-5 flex gap-2">
        {addr ? <Button icon="plus" onClick={onCompose}>Write an email</Button> : <Button onClick={() => navigate("/app/settings/profile")}>Claim a @melo.to address</Button>}
        {!personal && <Button variant="soft" onClick={() => navigate("/app/team")}>Open Team chat</Button>}
      </div>
    </div>
  );
}

const CAT_DOT: Record<string, string> = { newsletters: "#1e5a96", receipts: "#1f6b3a", updates: "#9a4b0f", screener: "#5b3fbf" };
function MailList({ items, folder, openId, nameFor, onDraft, showCat }: { items: MailMessage[]; folder: Folder; openId?: string; nameFor: (e: string) => string; onDraft: (m: MailMessage) => void; showCat?: boolean }) {
  let lastDay = "";
  return (
    /* Figma Mail · Inbox: one line per message once there's room — dot · sender · tag + subject + preview · time */
    <div className="@container flex flex-col">
      {items.map((m) => {
        const day = folder === "later" ? `Back ${dayLabel(m.snoozed_until!).toLowerCase()}` : dayLabel(m.created_at), header = day !== lastDay ? day : ""; lastDay = day;
        const to = m.to_addrs.map(nameFor).join(", ") || "No recipients";
        const inboxRow = INBOXISH.has(folder), unread = inboxRow && !m.read_at, sel = openId === m.id;
        const who = inboxRow ? (m.from_name || m.from_addr) : `To ${to}`;
        const c = cat(m);
        return (
          <div key={m.id}>
            {header && <p className="px-4 pt-4 pb-1.5 text-[13px] text-ink-2">{header}</p>}
            <button type="button" onClick={() => (folder === "drafts" ? onDraft(m) : navigate(`/app/mail/${folder}/${m.id}`))}
              className={cx("relative grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[10px] px-4 py-2.5 text-left text-[13px] animate-fade-up active:scale-[.995] @xl:h-11 @xl:grid-cols-[8px_150px_minmax(0,1fr)_auto] @xl:py-0", sel ? "bg-accent-soft" : "hover:bg-hover")}>
              {sel && <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-[10px] bg-accent animate-fade-in" />}
              <span className="hidden size-1.5 rounded-full @xl:block" style={{ background: unread ? "var(--color-accent)" : "transparent" }} aria-label={unread ? "Unread" : undefined} />
              <span className="@xl:hidden"><Avatar name={inboxRow ? who : to} id={inboxRow ? m.from_addr : m.to_addrs[0]} size={28} /></span>
              <span className={cx("truncate text-ink @xl:block", unread ? "font-semibold" : "font-normal", "hidden")}>{folder === "drafts" && <span className="text-bad">Draft · </span>}{who}</span>
              <span className="min-w-0">
                <span className={cx("flex items-center gap-2 truncate @xl:hidden", unread ? "font-semibold" : "")}>{unread && <span className="size-1.5 shrink-0 rounded-full bg-accent" />}<span className="truncate">{folder === "drafts" && <span className="text-bad">Draft · </span>}{who}</span></span>
                <span className="flex min-w-0 items-center gap-2">
                  {(showCat || (c !== "primary" && folder === "inbox")) && <span className="inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full bg-subtle px-2 text-[12px] capitalize text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line)]"><span className="size-1.5 rounded-full" style={{ background: CAT_DOT[c] ?? "#80868b" }} />{c === "receipts" ? "Receipt" : c}</span>}
                  <span className={cx("shrink-0 truncate text-ink", unread && "font-semibold")} style={{ maxWidth: "60%" }}>{m.subject || "(no subject)"}</span>
                  <span className="min-w-0 truncate text-ink-3">{m.body.replace(/\s+/g, " ").slice(0, 140)}</span>
                </span>
              </span>
              <span className={cx("text-[12px]", unread ? "font-medium text-ink" : "text-ink-3")}>{folder === "later" ? <span className="inline-flex items-center gap-1 text-pa-text"><Icon name="clock" className="size-3" />{fmtTime(m.snoozed_until!)}</span> : fmtShort(m.created_at)}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* Figma: the summary card at the top of a message — the asks, dates and questions, pulled out of the text */
export function summarize(body: string): string | null {
  const text = body.replace(/^>.*$/gm, "").replace(/\s+/g, " ").trim();
  if (text.length < 160) return null;
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9“"])/).map((x) => x.trim()).filter((x) => x.length > 12 && x.length < 260);
  const score = (x: string) => (/\?/.test(x) ? 3 : 0) + (/\b(can you|could you|please|need|let me know|would you|deadline|asap|by (mon|tue|wed|thu|fri|sat|sun|tomorrow|end of|eod|the)|before (mon|tue|wed|thu|fri|sat|sun|friday|monday))/i.test(x) ? 3 : 0)
    + (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|tonight|next week|\d{1,2}(:\d{2})?\s?(am|pm)|\d{1,2}(st|nd|rd|th))\b/i.test(x) ? 2 : 0)
    + (/[$€£]\s?\d|\d+%|\binvoice|payment|paid|due\b/i.test(x) ? 2 : 0) - (/unsubscribe|view in browser|privacy policy/i.test(x) ? 6 : 0);
  const picked = sentences.map((x, i) => ({ x, i, s: score(x) })).filter((o) => o.s >= 2).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, 2).sort((a, b) => a.i - b.i).map((o) => o.x);
  return picked.length ? picked.join(" ") : null;
}
function Summary({ m }: { m: MailMessage }) {
  const s = useMemo(() => summarize(m.body), [m.body]);
  if (!s) return null;
  return <div className="mt-5 flex gap-3 rounded-2xl bg-subtle px-4 py-3 text-[13px] leading-5 text-ink-2 animate-fade-up"><Icon name="sparkle" className="mt-0.5 size-4 shrink-0 text-accent" /><span><b className="mr-1 font-medium text-ink">Key points</b>{s}</span></div>;
}
function AddToWork({ m }: { m: MailMessage }) {
  const { ws } = useApp();
  const toast = useToast();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  useEffect(() => setState("idle"), [m.id]);
  const add = async () => {
    setState("busy");
    try {
      await api.createTask({ workspace_id: ws.id, title: (m.subject || "Follow up").slice(0, 300), status: "todo", priority: "normal", source: `${(m.from_name || m.from_addr).split(/[\s@]/)[0]}’s email`, source_ref: m.id, tags: [] });
      setState("done"); toast("Added to Work");
    } catch (e) { setState("idle"); toast((e as Error).message, "bad"); }
  };
  return state === "done"
    ? <Button variant="soft" size="s" icon="check" onClick={() => navigate("/app/work/mail")}>In Work</Button>
    : <Button variant="soft" size="s" icon="task" busy={state === "busy"} onClick={add}>Add to Work</Button>;
}

function ReplyKey({ onReply }: { onReply?: () => void }) {
  useEffect(() => {
    if (!onReply) return;
    const k = (e: KeyboardEvent) => { if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey && !e.altKey && !document.querySelector("[aria-modal='true']") && !(e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")) { e.preventDefault(); onReply(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onReply]);
  return null;
}

function SortedCard({ count }: { count: number }) {
  return (
    <Link to="/app/settings/filters" className="mt-6 flex gap-2.5 rounded-2xl bg-white p-3.5 text-sm shadow-[0_0_0_1px_var(--color-line)] hover:-translate-y-px hover:shadow-pop">
      <Icon name="shield" className="mt-0.5 text-icon" /><span><b className="block font-medium">{count} sorted out today</b><span className="text-pa-text">See what Melo moved</span></span>
    </Link>
  );
}

/* Screener: one row per new sender, decide once */
function ScreenerList({ items, openId, onDecide }: { items: MailMessage[]; openId?: string; onDecide: (addr: string, s: "allowed" | "blocked") => void }) {
  const senders = [...new Map(items.map((m) => [m.from_addr.toLowerCase(), m])).values()];
  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 pt-1 pb-2 text-[13px] text-ink-3">People emailing you for the first time. Allow them once and they go straight to Primary; block them and they’re gone for good.</p>
      {senders.map((m) => {
        const n = items.filter((x) => x.from_addr.toLowerCase() === m.from_addr.toLowerCase()).length;
        return (
          <div key={m.from_addr} className={cx("grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 rounded-xl px-3 py-2.5 animate-fade-up sm:grid-cols-[32px_minmax(0,1fr)_auto]", openId === m.id ? "bg-pa-soft" : "hover:bg-hover")}>
            <Avatar name={m.from_name || m.from_addr} id={m.from_addr} size={32} />
            <button type="button" className="min-w-0 text-left" onClick={() => navigate(`/app/mail/screener/${m.id}`)}>
              <span className="block truncate font-medium">{m.from_name || m.from_addr} <span className="font-normal text-ink-3">{m.from_addr}</span></span>
              <span className="block truncate text-sm text-ink-2">{m.subject || "(no subject)"}{n > 1 && <span className="text-ink-3"> · {n} emails</span>}</span>
            </button>
            <span className="col-span-2 flex gap-2 sm:col-span-1"><Button size="s" onClick={() => onDecide(m.from_addr, "allowed")}>Allow sender</Button><Button size="s" variant="soft" onClick={() => onDecide(m.from_addr, "blocked")}>Block</Button></span>
          </div>
        );
      })}
    </div>
  );
}

function Reader({ m, nameFor, onClose, onForward, onReply, onArchive, onTrash, onSnooze, onMove, onScreen, personal }: { m: MailMessage; nameFor: (e: string) => string; onClose: () => void; onForward: () => void; onReply?: () => void; onArchive?: () => void; onTrash?: () => void; onSnooze?: (d: Date | null) => void; onMove?: (c: MailCategory) => void; onScreen?: (s: "allowed" | "blocked") => void; personal?: boolean }) {
  const { account } = useApp();
  const incoming = m.folder === "inbox" || m.folder === "archive";
  const fromName = incoming ? (m.from_name || m.from_addr) : (account.profile?.full_name || m.from_addr);
  return (
    <article className={"flex min-w-0 flex-1 flex-col animate-fade-up lg:w-[440px] lg:flex-none xl:w-[480px]"}>
      <ReplyKey onReply={onReply} />
      <header className="flex h-16 shrink-0 items-center gap-1 border-b border-line px-5">
        <IconButton icon="chev-left" label={`Back to ${incoming ? "Inbox" : "Sent"}`} onClick={onClose} />
        {onArchive && <IconButton icon="archive" label="Archive" onClick={onArchive} />}
        {onTrash && <IconButton icon="trash" label="Delete" onClick={onTrash} className="hover:text-bad" />}
        {onSnooze && (snoozed(m)
          ? <Button variant="soft" size="s" icon="clock" onClick={() => onSnooze(null)}>Unsnooze</Button>
          : <Menu align="left" trigger={(t) => <IconButton icon="clock" label="Snooze" onClick={t} />} items={snoozeOptions().map((o) => ({ label: `${o.label} · ${o.when}`, icon: "clock" as const, onSelect: () => onSnooze(o.at) }))} />)}
        {onMove && <Menu align="left" trigger={(t) => <IconButton icon="filter" label="Move to" onClick={t} />} items={(["primary", "newsletters", "receipts", "updates"] as MailCategory[]).filter((c) => c !== cat(m)).map((c) => ({ label: c === "primary" ? "Move to Primary" : `Move to ${c[0].toUpperCase()}${c.slice(1)}`, icon: "inbox" as const, onSelect: () => onMove(c) }))} />}
        <span className="flex-1" />
        {!personal && incoming && <AddToWork m={m} />}
        {onReply && <Button size="s" icon="send" onClick={onReply}>Reply</Button>}
        <Button variant="soft" size="s" icon="send" onClick={onForward}>Forward</Button>
      </header>
      <div className="melo-scroll flex-1 overflow-y-auto px-5 py-6 md:px-8">
        {onScreen && <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-tag-purple-bg px-4 py-3 text-[13px] animate-fade-up"><Icon name="shield" className="size-4 text-tag-purple" /><span className="min-w-0 flex-1"><b className="font-medium">First email from {m.from_name || m.from_addr}.</b> Let them reach your Primary inbox?</span>
          <Button size="s" onClick={() => onScreen("allowed")}>Allow sender</Button><Button size="s" variant="soft" onClick={() => onScreen("blocked")}>Block</Button></div>}
        {personal && snoozed(m) && <p className="mb-4 flex items-center gap-2 text-[13px] text-pa-text"><Icon name="clock" className="size-4" />Snoozed until {new Date(m.snoozed_until!).toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit" })}</p>}
        <h2 className="text-[20px] font-medium">{m.subject || "(no subject)"}</h2>
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={fromName} id={incoming ? m.from_addr : undefined} size={36} dark={!incoming} />
          <div className="min-w-0 flex-1"><p className="truncate font-medium">{fromName} <span className="font-normal text-ink-3">&lt;{m.from_addr}&gt;</span></p>
            <p className="truncate text-[13px] text-ink-3">to {m.to_addrs.map(nameFor).join(", ")}</p></div>
          <span className="text-xs text-ink-3">{new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, {fmtTime(m.created_at)}</span>
        </div>
        {incoming && <Summary m={m} />}
        {incoming ? <MailBody m={m} /> : <div className="mt-6 whitespace-pre-wrap break-words text-[15px] leading-[24px]">{m.body}</div>}
        {!incoming && <div className="mt-8"><Tag tone="ok" icon="check">Sent from Melo</Tag></div>}
      </div>
      {/* Figma: quick reply bar at the foot of the reader (press R) */}
      {onReply && <div className="shrink-0 p-4 pt-2"><button type="button" onClick={onReply} className="flex h-11 w-full items-center rounded-2xl border border-line-2 bg-white px-4 text-left text-[13px] text-ink-3 hover:border-ink-4 hover:shadow-[0_1px_2px_rgba(0,0,0,.05)]">
        <span className="flex-1 truncate">Reply to {(m.from_name || m.from_addr).split(/\s+/)[0]}…</span><kbd className="rounded-md border border-line px-1.5 text-[11px] text-ink-3">R</kbd></button></div>}
    </article>
  );
}

/* Received mail: HTML in a locked-down frame (no scripts; remote images only when asked), else plain text */
function MailBody({ m }: { m: MailMessage }) {
  const [html, setHtml] = useState<string | null | undefined>(undefined);
  const [images, setImages] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => { let live = true; setHtml(undefined); setImages(false); api.mailHtml(m.id).then((h) => live && setHtml(h), () => live && setHtml(null)); return () => { live = false; }; }, [m.id]);
  const remote = Boolean(html && /<img[^>]+src=["']?https?:/i.test(html));
  const csp = `default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data: cid:${images ? " https: http:" : ""}`;
  const doc = html ? `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank"><style>body{margin:0;font:15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f1f1f;word-wrap:break-word}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${html}</body></html>` : "";
  const fit = () => { const el = frame.current; const d = el?.contentDocument; if (el && d?.body) el.style.height = `${Math.max(120, d.documentElement.scrollHeight)}px`; };
  if (html === undefined) return <div className="mt-6 flex flex-col gap-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>;
  if (!html) return <div className="mt-6 whitespace-pre-wrap break-words text-[15px] leading-[24px] animate-fade-in">{m.body}</div>;
  return (
    <div className="mt-6 animate-fade-in">
      {remote && !images && <div className="mb-3 flex items-center gap-2 rounded-xl bg-subtle px-3 py-2 text-[13px] text-ink-2"><Icon name="eye-off" className="size-4" />Images from the web are hidden to protect your privacy.<button type="button" className="ml-auto font-medium text-accent-ink hover:underline" onClick={() => setImages(true)}>Show images</button></div>}
      <iframe key={String(images)} ref={frame} title="Message" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" srcDoc={doc} onLoad={fit} className="block w-full rounded-lg border-0" style={{ height: 160 }} />
    </div>
  );
}

function Composer({ initial, from, onClose, onSent }: { initial: Partial<MailMessage>; from: string | null; onClose: (savedDraft: boolean) => void; onSent: () => void }) {
  const { ws, people } = useApp();
  const toast = useToast();
  const [to, setTo] = useState<string[]>(initial.to_addrs ?? []);
  const [typed, setTyped] = useState("");
  const [subject, setSubject] = useState(initial.subject ?? "");
  const [body, setBody] = useState(initial.body ?? "");
  const [busy, setBusy] = useState(false);
  const [min, setMin] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useExitGhost(root, "rise-out");
  const commit = () => {
    const parts = typed.split(/[\s,;]+/).filter(Boolean);
    const good = parts.filter(isEmail).map((x) => x.toLowerCase());
    if (good.length) setTo((t) => [...new Set([...t, ...good])]);
    setTyped(parts.filter((p) => !isEmail(p)).join(" "));
    return parts.every(isEmail);
  };
  const suggestions = typed.length > 1 ? people.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(typed.toLowerCase()) && !to.includes(p.email)).slice(0, 4) : [];
  const send = async () => {
    if (!from) return toast("Claim a @melo.to address first — Settings → Profile.", "bad");
    const ok = commit();
    const recipients = [...new Set([...to, ...typed.split(/[\s,;]+/).filter(isEmail)])];
    if (!ok || !recipients.length) return toast(recipients.length ? "Check the recipients." : "Add a recipient.", "bad");
    setBusy(true);
    try { await api.sendMail(recipients, subject, body, ws.id); if (initial.id) await api.deleteMail(initial.id).catch(() => {}); onSent(); }
    catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); }
  };
  const close = async () => {
    const dirty = to.length || typed.trim() || subject.trim() || body.trim();
    if (!dirty || !from) { if (initial.id && !dirty) await api.deleteMail(initial.id).catch(() => {}); return onClose(false); }
    try { await api.saveDraft({ id: initial.id, to: [...to, ...typed.split(/[\s,;]+/).filter(isEmail)], subject, body, from, ws: ws.id }); onClose(true); }
    catch (e) { toast((e as Error).message, "bad"); onClose(false); }
  };
  return createPortal(
    <div ref={root} role="dialog" aria-label="New email" className={cx("melo-app fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-2xl bg-white shadow-modal animate-rise transition-[height] duration-300 ease-[cubic-bezier(.22,1,.36,1)] sm:left-auto sm:right-6 sm:w-[min(640px,calc(100vw-48px))]", min ? "h-12" : "h-[min(520px,85dvh)]")}>
      <div className="flex h-12 shrink-0 cursor-default items-center gap-1 border-b border-line px-4" onDoubleClick={() => setMin(!min)}>
        <span className="min-w-0 flex-1 truncate font-medium">{subject || "New email"}</span>
        <IconButton icon="chev-down" label={min ? "Expand" : "Minimise"} className={cx("duration-300", min && "rotate-180")} onClick={() => setMin(!min)} />
        <IconButton icon="x" label="Close and save draft" onClick={close} />
      </div>
      {!min && <>
        {!from && <div className="flex items-center gap-2 bg-warn-soft px-4 py-2 text-sm text-warn"><Icon name="mail" />Sending needs a @melo.to address. <Link to="/app/settings/profile" className="font-medium underline">Claim one</Link></div>}
        <div className="relative flex min-h-11 flex-wrap items-center gap-1.5 border-b border-line px-4 py-1.5 text-sm">
          <span className="w-14 text-ink-3">To</span>
          {to.map((e) => <span key={e} className="flex h-7 items-center gap-1.5 rounded-full bg-hover pl-1 pr-2 animate-pop"><Avatar name={e} size={20} />{e}<button type="button" aria-label={`Remove ${e}`} onClick={() => setTo(to.filter((x) => x !== e))}><Icon name="x" className="size-3" /></button></span>)}
          <input aria-label="To" value={typed} onChange={(e) => setTyped((e.target as HTMLInputElement).value)} onBlur={commit} autoFocus={!to.length}
            onKeyDown={(e) => { if ([",", "Enter", " ", "Tab"].includes(e.key) && typed.trim()) { e.preventDefault(); commit(); } if (e.key === "Backspace" && !typed && to.length) setTo(to.slice(0, -1)); }}
            className="h-7 min-w-[160px] flex-1 bg-transparent outline-none" placeholder={to.length ? "" : "name@company.com"} />
          {!!suggestions.length && (
            <div className="absolute left-16 top-full z-10 mt-1 w-72 rounded-2xl bg-white p-1.5 shadow-pop animate-pop">
              {suggestions.map((p) => <button key={p.user_id} type="button" onMouseDown={(e) => { e.preventDefault(); setTo([...to, p.email]); setTyped(""); }} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-hover"><Avatar name={p.name || p.email} id={p.user_id} size={24} /><span className="min-w-0"><b className="block truncate font-medium">{p.name || p.email}</b><span className="block truncate text-xs text-ink-3">{p.email}</span></span></button>)}
            </div>
          )}
        </div>
        <label className="flex h-11 items-center border-b border-line px-4 text-sm"><span className="w-14 text-ink-3">Subject</span><input aria-label="Subject" value={subject} onChange={(e) => setSubject((e.target as HTMLInputElement).value)} className="flex-1 bg-transparent font-medium outline-none" /></label>
        <textarea aria-label="Message" value={body} onChange={(e) => setBody((e.target as HTMLTextAreaElement).value)} autoFocus={to.length > 0} placeholder="Write your message…"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
          className="melo-scroll flex-1 resize-none px-4 py-3 text-[15px] leading-[24px] outline-none" />
        <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
          <Button icon="send" onClick={send} busy={busy} disabled={!from}>Send</Button>
          <span className="text-xs text-ink-3">{from ? `From ${from} · ⌘↵ to send` : ""}</span>
          <span className="flex-1" />
          <IconButton icon="trash" label="Discard" onClick={async () => { if (initial.id) await api.deleteMail(initial.id).catch(() => {}); onClose(false); }} />
        </div>
      </>}
    </div>, document.body);
}
