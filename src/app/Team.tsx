import { useEffect, useMemo, useRef, useState } from "react";
import { api, auth, type Channel, type Message } from "../lib/api";
import { navigate, useLocation } from "../lib/router";
import { cx, dayLabel, fmtTime, sameDay, slugChannel } from "../lib/util";
import { Icon } from "../components/icons";
import { Avatar, Button, Empty, Field, IconButton, Input, Modal, Skeleton, useAsync, useToast } from "../components/ui";
import { useApp } from "./context";
import { Panel, SideItem, SideLabel, SideNav, SideSearch } from "./AppRoot";

const SEEN = "melo.seen";
const loadSeen = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(SEEN) || "{}"); } catch { return {}; } };
const markSeen = (id: string, at: string) => { const s = loadSeen(); s[id] = at; try { localStorage.setItem(SEEN, JSON.stringify(s)); } catch { /* ignore */ } };

export default function Team() {
  const { ws, person, nameOf, people, setUnread } = useApp();
  const { parts } = useLocation();
  const toast = useToast();
  const me = auth.get()?.user.id ?? "";
  const ch = useAsync<Channel[]>(() => api.channels(ws.id), [ws.id]);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [latest, setLatest] = useState<Record<string, { at: string; by: string }>>({});
  const channels = (ch.data ?? []).filter((c) => !c.dm_users);
  const dms = (ch.data ?? []).filter((c) => c.dm_users);
  const activeId = parts[2];
  const active = ch.data?.find((c) => c.id === activeId || (!c.dm_users && c.name === activeId));

  /* No channel in the URL (or one that no longer exists) → open #general */
  useEffect(() => {
    if (!ch.data?.length || active || ch.loading) return;
    const general = channels.find((c) => c.name === "general") ?? channels[0];
    if (general) navigate(`/app/team/${general.name}`, { replace: true });
  }, [ch.data, ch.loading, active]); // eslint-disable-line

  /* Unread dots: newest message per conversation in the last two weeks */
  useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        const rows = await api.latestMessages(ws.id, new Date(Date.now() - 14 * 86_400_000).toISOString());
        if (!live) return;
        const m: Record<string, { at: string; by: string }> = {};
        for (const r of rows) if (!m[r.channel_id]) m[r.channel_id] = { at: r.created_at, by: r.user_id };
        setLatest(m);
      } catch { /* keep last */ }
    };
    poll(); const t = setInterval(poll, 8000);
    return () => { live = false; clearInterval(t); };
  }, [ws.id]);
  const seen = loadSeen();
  const isUnread = (c: Channel) => { const l = latest[c.id]; return Boolean(l && l.by !== me && c.id !== active?.id && (!seen[c.id] || seen[c.id] < l.at)); };
  const unreadCount = (ch.data ?? []).filter(isUnread).length;
  useEffect(() => { setUnread({ team: unreadCount }); }, [unreadCount, setUnread]);

  const dmName = (c: Channel) => { const other = c.dm_users?.find((u) => u !== me) ?? me; return other === me ? `${nameOf(me)} (you)` : nameOf(other); };
  const openDm = async (user: string) => {
    try { const id = await api.openDm(ws.id, user); const list = await api.channels(ws.id); ch.set(() => list); navigate(`/app/team/${id}`); } catch (e) { toast((e as Error).message, "bad"); }
  };
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const dmUsers = new Set(dms.flatMap((d) => d.dm_users ?? []));
  const startable = people.filter((p) => p.user_id !== me && !dmUsers.has(p.user_id));

  return (
    <>
      <SideNav title="Team" action={<Button size="s" icon="plus" onClick={() => setCreating(true)}>New</Button>}>
        <SideSearch value={q} onChange={setQ} />
        <SideLabel action={<IconButton icon="plus" label="New channel" className="size-6" onClick={() => setCreating(true)} />}>Channels</SideLabel>
        {ch.loading && !ch.data && <><Skeleton className="mb-1 h-8" /><Skeleton className="h-8" /></>}
        {channels.filter((c) => match(c.name)).map((c) => (
          <SideItem key={c.id} to={`/app/team/${c.name}`} icon={c.is_private ? "lock" : "hash"} label={<span className={cx(isUnread(c) && "font-semibold")}>{c.name}</span>} active={active?.id === c.id} count={isUnread(c) ? "•" : undefined} accent />
        ))}
        <SideLabel>Direct messages</SideLabel>
        {dms.filter((c) => match(dmName(c))).map((c) => {
          const other = c.dm_users?.find((u) => u !== me) ?? me;
          return <SideItem key={c.id} to={`/app/team/${c.id}`} label={<span className="flex items-center gap-2"><Avatar name={nameOf(other)} id={other} size={20} /><span className={cx("truncate", isUnread(c) && "font-semibold")}>{dmName(c)}</span></span>} active={active?.id === c.id} count={isUnread(c) ? "•" : undefined} accent />;
        })}
        {startable.filter((p) => match(p.name ?? p.email)).map((p) => (
          <SideItem key={p.user_id} onClick={() => openDm(p.user_id)} label={<span className="flex items-center gap-2 text-ink-2"><Avatar name={p.name || p.email} id={p.user_id} size={20} /><span className="truncate">{p.name || p.email.split("@")[0]}</span></span>} />
        ))}
        {people.length <= 1 && <p className="px-2.5 pt-1 text-xs text-ink-3">Invite teammates in Settings → Members to start direct messages.</p>}
      </SideNav>
      <Panel>
        {ch.error ? <Empty icon="users" title="We couldn’t load your channels" body={ch.error} action={<Button onClick={ch.reload}>Try again</Button>} />
          : !active ? <div className="flex flex-1 items-center justify-center"><Skeleton className="h-6 w-40" /></div>
          : <Conversation key={active.id} channel={active} title={active.dm_users ? dmName(active) : `#${active.name}`} person={person} nameOf={nameOf} me={me} />}
      </Panel>
      <NewChannel open={creating} onClose={() => setCreating(false)} onCreated={(c) => { ch.set((d) => [...(d ?? []), c]); navigate(`/app/team/${c.name}`); }} />
    </>
  );
}

