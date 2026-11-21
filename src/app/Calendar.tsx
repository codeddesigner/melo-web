import { useEffect, useMemo, useRef, useState } from "react";
import { api, auth, type CalEvent } from "../lib/api";
import { addDays, cx, fmtTime, isoDate, sameDay, startOfDay, startOfWeek } from "../lib/util";
import { Icon } from "../components/icons";
import { Button, Field, IconButton, Input, Modal, useAsync, useToast } from "../components/ui";
import { useApp } from "./context";
import { Panel, SideLabel, SideNav } from "./AppRoot";

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
  const [mode, setMode] = useState<"week" | "day">(() => (window.innerWidth < 900 ? "day" : "week"));
  const [draft, setDraft] = useState<{ start: Date } | null>(null);
  const [open, setOpen] = useState<CalEvent | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const from = mode === "week" ? startOfWeek(anchor) : startOfDay(anchor);
  const days = Array.from({ length: mode === "week" ? 7 : 1 }, (_, i) => addDays(from, i));
  const to = addDays(from, days.length);
  const ev = useAsync<CalEvent[]>(() => api.events(ws.id, from.toISOString(), to.toISOString()), [ws.id, from.getTime(), days.length]);
  const events = (ev.data ?? []).filter((e) => !hidden[e.color]);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => { if (grid.current) grid.current.scrollTop = Math.max(0, (Math.min(now.getHours(), 17) - START - 1) * HOUR); }, []); // eslint-disable-line

  const title = mode === "week"
    ? `${from.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${addDays(to, -1).toLocaleDateString("en-US", from.getMonth() === addDays(to, -1).getMonth() ? { day: "numeric" } : { month: "short", day: "numeric" })}`
    : anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const step = (n: number) => setAnchor((a) => addDays(a, n * days.length));

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
        <SideLabel>Booking links</SideLabel>
        <p className="px-2.5 text-xs text-ink-3">Booking pages on yourcompany.melo.to are coming soon.</p>
      </SideNav>
      <Panel>
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-3 md:px-5">
          <h2 key={title} className="mr-2 text-[18px] font-medium animate-fade-in">{title}</h2>
          <Button variant="soft" size="s" onClick={() => setAnchor(new Date())}>Today</Button>
          <IconButton icon="chev-left" label="Previous" onClick={() => step(-1)} />
          <IconButton icon="chev-right" label="Next" onClick={() => step(1)} />
          <span className="flex-1" />
          <div className="flex rounded-full bg-hover p-0.5">
            {(["day", "week"] as const).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cx("h-7 rounded-full px-3 text-sm capitalize", mode === m ? "bg-white font-medium shadow-sm" : "text-ink-2 hover:text-ink")}>{m}</button>)}
          </div>
        </header>
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
        <p className="hidden border-t border-line px-5 py-2 text-xs text-ink-3 md:block">Double-click the grid to add an event. {personal ? "Only you can see your personal calendar." : `Events are shared with everyone in ${ws.name}.`}</p>
      </Panel>
      {draft && <EventModal start={draft.start} onClose={() => setDraft(null)} onSaved={(e) => { ev.set((d) => [...(d ?? []), e]); setDraft(null); toast("Event added"); }} />}
      {open && (
        <Modal open onClose={() => setOpen(null)} title={open.title} footer={<>
          {open.user_id === me && <Button variant="danger" icon="trash" onClick={async () => { try { await api.deleteEvent(open.id); ev.set((d) => (d ?? []).filter((x) => x.id !== open.id)); setOpen(null); toast("Event deleted"); } catch (e) { toast((e as Error).message, "bad"); } }}>Delete</Button>}
          <Button onClick={() => setOpen(null)}>Done</Button></>}>
          <div className="flex flex-col gap-2 text-sm">
            <p className="flex items-center gap-2"><Icon name="clock" className="text-icon-2" />{new Date(open.starts_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {fmtTime(open.starts_at)} – {fmtTime(open.ends_at)}</p>
            {open.location && <p className="flex items-center gap-2"><Icon name="globe" className="text-icon-2" />{open.location}</p>}
            <p className="flex items-center gap-2"><Icon name="user" className="text-icon-2" />Added by {nameOf(open.user_id)}</p>
          </div>
        </Modal>
      )}
    </>
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
