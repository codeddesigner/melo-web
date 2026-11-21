/* Static Melo Personal app mock, drawn at the Figma frame size (1440×900) and scaled to fit.
   Used by the Personal website hero, the feature cards and section visuals. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, MeloMark, type IconName } from "../components/icons";
import { cx } from "../lib/util";

export type MockView = "inbox" | "screener" | "later" | "thread" | "filters";

/* Fit a fixed-size drawing into whatever width it's given */
export function Scaled({ w = 1440, h = 900, children, className }: { w?: number; h?: number; children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const fit = () => setK(el.clientWidth / w);
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={box} className={cx("relative w-full overflow-hidden", className)} style={{ aspectRatio: `${w} / ${h}` }} aria-hidden="true">
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: w, height: h, transform: `scale(${k})`, opacity: k ? 1 : 0 }}>{children}</div>
    </div>
  );
}

/* Figma avatar/* pairs: soft fill + matching ink */
const AV: Record<string, [string, string]> = { MM: ["#ffe0cc", "#8a4100"], SM: ["#c8ece9", "#00605c"], DW: ["#fddbe7", "#9c2459"], SL: ["#d3e3fd", "#0b57d0"], HL: ["#e8def8", "#5b3fbf"], LG: ["#c9eed3", "#146c2e"], MR: ["#ffe0cc", "#8a4100"], AM: ["#e8eaed", "#444746"] };
const Av = ({ i, s = 32, sq }: { i: string; s?: number; sq?: boolean }) =>
  <span className={cx("flex shrink-0 items-center justify-center font-medium", sq ? "rounded-lg bg-hover text-ink-3" : "rounded-full")} style={{ width: s, height: s, fontSize: s * 0.36, background: sq ? undefined : (AV[i] ?? ["#e8eaed", "#444746"])[0], color: sq ? undefined : (AV[i] ?? ["#e8eaed", "#444746"])[1] }}>{i}</span>;
const Tag = ({ c, t }: { c: string; t: string }) => <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-hover px-2 text-[12px] text-ink-2"><span className="size-1.5 rounded-full" style={{ background: c }} />{t}</span>;

function Sidebar({ active }: { active: string }) {
  const Item = ({ ic, t, n, on }: { ic: IconName; t: string; n?: number; on?: boolean }) => (
    <div className={cx("flex h-[34px] items-center gap-2.5 rounded-xl px-2.5 text-[14px]", on && "bg-active font-medium")}>
      <Icon name={ic} className="size-4 text-icon" /><span className="flex-1">{t}</span>{n !== undefined && <span className={cx("text-[12px]", on ? "font-semibold text-pa-text" : "text-ink-3")}>{n}</span>}
    </div>
  );
  const Dot = ({ c, t, n, on }: { c: string; t: string; n?: number; on?: boolean }) => (
    <div className={cx("flex h-[34px] items-center gap-2.5 rounded-xl px-2.5 text-[14px]", on && "bg-active font-medium")}><span className="ml-1 size-2 rounded-full" style={{ background: c }} /><span className="flex-1">{t}</span>{n !== undefined && <span className="text-[12px] text-ink-3">{n}</span>}</div>
  );
  return (
    <>
      <div className="flex w-[76px] shrink-0 flex-col items-center gap-1 border-r border-line/60 py-4">
        <span className="mb-4 flex size-[34px] items-center justify-center rounded-[10px] bg-inverse text-white"><MeloMark className="h-[11px] w-[17px]" /></span>
        <span className="relative flex h-[58px] w-[60px] flex-col items-center justify-center gap-1 rounded-xl bg-active text-[12px] font-semibold"><Icon name="mail" className="size-[18px]" />Mail<span className="absolute left-[34px] top-[6px] flex size-4 items-center justify-center rounded-full bg-pa text-[10px] font-bold text-pa-on">4</span></span>
        <span className="flex-1" />
        <span className="flex h-[58px] w-[60px] flex-col items-center justify-center gap-1 text-[12px] text-ink-2"><Icon name="settings" className="size-[18px]" />Settings</span>
        <Av i="AM" s={30} />
      </div>
      <div className="flex w-[240px] shrink-0 flex-col px-3 py-4">
        <div className="mb-3 flex h-8 items-center justify-between pl-2"><b className="text-[16px] font-medium">Mail</b><span className="flex h-8 items-center gap-1.5 rounded-full bg-inverse px-3 text-[13px] font-medium text-white"><Icon name="plus" className="size-4" />Compose</span></div>
        <div className="mb-3 flex h-8 items-center gap-2 rounded-xl bg-white px-2.5 text-[13px] text-ink-3 shadow-[0_0_0_1px_var(--color-line)]"><Icon name="search" className="size-4" /><span className="flex-1">Search</span><kbd className="text-[10px]">⌘K</kbd></div>
        <Item ic="inbox" t="Inbox" n={4} on={active === "inbox"} /><Item ic="clock" t="Later" n={3} on={active === "later"} /><Item ic="send" t="Sent" /><Item ic="doc" t="Drafts" n={1} /><Item ic="archive" t="Archive" />
        <div className="mt-5 mb-1 flex items-center justify-between px-2.5 text-[12px] text-ink-3">Sorted by Melo<Icon name="plus" className="size-4" /></div>
        <Dot c="#1e5a96" t="Newsletters" n={8} /><Dot c="#1f6b3a" t="Receipts" n={2} /><Dot c="#5b3fbf" t="Screener" n={4} on={active === "screener"} /><Dot c="#9a4b0f" t="Updates" />
        <div className="mt-5 mb-1 px-2.5 text-[12px] text-ink-3">Accounts</div>
        <Item ic="mail" t="alex@melo.to" n={4} /><Item ic="mail" t="alex.morgan@gmail.com" n={12} />
        <span className="flex-1" />
        <div className="flex gap-2.5 rounded-2xl bg-white p-3.5 text-[13px] shadow-[0_0_0_1px_var(--color-line)]"><Icon name="shield" className="mt-0.5 size-4 text-icon" /><span><b className="block font-medium">26 sorted out today</b><span className="text-pa-text">See what Melo moved</span></span></div>
      </div>
    </>
  );
}