function Conversation({ channel, title, nameOf, me }: { channel: Channel; title: string; person: ReturnType<typeof useApp>["person"]; nameOf: (id: string) => string; me: string }) {
  const { ws, people } = useApp();
  const toast = useToast();
  const [msgs, setMsgs] = useState<Message[] | null>(null);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  useEffect(() => {
    let live = true, last = "";
    const load = async (first: boolean) => {
      try {
        const rows = await api.messages(channel.id, first ? undefined : last || undefined);
        if (!live) return;
        if (first) setMsgs(rows); else if (rows.length) setMsgs((m) => { const ids = new Set((m ?? []).map((x) => x.id)); return [...(m ?? []), ...rows.filter((r) => !ids.has(r.id))]; });
        const tail = rows[rows.length - 1]; if (tail) { last = tail.created_at; markSeen(channel.id, tail.created_at); }
        setErr("");
      } catch (e) { if (live && first) setErr((e as Error).message); }
    };
    load(true); const t = setInterval(() => load(false), 3000);
    return () => { live = false; clearInterval(t); };
  }, [channel.id]);
  useEffect(() => { const el = scroller.current; if (el && atBottom.current) el.scrollTop = el.scrollHeight; }, [msgs]);

  const send = async () => {
    const body = text.trim(); if (!body || sending) return;
    setSending(true); setText("");
    const temp: Message = { id: "tmp-" + Date.now(), channel_id: channel.id, workspace_id: ws.id, user_id: me, body, created_at: new Date().toISOString() };
    setMsgs((m) => [...(m ?? []), temp]); atBottom.current = true;
    try { const saved = await api.postMessage(ws.id, channel.id, body); setMsgs((m) => (m ?? []).map((x) => (x.id === temp.id ? saved : x))); markSeen(channel.id, saved.created_at); }
    catch (e) { setMsgs((m) => (m ?? []).filter((x) => x.id !== temp.id)); setText(body); toast((e as Error).message, "bad"); }
    finally { setSending(false); }
  };
  const del = async (id: string) => { try { await api.deleteMessage(id); setMsgs((m) => (m ?? []).filter((x) => x.id !== id)); } catch (e) { toast((e as Error).message, "bad"); } };

  const groups = useMemo(() => {
    const out: { day: string; items: (Message & { cont: boolean })[] }[] = [];
    (msgs ?? []).forEach((m, i, all) => {
      const prev = all[i - 1];
      const newDay = !prev || !sameDay(new Date(prev.created_at), new Date(m.created_at));
      if (newDay) out.push({ day: dayLabel(m.created_at), items: [] });
      const cont = Boolean(prev && !newDay && prev.user_id === m.user_id && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000);
      out[out.length - 1].items.push({ ...m, cont });
    });
    return out;
  }, [msgs]);
  const highlight = (body: string) => body.split(/(@[A-Za-z][\w.-]*(?:\s[A-Z][\w-]*)?)/g).map((part, i) =>
    part.startsWith("@") && people.some((p) => (p.name ?? "").toLowerCase().startsWith(part.slice(1).toLowerCase())) ? <span key={i} className="text-accent-ink">{part}</span> : part);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-6">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-[16px] font-medium">{!channel.dm_users && <Icon name="hash" className="size-4" />}{channel.dm_users ? title : channel.name}</h2>
          {channel.topic && <p className="truncate text-[13px] text-ink-3">{channel.topic}</p>}
        </div>
        {!channel.dm_users && <div className="flex -space-x-1.5">{people.slice(0, 4).map((p) => <Avatar key={p.user_id} name={p.name || p.email} id={p.user_id} size={24} className="ring-2 ring-white" />)}</div>}
        {!channel.dm_users && <span className="text-sm text-ink-3">{people.length}</span>}
      </header>
      <div ref={scroller} onScroll={(e) => { const el = e.currentTarget as HTMLDivElement; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }} className="melo-scroll flex flex-1 flex-col overflow-y-auto px-4 py-4">
        <span className="flex-1" />
        {err && <Empty icon="comment" title="We couldn’t load messages" body={err} />}
        {!msgs && !err && <div className="flex flex-col gap-3 px-2"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-10 w-1/2" /></div>}
        {msgs && !msgs.length && <Empty icon={channel.dm_users ? "comment" : "hash"} title={channel.dm_users ? `This is the start of your conversation` : `Welcome to #${channel.name}`} body={channel.dm_users ? "Only the two of you can see this conversation." : channel.topic ?? "Say hello — messages here are visible to everyone in the workspace."} />}
        {groups.map((g) => (
          <div key={g.day}>
            <div className="my-3 flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-line" />{g.day}<span className="h-px flex-1 bg-line" /></div>
            {g.items.map((m) => (
              <div key={m.id} className={cx("group relative flex gap-3 rounded-xl px-2 transition-colors hover:bg-subtle", m.cont ? "py-0.5" : "mt-2 py-1.5", m.id.startsWith("tmp-") && "opacity-60")}>
                {m.cont ? <span className="w-9 shrink-0 pt-0.5 text-right text-[10px] text-transparent group-hover:text-ink-3">{fmtTime(m.created_at)}</span> : <Avatar name={nameOf(m.user_id)} id={m.user_id} size={36} />}
                <div className="min-w-0 flex-1">
                  {!m.cont && <p className="flex items-baseline gap-2"><span className="font-medium">{nameOf(m.user_id)}</span><span className="text-xs text-ink-3">{fmtTime(m.created_at)}</span></p>}
                  <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[22px]">{highlight(m.body)}</p>
                </div>
                {m.user_id === me && !m.id.startsWith("tmp-") && (
                  <button type="button" aria-label="Delete message" onClick={() => del(m.id)} className="absolute top-1 right-2 hidden size-7 items-center justify-center rounded-lg bg-white text-icon-2 shadow-pop hover:text-bad group-hover:flex"><Icon name="trash" className="size-3.5" /></button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <form className="px-4 pb-4" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="rounded-2xl border border-line bg-white px-3.5 pt-3 pb-2 transition focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(27,135,245,.12)]">
          <textarea aria-label={`Message ${title}`} rows={1} value={text} placeholder={`Message ${title}`} onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="max-h-40 min-h-[24px] w-full resize-none bg-transparent text-[14.5px] outline-none" />
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-ink-3">Enter to send · Shift + Enter for a new line</span>
            <button type="submit" aria-label="Send" disabled={!text.trim() || sending} className="flex size-8 items-center justify-center rounded-lg bg-inverse text-white transition disabled:bg-line-2"><Icon name="send" /></button>
          </div>
        </div>
      </form>
    </>
  );
}

function NewChannel({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (c: Channel) => void }) {
  const { ws } = useApp();
  const toast = useToast();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const slug = slugChannel(name);
  const create = async () => {
    if (slug.length < 2) return toast("Use at least 2 letters or numbers.", "bad");
    setBusy(true);
    try { const c = await api.createChannel(ws.id, slug, topic.trim()); setName(""); setTopic(""); onClose(); onCreated(c); toast(`#${c.name} created`); }
    catch (e) { toast(/duplicate|unique/i.test((e as Error).message) ? `#${slug} already exists` : (e as Error).message, "bad"); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="New channel" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={create} busy={busy}>Create channel</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Name" hint={slug ? `#${slug}` : "Lowercase, no spaces — like #design-team"}><Input value={name} onChange={setName} placeholder="design-team" autoFocus onEnter={create} /></Field>
        <Field label="Topic (optional)"><Input value={topic} onChange={setTopic} placeholder="What’s this channel about?" onEnter={create} /></Field>
      </div>
    </Modal>
  );
}
