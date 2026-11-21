/* Interactive product previews on the homepage: hero inbox, feature mini-shots, rules card, booking widget. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Icon, MeloMark, type IconName } from "../components/icons";
import { AVATARS, MAIL, RULES, TAG_COLORS, type Mail, type MailRow } from "./data";

const ini = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const isMail = (m: MailRow): m is Mail => !("group" in m);

function Rail({ active }: { active: string }) {
  const tabs: [string, IconName, string, number?][] = [["mail", "mail", "Mail", 4], ["team", "users", "Team", 2], ["work", "task", "Work"], ["calendar", "calendar", "Calendar"]];
  return (
    <div className="app-rail"><span className="app-mark"><MeloMark className="w-[15px] h-[11px]" /></span>
      {tabs.map(([k, ic, l, n]) => <span key={k} className={`rail-tab${k === active ? " active" : ""}`}><Icon name={ic} className="icon" />{l}{n ? <span className="rail-count">{n}</span> : null}</span>)}
      <span className="rail-spacer" /><span className="rail-tab"><Icon name="settings" className="icon" />Settings</span><span className="rail-avatar">AM</span></div>
  );
}

/* ---------------- Hero inbox ---------------- */
export function HeroInbox({ interactive = true }: { interactive?: boolean }) {
  const [folder, setFolder] = useState<"primary" | "other">("primary");
  const [sel, setSel] = useState(1);
  const [read, setRead] = useState<Record<string, boolean>>({ "primary-1": true });
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const rows = MAIL[folder];
  const unread = MAIL.primary.filter((m, i) => isMail(m) && m.unread && !read[`primary-${i}`]).length;
  const m = rows[sel];
  const hl = useRef<HTMLSpanElement>(null), list = useRef<HTMLDivElement>(null), seg = useRef<HTMLDivElement>(null), ind = useRef<HTMLSpanElement>(null);
  const jump = useRef(true);
  useLayoutEffect(() => {
    const a = list.current?.querySelector<HTMLElement>(".mrow.active"), h = hl.current;
    if (h && a) { h.classList.toggle("m-jump", jump.current); h.style.opacity = "1"; h.style.width = `${a.offsetWidth}px`; h.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`; requestAnimationFrame(() => h.classList.remove("m-jump")); jump.current = false; }
    const b = seg.current?.querySelector<HTMLElement>("button.on"), i = ind.current;
    if (b && i) { i.style.width = `${b.offsetWidth}px`; i.style.transform = `translateX(${b.offsetLeft - 2}px)`; i.style.left = "2px"; }
  }, [sel, folder]);
  const pick = (i: number) => { setSel(i); setRead((r) => ({ ...r, [`${folder}-${i}`]: true })); };
  const tabIndex = interactive ? undefined : -1;
  return (
    <div className="app-window" aria-label={interactive ? "Melo Mail inbox preview" : undefined}>
      <div className="app-chrome"><i /><i /><i /></div>
      <div className="app">
        <div className="app-rail"><span className="app-mark"><MeloMark className="w-[15px] h-[11px]" /></span>
          <button type="button" tabIndex={tabIndex} className="rail-tab active"><Icon name="mail" className="icon" />Mail<span className="rail-count">4</span></button>
          <button type="button" tabIndex={tabIndex} className="rail-tab"><Icon name="users" className="icon" />Team<span className="rail-count">2</span></button>
          <button type="button" tabIndex={tabIndex} className="rail-tab"><Icon name="task" className="icon" />Work</button>
          <button type="button" tabIndex={tabIndex} className="rail-tab"><Icon name="calendar" className="icon" />Calendar</button>
          <span className="rail-spacer" /><button type="button" tabIndex={tabIndex} className="rail-tab"><Icon name="settings" className="icon" />Settings</button><span className="rail-avatar">AM</span></div>
        <div className="app-side">
          <div className="side-head">Mail <span className="compose"><Icon name="plus" className="icon" />Compose</span></div>
          <div className="side-search"><Icon name="search" className="icon" />Search<kbd>⌘K</kbd></div>
          {([["inbox", "Inbox", unread || ""], ["clock", "Later", 3], ["send", "Sent", ""], ["doc", "Drafts", 1], ["archive", "Archive", ""]] as [IconName, string, number | string][]).map(([ic, l, n], i) =>
            <button type="button" tabIndex={tabIndex} key={l} className={`side-row${i ? "" : " active"}`}><Icon name={ic} className="icon" />{l}{n !== "" && <span className={`n${i ? "" : " m-bump"}`} key={String(n)}>{n}</span>}</button>)}
          <div className="side-label">Labels <Icon name="plus" className="icon" /></div>
          {([["var(--tag-blue-fg)", "Clients", 6], ["var(--tag-green-fg)", "Finance", 2], ["var(--tag-purple-fg)", "Design", 4], ["var(--tag-orange-fg)", "Hiring", ""]] as [string, string, number | string][]).map(([c, l, n]) =>
            <button type="button" tabIndex={tabIndex} key={l} className="side-row"><span className="dot" style={{ background: c }} />{l}{n !== "" && <span className="n">{n}</span>}</button>)}
          <div className="side-label">Accounts</div>
          <button type="button" tabIndex={tabIndex} className="side-row"><Icon name="mail" className="icon" />alex@acme.com<span className="n">4</span></button>
          <button type="button" tabIndex={tabIndex} className="side-row"><Icon name="mail" className="icon" />hello@acme.com<span className="n">12</span></button>
          <div className="side-rules"><Icon name="shield" className="icon" /><div><b>38 hidden by rules today</b><span>Review what was filtered</span></div></div>
        </div>
        <div className="app-list">
          <div className="list-head"><h3>Inbox</h3>
            <div className="seg m-on" role="tablist" ref={seg}><span className="m-seg" ref={ind} aria-hidden="true" />
              {(["primary", "other"] as const).map((f) => <button type="button" tabIndex={tabIndex} key={f} className={folder === f ? "on" : ""} onClick={() => { setFolder(f); setSel(1); }}>{f === "primary" ? "Primary" : "Other"} <span>{f === "primary" ? unread : 10}</span></button>)}</div>
            <span className="icon-btn"><Icon name="filter" className="icon" /></span><span className="icon-btn"><Icon name="more" className="icon" /></span></div>
          <div className="list-rows m-slide" ref={list} data-act={folder} key={folder}>
            {rows.map((r, i) => isMail(r)
              ? <button type="button" tabIndex={tabIndex} key={i} className={`mrow${r.unread && !read[`${folder}-${i}`] ? " unread" : ""}${i === sel ? " active" : ""}`} onClick={() => pick(i)}>
                  <span className={r.unread && !read[`${folder}-${i}`] ? "u" : ""} /><span className="from">{r.from}</span>
                  <span className="line">{r.tag && <span className="tag"><span className="dot" style={{ background: TAG_COLORS[r.tag] }} />{r.tag}</span>}<span className="subj">{r.subj}</span><span className="prev">{r.prev}</span></span>
                  <span className="time">{r.time}</span></button>
              : <div key={i} className="group">{r.group}</div>)}
            <span className="m-hl m-jump" ref={hl} aria-hidden="true" />
          </div>
        </div>
        <div className="app-read" key={`${folder}-${sel}`}>
          {m && isMail(m) && <>
            <div className="read-bar"><span className="icon-btn" title="Archive"><Icon name="archive" className="icon" /></span><span className="icon-btn" title="Later"><Icon name="clock" className="icon" /></span>
              <button type="button" tabIndex={tabIndex} className={`pill${added[`${folder}-${sel}`] ? " done" : ""}`} onClick={() => setAdded((a) => ({ ...a, [`${folder}-${sel}`]: true }))}><Icon name={added[`${folder}-${sel}`] ? "check" : "task"} className="icon" /><span>{added[`${folder}-${sel}`] ? "Added to Work" : "Add to Work"}</span></button>
              <span className="icon-btn" title="More"><Icon name="more" className="icon" /></span></div>
            <div className="thread"><h4>{m.subj}</h4>
              <div className="t-meta"><span className="avatar" style={{ background: AVATARS[sel % AVATARS.length] }}>{ini(m.from)}</span><div><b>{m.from}</b><span>{m.to}</span></div><span className="when">{m.time}</span></div>
              <div className="summary"><Icon name="sparkle" className="icon" /><span>{m.summary}</span></div>
              <div className="t-body">{m.body.map((p, i) => <p key={i}>{p}</p>)}</div>
              {m.attach && <span className="attach"><Icon name="clip" className="icon" />{m.attach[0]} <span>{m.attach[1]}</span></span>}</div>
            <div className="reply"><div className="reply-box">Reply to {m.from.split(" ")[0]}…<kbd>R</kbd></div></div>
          </>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Feature mini-shots ---------------- */
const Side = ({ title, btn, children }: { title: string; btn: string; children: ReactNode }) => (
  <div className="app-side"><div className="side-head">{title} <span className="compose"><Icon name="plus" className="icon" />{btn}</span></div><div className="side-search"><Icon name="search" className="icon" />Search<kbd>⌘K</kbd></div>{children}</div>
);
const Row = ({ ic, dot, av, label, n, active }: { ic?: IconName; dot?: string; av?: [string, string]; label: string; n?: number | string; active?: boolean }) => (
  <span className={`side-row${active ? " active" : ""}`}>{dot ? <span className="dot" style={{ background: dot }} /> : av ? <span className="avatar" style={{ width: 16, height: 16, fontSize: 7, background: av[1] }}>{av[0]}</span> : ic && <Icon name={ic} className="icon" />}{label}{n ? <span className="n">{n}</span> : null}</span>
);
const Label = ({ t }: { t: string }) => <div className="side-label">{t}<Icon name="plus" className="icon" /></div>;
const Win = ({ children }: { children: ReactNode }) => <div className="app-window"><div className="app-chrome"><i /><i /><i /></div><div className="app no-read">{children}</div></div>;

export function Mini({ kind }: { kind: "mail" | "team" | "work" | "calendar" }) {
  if (kind === "mail") return <HeroInbox interactive={false} />;
  if (kind === "team") return (
    <Win><Rail active="team" />
      <Side title="Team" btn="New"><Row ic="comment" label="Threads" n={3} /><Row ic="search" label="Mentions" n={2} /><Row ic="phone" label="Huddles" />
        <Label t="Channels" /><Row ic="hash" label="dashboard-revamp" active /><Row ic="hash" label="client-acme" n={3} /><Row ic="hash" label="general" /><Row ic="hash" label="announcements" /><Row ic="lock" label="leadership" />
        <Label t="Direct messages" /><Row av={["MK", "var(--avatar-orange)"]} label="Maya Kim" n={2} /><Row av={["TB", "var(--avatar-teal)"]} label="Tom Becker" /><Row av={["JL", "var(--avatar-purple)"]} label="Jonas Lind" /><Row av={["SL", "var(--avatar-blue)"]} label="Sam Lee" /></Side>
      <div className="pane"><div className="pane-head"><h3><Icon name="hash" className="icon" />dashboard-revamp</h3><span className="sub">Design Team · Redesign of the client dashboard, due Dec 12</span></div>
        <div className="pin"><Icon name="clip" className="icon" />Client review is Friday 10:00 — final palette due Thursday</div><div style={{ flex: 1 }} />
        {([["TB", "var(--avatar-teal)", "Tom Becker", "11:02 AM", "Huddle ended — 8 min, notes are in the thread.", "2 replies · Last reply 11:14 AM"], ["AM", "#1f1f1f", "Alex Morgan", "2:20 PM", "Our Melo for Business channel is live — mail, chat and workspace rules in one place.", "👍 3 · 🎉 2"],
          ["JL", "var(--avatar-purple)", "Jonas Lind", "2:31 PM", "Pushed the new inbox layout to staging. Table and the rules banner are next.", "inbox-layout-v2.fig"], ["MK", "var(--avatar-orange)", "Maya Kim", "2:49 PM", "Looks great! Can you review the empty states before Friday? @Alex", ""]] as string[][]).map(([i, c, n, t, p, r], k) => (
          <div key={k} className={`msg${k === 3 ? " hl" : ""}`}><span className="avatar" style={{ background: c }}>{i}</span><div><b>{n}</b><time>{t}</time><p>{p}</p>{r && <div className="reacts">{r.split(" · ").map((x) => <span key={x}>{x}</span>)}</div>}</div></div>))}
        <div className="composer">Message #dashboard-revamp</div></div></Win>
  );
  if (kind === "work") {
    const T = ({ t, src, who, c, done }: { t: string; src?: [IconName, string]; who: string; c: string; done?: boolean }) => <div className="task"><span className={`box${done ? " done" : ""}`} />{t}{src && <span className="src"><Icon name={src[0]} className="icon" />{src[1]}</span>}<span className="who"><span className="avatar" style={{ background: c }}>{who}</span></span></div>;
    return (
      <Win><Rail active="work" />
        <Side title="Work" btn="New task"><Row ic="task" label="My tasks" n={5} active /><Row ic="users" label="Assigned by me" n={3} /><Row ic="calendar" label="Due this week" n={4} /><Row ic="mail" label="From mail" n={4} /><Row ic="comment" label="From chat" n={2} />
          <Label t="Projects" /><Row dot="var(--avatar-purple)" label="Dashboard Revamp v2" n={6} /><Row dot="var(--avatar-pink)" label="Brand refresh" n={3} /><Row dot="var(--avatar-teal)" label="Client onboarding" n={2} />
          <Label t="Tags" /><Row dot="var(--tag-purple-fg)" label="design" /><Row dot="var(--tag-blue-fg)" label="client" /><Row dot="var(--tag-orange-fg)" label="launch" /></Side>
        <div className="pane"><div className="pane-head"><h3>Dashboard Revamp v2</h3><span className="chip dark">List</span><span className="chip">Board</span><span className="chip">Calendar</span></div>
          <div className="task-group" style={{ color: "var(--accent-base)" }}>● <span style={{ color: "var(--text-primary)" }}>In progress</span><span className="n">3</span></div>
          <T t="Decide dashboard palette" src={["mail", "Maya’s email"]} who="MK" c="var(--avatar-orange)" /><T t="Review empty states" src={["hash", "#dashboard"]} who="AM" c="#1f1f1f" /><T t="Ship inbox layout to staging" who="JL" c="var(--avatar-purple)" />
          <div className="task-group" style={{ color: "var(--text-tertiary)" }}>○ <span style={{ color: "var(--text-primary)" }}>To do</span><span className="n">4</span></div>
          <T t="Export final brand assets" src={["mail", "Maya’s email"]} who="MK" c="var(--avatar-orange)" /><T t="Prep client review deck" who="SL" c="var(--avatar-blue)" /><T t="Fix chart tooltip overflow" src={["hash", "#dashboard"]} who="JL" c="var(--avatar-purple)" /><T t="Invoice Q1 retainer" src={["mail", "Leo’s email"]} who="AM" c="#1f1f1f" />
          <div className="task-group" style={{ color: "var(--feedback-success)" }}>✓ <span style={{ color: "var(--text-primary)" }}>Done</span><span className="n">2</span></div>
          <T t="Moodboard v2" who="MK" c="var(--avatar-orange)" done /><T t="Kickoff with client" who="AM" c="#1f1f1f" done /></div></Win>
    );
  }
  const days = ["Mon 16", "Tue 17", "Wed 18", "Thu 19", "Fri 20", "Sat 21", "Sun 22"];
  const ev: Record<number, [number, number, string, string, string?][]> = {
    0: [[64, 26, "p", "Team standup"], [192, 52, "g", "Client call — Northwind", "11:00 · Melo video"], [384, 64, "n", "Deep work: dashboard", "2:00 – 4:00"]],
    1: [[64, 26, "p", "Team standup"], [128, 46, "p", "Design crit", "10:00 · #dashboard"], [320, 26, "g", "Intro — Priya Shah"]],
    2: [[64, 26, "p", "Team standup"], [256, 48, "o", "Lunch with Sam", "12:30 · Café"], [448, 44, "k", "Hiring sync", "3:30 · Tom, Alex"]],
    3: [[64, 26, "p", "Team standup"], [128, 60, "p", "Client review — dashboard v2", "10:00 · Northwind"], [352, 40, "p", "Retro", "2:00 · #general"]],
    4: [[64, 26, "p", "Team standup"], [160, 40, "o", "Focus: rules copy", "11:00 · Personal"]],
  };
  return (
    <Win><Rail active="calendar" />
      <Side title="Calendar" btn="New event"><div style={{ padding: "6px 8px 0", fontWeight: 600 }}>November 2026</div>
        <div className="minical" style={{ padding: "0 6px" }}>{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={"w" + i} className="wk">{d}</span>)}
          {Array.from({ length: 35 }, (_, i) => { const d = i - 5; const n = d < 1 ? 26 + d + 5 - 1 : d > 30 ? d - 30 : d; return <span key={i} className={d === 21 ? "sel" : d >= 16 && d <= 22 ? "wk2" : d < 1 || d > 30 ? "wk" : ""}>{n}</span>; })}</div>
        <Label t="My calendars" /><Row dot="var(--avatar-blue)" label="Work · alex@acme.com" /><Row dot="var(--avatar-teal)" label="Client meetings" /><Row dot="var(--avatar-orange)" label="Personal" /><Row dot="var(--avatar-pink)" label="Team out of office" />
        <Label t="Booking links" /><Row ic="link" label="Intro call" n="15m" /><Row ic="link" label="Client call" n="30m" /></Side>
      <div className="pane"><div className="pane-head"><h3>November 16 – 22</h3><span className="chip">Today</span><span className="right"><span className="chip">Day</span><span className="chip dark">Week</span><span className="chip">Month</span></span></div>
        <div className="cal"><div><div className="cal-h" /><div className="cal-times">{["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"].map((t) => <div key={t}>{t}</div>)}</div></div>
          {days.map((d, i) => <div key={d} style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><div className={`cal-h${i === 5 ? " today" : ""}`}>{d.split(" ")[0]} <b>{d.split(" ")[1]}</b></div>
            <div className="cal-col" style={{ flex: 1, backgroundPosition: "0 -1px" }}>{(ev[i] ?? []).map(([top, h, c, t, s]) => <div key={t + top} className={`ev ${c}`} style={{ top: top - 44, height: h }}><b>{t}</b>{s && <span>{s}</span>}</div>)}</div></div>)}
          <div className="now" style={{ top: 44 + 64 * 6 + 20 }} /></div></div></Win>
  );
}

/* ---------------- Rules card ---------------- */
export function RulesCard() {
  const [on, setOn] = useState(RULES.map((r) => r[4]));
  const [flash, setFlash] = useState(-1);
  const active = on.filter(Boolean).length;
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);
  const [counts, setCounts] = useState([0, 0, 0]);
  useEffect(() => {
    const el = ref.current; if (!el || !("IntersectionObserver" in window)) { setPlay(true); setCounts([active, 1284, 6]); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect(); setPlay(true);
      const t0 = performance.now();
      const step = (t: number) => { const k = Math.min(1, (t - t0) / 1100), ease = 1 - Math.pow(1 - k, 3); setCounts([Math.round(4 * ease), Math.round(1284 * ease), Math.round(6 * ease)]); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: 0.25 });
    io.observe(el); return () => io.disconnect();
  }, []); // eslint-disable-line
  const flip = (i: number) => { setOn((o) => o.map((v, k) => (k === i ? !v : v))); setFlash(i); setTimeout(() => setFlash(-1), 700); };
  return (
    <div id="rules-card" ref={ref} className={play ? "m-play" : ""}>
      <h4>Rules &amp; filters</h4><p className="desc">Decide what reaches everyone at Acme Studio. Enforced rules can’t be turned off; defaults can be, from each person’s settings.</p>
      <div className="stats"><div><b className={flash >= 0 ? "m-bump" : ""}>{play && counts[0] === 4 ? active : counts[0]}</b><span>active rules</span></div><div><b>{counts[1].toLocaleString("en-US")}</b><span>messages filtered this week</span></div><div><b>{counts[2]}</b><span>people opted out of a default</span></div></div>
      <div className="rules">{RULES.map(([t, cond, act, kind], i) => (
        <div key={t} className={`rule${on[i] ? "" : " off"}${flash === i ? " m-flash" : ""}`}>
          <span className={`sw${on[i] ? " on" : ""}`} role="switch" tabIndex={0} aria-checked={on[i]} aria-label={t} onClick={() => flip(i)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(i); } }} />
          <span className="t"><b>{t}</b><span>{cond} → {act}</span></span>
          <span className={`badge ${kind}`}><Icon name={kind === "enf" ? "lock" : "shield"} className="icon" />{kind === "enf" ? "Enforced" : "Default"}</span></div>))}</div>
      <div className="rules-note"><Icon name="filter" className="icon" />Employees see workspace defaults in their own filters and can add personal ones on top — like muting a channel only for themselves.</div>
    </div>
  );
}

/* ---------------- Booking widget ---------------- */
export function Booker() {
  const avail = [23, 24, 25, 26, 27, 30];
  const slots = ["9:00am", "9:30am", "10:00am", "11:30am", "1:00pm", "2:30pm", "3:00pm", "4:00pm"];
  const [day, setDay] = useState(24), [pick, setPick] = useState("10:00am"), [booked, setBooked] = useState(false), [act, setAct] = useState("");
  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div id="booker" data-act={act}>
      <span className="bk-url"><Icon name="shield" className="icon" />acme.melo.to/alex/client-call</span>
      <div className="bk">
        <div><div className="bk-org"><i />Acme Studio</div><div className="bk-av">AM</div><div style={{ marginTop: 6, color: "var(--text-secondary)" }}>Alex Morgan</div><h5>Client call</h5>
          <div className="bk-meta"><Icon name="clock" className="icon" />30 min</div><div className="bk-meta"><Icon name="phone" className="icon" />Melo video — link sent on booking</div><div className="bk-meta"><Icon name="globe" className="icon" />Europe/London</div>
          <p className="bk-blurb">A focused 30 minutes to walk through your project, timelines and how we work. Add anything you want me to read first.</p></div>
        <div><div className="bk-month"><div>November <span>2026</span></div><div style={{ display: "flex", gap: 8, color: "var(--icon-secondary)" }}><Icon name="chev-left" className="icon" /><Icon name="chev-right" className="icon" /></div></div>
          <div className="bk-grid">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => <span key={d} className="dw">{d}</span>)}{Array.from({ length: 6 }, (_, i) => <span key={"e" + i} />)}
            {Array.from({ length: 30 }, (_, i) => { const d = i + 1, a = avail.includes(d); return <button type="button" key={d} disabled={!a} onClick={() => { setDay(d); setBooked(false); setAct("day"); }} className={`${a ? "av" : ""}${d === day ? " sel" : ""}${d === 21 ? " today" : ""}`}>{d}</button>; })}</div></div>
        <div><div className="bk-times-h">{dows[(day - 2 + 70) % 7]} <span>{day}</span><span style={{ marginLeft: "auto" }}>12h · 24h</span></div>
          <div className="bk-times" key={day}>{slots.map((s) => booked && s === pick ? <button type="button" key={s} className="booked"><Icon name="check" className="icon" />Booked {s}</button>
            : !booked && s === pick ? <div key={s} className="pair"><button type="button" className="t">{s}</button><button type="button" className="c" onClick={() => { setBooked(true); setAct("confirm"); }}>Confirm</button></div>
            : <button type="button" key={s} onClick={() => { setPick(s); setBooked(false); setAct("slot"); }}><i />{s}</button>)}</div></div>
      </div>
      <div className="bk-powered">Powered by <MeloMark className="w-[10px] h-[8px]" /><b>Melo</b></div>
    </div>
  );
}