type Row = { g?: string; i?: string; who?: string; tag?: [string, string]; s?: string; p?: string; t?: string; u?: boolean; on?: boolean };
const INBOX: Row[] = [
  { g: "Today" },
  { i: "MM", who: "Mum", tag: ["#5b3fbf", "Family"], s: "Sunday lunch?", p: "Bring the kids if you can — I’m making the lemon cake", t: "9:12 AM", u: true, on: true },
  { i: "SM", who: "Sofia Morgan", s: "Lisbon photos 📸", p: "Finally sorted the album. The sunset ones are my favourite", t: "8:40 AM", u: true },
  { i: "S", who: "Stripe", tag: ["#1f6b3a", "Receipt"], s: "Receipt from Bluebird Yoga", p: "€45.00 paid with Visa ·· 4412", t: "8:03 AM", u: true },
  { i: "DW", who: "Daniel Weber", s: "Re: Saturday 5-a-side", p: "I’m in. Bringing the spare ball.", t: "7:48 AM", u: true },
  { i: "N", who: "Notion", s: "Shared with you: Wedding plan", p: "Sofia invited you to edit the page", t: "7:02 AM" },
  { g: "Yesterday" },
  { i: "HL", who: "Hannah Lind", tag: ["#5b3fbf", "Family"], s: "Re: Flat viewing on Thursday", p: "6pm works — I’ll meet you outside", t: "Thu" },
  { i: "SL", who: "Sam Lee", tag: ["#1e5a96", "Friends"], s: "Climbing on Sunday?", p: "New wall opened at the Arches. 10am?", t: "Thu", u: true },
  { g: "Earlier" },
  { i: "A", who: "Airbnb", s: "Reservation confirmed", p: "Your stay in Lisbon, Dec 19–22. Check-in after 3pm", t: "Nov 18" },
  { i: "LG", who: "Leo Grant", tag: ["#1e5a96", "Friends"], s: "Your lease renewal", p: "Attached the signed renewal for next year", t: "Nov 15" },
];
const SCREEN: Row[] = [
  { g: "New senders · waiting for you" },
  { who: "Marco Ruiz", s: "Old flatmate here 👋", p: "Got your address from Sofia — are you still in London?", t: "9:40 AM", u: true, on: true },
  { who: "Northside Lettings", s: "Viewing slots this week", p: "We have three times for the Elm Road flat", t: "8:15 AM", u: true },
  { who: "Bluebird Yoga", s: "Welcome to Bluebird", p: "Your first class is on us. Here’s how to book", t: "7:50 AM", u: true },
  { who: "Clara Weiss", s: "Found your wallet!", p: "Picked it up near Hampstead Heath station", t: "7:02 AM", u: true },
];
function List({ rows, title, tabs }: { rows: Row[]; title: string; tabs?: ReactNode }) {
  return (
    <div className="flex w-[644px] shrink-0 flex-col border-r border-line bg-white">
      <div className="flex h-16 items-center gap-3 px-7"><b className="font-display text-[22px] font-medium">{title}</b>{tabs}<span className="flex-1" /><Icon name="filter" className="size-4 text-icon" /><Icon name="more" className="size-4 text-icon" /></div>
      <div className="px-3">
        {rows.map((r, k) => r.g ? <p key={k} className="px-3 pt-4 pb-2 text-[12px] text-ink-3">{r.g}</p> : (
          <div key={k} className={cx("flex h-11 items-center gap-3 rounded-xl px-3 text-[13px]", r.on && "bg-pa-soft shadow-[inset_2px_0_0_var(--color-pa)]")}>
            <span className={cx("size-1.5 shrink-0 rounded-full", r.u ? "bg-pa" : "bg-transparent")} />
            <span className={cx("w-[140px] shrink-0 truncate", r.u ? "font-semibold" : "text-ink-2")}>{r.who}</span>
            <span className="flex min-w-0 flex-1 items-center gap-2">{r.tag && <Tag c={r.tag[0]} t={r.tag[1]} />}<b className={cx("shrink-0", r.u ? "font-semibold" : "font-normal")}>{r.s}</b><span className="truncate text-ink-3">{r.p}</span></span>
            <span className={cx("shrink-0 text-[12px]", r.u ? "font-medium" : "text-ink-3")}>{r.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
const Seg = ({ items }: { items: [string, number?][] }) => (
  <span className="flex rounded-lg bg-hover p-0.5 text-[13px]">{items.map(([t, n], k) => <span key={t} className={cx("flex h-7 items-center gap-1.5 rounded-md px-2.5", k === 0 ? "bg-white font-medium shadow-sm" : "text-ink-2")}>{t}{n !== undefined && <span className="text-ink-3">{n}</span>}</span>)}</span>
);
function Reader({ screener }: { screener?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="flex h-16 items-center gap-3 px-6 text-icon">
        <Icon name="archive" className="size-4" /><Icon name="clock" className="size-4" />
        <span className="flex h-8 items-center gap-1.5 rounded-full bg-hover px-3 text-[13px] font-medium text-ink"><Icon name="check" className="size-4" />{screener ? "Allow sender" : "Remind me"}</span>
        {screener && <span className="text-[13px] font-medium text-ink">Block</span>}
        <span className="flex-1" /><Icon name="more" className="size-4" />
      </div>
      <div className="px-8">
        <h4 className="mt-2 font-display text-[22px] font-medium">{screener ? "Old flatmate here 👋" : "Sunday lunch?"}</h4>
        <div className="mt-4 flex items-center gap-3"><Av i={screener ? "MR" : "MM"} s={36} /><div className="flex-1 text-[13px]"><b className="block text-[14px] font-medium">{screener ? "Marco Ruiz" : "Mum"}</b><span className="text-ink-3">{screener ? "marco.ruiz@fastmail.com · first email" : "to you, Sofia"}</span></div><span className="text-[12px] text-ink-3">{screener ? "9:40 AM" : "9:12 AM"}</span></div>
        <div className="mt-4 flex gap-2.5 rounded-2xl bg-subtle p-4 text-[13px] text-ink-2"><Icon name="sparkle" className="size-4 shrink-0 text-pa-text" />{screener ? "First time writing to you. Melo is holding this until you decide — Marco won’t know." : "Mum’s hosting lunch on Sunday at 1pm and wants to know if the kids are coming by Friday."}</div>
        <p className="mt-5 text-[15px] leading-[24px]">{screener ? "Hey Alex! It’s Marco from the Camden flat. Sofia gave me your new address — are you still in London? I’m visiting in December and would love to catch up." : "Hi love — I’m doing a roast on Sunday, 1pm. Bring the kids if you can, I’m making the lemon cake. Let me know by Friday so I get enough potatoes! Mum x"}</p>
        {!screener && <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-hover px-3 py-2.5 text-[13px]"><Icon name="clip" className="size-4" /><b className="font-medium">lemon-cake-recipe.pdf</b><span className="text-ink-3">320 KB</span></span>}
      </div>
      <span className="flex-1" />
      <div className="m-6 flex h-11 items-center rounded-2xl border border-line px-4 text-[13px] text-ink-3"><span className="flex-1">{screener ? "Allow Marco to reply from here" : "Reply to Mum…"}</span><kbd className="text-[10px]">R</kbd></div>
    </div>
  );
}
function Later() {
  const grp = (t: string, rows: [string, string, string, string][]) => (
    <div className="mb-4"><p className="mb-2 text-[13px] text-ink-2">{t}</p>
      <div className="rounded-2xl border border-line bg-white">{rows.map(([i, w, s, d], k) => <div key={k} className={cx("flex h-12 items-center gap-3 px-4 text-[13px]", k && "border-t border-line")}><Av i={i} s={26} sq={i.length === 1} /><span className="w-[130px]">{w}</span><b className="font-medium">{s}</b><span className="flex-1" /><span className="text-[12px] text-ink-3">{d}</span></div>)}</div></div>
  );
  return (
    <div className="flex min-w-0 flex-1 bg-white">
      <div className="flex-1 px-7 pt-6">
        {grp("Comes back today at 5:00 PM", [["SL", "Sam Lee", "Climbing on Sunday?", "5:00 PM"]])}
        {grp("Tomorrow, 9:00 AM", [["S", "Stripe", "December statement", "Tomorrow"], ["HL", "Hannah Lind", "Flat viewing checklist", "Tomorrow"]])}
        {grp("Next week", [["N", "Notion", "Weekly digest", "Mon"], ["F", "Figma", "Concert presale", "Mon"], ["LG", "Leo Grant", "Dinner on Friday", "Tue"]])}
      </div>
      <div className="w-[300px] border-l border-line bg-subtle p-5 text-[13px]">
        <b className="font-medium">Snooze schedule</b>
        <div className="mt-3 rounded-2xl bg-white p-3 shadow-[0_0_0_1px_var(--color-line)]"><b className="text-[12px] font-medium">November 2026</b><div className="mt-2 grid grid-cols-7 gap-1 text-center text-[12px]">{["21", "22", "23", "24", "25", "26", "27"].map((d, k) => <span key={d} className={cx("rounded-lg py-1.5", k === 0 && "bg-inverse text-white")}>{d}</span>)}</div></div>
        {["Later today", "Tomorrow morning", "Next week", "Pick date & time"].map((t) => <div key={t} className="mt-2 flex h-9 items-center gap-2 rounded-xl bg-hover px-3"><Icon name="clock" className="size-4" />{t}</div>)}
      </div>
    </div>
  );
}
function Filters() {
  return (
    <div className="absolute left-[340px] top-[110px] w-[390px] rounded-2xl bg-white p-4 text-[13px] shadow-modal">
      <b className="text-[14px] font-medium">Filters</b><p className="text-[12px] text-ink-3">Choose what reaches Primary. Nothing is deleted.</p>
      {[["Newsletters", "Moved to the Newsletters tab", true], ["Receipts & orders", "Moved to Receipts and bundled by order", true], ["deals@shopmart.com", "Skips Primary", true], ["Calendar invites", "Paused", false]].map(([t, d, on]) => (
        <div key={String(t)} className="mt-3 flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-hover"><Icon name="filter" className="size-4" /></span><span className="flex-1"><b className="block font-medium">{t}</b><span className="text-[12px] text-ink-3">{d}</span></span>
          <span className={cx("relative h-5 w-9 rounded-full", on ? "bg-pa" : "bg-line-2")}><span className={cx("absolute top-0.5 size-4 rounded-full bg-white shadow-sm", on ? "left-[18px]" : "left-0.5")} /></span></div>
      ))}
    </div>
  );
}

export function PersonalMock({ view = "inbox" }: { view?: MockView }) {
  const tabs = <Seg items={[["Primary", 4], ["Everything else", 10]]} />;
  return (
    <div className="melo-app relative flex h-[900px] w-[1440px] overflow-hidden bg-app text-ink">
      <Sidebar active={view === "screener" ? "screener" : view === "later" ? "later" : "inbox"} />
      {view === "screener" ? <><List rows={SCREEN} title="Screener" tabs={<Seg items={[["New senders", 4], ["Blocked", 2]]} />} /><Reader screener /></>
        : view === "later" ? <div className="flex min-w-0 flex-1 flex-col bg-white"><div className="flex h-16 items-center gap-6 border-b border-line px-7 text-[13px] text-ink-2"><span>Primary</span><span>Everything else</span><b className="font-medium text-ink">Later · 4 snoozed</b><span>Cleared</span></div><Later /></div>
        : <><List rows={INBOX} title="Inbox" tabs={tabs} /><Reader /></>}
      {view === "filters" && <Filters />}
    </div>
  );
}

/* Small window chrome around a mock, as in the Figma hero */
export function MockWindow({ view, className }: { view?: MockView; className?: string }) {
  return (
    <div className={cx("overflow-hidden rounded-[20px] bg-white text-left shadow-[0_0_0_1px_rgba(0,0,0,.06),0_40px_80px_-30px_rgba(60,50,0,.35)]", className)}>
      <div className="flex h-9 items-center gap-1.5 border-b border-line bg-subtle px-4"><i className="size-2.5 rounded-full bg-[#ff5f57]" /><i className="size-2.5 rounded-full bg-[#febc2e]" /><i className="size-2.5 rounded-full bg-[#28c840]" /></div>
      <Scaled><PersonalMock view={view} /></Scaled>
    </div>
  );
}
