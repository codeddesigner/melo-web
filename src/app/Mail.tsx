import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, type MailMessage } from "../lib/api";
import { Link, navigate, useLocation } from "../lib/router";
import { cx, dayLabel, fmtShort, fmtTime, isEmail } from "../lib/util";
import { Icon } from "../components/icons";
import { Avatar, Button, Empty, IconButton, Skeleton, Tag, useAsync, useExitGhost, useToast } from "../components/ui";
import { useApp } from "./context";
import { Panel, SideItem, SideLabel, SideNav, SideSearch } from "./AppRoot";

type Folder = "inbox" | "sent" | "drafts";
const PROVIDER: Record<string, string> = { google: "Google Workspace", microsoft: "Microsoft 365", imap: "your mail server", melodomain: "your domain" };

export default function Mail() {
  const { account, ws, people } = useApp();
  const { parts } = useLocation();
  const toast = useToast();
  const folder = (["inbox", "sent", "drafts"].includes(parts[2] ?? "") ? parts[2] : "inbox") as Folder;
  const openId = parts[3];
  const [q, setQ] = useState("");
  const [compose, setCompose] = useState<Partial<MailMessage> | null>(null);
  const sent = useAsync<MailMessage[]>(() => api.mail("sent"), []);
  const drafts = useAsync<MailMessage[]>(() => api.mail("draft"), []);
  const addr = account.profile?.melo_address ? `${account.profile.melo_address}@melo.to` : null;
  const list = (folder === "sent" ? sent.data : folder === "drafts" ? drafts.data : []) ?? [];
  const shown = list.filter((m) => !q || `${m.subject} ${m.body} ${m.to_addrs.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  const open = list.find((m) => m.id === openId);
  const loading = folder === "sent" ? sent.loading && !sent.data : folder === "drafts" ? drafts.loading && !drafts.data : false;
  const nameFor = (email: string) => people.find((p) => p.email === email || (p.melo_address && `${p.melo_address}@melo.to` === email))?.name || email;

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && !compose && !document.querySelector("[aria-modal='true']") && !(e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")) { e.preventDefault(); setCompose({}); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [compose]);

  return (
    <>
      <SideNav title="Mail" action={<Button size="s" icon="plus" onClick={() => setCompose({})}>Compose</Button>}>
        <SideSearch value={q} onChange={setQ} placeholder="Search mail" />
        <SideItem to="/app/mail/inbox" icon="inbox" label="Inbox" active={folder === "inbox"} />
        <SideItem to="/app/mail/sent" icon="send" label="Sent" count={sent.data?.length} active={folder === "sent"} />
        <SideItem to="/app/mail/drafts" icon="doc" label="Drafts" count={drafts.data?.length} active={folder === "drafts"} />
        <SideLabel>Accounts</SideLabel>
        {addr && <SideItem icon="mail" label={addr} onClick={() => navigate("/app/mail/sent")} />}
        <SideItem icon="mail" label={account.email} onClick={() => navigate("/app/mail/inbox")} />
        <span className="flex-1" />
        <Link to="/app/settings/rules" className="mt-6 flex gap-2.5 rounded-2xl bg-white p-3.5 text-sm shadow-[0_0_0_1px_var(--color-line)] hover:-translate-y-px hover:shadow-pop">
          <Icon name="shield" className="mt-0.5 text-icon" /><span><b className="block font-medium">Workspace rules</b><span className="text-accent-ink">Review what gets filtered</span></span>
        </Link>
      </SideNav>
      <Panel className="flex-row">
        <div className={cx("flex min-w-0 flex-col", open ? "hidden w-[420px] border-r border-line lg:flex" : "flex-1")}>
          <header className="flex h-16 shrink-0 items-center gap-3 px-4 md:px-6">
            <h2 className="text-[22px] font-medium capitalize tracking-[-.2px]">{folder}</h2>
            <span className="flex-1" />
            {folder !== "inbox" && <IconButton icon="refresh" label="Refresh" onClick={() => (folder === "sent" ? sent : drafts).reload()} />}
          </header>
          <div className="melo-scroll flex-1 overflow-y-auto px-3 pb-6">
            {folder === "inbox" ? <InboxState addr={addr} provider={ws.mail_provider} email={account.email} onCompose={() => setCompose({})} />
              : loading ? <div className="flex flex-col gap-2 px-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
              : !shown.length ? <Empty icon={folder === "sent" ? "send" : "doc"} title={q ? "No mail matches that" : folder === "sent" ? "Nothing sent yet" : "No drafts"}
                  body={folder === "sent" ? (addr ? `Mail you send from ${addr} shows up here.` : "Claim a @melo.to address to send mail from Melo.") : "Close the composer before sending and your draft is saved here."}
                  action={!q && <Button icon="plus" onClick={() => setCompose({})}>Compose</Button>} />
              : <MailList items={shown} folder={folder} openId={openId} nameFor={nameFor} onDraft={(m) => setCompose(m)} />}
          </div>
        </div>
        {open && folder === "sent" && <Reader m={open} nameFor={nameFor} onClose={() => navigate("/app/mail/sent")} onForward={() => setCompose({ subject: `Fwd: ${open.subject}`, body: `\n\n---------- Forwarded message ----------\n${open.body}` })} />}
      </Panel>
      {compose && <Composer initial={compose} from={addr} onClose={(saved) => { setCompose(null); drafts.reload(); if (saved) toast("Draft saved"); }}
        onSent={() => { setCompose(null); sent.reload(); drafts.reload(); toast("Email sent"); navigate("/app/mail/sent"); }} />}
    </>
  );
}

function InboxState({ addr, provider, email, onCompose }: { addr: string | null; provider: string | null; email: string; onCompose: () => void }) {
  const external = provider && provider !== "melo" ? PROVIDER[provider] : null;
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center animate-fade-up">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Icon name="inbox" className="size-6" /></span>
      <h3 className="mt-4 text-[19px] font-medium">You’re all caught up</h3>
      <p className="mt-2 max-w-md text-sm text-ink-2">
        {addr ? <>Melo inboxes for <b className="font-medium">{addr}</b> are opening soon. Until then, you can send from Melo and replies arrive at <b className="font-medium">{email}</b>.</>
          : <>Claim a free @melo.to address to send mail from Melo. Replies arrive at <b className="font-medium">{email}</b> until Melo inboxes open.</>}
      </p>
      {external && <p className="mt-3 max-w-md text-sm text-ink-3">Connecting {external} so your existing mail appears here is on the way — we’ll email you when it’s ready.</p>}
      <div className="mt-5 flex gap-2">
        {addr ? <Button icon="plus" onClick={onCompose}>Write an email</Button> : <Button onClick={() => navigate("/app/settings/profile")}>Claim a @melo.to address</Button>}
        <Button variant="soft" onClick={() => navigate("/app/team")}>Open Team chat</Button>
      </div>
    </div>
  );
}

function MailList({ items, folder, openId, nameFor, onDraft }: { items: MailMessage[]; folder: Folder; openId?: string; nameFor: (e: string) => string; onDraft: (m: MailMessage) => void }) {
  let lastDay = "";
  return (
    <div className="flex flex-col">
      {items.map((m) => {
        const day = dayLabel(m.created_at), header = day !== lastDay ? day : ""; lastDay = day;
        const to = m.to_addrs.map(nameFor).join(", ") || "No recipients";
        return (
          <div key={m.id}>
            {header && <p className="px-3 pt-4 pb-1 text-xs text-ink-3">{header}</p>}
            <button type="button" onClick={() => (folder === "drafts" ? onDraft(m) : navigate(`/app/mail/sent/${m.id}`))}
              className={cx("relative grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left animate-fade-up active:scale-[.99]", openId === m.id ? "bg-accent-soft" : "hover:bg-hover")}>
              {openId === m.id && <span className="absolute left-0 top-3 h-6 w-0.5 rounded bg-accent animate-fade-in" />}
              <Avatar name={to} id={m.to_addrs[0]} size={28} />
              <span className="min-w-0">
                <span className="flex items-center gap-2"><span className="truncate font-medium">{folder === "drafts" && <span className="text-bad">Draft · </span>}To {to}</span></span>
                <span className="block truncate text-sm"><span className="text-ink">{m.subject || "(no subject)"}</span> <span className="text-ink-3">{m.body.slice(0, 120)}</span></span>
              </span>
              <span className="text-xs text-ink-3">{fmtShort(m.created_at)}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Reader({ m, nameFor, onClose, onForward }: { m: MailMessage; nameFor: (e: string) => string; onClose: () => void; onForward: () => void }) {
  const { account } = useApp();
  return (
    <article className="flex min-w-0 flex-1 flex-col animate-fade-up">
      <header className="flex h-16 shrink-0 items-center gap-1 border-b border-line px-5">
        <IconButton icon="chev-left" label="Back to Sent" onClick={onClose} />
        <span className="flex-1" />
        <Button variant="soft" size="s" icon="send" onClick={onForward}>Forward</Button>
      </header>
      <div className="melo-scroll flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <h2 className="text-[20px] font-medium">{m.subject || "(no subject)"}</h2>
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={account.profile?.full_name || m.from_addr} size={36} dark />
          <div className="min-w-0 flex-1"><p className="font-medium">{account.profile?.full_name || m.from_addr} <span className="font-normal text-ink-3">&lt;{m.from_addr}&gt;</span></p>
            <p className="truncate text-[13px] text-ink-3">to {m.to_addrs.map(nameFor).join(", ")}</p></div>
          <span className="text-xs text-ink-3">{new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, {fmtTime(m.created_at)}</span>
        </div>
        <div className="mt-6 whitespace-pre-wrap text-[15px] leading-[24px]">{m.body}</div>
        <div className="mt-8"><Tag tone="ok" icon="check">Sent from Melo</Tag></div>
      </div>
    </article>
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
