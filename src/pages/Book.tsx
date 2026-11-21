/* Public booking page (Figma: Public · Booking page) — melo.to/book/:handle/:slug */
import { useEffect, useMemo, useState } from "react";
import { api, type BookingPage } from "../lib/api";
import { Link, useLocation } from "../lib/router";
import { cx, isEmail, sameDay, startOfWeek, addDays } from "../lib/util";
import { Icon } from "../components/icons";
import { Avatar, Spinner } from "../components/ui";

const LOC = { video: "Melo video — link sent on booking", phone: "Phone call", in_person: "In person" } as const;

export default function Book() {
  const { parts } = useLocation();
  const [handle, slug] = [parts[1] ?? "", parts[2]];
  const [page, setPage] = useState<BookingPage | null | undefined>(undefined);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true; setPage(undefined);
    api.bookingPage(handle, slug).then((p) => live && setPage(p), (e: Error) => { if (live) { setErr(e.message); setPage(null); } });
    return () => { live = false; };
  }, [handle, slug]);
  useEffect(() => { document.title = page?.title ? `${page.title} with ${page.owner} — Melo` : page?.owner ? `Book time with ${page.owner} — Melo` : "Book a time — Melo"; }, [page]);
  return (
    <div className="melo-app flex min-h-dvh flex-col items-center justify-center bg-app px-4 py-10">
      <span className="mb-5 flex h-8 items-center gap-2 rounded-full bg-hover px-3 text-[12px] text-ink-2"><Icon name="shield" className="size-3.5 text-ok" />{location.host}/book/{handle}{slug ? `/${slug}` : ""}</span>
      <div className="w-full max-w-[960px] overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_var(--color-line),0_24px_48px_-24px_rgba(0,0,0,.18)]">
        {page === undefined ? <div className="flex h-[420px] items-center justify-center"><Spinner delay /></div>
          : page === null ? <div className="flex h-[420px] flex-col items-center justify-center gap-2 px-6 text-center"><Icon name="link" className="size-6 text-icon-2" /><b className="text-[17px] font-medium">This booking link isn’t available</b><p className="text-sm text-ink-3">{err || "It may have been turned off or renamed. Ask for a new link."}</p></div>
          : slug ? <Slots page={page} handle={handle} slug={slug} />
          : <Index page={page} handle={handle} />}
      </div>
      <p className="mt-5 flex items-center gap-1.5 text-[12px] text-ink-3">Powered by <Link to="/" className="font-medium text-ink-2 hover:text-ink">Melo</Link></p>
    </div>
  );
}

function Index({ page, handle }: { page: BookingPage; handle: string }) {
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-12">
      <Avatar name={page.owner} size={56} soft />
      <div className="text-center"><h1 className="text-[24px] font-medium">Book time with {page.owner}</h1><p className="mt-1 text-sm text-ink-3">Pick what you’d like to talk about.</p></div>
      <div className="grid w-full max-w-xl gap-3">
        {(page.links ?? []).map((l) => (
          <Link key={l.slug} to={`/book/${handle}/${l.slug}`} className="flex items-center gap-4 rounded-2xl border border-line p-4 hover:-translate-y-px hover:shadow-pop">
            <span className="min-w-0 flex-1"><b className="block text-[15px] font-medium">{l.title}</b><span className="text-[13px] text-ink-3">{l.duration} min · {LOC[l.location]}</span>{l.description && <span className="mt-1 block text-[13px] text-ink-2">{l.description}</span>}</span>
            <Icon name="chev-right" className="size-4 text-icon-2" />
          </Link>
        ))}
        {!(page.links ?? []).length && <p className="text-center text-sm text-ink-3">{page.owner} doesn’t have any open booking links right now.</p>}
      </div>
    </div>
  );
}

