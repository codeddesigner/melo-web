/* Team (Figma: Team · Channel, DM, Huddle, Mentions & activity, Mention autocomplete, New message) */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, auth, type Channel, type Message, type Reaction } from "../lib/api";
import { Link, navigate, useLocation } from "../lib/router";
import { cx, dayLabel, fmtShort, fmtTime, sameDay, slugChannel } from "../lib/util";
import { Icon } from "../components/icons";
import { Avatar, Button, Empty, Field, IconButton, Input, Menu, Modal, Skeleton, Spinner, useAsync, useToast } from "../components/ui";
import { useApp } from "./context";
import { Panel, SideItem, SideLabel, SideNav, SideSearch } from "./AppRoot";

const SEEN = "melo.seen";
const loadSeen = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(SEEN) || "{}"); } catch { return {}; } };
const markSeen = (id: string, at: string) => { const s = loadSeen(); s[id] = at; try { localStorage.setItem(SEEN, JSON.stringify(s)); } catch { /* ignore */ } };
const QUICK = ["👍", "❤️", "😂", "🎉", "👀", "✅"];
const EMOJI = ["😀", "😄", "😂", "🙂", "😉", "😍", "🤔", "😅", "🙌", "👏", "👍", "👎", "🙏", "💪", "🎉", "🔥", "❤️", "✨", "👀", "✅", "❌", "⚡", "🚀", "☕", "📌", "📎", "🗓️", "💡"];
const VIEWS = { _threads: "Threads", _mentions: "Mentions", _huddles: "Huddles" } as const;
type View = keyof typeof VIEWS;
const FILE_RE = /\[\[file:([^|\]]+)\|([^|\]]*)\|(\d+)\]\]/g;
const huddleUrl = (ws: string, ch: string) => `https://meet.jit.si/melo-${ws.slice(0, 8)}-${ch.slice(0, 8)}-${Math.random().toString(36).slice(2, 10)}`;
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function Team() {
  const { ws, nameOf, people, setUnread } = useApp();
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
  const view = (activeId && activeId in VIEWS ? activeId : null) as View | null;
  const active = view ? undefined : ch.data?.find((c) => c.id === activeId || (!c.dm_users && c.name === activeId));
  const myName = nameOf(me);

  /* Mentions + threads I'm part of, for the counts at the top of the sidebar */
  const mentions = useAsync<Message[]>(() => api.workspaceMessages(ws.id, `body=ilike.${encodeURIComponent(`*@${myName.split(" ")[0]}*`)}&user_id=neq.${me}`), [ws.id, myName]);
  const threads = useAsync<Message[]>(() => api.workspaceMessages(ws.id, "parent_id=not.is.null"), [ws.id]);

  useEffect(() => {
    if (!ch.data?.length || active || view || ch.loading) return;
    const general = channels.find((c) => c.name === "general") ?? channels[0];
    if (general) navigate(`/app/team/${general.name}`, { replace: true });
  }, [ch.data, ch.loading, active, view]); // eslint-disable-line

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
  useEffect(() => { setUnread((u) => (u.team === unreadCount ? u : { ...u, team: unreadCount })); }, [unreadCount, setUnread]);

  const dmName = (c: Channel) => { const other = c.dm_users?.find((u) => u !== me) ?? me; return other === me ? `${nameOf(me)} (you)` : nameOf(other); };
  const openDm = async (user: string) => {
    try { const id = await api.openDm(ws.id, user); const list = await api.channels(ws.id); ch.set(() => list); navigate(`/app/team/${id}`); } catch (e) { toast((e as Error).message, "bad"); }
  };
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const dmUsers = new Set(dms.flatMap((d) => d.dm_users ?? []));
  const startable = people.filter((p) => p.user_id !== me && !dmUsers.has(p.user_id));
  const chName = (id: string) => { const c = ch.data?.find((x) => x.id === id); return c ? (c.dm_users ? dmName(c) : `#${c.name}`) : "a conversation"; };
  const chPath = (id: string) => { const c = ch.data?.find((x) => x.id === id); return c ? `/app/team/${c.dm_users ? c.id : c.name}` : "/app/team"; };
  const threadParents = new Set((threads.data ?? []).map((m) => m.parent_id!));

  return (
    <>
      <SideNav title="Team" action={<Button size="s" icon="plus" onClick={() => setCreating(true)}>New</Button>}>
        <SideSearch value={q} onChange={setQ} />
        <SideItem to="/app/team/_threads" icon="comment" label="Threads" count={threadParents.size || undefined} accent active={view === "_threads"} />
        <SideItem to="/app/team/_mentions" icon="at" label="Mentions" count={mentions.data?.length || undefined} active={view === "_mentions"} />
        <SideItem to="/app/team/_huddles" icon="phone" label="Huddles" active={view === "_huddles"} />
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
      <Panel className="flex-row">
        {ch.error ? <Empty icon="users" title="We couldn’t load your channels" body={ch.error} action={<Button onClick={ch.reload}>Try again</Button>} />
          : view ? <ActivityView key={view} view={view} chName={chName} chPath={chPath} nameOf={nameOf} mentions={mentions} threads={threads} />
          : !active ? <div className="flex flex-1 items-center justify-center"><Skeleton className="h-6 w-40" /></div>
          : <Conversation key={active.id} channel={active} title={active.dm_users ? dmName(active) : `#${active.name}`} nameOf={nameOf} me={me} openThread={parts[3]} onThreadsChanged={threads.reload} />}
      </Panel>
      <NewChannel open={creating} onClose={() => setCreating(false)} onCreated={(c) => { ch.set((d) => [...(d ?? []), c]); navigate(`/app/team/${c.name}`); }} />
    </>
  );
}

