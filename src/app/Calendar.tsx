import { useEffect, useMemo, useRef, useState } from "react";
import { api, auth, type BookingLink, type CalEvent } from "../lib/api";
import { navigate, useLocation } from "../lib/router";
import { BookingLinksPage, bookingUrl } from "./Booking";
import { addDays, copy, cx, fmtTime, isoDate, sameDay, startOfDay, startOfWeek } from "../lib/util";
import { Icon } from "../components/icons";
import { Button, Field, IconButton, Input, Modal, useAsync, useToast } from "../components/ui";
import { useApp } from "./context";
import { Panel, SideItem, SideLabel, SideNav } from "./AppRoot";

const COLORS: Record<string, { bg: string; bar: string; label: string }> = {
  blue: { bg: "#e6e4fd", bar: "#1b87f5", label: "Work" },
  green: { bg: "#dff3e7", bar: "#14a37f", label: "Client meetings" },
  orange: { bg: "#fde6d2", bar: "#f07b1e", label: "Personal" },
  pink: { bg: "#fbe0ec", bar: "#e2468b", label: "Out of office" },
  gray: { bg: "#ececec", bar: "#80868b", label: "Focus" },
};
const HOUR = 64, START = 7, END = 21;

export default function Calendar() {
  const { ws, nameOf, account, personal } = useApp();
  const toast = useToast();
  const me = auth.get()?.user.id ?? "";
  const [anchor, setAnchor] = useState(() => new Date());
  const { parts } = useLocation();
  const booking = parts[2] === "booking";
  const [mode, setMode] = useState<"week" | "day" | "month">(() => (window.innerWidth < 900 ? "day" : "week"));
  const [sharing, setSharing] = useState(false);
  const links = useAsync<BookingLink[]>(() => (personal ? Promise.resolve([]) : api.bookingLinks()), [personal]);
  const handle = account.profile?.melo_address ?? null;
  const [draft, setDraft] = useState<{ start: Date } | null>(null);
  const [open, setOpen] = useState<CalEvent | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const from = mode === "month" ? startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1)) : mode === "week" ? startOfWeek(anchor) : startOfDay(anchor);
  const days = Array.from({ length: mode === "month" ? 42 : mode === "week" ? 7 : 1 }, (_, i) => addDays(from, i));
  const to = addDays(from, days.length);
  const ev = useAsync<CalEvent[]>(() => api.events(ws.id, from.toISOString(), to.toISOString()), [ws.id, from.getTime(), days.length]);
  const events = (ev.data ?? []).filter((e) => !hidden[e.color]);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => { if (grid.current) grid.current.scrollTop = Math.max(0, (Math.min(now.getHours(), 17) - START - 1) * HOUR); }, []); // eslint-disable-line

  const title = mode === "month" ? anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : mode === "week"
    ? `${from.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${addDays(to, -1).toLocaleDateString("en-US", from.getMonth() === addDays(to, -1).getMonth() ? { day: "numeric" } : { month: "short", day: "numeric" })}`
    : anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const step = (n: number) => setAnchor((a) => (mode === "month" ? new Date(a.getFullYear(), a.getMonth() + n, 1) : addDays(a, n * days.length)));

  return (
    <>
      <SideNav title="Calendar" action={<Button size="s" icon="plus" onClick={() => setDraft({ start: nextSlot() })}>New event</Button>}>
        <MiniMonth value={anchor} onPick={setAnchor} />
        <SideLabel>My calendars</SideLabel>
        {Object.entries(COLORS).map(([k, c]) => (
          <label key={k} className="flex h-8 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-sm hover:bg-hover">
            <input type="checkbox" checked={!hidden[k]} onChange={() => setHidden((h) => ({ ...h, [k]: !h[k] }))} className="sr-only" />
            <span className="flex size-4 items-center justify-center rounded border-2 transition-colors" style={{ borderColor: c.bar, background: hidden[k] ? "transparent" : c.bar }}>{!hidden[k] && <Icon name="check" className="size-3 text-white" />}</span>
            {k === "blue" ? `Work · ${account.email}` : c.label}
          </label>
        ))}
        {!personal && <>
          <SideLabel action={<IconButton icon="plus" label="New booking link" className="size-6" onClick={() => navigate("/app/calendar/booking?new=1")} />}>Booking links</SideLabel>
          {(links.data ?? []).map((l) => <SideItem key={l.id} to="/app/calendar/booking" icon="link" label={<span className={cx(!l.enabled && "text-ink-3")}>{l.title}</span>} count={`${l.duration_min}m`} active={booking} />)}
          {links.data && !links.data.length && <SideItem to="/app/calendar/booking" icon="plus" label="Set up booking links" active={booking} />}
          <span className="flex-1" />
          {handle && <div className="mt-6 rounded-2xl bg-white p-3.5 text-sm shadow-[0_0_0_1px_var(--color-line)]">
            <b className="block font-medium">Your booking page</b>
            <span className="flex items-center gap-2"><a href={bookingUrl(handle)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-accent-ink hover:underline">{bookingUrl(handle).replace(/^https?:\/\//, "")}</a>
              <IconButton icon="copy" label="Copy booking page link" className="size-7" onClick={async () => { await copy(bookingUrl(handle)); toast("Link copied"); }} /></span>
          </div>}
        </>}
      </SideNav>
      {booking ? <BookingLinksPage links={links} /> : <>
      <Panel>
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-3 md:px-5">
          <h2 key={title} className="mr-2 text-[18px] font-medium animate-fade-in">{title}</h2>
          <Button variant="soft" size="s" onClick={() => setAnchor(new Date())}>Today</Button>
          <IconButton icon="chev-left" label="Previous" onClick={() => step(-1)} />
          <IconButton icon="chev-right" label="Next" onClick={() => step(1)} />
          <span className="flex-1" />
          <div className="flex rounded-full bg-hover p-0.5">
            {(["day", "week", "month"] as const).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cx("h-7 rounded-full px-3 text-sm capitalize", mode === m ? "bg-white font-medium shadow-sm" : "text-ink-2 hover:text-ink")}>{m}</button>)}
          </div>
          {!personal && <Button variant="soft" size="s" icon="link" onClick={() => setSharing(true)}>Share availability</Button>}
        </header>
        {mode === "month" ? <MonthGrid days={days} month={anchor.getMonth()} events={events} now={now} onOpen={setOpen} onDay={(d) => { setAnchor(d); setMode("day"); }} onNew={(d) => { const x = new Date(d); x.setHours(9, 0, 0, 0); setDraft({ start: x }); }} /> : <>
        <div key={from.getTime()} className="grid border-b border-line animate-fade-in" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
          <span />
          {days.map((d) => (
            <div key={d.toISOString()} className="flex items-center gap-2 border-l border-line px-2.5 py-2.5 text-sm">
              <span className="text-ink-3">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
              <span className={cx("flex size-7 items-center justify-center rounded-full font-medium", sameDay(d, now) && "bg-accent text-[var(--color-accent-on,#fff)]")}>{d.getDate()}</span>
            </div>
          ))}
        </div>
        <div ref={grid} className="melo-scroll relative flex-1 overflow-y-auto">
          <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))`, height: (END - START) * HOUR }}>
            <div className="relative">{Array.from({ length: END - START }, (_, i) => <span key={i} className="absolute right-2 -translate-y-1/2 text-[11px] text-ink-3" style={{ top: i * HOUR }}>{i ? new Date(2000, 0, 1, START + i).toLocaleTimeString("en-US", { hour: "numeric" }) : ""}</span>)}</div>
            {days.map((d) => {
              const dayEvents = events.filter((e) => sameDay(new Date(e.starts_at), d));
              return (
                <div key={d.toISOString()} className={cx("relative border-l border-line", (d.getDay() === 0 || d.getDay() === 6) && "bg-subtle")}
                  onDoubleClick={(e) => { const y = (e as unknown as { nativeEvent: { offsetY: number } }).nativeEvent.offsetY; const h = START + Math.floor(y / (HOUR / 2)) / 2; const s = new Date(d); s.setHours(Math.floor(h), (h % 1) * 60); setDraft({ start: s }); }}>
                  {Array.from({ length: END - START }, (_, i) => <span key={i} className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ top: i * HOUR }} />)}
                  {dayEvents.map((e) => {
                    const s = new Date(e.starts_at), en = new Date(e.ends_at);
                    /* Keep events that start before 7am or run past 9pm inside the visible grid */
                    const max = (END - START) * HOUR;
                    const rawTop = ((s.getHours() + s.getMinutes() / 60) - START) * HOUR;
                    const rawEnd = sameDay(s, en) ? ((en.getHours() + en.getMinutes() / 60) - START) * HOUR : max;
                    const top = Math.min(Math.max(0, rawTop), max - 22), h = Math.max(22, Math.min(rawEnd, max) - top - 3);
                    const c = COLORS[e.color] ?? COLORS.blue;
                    return (
                      <button key={e.id} type="button" onClick={() => setOpen(e)} className="absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1 text-left hover:brightness-95 active:scale-[.98] animate-pop"
                        style={{ top: top + 1, height: h, background: c.bg, boxShadow: `inset 3px 0 0 ${c.bar}` }}>
                        <p className="truncate text-[13px] font-medium leading-4">{e.title}</p>
                        {h > 34 && <p className="truncate text-[11px] text-ink-2">{fmtTime(s)}{e.location ? ` · ${e.location}` : ""}</p>}
                      </button>
                    );
                  })}
                  {sameDay(d, now) && now.getHours() >= START && now.getHours() < END && (
                    <span className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-bad" style={{ top: ((now.getHours() + now.getMinutes() / 60) - START) * HOUR }}><span className="absolute -left-1 -top-[3px] size-2 rounded-full bg-bad" /></span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </>}
        <p className="hidden border-t border-line px-5 py-2 text-xs text-ink-3 md:block">Double-click the grid to add an event. {personal ? "Only you can see your personal calendar." : `Events are shared with everyone in ${ws.name}.`}</p>
      </Panel>
      </>}
      {sharing && <ShareAvailability links={links.data ?? []} handle={handle} onClose={() => setSharing(false)} />}
      {draft && <EventModal start={draft.start} onClose={() => setDraft(null)} onSaved={(e) => { ev.set((d) => [...(d ?? []), e]); setDraft(null); toast("Event added"); }} />}
      {open && (
        <Modal open onClose={() => setOpen(null)} title={open.title} footer={<>
          {open.user_id === me && <Button variant="danger" icon="trash" onClick={async () => { try { await api.deleteEvent(open.id); ev.set((d) => (d ?? []).filter((x) => x.id !== open.id)); setOpen(null); toast("Event deleted"); } catch (e) { toast((e as Error).message, "bad"); } }}>Delete</Button>}
          <Button onClick={() => setOpen(null)}>Done</Button></>}>
          <div className="flex flex-col gap-2 text-sm">
            <p className="flex items-center gap-2"><Icon name="clock" className="text-icon-2" />{new Date(open.starts_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {fmtTime(open.starts_at)} – {fmtTime(open.ends_at)}</p>
            {open.location && <p className="flex items-start gap-2 break-all"><Icon name="globe" className="mt-0.5 shrink-0 text-icon-2" /><span>{open.location.split(/(https?:\/\/\S+)/).map((x, i) => /^https?:/.test(x) ? <a key={i} href={x} target="_blank" rel="noopener noreferrer" className="text-accent-ink hover:underline">Join video call</a> : x)}</span></p>}
            <p className="flex items-center gap-2"><Icon name="user" className="text-icon-2" />Added by {nameOf(open.user_id)}</p>
          </div>
        </Modal>
      )}
    </>
  );
}
/* Figma: Calendar · Month */
function MonthGrid({ days, month, events, now, onOpen, onDay, onNew }: { days: Date[]; month: number; events: CalEvent[]; now: Date; onOpen: (e: CalEvent) => void; onDay: (d: Date) => void; onNew: (d: Date) => void }) {
  return (
    <div className="melo-scroll flex-1 overflow-auto animate-fade-in">
      <div className="grid min-w-[700px] grid-cols-7">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="border-b border-line px-3 py-2 text-[12px] text-ink-3">{d}</div>)}
        {days.map((d, i) => {
          const list = events.filter((e) => sameDay(new Date(e.starts_at), d)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          const out = d.getMonth() !== month;
          return (
            <div key={i} onDoubleClick={() => onNew(d)} className={cx("min-h-[112px] border-b border-line p-1.5", i % 7 && "border-l", out && "bg-subtle/70", (d.getDay() === 0 || d.getDay() === 6) && !out && "bg-subtle/40")}>
              <button type="button" onClick={() => onDay(d)} className={cx("mb-1 flex size-7 items-center justify-center rounded-full text-[13px] hover:bg-hover", sameDay(d, now) ? "bg-accent font-medium text-[var(--color-accent-on,#fff)] hover:bg-accent" : out ? "text-ink-4" : "text-ink")}>{d.getDate()}</button>
              <div className="flex flex-col gap-0.5">
                {list.slice(0, 3).map((e) => { const c = COLORS[e.color] ?? COLORS.blue; return <button key={e.id} type="button" onClick={() => onOpen(e)} className="flex items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-left text-[12px] hover:brightness-95" style={{ background: c.bg, boxShadow: `inset 2px 0 0 ${c.bar}` }}><span className="shrink-0 text-ink-2">{fmtTime(e.starts_at).replace(":00", "")}</span><span className="truncate">{e.title}</span></button>; })}
                {list.length > 3 && <button type="button" onClick={() => onDay(d)} className="px-1.5 text-left text-[11px] text-ink-3 hover:text-ink">+{list.length - 3} more</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Figma: Share availability — your booking links, plus your free times this week as text */
function ShareAvailability({ links, handle, onClose }: { links: BookingLink[]; handle: string | null; onClose: () => void }) {
  const { ws } = useApp();
  const toast = useToast();
  const me = auth.get()?.user.id ?? "";
  const start = startOfDay(new Date()), end = addDays(start, 7);
  const ev = useAsync<CalEvent[]>(() => api.events(ws.id, start.toISOString(), end.toISOString()), [ws.id]);
  const free = useMemo(() => {
    const mine = (ev.data ?? []).filter((e) => e.user_id === me);
    const out: string[] = [];
    for (let i = 0; i < 7 && out.length < 6; i++) {
      const d = addDays(start, i); if (d.getDay() === 0 || d.getDay() === 6) continue;
      const blocks: [Date, Date][] = []; let cur: Date | null = null;
      for (let m = 9 * 60; m < 17 * 60; m += 30) {
        const a = new Date(d); a.setHours(0, m, 0, 0); const b = new Date(a.getTime() + 30 * 60_000);
        const ok = a > new Date() && !mine.some((e) => new Date(e.starts_at) < b && new Date(e.ends_at) > a);
        if (ok && !cur) cur = a; if (!ok && cur) { blocks.push([cur, a]); cur = null; }
      }
      if (cur) { const e = new Date(d); e.setHours(17, 0, 0, 0); blocks.push([cur, e]); }
      const long = blocks.filter(([a, b]) => b.getTime() - a.getTime() >= 3_600_000).slice(0, 2);
      if (long.length) out.push(`${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}: ${long.map(([a, b]) => `${fmtTime(a)}–${fmtTime(b)}`).join(", ")}`);
    }
    return out;
  }, [ev.data]); // eslint-disable-line
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const text = `Here’s when I’m free this week (${tz}):\n${free.map((f) => `• ${f}`).join("\n")}${links[0] && handle ? `\n\nOr pick a time: ${bookingUrl(handle, links.find((l) => l.enabled)?.slug)}` : ""}`;
  return (
    <Modal open onClose={onClose} title="Share availability" width={560} footer={<><Button variant="ghost" onClick={() => navigate("/app/calendar/booking")}>Edit booking links</Button><Button icon="copy" onClick={async () => { await copy(text); toast("Copied — paste it into any message"); }}>Copy free times</Button></>}>
      <div className="flex flex-col gap-4">
        {handle && links.filter((l) => l.enabled).length > 0 && <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium">Booking links</p>
          {links.filter((l) => l.enabled).map((l) => <div key={l.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2"><Icon name="link" className="size-4 text-icon-2" /><span className="min-w-0 flex-1"><b className="block text-[13px] font-medium">{l.title} <span className="font-normal text-ink-3">· {l.duration_min} min</span></b><span className="block truncate text-[12px] text-ink-3">{bookingUrl(handle, l.slug)}</span></span><Button size="s" variant="soft" icon="copy" onClick={async () => { await copy(bookingUrl(handle, l.slug)); toast("Link copied"); }}>Copy</Button></div>)}
        </div>}
        <div><p className="mb-2 text-[13px] font-medium">Free this week</p>
          {ev.loading && !ev.data ? <p className="text-sm text-ink-3">Checking your calendar…</p> : <pre className="whitespace-pre-wrap rounded-xl bg-subtle p-3 font-sans text-[13px] leading-5">{free.length ? text : "No free hour-long blocks between 9 and 5 this week."}</pre>}
        </div>
      </div>
    </Modal>
  );
}
function nextSlot() { const d = new Date(); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); return d; }

function MiniMonth({ value, onPick }: { value: Date; onPick: (d: Date) => void }) {
  const [month, setMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  useEffect(() => setMonth(new Date(value.getFullYear(), value.getMonth(), 1)), [value]);
  const first = startOfWeek(month);
  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(first, i)), [first.getTime()]); // eslint-disable-line
  const week = startOfWeek(value), today = new Date();
  return (
    <div className="mb-2 px-1">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-sm font-medium">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <span className="flex"><IconButton icon="chev-left" label="Previous month" className="size-7" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} /><IconButton icon="chev-right" label="Next month" className="size-7" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} /></span>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-ink-3">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="py-1">{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center text-[13px]">
        {cells.map((d) => {
          const inWeek = d >= week && d < addDays(week, 7);
          return <button key={d.toISOString()} type="button" onClick={() => onPick(d)} aria-label={d.toDateString()}
            className={cx("mx-auto flex size-8 items-center justify-center rounded-full transition-colors", d.getMonth() !== month.getMonth() && "text-ink-4", inWeek && !sameDay(d, today) && "bg-active", sameDay(d, today) ? "bg-accent font-semibold text-white" : "hover:bg-hover")}>{d.getDate()}</button>;
        })}
      </div>
    </div>
  );
}

function EventModal({ start, onClose, onSaved }: { start: Date; onClose: () => void; onSaved: (e: CalEvent) => void }) {
  const { ws } = useApp();
  const toast = useToast();
  const hh = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const [f, setF] = useState({ title: "", date: isoDate(start), from: hh(start), to: hh(new Date(start.getTime() + 3_600_000)), location: "", color: "blue" });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.title.trim()) return toast("Give the event a title.", "bad");
    const s = new Date(`${f.date}T${f.from}`), e = new Date(`${f.date}T${f.to}`);
    /* An end at or before the start runs past midnight (11 PM – 12 AM) */
    if (e <= s) e.setDate(e.getDate() + 1);
    if (e.getTime() - s.getTime() > 24 * 3_600_000 || e.getTime() === s.getTime()) return toast("The end time needs to be after the start.", "bad");
    setBusy(true);
    try { onSaved(await api.createEvent({ workspace_id: ws.id, title: f.title.trim(), starts_at: s.toISOString(), ends_at: e.toISOString(), color: f.color, location: f.location.trim() || null })); }
    catch (err) { toast((err as Error).message, "bad"); } finally { setBusy(false); }
  };
  const inp = "h-9 w-full rounded-full border border-line px-3 text-sm outline-none focus:border-accent";
  return (
    <Modal open onClose={onClose} title="New event" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} busy={busy}>Add event</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Title"><Input value={f.title} onChange={(v) => setF({ ...f, title: v })} placeholder="Design crit" autoFocus onEnter={save} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date"><input type="date" aria-label="Date" value={f.date} onChange={(e) => setF({ ...f, date: (e.target as HTMLInputElement).value })} className={inp} /></Field>
          <Field label="From"><input type="time" aria-label="From" value={f.from} onChange={(e) => setF({ ...f, from: (e.target as HTMLInputElement).value })} className={inp} /></Field>
          <Field label="To"><input type="time" aria-label="To" value={f.to} onChange={(e) => setF({ ...f, to: (e.target as HTMLInputElement).value })} className={inp} /></Field>
        </div>
        <Field label="Location or link (optional)"><Input value={f.location} onChange={(v) => setF({ ...f, location: v })} placeholder="Melo video, Studio, #design" /></Field>
        <div className="flex flex-wrap gap-2">
          {Object.entries(COLORS).map(([k, c]) => (
            <button key={k} type="button" aria-pressed={f.color === k} onClick={() => setF({ ...f, color: k })} className={cx("flex h-8 items-center gap-2 rounded-full px-3 text-sm transition", f.color === k ? "bg-inverse text-white" : "bg-hover")}>
              <span className="size-2.5 rounded-full" style={{ background: c.bar }} />{c.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