function Slots({ page, handle, slug }: { page: BookingPage; handle: string; slug: string }) {
  const slots = useMemo(() => (page.slots ?? []).map((s) => new Date(s)), [page.slots]);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const firstDay = slots[0] ?? new Date();
  const [month, setMonth] = useState(new Date(firstDay.getFullYear(), firstDay.getMonth(), 1));
  const [day, setDay] = useState<Date | null>(slots[0] ?? null);
  const [pick, setPick] = useState<Date | null>(null);
  const [h24, setH24] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", note: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [done, setDone] = useState<Date | null>(null);
  const has = (d: Date) => slots.some((s) => sameDay(s, d));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(startOfWeek(month), i));
  const daySlots = day ? slots.filter((s) => sameDay(s, day)) : [];
  const fmt = (d: Date) => d.toLocaleTimeString(h24 ? "en-GB" : "en-US", { hour: "numeric", minute: "2-digit" }).replace(" AM", "am").replace(" PM", "pm");
  const book = async () => {
    if (!pick) return;
    if (!form.name.trim()) return setErr("Add your name.");
    if (!isEmail(form.email)) return setErr("Add a valid email so we can send the details.");
    setBusy(true); setErr("");
    try { await api.bookSlot(handle, slug, pick.toISOString(), form.name.trim(), form.email.trim(), form.note.trim()); setDone(pick); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  if (done) return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center animate-fade-up">
      <span className="flex size-14 items-center justify-center rounded-full bg-ok-soft text-ok animate-tick"><Icon name="check" className="size-7" /></span>
      <h1 className="text-[22px] font-medium">You’re booked with {page.owner}</h1>
      <p className="text-sm text-ink-2">{page.title} · {done.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {fmt(done)} ({tz})</p>
      <p className="text-[13px] text-ink-3">{page.owner} has it on their calendar{page.location === "video" ? " and will send the video link" : ""}.</p>
    </div>
  );
  return (
    <div className="grid md:grid-cols-[280px_1fr_260px]">
      <div className="border-b border-line p-6 md:border-r md:border-b-0">
        {page.workspace && <p className="mb-5 flex items-center gap-2 text-[13px] text-ink-2"><span className="flex size-6 items-center justify-center rounded-md bg-tag-purple-bg text-[11px] font-semibold text-tag-purple">{page.workspace[0]}</span>{page.workspace}</p>}
        <Avatar name={page.owner} size={40} soft />
        <p className="mt-2 text-[13px] text-ink-2">{page.owner}</p>
        <h1 className="mt-1 text-[22px] font-medium">{page.title}</h1>
        <div className="mt-3 flex flex-col gap-2 text-[13px] text-ink-2">
          <span className="flex items-center gap-2"><Icon name="clock" className="size-4 text-icon-2" />{page.duration} min</span>
          <span className="flex items-center gap-2"><Icon name={page.location === "phone" ? "phone" : "globe"} className="size-4 text-icon-2" />{LOC[page.location ?? "video"]}</span>
          <span className="flex items-center gap-2"><Icon name="globe" className="size-4 text-icon-2" />Times in {tz.replace(/_/g, " ")}</span>
        </div>
        {page.description && <p className="mt-4 text-[13px] leading-5 text-ink-2">{page.description}</p>}
      </div>
      <div className="border-b border-line p-6 md:border-r md:border-b-0">
        <div className="mb-4 flex items-center"><b className="flex-1 text-[14px] font-medium">{month.toLocaleDateString("en-US", { month: "long" })} <span className="font-normal text-ink-3">{month.getFullYear()}</span></b>
          <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-hover"><Icon name="chev-left" className="size-4" /></button>
          <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-hover"><Icon name="chev-right" className="size-4" /></button></div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d} className="pb-2 text-[11px] text-ink-3 uppercase">{d}</span>)}
          {cells.map((d) => {
            const inMonth = d.getMonth() === month.getMonth(), ok = inMonth && has(d), on = day && sameDay(d, day);
            return <button key={d.toISOString()} type="button" disabled={!ok} onClick={() => { setDay(d); setPick(null); }} className={cx("mx-auto flex size-11 items-center justify-center rounded-xl text-[14px]", !inMonth && "invisible", on ? "bg-inverse font-semibold text-white" : ok ? "bg-subtle font-semibold hover:bg-active" : "text-ink-4")}>{d.getDate()}</button>;
          })}
        </div>
        {!slots.length && <p className="mt-4 text-center text-[13px] text-ink-3">No open times in the next three weeks.</p>}
      </div>
      <div className="p-5">
        {day && <div className="mb-3 flex items-center"><b className="flex-1 text-[14px] font-medium">{day.toLocaleDateString("en-US", { weekday: "short" })} <span className="font-normal text-ink-3">{day.getDate()}</span></b>
          <span className="flex rounded-lg bg-hover p-0.5 text-[11px]">{[false, true].map((v) => <button key={String(v)} type="button" onClick={() => setH24(v)} className={cx("rounded-md px-2 py-0.5", h24 === v && "bg-white shadow-sm")}>{v ? "24h" : "12h"}</button>)}</span></div>}
        {pick ? (
          <div className="flex flex-col gap-2.5 animate-fade-in">
            <button type="button" onClick={() => setPick(null)} className="flex h-10 items-center justify-center rounded-xl bg-inverse text-[14px] font-medium text-white">{fmt(pick)}</button>
            <input aria-label="Your name" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: (e.target as HTMLInputElement).value })} className="h-10 rounded-xl border border-line px-3 text-[14px] outline-none focus:border-accent" />
            <input aria-label="Your email" type="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: (e.target as HTMLInputElement).value })} className="h-10 rounded-xl border border-line px-3 text-[14px] outline-none focus:border-accent" />
            <textarea aria-label="Anything to share" placeholder="Anything to share first? (optional)" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: (e.target as HTMLTextAreaElement).value })} className="resize-none rounded-xl border border-line px-3 py-2 text-[14px] outline-none focus:border-accent" />
            {err && <p role="alert" className="text-[13px] text-bad">{err}</p>}
            <button type="button" onClick={book} disabled={busy} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-inverse text-[14px] font-medium text-white disabled:opacity-60">{busy ? <><Spinner className="size-4" />Booking…</> : "Confirm"}</button>
          </div>
        ) : (
          <div className="melo-scroll flex max-h-[420px] flex-col gap-2 overflow-y-auto">
            {daySlots.map((s) => <button key={s.toISOString()} type="button" onClick={() => { setPick(s); setErr(""); }} className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-subtle text-[14px] font-medium hover:bg-active"><span className="size-1.5 rounded-full bg-ok" />{fmt(s)}</button>)}
            {day && !daySlots.length && <p className="text-[13px] text-ink-3">No times left this day.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