/* ---------- Threads / Mentions / Huddles ---------- */
function ActivityView({ view, chName, chPath, nameOf, mentions, threads }: { view: View; chName: (id: string) => string; chPath: (id: string) => string; nameOf: (id: string) => string; mentions: ReturnType<typeof useAsync<Message[]>>; threads: ReturnType<typeof useAsync<Message[]>> }) {
  const { ws } = useApp();
  const huddles = useAsync<Message[]>(() => (view === "_huddles" ? api.workspaceMessages(ws.id, "kind=eq.huddle") : Promise.resolve([])), [ws.id, view]);
  const parents = useAsync<Message[]>(() => {
    const ids = [...new Set((threads.data ?? []).map((m) => m.parent_id!))].slice(0, 80);
    return view === "_threads" && ids.length ? api.workspaceMessages(ws.id, `id=in.(${ids.join(",")})`) : Promise.resolve([]);
  }, [ws.id, view, threads.data]);
  const src = view === "_mentions" ? mentions : view === "_huddles" ? huddles : parents;
  const rows = src.data ?? [];
  const replies = (id: string) => (threads.data ?? []).filter((m) => m.parent_id === id);
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-6"><h2 className="text-[17px] font-medium">{VIEWS[view]}</h2><span className="flex-1" /><IconButton icon="refresh" label="Refresh" onClick={() => { src.reload(); threads.reload(); }} /></header>
      <div className="melo-scroll flex-1 overflow-y-auto px-4 py-4">
        {src.loading && !src.data ? <div className="flex flex-col gap-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          : !rows.length ? <Empty icon={view === "_huddles" ? "phone" : view === "_mentions" ? "at" : "comment"} title={view === "_huddles" ? "No huddles yet" : view === "_mentions" ? "No mentions yet" : "No threads yet"}
              body={view === "_huddles" ? "Start one from any channel with the Huddle button — everyone in the channel can jump in." : view === "_mentions" ? "When someone writes @ and your name, it shows up here." : "Reply to a message in a thread and the conversation collects here."} />
          : rows.map((m) => {
            const r = replies(m.id);
            return (
              <Link key={m.id} to={`${chPath(m.channel_id)}${view === "_threads" ? `/${m.id}` : ""}`} className="mb-2 flex gap-3 rounded-2xl border border-line bg-white p-4 hover:-translate-y-px hover:shadow-pop">
                <Avatar name={nameOf(m.user_id)} id={m.user_id} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2 text-[13px]"><b className="font-medium">{nameOf(m.user_id)}</b><span className="text-ink-3">in {chName(m.channel_id)} · {fmtShort(m.created_at)}</span></span>
                  <span className="mt-0.5 line-clamp-2 block text-[14px]">{m.kind === "huddle" ? "Started a huddle" : m.body.replace(FILE_RE, "📎 $2")}</span>
                  {view === "_threads" && <span className="mt-1.5 block text-[13px] font-medium text-accent-ink">{r.length} {r.length === 1 ? "reply" : "replies"} · last {fmtShort(r[0]?.created_at ?? m.created_at)}</span>}
                </span>
              </Link>
            );
          })}
      </div>
    </div>
  );
}

