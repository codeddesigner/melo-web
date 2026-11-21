/* Figma: Calendar · Booking links — links on the left, your availability on the right */
import { useEffect, useMemo, useState } from "react";
import { api, type BookingLink, type BookingSettings } from "../lib/api";
import { navigate, useLocation } from "../lib/router";
import { onBusinessHost, onPersonalHost } from "../lib/site";
import { copy, cx } from "../lib/util";
import { Icon } from "../components/icons";
import { Avatar, Button, Field, IconButton, Input, Menu, Modal, Select, Skeleton, Toggle, useAsync, useConfirm, useToast } from "../components/ui";
import { useApp } from "./context";
import { Panel } from "./AppRoot";

export const bookingUrl = (handle: string, slug?: string) =>
  `${onPersonalHost() || onBusinessHost() ? "https://melo.to" : location.origin}/book/${handle}${slug ? `/${slug}` : ""}`;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LOC: Record<BookingLink["location"], { label: string; icon: "phone" | "globe" | "users" }> = { video: { label: "Melo video", icon: "globe" }, phone: { label: "Phone", icon: "phone" }, in_person: { label: "In person", icon: "users" } };
const hm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const TIMES = Array.from({ length: 48 }, (_, i) => i * 30);
const DEFAULT: BookingSettings = { tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", hours: { 1: [540, 1020], 2: [540, 1020], 3: [540, 1020], 4: [540, 1020], 5: [540, 1020] }, buffer_min: 10, notice_min: 240 };
const ZONES: string[] = (() => { try { return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? []; } catch { return []; } })();

export function BookingLinksPage({ links }: { links: ReturnType<typeof useAsync<BookingLink[]>> }) {
  const { account, ws } = useApp();
  const { query } = useLocation();
  const toast = useToast();
  const confirm = useConfirm();
  const handle = account.profile?.melo_address ?? null;
  const [creating, setCreating] = useState(query.get("new") === "1");
  useEffect(() => { if (query.get("new") === "1") { setCreating(true); navigate("/app/calendar/booking", { replace: true, scroll: false }); } }, [query]);
  const monthStart = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString(); }, []);
  const counts = useAsync(() => api.bookingCounts(monthStart), [monthStart]);
  const booked = (id: string) => (counts.data ?? []).filter((b) => b.link_id === id).length;
  const set = async (l: BookingLink, patch: Partial<BookingLink>) => {
    links.set((d) => (d ?? []).map((x) => (x.id === l.id ? { ...x, ...patch } : x)));
    try { await api.updateBookingLink(l.id, patch); } catch (e) { toast((e as Error).message, "bad"); links.reload(); }
  };
  const del = async (l: BookingLink) => {
    if (!(await confirm({ title: `Delete “${l.title}”?`, body: "The link stops working. Meetings already booked stay on your calendar.", confirm: "Delete link", danger: true }))) return;
    links.set((d) => (d ?? []).filter((x) => x.id !== l.id));
    try { await api.deleteBookingLink(l.id); toast("Link deleted"); } catch (e) { toast((e as Error).message, "bad"); links.reload(); }
  };
  return (
    <Panel className="flex-row">
      <div className="melo-scroll min-w-0 flex-1 overflow-y-auto px-4 pb-12 md:px-6">
        <div className="flex h-16 items-center gap-4"><h2 className="flex-1 text-[20px] leading-[26px] font-medium tracking-[-.3px]">Booking links</h2><Button icon="plus" onClick={() => setCreating(true)} disabled={!handle}>New link</Button></div>
        <p className="-mt-2 text-[13px] text-ink-2">Share a link and let people pick a time that works. Bookings land in your calendar.</p>
        {!handle ? (
          <div className="mt-6 rounded-2xl border border-line bg-white p-5 text-sm">Booking pages live at <b className="font-medium">melo.to/book/you</b>, so they need a Melo address. <button type="button" className="font-medium text-accent-ink hover:underline" onClick={() => navigate("/app/settings/profile")}>Claim yours in Settings</button>.</div>
        ) : <>
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
            <Avatar name={account.profile?.full_name || account.email} size={40} soft />
            <div className="min-w-0 flex-1"><b className="block text-[14px] font-medium">Your public page</b><a href={bookingUrl(handle)} target="_blank" rel="noopener noreferrer" className="text-[13px] text-accent-ink hover:underline">{bookingUrl(handle).replace(/^https?:\/\//, "")}</a></div>
            <Button variant="soft" size="s" icon="copy" onClick={async () => { await copy(bookingUrl(handle)); toast("Link copied"); }}>Copy</Button>
            <Button variant="soft" size="s" icon="share" onClick={() => window.open(bookingUrl(handle), "_blank", "noopener")}>Preview</Button>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
            {links.loading && !links.data ? <div className="p-5"><Skeleton className="h-12" /></div>
              : !(links.data ?? []).length ? <div className="flex flex-col items-center gap-3 px-6 py-12 text-center"><Icon name="link" className="size-6 text-icon-2" /><p className="text-sm text-ink-2">No booking links yet. Make one for intro calls, client meetings or office hours.</p><Button icon="plus" onClick={() => setCreating(true)}>New link</Button></div>
              : (links.data ?? []).map((l, i) => (
                <div key={l.id} className={cx("flex items-center gap-4 px-4 py-3.5 animate-fade-up", i && "border-t border-line")}>
                  <span className="h-9 w-[3px] shrink-0 rounded-full" style={{ background: l.enabled ? ["#c8ece9", "#d3e3fd", "#1b87f5", "#ffe0cc"][i % 4] : "#e3e6ea" }} />
                  <div className={cx("min-w-0 flex-1", !l.enabled && "opacity-60")}>
                    <p className="flex items-center gap-2 text-[14px] font-medium">{l.title}<span className="rounded-full bg-hover px-2 text-[12px] font-normal text-ink-2">{l.duration_min} min</span></p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-ink-3"><Icon name={LOC[l.location].icon} className="size-3" />{LOC[l.location].label} · {bookingUrl(handle, l.slug).replace(/^https?:\/\//, "")}</p>
                  </div>
                  <span className="hidden text-[12px] text-ink-3 md:inline">{l.enabled ? `${booked(l.id)} booked this month` : "Hidden from your page"}</span>
                  <IconButton icon="copy" label={`Copy ${l.title} link`} onClick={async () => { await copy(bookingUrl(handle, l.slug)); toast("Link copied"); }} />
                  <Toggle on={l.enabled} onChange={(v) => set(l, { enabled: v })} label={`${l.title} visible`} />
                  <Menu trigger={(t) => <IconButton icon="more" label={`${l.title} options`} onClick={t} />} items={[
                    { label: "Open booking page", icon: "share", onSelect: () => window.open(bookingUrl(handle, l.slug), "_blank", "noopener") },
                    { label: "Delete link", icon: "trash", danger: true, onSelect: () => del(l) },
                  ]} />
                </div>
              ))}
          </div>
        </>}
      </div>
      <Availability />
      {creating && handle && <NewLink ws={ws.id} taken={(links.data ?? []).map((l) => l.slug)} onClose={() => setCreating(false)} onCreated={(l) => { links.set((d) => [...(d ?? []), l]); setCreating(false); toast("Booking link created"); }} />}
    </Panel>
  );
}

function Availability() {
  const toast = useToast();
  const s = useAsync(() => api.bookingSettings(), []);
  const [f, setF] = useState<BookingSettings | null>(null);
  useEffect(() => { if (s.data !== undefined && !f) setF(s.data ?? DEFAULT); }, [s.data]); // eslint-disable-line
  const [dirty, setDirty] = useState(false);
  const up = (p: Partial<BookingSettings>) => { setF((x) => ({ ...(x ?? DEFAULT), ...p })); setDirty(true); };
  const save = async () => { if (!f) return; try { await api.saveBookingSettings(f); setDirty(false); toast("Availability saved"); } catch (e) { toast((e as Error).message, "bad"); } };
  const day = (i: number) => f?.hours[String(i + 1)];
  return (
    <aside className="melo-scroll hidden w-[320px] shrink-0 overflow-y-auto border-l border-line bg-white px-5 pb-10 xl:block">
      <div className="flex h-16 items-center"><h3 className="flex-1 text-[15px] font-medium">Availability</h3>{dirty && <Button size="s" onClick={save}>Save</Button>}</div>
      {!f ? <Skeleton className="mt-4 h-40" /> : <>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-[13px]"><Icon name="globe" className="size-4 text-icon-2" />
          <select aria-label="Time zone" value={f.tz} onChange={(e) => up({ tz: (e.target as HTMLSelectElement).value })} className="min-w-0 flex-1 bg-transparent outline-none">
            {(ZONES.length ? ZONES : [f.tz]).map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
          </select></label>
        <div className="mt-4 flex flex-col gap-1.5">
          {DAYS.map((d, i) => {
            const h = day(i);
            return (
              <div key={d} className="flex h-9 items-center gap-3 text-[13px]">
                <Toggle on={Boolean(h)} label={`${d} available`} onChange={(v) => { const hours = { ...f.hours }; if (v) hours[String(i + 1)] = [540, 1020]; else delete hours[String(i + 1)]; up({ hours }); }} />
                <b className="w-9 font-medium">{d}</b>
                {h ? <span className="flex items-center gap-1 text-ink-2">
                  <select aria-label={`${d} from`} value={h[0]} onChange={(e) => { const v = +(e.target as HTMLSelectElement).value; if (v < h[1]) up({ hours: { ...f.hours, [String(i + 1)]: [v, h[1]] } }); }} className="rounded-lg px-1 py-0.5 outline-none hover:bg-hover">{TIMES.map((t) => <option key={t} value={t}>{hm(t)}</option>)}</select>–
                  <select aria-label={`${d} to`} value={h[1]} onChange={(e) => { const v = +(e.target as HTMLSelectElement).value; if (v > h[0]) up({ hours: { ...f.hours, [String(i + 1)]: [h[0], v] } }); }} className="rounded-lg px-1 py-0.5 outline-none hover:bg-hover">{TIMES.slice(1).concat(1440).map((t) => <option key={t} value={t}>{t === 1440 ? "24:00" : hm(t)}</option>)}</select>
                </span> : <span className="text-ink-3">Unavailable</span>}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-line p-3.5 text-[13px]">
          <label className="flex items-center justify-between gap-2">Buffer between meetings<select value={f.buffer_min} onChange={(e) => up({ buffer_min: +(e.target as HTMLSelectElement).value })} className="rounded-lg bg-hover px-2 py-1 font-medium outline-none">{[0, 5, 10, 15, 30].map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
          <label className="flex items-center justify-between gap-2">Minimum notice<select value={f.notice_min} onChange={(e) => up({ notice_min: +(e.target as HTMLSelectElement).value })} className="rounded-lg bg-hover px-2 py-1 font-medium outline-none">{[[60, "1 hour"], [240, "4 hours"], [1440, "1 day"], [2880, "2 days"]].map(([m, l]) => <option key={m} value={m}>{l}</option>)}</select></label>
          <p className="flex items-center justify-between gap-2">Check conflicts in<b className="font-medium">Your calendar</b></p>
        </div>
      </>}
    </aside>
  );
}

function NewLink({ ws, taken, onClose, onCreated }: { ws: string; taken: string[]; onClose: () => void; onCreated: (l: BookingLink) => void }) {
  const toast = useToast();
  const [f, setF] = useState({ title: "", slug: "", duration: "30", location: "video" as BookingLink["location"], description: "" });
  const [touched, setTouched] = useState(false), [busy, setBusy] = useState(false);
  const slug = (touched ? f.slug : f.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const create = async () => {
    if (!f.title.trim()) return toast("Give the link a name.", "bad");
    if (!slug) return toast("Add a short link name.", "bad");
    if (taken.includes(slug)) return toast(`You already have /${slug}`, "bad");
    setBusy(true);
    try { onCreated(await api.createBookingLink({ workspace_id: ws, slug, title: f.title.trim(), duration_min: +f.duration, location: f.location, description: f.description.trim() || null })); }
    catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="New booking link" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={create} busy={busy}>Create link</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Name"><Input value={f.title} onChange={(v) => setF({ ...f, title: v })} placeholder="Client call" autoFocus onEnter={create} /></Field>
        <Field label="Link" hint={`…/book/you/${slug || "client-call"}`}><Input value={touched ? f.slug : slug} onChange={(v) => { setTouched(true); setF({ ...f, slug: v }); }} placeholder="client-call" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Length"><Select label="Length" value={f.duration} onChange={(v) => setF({ ...f, duration: v })} options={["15", "30", "45", "60", "90"].map((m) => ({ value: m, label: `${m} min` }))} /></Field>
          <Field label="Where"><Select label="Where" value={f.location} onChange={(v) => setF({ ...f, location: v })} options={(Object.keys(LOC) as BookingLink["location"][]).map((k) => ({ value: k, label: LOC[k].label }))} /></Field>
        </div>
        <Field label="Description (optional)"><Input value={f.description} onChange={(v) => setF({ ...f, description: v })} placeholder="A focused 30 minutes to walk through your project" /></Field>
      </div>
    </Modal>
  );
}