/* ---------- A channel or DM ---------- */
function Conversation({ channel, title, nameOf, me, openThread, onThreadsChanged }: { channel: Channel; title: string; nameOf: (id: string) => string; me: string; openThread?: string; onThreadsChanged: () => void }) {
  const { ws, people } = useApp();
  const toast = useToast();
  const [msgs, setMsgs] = useState<Message[] | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [pins, setPins] = useState<Message[]>([]);
  const [showPins, setShowPins] = useState(false);
  const [err, setErr] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const firstPaint = useRef(true);
  const known = useRef<Set<string> | null>(null);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const path = channel.dm_users ? channel.id : channel.name;

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
    const extras = async () => { try { const [r, p] = await Promise.all([api.reactions(channel.id), api.pinned(channel.id)]); if (live) { setReactions(r); setPins(p); } } catch { /* keep last */ } };
    load(true); extras();
    const t = setInterval(() => load(false), 3000), t2 = setInterval(extras, 6000);
    return () => { live = false; clearInterval(t); clearInterval(t2); };
  }, [channel.id]);
  const top = useMemo(() => (msgs ?? []).filter((m) => !m.parent_id), [msgs]);
  useEffect(() => {
    const el = scroller.current; if (!el || !msgs) return;
    if (!known.current) known.current = new Set(msgs.map((m) => m.id));
    if (!atBottom.current) return;
    if (firstPaint.current) { el.scrollTop = el.scrollHeight; firstPaint.current = false; }
    else el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [top.length]); // eslint-disable-line

  const post = async (body: string, extra: { parent_id?: string; kind?: "huddle" } = {}) => {
    const temp: Message = { id: "tmp-" + Date.now(), channel_id: channel.id, workspace_id: ws.id, user_id: me, body, created_at: new Date().toISOString(), parent_id: extra.parent_id ?? null, kind: extra.kind ?? "text" };
    setMsgs((m) => [...(m ?? []), temp]); if (!extra.parent_id) atBottom.current = true;
    try {
      const saved = await api.postMessage(ws.id, channel.id, body, extra);
      known.current?.add(saved.id);
      setMsgs((m) => (m ?? []).filter((x) => x.id !== saved.id).map((x) => (x.id === temp.id ? saved : x)));
      markSeen(channel.id, saved.created_at);
      if (extra.parent_id) onThreadsChanged();
      return true;
    } catch (e) { setMsgs((m) => (m ?? []).filter((x) => x.id !== temp.id)); toast((e as Error).message, "bad"); return false; }
  };
  const del = async (id: string) => {
    setLeaving((s) => new Set(s).add(id));
    try { await api.deleteMessage(id); setTimeout(() => setMsgs((m) => (m ?? []).filter((x) => x.id !== id && x.parent_id !== id)), 180); if (openThread === id) navigate(`/app/team/${path}`); }
    catch (e) { setLeaving((s) => { const n = new Set(s); n.delete(id); return n; }); toast((e as Error).message, "bad"); }
  };
  const react = async (m: Message, emoji: string) => {
    const mine = reactions.some((r) => r.message_id === m.id && r.user_id === me && r.emoji === emoji);
    setReactions((rs) => (mine ? rs.filter((r) => !(r.message_id === m.id && r.user_id === me && r.emoji === emoji)) : [...rs, { message_id: m.id, user_id: me, emoji }]));
    try { await api.react(m.id, emoji, !mine); } catch (e) { toast((e as Error).message, "bad"); }
  };
  const pin = async (m: Message, on: boolean) => {
    setPins((p) => (on ? [{ ...m, pinned_at: new Date().toISOString() }, ...p] : p.filter((x) => x.id !== m.id)));
    try { await api.pin(m.id, on); toast(on ? "Pinned to the channel" : "Unpinned"); } catch (e) { toast((e as Error).message, "bad"); }
  };
  const toTask = async (m: Message) => {
    const title = m.body.replace(FILE_RE, "$2").replace(/\s+/g, " ").trim().slice(0, 140) || "Follow up";
    try {
      await api.createTask({ workspace_id: ws.id, title, status: "todo", priority: "normal", tags: [], source: channel.dm_users ? `@${nameOf(m.user_id).split(" ")[0]}` : `#${channel.name}`, source_ref: path });
      toast("Added to Work");
    } catch (e) { toast((e as Error).message, "bad"); }
  };
  const huddle = async () => {
    const url = huddleUrl(ws.id, channel.id);
    if (await post(url, { kind: "huddle" })) window.open(url, "_blank", "noopener");
  };

  const groups = useMemo(() => {
    const out: { day: string; items: (Message & { cont: boolean })[] }[] = [];
    top.forEach((m, i, all) => {
      const prev = all[i - 1];
      const newDay = !prev || !sameDay(new Date(prev.created_at), new Date(m.created_at));
      if (newDay) out.push({ day: dayLabel(m.created_at), items: [] });
      const cont = Boolean(prev && !newDay && prev.user_id === m.user_id && m.kind !== "huddle" && prev.kind !== "huddle" && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000);
      out[out.length - 1].items.push({ ...m, cont });
    });
    return out;
  }, [top]);
  const thread = openThread ? (msgs ?? []).find((m) => m.id === openThread && !m.parent_id) : undefined;
  const repliesOf = (id: string) => (msgs ?? []).filter((m) => m.parent_id === id);
  const row = (m: Message & { cont?: boolean }, inThread = false) => (
    <MessageRow key={m.id} m={m} cont={Boolean(m.cont)} inThread={inThread} me={me} nameOf={nameOf} people={people}
      reactions={reactions.filter((r) => r.message_id === m.id)} replies={inThread ? [] : repliesOf(m.id)} pinned={pins.some((p) => p.id === m.id)}
      fresh={Boolean(known.current && !known.current.has(m.id))} leaving={leaving.has(m.id)}
      onReact={(e) => react(m, e)} onReply={inThread ? undefined : () => navigate(`/app/team/${path}/${m.id}`)} onPin={(on) => pin(m, on)} onDelete={() => del(m.id)} onTask={m.kind === "huddle" ? undefined : () => toTask(m)} />
  );

  return (
    <>
      <div className={cx("min-w-0 flex-1 flex-col", thread ? "hidden lg:flex" : "flex")}>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4 md:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-1.5 text-[16px] font-medium">{!channel.dm_users && <Icon name="hash" className="size-4" />}{channel.dm_users ? title : channel.name}</h2>
            {channel.topic && <p className="truncate text-[13px] text-ink-3">{channel.topic}</p>}
          </div>
          {!channel.dm_users && <div className="hidden -space-x-1.5 sm:flex">{people.slice(0, 4).map((p) => <Avatar key={p.user_id} name={p.name || p.email} id={p.user_id} size={24} className="ring-2 ring-white" />)}</div>}
          {!channel.dm_users && <span className="hidden text-sm text-ink-3 sm:inline">{people.length}</span>}
          <Button variant="soft" size="s" icon="phone" onClick={huddle}>Huddle</Button>
          <Menu trigger={(t) => <IconButton icon="more" label="Channel options" onClick={t} />} items={[
            { label: pins.length ? `Pinned messages (${pins.length})` : "No pinned messages", icon: "pin", disabled: !pins.length, onSelect: () => setShowPins(true) },
            { label: "Copy link to channel", icon: "link", onSelect: () => { navigator.clipboard?.writeText(location.origin + `/app/team/${path}`).catch(() => {}); toast("Link copied"); } },
          ]} />
        </header>
        {pins[0] && (
          <button type="button" onClick={() => setShowPins(true)} className="flex shrink-0 items-center gap-2 border-b border-line bg-subtle px-6 py-2 text-left text-[13px] text-ink-2 hover:bg-hover animate-fade-in">
            <Icon name="pin" className="size-3.5 text-icon-2" /><span className="min-w-0 flex-1 truncate">{pins[0].kind === "huddle" ? "Huddle link" : pins[0].body.replace(FILE_RE, "📎 $2")}</span><span className="text-ink-3">{pins.length} pinned</span>
          </button>
        )}
        <div ref={scroller} onScroll={(e) => { const el = e.currentTarget as HTMLDivElement; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }} className="melo-scroll flex flex-1 flex-col overflow-y-auto px-4 py-4">
          <span className="flex-1" />
          {err && <Empty icon="comment" title="We couldn’t load messages" body={err} />}
          {!msgs && !err && <div className="flex flex-col gap-3 px-2"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-10 w-1/2" /></div>}
          {msgs && !top.length && <Empty icon={channel.dm_users ? "comment" : "hash"} title={channel.dm_users ? `This is the start of your conversation` : `Welcome to #${channel.name}`} body={channel.dm_users ? "Only the two of you can see this conversation." : channel.topic ?? "Say hello — messages here are visible to everyone in the workspace."} />}
          {groups.map((g) => (
            <div key={g.day}>
              <div className="my-3 flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-line" />{g.day}<span className="h-px flex-1 bg-line" /></div>
              {g.items.map((m) => row(m))}
            </div>
          ))}
        </div>
        <Composer key={channel.id} placeholder={`Message ${title}`} onSend={(b) => post(b)} onHuddle={huddle} />
      </div>
      {thread && (
        <aside className="flex w-full shrink-0 flex-col border-l border-line bg-white animate-fade-in lg:w-[400px]">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-4"><div className="min-w-0 flex-1"><h3 className="text-[15px] font-medium">Thread</h3><p className="truncate text-[12px] text-ink-3">{title}</p></div><IconButton icon="x" label="Close thread" onClick={() => navigate(`/app/team/${path}`)} /></header>
          <div className="melo-scroll flex-1 overflow-y-auto px-3 py-3">
            {row(thread, true)}
            <div className="my-3 flex items-center gap-3 px-2 text-xs text-ink-3">{repliesOf(thread.id).length} {repliesOf(thread.id).length === 1 ? "reply" : "replies"}<span className="h-px flex-1 bg-line" /></div>
            {repliesOf(thread.id).map((m) => row(m, true))}
          </div>
          <Composer key={thread.id} placeholder="Reply…" onSend={(b) => post(b, { parent_id: thread.id })} compact />
        </aside>
      )}
      <Modal open={showPins} onClose={() => setShowPins(false)} title={`Pinned in ${title}`} width={520}>
        <div className="flex flex-col gap-2">
          {!pins.length && <p className="text-sm text-ink-3">Nothing pinned yet.</p>}
          {pins.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
              <Avatar name={nameOf(p.user_id)} id={p.user_id} size={28} />
              <div className="min-w-0 flex-1"><p className="text-[13px]"><b className="font-medium">{nameOf(p.user_id)}</b> <span className="text-ink-3">{fmtShort(p.created_at)}</span></p><p className="text-[14px] break-words">{p.kind === "huddle" ? "Huddle link" : p.body.replace(FILE_RE, "📎 $2")}</p></div>
              <Button size="s" variant="soft" onClick={() => pin(p, false)}>Unpin</Button>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

function MessageRow({ m, cont, inThread, me, nameOf, people, reactions, replies, pinned, fresh, leaving, onReact, onReply, onPin, onDelete, onTask }: {
  m: Message; cont: boolean; inThread: boolean; me: string; nameOf: (id: string) => string; people: ReturnType<typeof useApp>["people"]; reactions: Reaction[]; replies: Message[]; pinned: boolean; fresh: boolean; leaving: boolean;
  onReact: (e: string) => void; onReply?: () => void; onPin: (on: boolean) => void; onDelete: () => void; onTask?: () => void;
}) {
  const [picker, setPicker] = useState(false);
  const tmp = m.id.startsWith("tmp-");
  const grouped = reactions.reduce<Record<string, string[]>>((a, r) => { (a[r.emoji] ??= []).push(r.user_id); return a; }, {});
  const meName = nameOf(me);
  const mentionsMe = m.user_id !== me && new RegExp(`@${meName.split(" ")[0]}\\b`, "i").test(m.body);
  return (
    <div className={cx("group relative flex gap-3 rounded-xl px-2", cont ? "py-0.5" : "mt-2 py-1.5", mentionsMe ? "bg-accent-soft/70" : "hover:bg-subtle", tmp && "opacity-70", leaving ? "animate-pop-out" : fresh && "animate-fade-up")}>
      {cont ? <span className="w-9 shrink-0 pt-0.5 text-right text-[10px] text-transparent transition-colors group-hover:text-ink-3">{fmtTime(m.created_at)}</span> : <Avatar name={nameOf(m.user_id)} id={m.user_id} size={36} />}
      <div className="min-w-0 flex-1">
        {!cont && <p className="flex items-baseline gap-2 text-[13px]"><span className="font-semibold">{nameOf(m.user_id)}</span><span className="text-[12px] text-ink-3">{fmtTime(m.created_at)}</span>{pinned && <span className="flex items-center gap-1 text-[11px] text-ink-3"><Icon name="pin" className="size-3" />Pinned</span>}</p>}
        {m.kind === "huddle" ? <HuddleCard m={m} name={nameOf(m.user_id)} /> : <Body text={m.body} people={people} />}
        {(Object.keys(grouped).length > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {Object.entries(grouped).map(([e, us]) => (
              <button key={e} type="button" onClick={() => onReact(e)} title={us.map(nameOf).join(", ")} className={cx("flex h-6 items-center gap-1 rounded-full border px-2 text-[12px] active:scale-95", us.includes(me) ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-white hover:bg-hover")}>{e}<span>{us.length}</span></button>
            ))}
          </div>
        )}
        {!inThread && replies.length > 0 && (
          <button type="button" onClick={onReply} className="mt-1.5 flex items-center gap-2 rounded-lg py-0.5 pr-2 text-[12px] hover:bg-hover">
            <span className="flex -space-x-1">{[...new Set(replies.map((r) => r.user_id))].slice(0, 3).map((u) => <Avatar key={u} name={nameOf(u)} id={u} size={18} className="ring-2 ring-white" />)}</span>
            <b className="font-medium text-accent-ink">{replies.length} {replies.length === 1 ? "reply" : "replies"}</b><span className="text-ink-3">Last reply {fmtTime(replies[replies.length - 1].created_at)}</span>
          </button>
        )}
      </div>
      {!tmp && (
        <div className="absolute -top-3 right-2 flex items-center gap-0.5 rounded-xl bg-white p-0.5 opacity-0 shadow-pop transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {QUICK.slice(0, 3).map((e) => <button key={e} type="button" aria-label={`React ${e}`} onClick={() => onReact(e)} className="flex size-7 items-center justify-center rounded-lg text-[14px] hover:bg-hover active:scale-90">{e}</button>)}
          <div className="relative">
            <IconButton icon="smile" label="More reactions" className="size-7" onClick={() => setPicker(!picker)} />
            {picker && <EmojiGrid onPick={(e) => { setPicker(false); onReact(e); }} onClose={() => setPicker(false)} className="right-0 top-8" />}
          </div>
          {onReply && <IconButton icon="reply" label="Reply in thread" className="size-7" onClick={onReply} />}
          <IconButton icon="pin" label={pinned ? "Unpin" : "Pin to channel"} className={cx("size-7", pinned && "text-accent-ink")} onClick={() => onPin(!pinned)} />
          {onTask && <IconButton icon="task" label="Add to Work" className="size-7" onClick={onTask} />}
          {m.user_id === me && <IconButton icon="trash" label="Delete message" className="size-7 hover:text-bad" onClick={onDelete} />}
        </div>
      )}
    </div>
  );
}

function HuddleCard({ m, name }: { m: Message; name: string }) {
  const live = Date.now() - new Date(m.created_at).getTime() < 2 * 3600_000;
  return (
    <div className="mt-1 flex max-w-md items-center gap-3 rounded-2xl border border-line bg-white p-3">
      <span className={cx("flex size-9 items-center justify-center rounded-full", live ? "bg-ok-soft text-ok" : "bg-hover text-icon-2")}><Icon name="phone" className="size-4" /></span>
      <span className="min-w-0 flex-1"><b className="block text-[14px] font-medium">{name.split(" ")[0]} started a huddle</b><span className="text-[12px] text-ink-3">{live ? "Video and voice in your browser — jump in" : "Huddle ended"}</span></span>
      {live && <a href={m.body} target="_blank" rel="noopener noreferrer" className="flex h-8 items-center rounded-full bg-inverse px-3.5 text-[13px] font-medium text-white hover:bg-[#333]">Join</a>}
    </div>
  );
}

/* Message text: mentions, links, **bold**, _italic_, `code` and file chips */
function Body({ text, people }: { text: string; people: ReturnType<typeof useApp>["people"] }) {
  const files: ReactNode[] = [];
  const clean = text.replace(FILE_RE, (_all, path: string, name: string, n: string) => { files.push(<FileChip key={path} path={path} name={name} size={+n} />); return ""; }).trim();
  const inline = (s: string, k: string): ReactNode[] => s.split(/(@[A-Za-z][\w.-]*(?:\s[A-Z][\w-]*)?|https?:\/\/[^\s<]+|\*\*[^*]+\*\*|_[^_\s][^_]*_|`[^`]+`)/g).map((part, i) => {
    const key = `${k}-${i}`;
    if (!part) return null;
    if (part.startsWith("@") && people.some((p) => (p.name ?? "").toLowerCase().startsWith(part.slice(1).toLowerCase()))) return <span key={key} className="rounded bg-accent-soft px-0.5 text-accent-ink">{part}</span>;
    if (/^https?:\/\//.test(part)) return <a key={key} href={part} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline-offset-2 hover:underline">{part}</a>;
    if (part.startsWith("**") && part.endsWith("**")) return <b key={key} className="font-semibold">{part.slice(2, -2)}</b>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) return <i key={key}>{part.slice(1, -1)}</i>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={key} className="rounded bg-hover px-1 font-mono text-[13px]">{part.slice(1, -1)}</code>;
    return part;
  });
  return <>
    {clean && <p className="whitespace-pre-wrap break-words text-[14px] leading-[22px]">{inline(clean, "t")}</p>}
    {files.length > 0 && <div className="mt-1.5 flex flex-wrap gap-2">{files}</div>}
  </>;
}
function FileChip({ path, name, size: n }: { path: string; name: string; size: number }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const open = async () => { setBusy(true); try { window.open(await api.fileUrl(path), "_blank", "noopener"); } catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); } };
  return <button type="button" onClick={open} className="flex h-10 items-center gap-2 rounded-xl border border-line bg-subtle px-3 text-[13px] hover:bg-hover">{busy ? <Spinner className="size-4" /> : <Icon name="clip" className="size-4 text-icon-2" />}<b className="max-w-[220px] truncate font-medium">{name}</b><span className="text-ink-3">{size(n)}</span></button>;
}

function EmojiGrid({ onPick, onClose, className }: { onPick: (e: string) => void; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const c = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); }; const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("mousedown", c); window.addEventListener("keydown", k); return () => { document.removeEventListener("mousedown", c); window.removeEventListener("keydown", k); }; }, [onClose]);
  return <div ref={ref} role="dialog" aria-label="Pick an emoji" className={cx("absolute z-40 grid w-[232px] grid-cols-7 gap-0.5 rounded-2xl bg-white p-2 shadow-pop animate-pop", className)}>{EMOJI.map((e) => <button key={e} type="button" onClick={() => onPick(e)} className="flex size-7 items-center justify-center rounded-lg text-[16px] hover:bg-hover active:scale-90">{e}</button>)}</div>;
}

/* ---------- Composer (Figma: message box with + · emoji · @ · attach · AI) ---------- */
function Composer({ placeholder, onSend, onHuddle, compact }: { placeholder: string; onSend: (body: string) => Promise<boolean>; onHuddle?: () => void; compact?: boolean }) {
  const { ws, people } = useApp();
  const toast = useToast();
  const me = auth.get()?.user.id ?? "";
  const [text, setText] = useState("");
  const [files, setFiles] = useState<{ path?: string; name: string; size: number; busy: boolean }[]>([]);
  const [sending, setSending] = useState(false);
  const [emoji, setEmoji] = useState(false);
  const [sel, setSel] = useState(0);
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => { const el = box.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }, [text]);
  /* @mention autocomplete on the word being typed */
  const caret = box.current?.selectionStart ?? text.length;
  const word = /(^|\s)@([\w.-]*)$/.exec(text.slice(0, caret));
  const matches = word ? people.filter((p) => p.user_id !== me && (p.name || p.email).toLowerCase().includes(word[2].toLowerCase())).slice(0, 6) : [];
  useEffect(() => setSel(0), [word?.[2]]); // eslint-disable-line
  const insert = (s: string, replaceWord = false) => {
    const el = box.current; const at = el?.selectionStart ?? text.length;
    const before = replaceWord && word ? text.slice(0, at - word[2].length - 1) : text.slice(0, at);
    const next = before + s + text.slice(at);
    setText(next);
    requestAnimationFrame(() => { el?.focus(); const p = before.length + s.length; el?.setSelectionRange(p, p); });
  };
  const pickPerson = (p: (typeof people)[number]) => insert(`@${p.name || p.email.split("@")[0]} `, true);
  const attach = async (list: FileList | null) => {
    for (const f of Array.from(list ?? [])) {
      if (f.size > 25 * 1048576) { toast(`${f.name} is over 25 MB`, "bad"); continue; }
      setFiles((x) => [...x, { name: f.name, size: f.size, busy: true }]);
      try { const path = await api.upload(ws.id, f); setFiles((x) => x.map((y) => (y.name === f.name && y.busy ? { ...y, path, busy: false } : y))); }
      catch (e) { setFiles((x) => x.filter((y) => !(y.name === f.name && y.busy))); toast((e as Error).message, "bad"); }
    }
  };
  const send = async () => {
    if (sending || files.some((f) => f.busy)) return;
    const body = [text.trim(), ...files.filter((f) => f.path).map((f) => `[[file:${f.path}|${f.name.replace(/[|\]]/g, "")}|${f.size}]]`)].filter(Boolean).join("\n");
    if (!body) return;
    setSending(true); const keep = text, keepFiles = files; setText(""); setFiles([]);
    const ok = await onSend(body);
    if (!ok) { setText(keep); setFiles(keepFiles); }
    setSending(false);
  };
  const wrap = (mark: string) => {
    const el = box.current; if (!el) return;
    const a = el.selectionStart, b = el.selectionEnd, inner = text.slice(a, b) || "text";
    setText(text.slice(0, a) + mark + inner + mark + text.slice(b));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + mark.length, a + mark.length + inner.length); });
  };
  return (
    <form className={cx("relative shrink-0", compact ? "px-3 pb-3" : "px-4 pb-4")} onSubmit={(e) => { e.preventDefault(); send(); }}
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); attach((e as unknown as DragEvent).dataTransfer?.files ?? null); }}>
      {matches.length > 0 && (
        <div role="listbox" aria-label="Mention someone" className="absolute bottom-full left-4 z-30 mb-1 w-72 rounded-2xl bg-white p-1.5 shadow-pop animate-pop">
          {matches.map((p, i) => <button key={p.user_id} type="button" role="option" aria-selected={i === sel} onMouseDown={(e) => { e.preventDefault(); pickPerson(p); }} className={cx("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[13px]", i === sel ? "bg-active" : "hover:bg-hover")}><Avatar name={p.name || p.email} id={p.user_id} size={24} /><span className="min-w-0 flex-1 truncate"><b className="font-medium">{p.name || p.email}</b> <span className="text-ink-3">{p.email}</span></span></button>)}
        </div>
      )}
      <div className="rounded-2xl border border-line bg-white px-3.5 pt-3 pb-2 transition focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)]">
        {files.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{files.map((f) => <span key={f.name + f.size} className="flex h-8 items-center gap-2 rounded-lg bg-subtle px-2.5 text-[12px]">{f.busy ? <Spinner className="size-3.5" /> : <Icon name="clip" className="size-3.5 text-icon-2" />}<span className="max-w-[160px] truncate">{f.name}</span><span className="text-ink-3">{size(f.size)}</span><button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y !== f))} className="text-ink-3 hover:text-ink"><Icon name="x" className="size-3" /></button></span>)}</div>}
        <textarea ref={box} aria-label={placeholder} rows={1} value={text} placeholder={placeholder} onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
          onPaste={(e) => { if (e.clipboardData.files.length) { e.preventDefault(); attach(e.clipboardData.files); } }}
          onKeyDown={(e) => {
            if (matches.length) {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => (s + 1) % matches.length); return; }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => (s - 1 + matches.length) % matches.length); return; }
              if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pickPerson(matches[sel]); return; }
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); wrap("**"); return; }
            if ((e.metaKey || e.ctrlKey) && e.key === "i") { e.preventDefault(); wrap("_"); return; }
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          className="max-h-40 min-h-[24px] w-full resize-none bg-transparent text-[14px] outline-none" />
        <div className="flex items-center gap-0.5 pt-1">
          <Menu align="left" trigger={(t) => <IconButton icon="plus" label="More" className="size-7" onClick={t} />} items={[
            { label: "Upload a file", icon: "clip", onSelect: () => picker.current?.click() },
            ...(onHuddle ? [{ label: "Start a huddle", icon: "phone" as const, onSelect: onHuddle }] : []),
            { label: "Bold (⌘B)", icon: "star", onSelect: () => wrap("**") },
            { label: "Italic (⌘I)", icon: "star", onSelect: () => wrap("_") },
          ]} />
          <div className="relative"><IconButton icon="smile" label="Emoji" className="size-7" onClick={() => setEmoji(!emoji)} />{emoji && <EmojiGrid className="bottom-9 left-0" onPick={(e) => { setEmoji(false); insert(e); }} onClose={() => setEmoji(false)} />}</div>
          <IconButton icon="at" label="Mention someone" className="size-7" onClick={() => insert((text && !/\s$/.test(text) ? " " : "") + "@")} />
          <IconButton icon="clip" label="Attach a file" className="size-7" onClick={() => picker.current?.click()} />
          <IconButton icon="sparkle" label="Tidy up" className="size-7" onClick={() => { const t = text.trim().replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " "); if (!t) return; setText(t.charAt(0).toUpperCase() + t.slice(1).replace(/(^|[.!?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase()) + (/[.!?…)]$/.test(t) ? "" : ".")); }} />
          <input ref={picker} type="file" multiple hidden onChange={(e) => { attach(e.target.files); e.target.value = ""; }} />
          <span className="flex-1" />
          <span className="mr-2 hidden text-[11px] text-ink-4 md:inline">Shift + Enter for a new line</span>
          <button type="submit" aria-label="Send" disabled={(!text.trim() && !files.some((f) => f.path)) || sending || files.some((f) => f.busy)} className="flex size-8 items-center justify-center rounded-lg bg-inverse text-white active:scale-90 disabled:bg-line-2"><Icon name="send" /></button>
        </div>
      </div>
    </form>
  );
}

function NewChannel({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (c: Channel) => void }) {
  const { ws } = useApp();
  const toast = useToast();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const slug = slugChannel(name).replace(/^_+/, "");
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
