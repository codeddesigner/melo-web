import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "../lib/router";
import { Icon, type IconName } from "../components/icons";

type Feature = [IconName, string, string, string, string]; // icon, bg, fg, title, desc
const F = (href: string, [icon, bg, fg, title, desc]: Feature, onPick: () => void, demo?: boolean) => (
  <a key={title} className="mega-feature" href={href} onClick={(e) => { if (demo) { e.preventDefault(); window.dispatchEvent(new Event("melo:demo")); } onPick(); }}>
    <span className="mf-icon" style={{ background: bg, color: fg }}><Icon name={icon} className="icon" /></span>
    <span><span className="mf-title">{title}</span><span className="mf-desc">{desc}</span></span>
  </a>
);
const L = (href: string, icon: IconName, label: string, onPick: () => void, demo?: boolean) => (
  <a key={label} className="mega-link" href={href} onClick={(e) => { if (demo) { e.preventDefault(); window.dispatchEvent(new Event("melo:demo")); } onPick(); }}><Icon name={icon} className="icon" />{label}</a>
);

function Menus({ close }: { close: () => void }): Record<string, { width: number; body: ReactNode; foot: ReactNode }> {
  return {
    Product: {
      width: 1018,
      body: <>
        <div className="mega-col" style={{ width: 300 }}><div className="mega-label">Apps</div>
          {F("#product", ["mail", "var(--tag-blue-bg)", "var(--avatar-blue)", "Mail", "Split inbox, AI summaries, shared addresses."], close)}
          {F("#product", ["users", "var(--tag-pink-bg)", "var(--avatar-pink)", "Team", "Channels, DMs, threads and huddles."], close)}
          {F("#product", ["task", "var(--tag-green-bg)", "var(--feedback-success)", "Work", "Tasks, projects and tags — from mail or chat."], close)}
          {F("#booking", ["calendar", "var(--tag-orange-bg)", "var(--avatar-orange)", "Calendar", "Your week plus booking links."], close)}</div>
        <div className="mega-col" style={{ width: 280 }}><div className="mega-label">Features</div>
          {F("#rules", ["shield", "var(--tag-purple-bg)", "var(--accent-base)", "Workspace rules", "Filter the noise for everyone."], close)}
          {F("#rules", ["filter", "var(--bg-hover)", "var(--icon-primary)", "Personal filters", "Mute what you don’t need."], close)}
          {F("#product", ["sparkle", "var(--tag-purple-bg)", "var(--accent-base)", "Melo AI", "Summaries, drafts and next steps."], close)}
          {F("#booking", ["link", "var(--tag-green-bg)", "var(--feedback-success)", "Booking links", "yourcompany.melo.to pages."], close)}</div>
        <a className="promo promo-light" href="#booking" style={{ width: 320 }} onClick={close}>
          <span className="chip-new">What’s new</span><h4>Calendar &amp; booking links</h4><p>Share a page on yourcompany.melo.to and let clients book you.</p></a>
      </>,
      foot: <><span>Available on the web today — desktop and mobile apps are on the way</span><a href="#product" onClick={close}>See all features <Icon name="chev-right" className="icon" /></a></>,
    },
    Solutions: {
      width: 1122,
      body: <>
        <div className="mega-col" style={{ width: 240 }}><div className="mega-label">By team</div>
          {F("#product", ["settings", "var(--bg-hover)", "var(--icon-primary)", "Operations", "Quiet inboxes, clear owners."], close)}
          {F("#product", ["star", "var(--tag-pink-bg)", "var(--avatar-pink)", "Agencies", "Client mail, chat and booking in one place."], close)}
          {F("#booking", ["bolt", "var(--tag-orange-bg)", "var(--avatar-orange)", "Sales", "Book meetings, track every thread."], close)}
          {F("#product", ["comment", "var(--tag-blue-bg)", "var(--avatar-blue)", "Customer support", "Shared addresses with assignments."], close)}</div>
        <div className="mega-col" style={{ width: 200 }}><div className="mega-label">By size</div>
          {L("/signup", "bolt", "Startups", close)}{L("/signup", "users", "Growing teams", close)}{L("#vs-slack", "lock", "Enterprise", close)}{L("/signup", "star", "Nonprofits", close)}</div>
        <div className="mega-col" style={{ width: 200 }}><div className="mega-label">Use cases</div>
          {L("#product", "inbox", "Shared inbox", close)}{L("#product", "mail", "Client communication", close)}{L("#product", "hash", "Internal comms", close)}{L("#booking", "calendar", "Meeting scheduling", close)}{L("#vs-slack", "board", "Replace Slack + Gmail", close)}</div>
        <a className="promo promo-dark" href="#vs-slack" style={{ width: 282, alignSelf: "flex-start" }} onClick={close}>
          <span className="eyebrow">Compare</span><blockquote>Melo vs. Slack: email and chat in one inbox.</blockquote>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: 13 }}>See how it compares <Icon name="chev-right" className="icon" /></span></a>
      </>,
      foot: <><span>Not sure where to start? Our team will tailor a setup for you.</span><a href="#demo" onClick={(e) => { e.preventDefault(); close(); window.dispatchEvent(new Event("melo:demo")); }}>Talk to sales <Icon name="chev-right" className="icon" /></a></>,
    },
    Resources: {
      width: 820,
      body: <>
        <div className="mega-col" style={{ width: 240 }}><div className="mega-label">Learn</div>
          {F("#faq", ["doc", "var(--tag-blue-bg)", "var(--avatar-blue)", "Help center", "Answers in minutes."], close)}
          {F("#rules", ["board", "var(--tag-green-bg)", "var(--feedback-success)", "Guides", "Set up rules, migrate mail."], close)}
          {F("#demo", ["phone", "var(--tag-orange-bg)", "var(--avatar-orange)", "Book a demo", "A 30-minute walkthrough for your team."], close, true)}</div>
        <a className="promo promo-blue" href="#rules" style={{ width: 282, alignSelf: "flex-start" }} onClick={close}>
          <span className="promo-tile">5 rules every<br />team should start with</span><span className="eyebrow">Guide · 6 min read</span>
          <p>From “mute #random” to snoozing newsletters — the quick wins.</p></a>
      </>,
      foot: <><span>Answers to the most common setup questions</span><a href="#faq" onClick={close}>Visit help center <Icon name="chev-right" className="icon" /></a></>,
    },
  };
}

export function Header({ signedIn, onDemo }: { signedIn: boolean; onDemo: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [mmOpen, setMmOpen] = useState<Record<string, boolean>>({ Product: true });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hover = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  useEffect(() => {
    const click = (e: Event) => { if (!(e.target as HTMLElement).closest("[data-menu]")) setOpen(null); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(null); setMobile(false); } };
    document.addEventListener("click", click); window.addEventListener("keydown", key);
    return () => { document.removeEventListener("click", click); window.removeEventListener("keydown", key); };
  }, []);
  useEffect(() => { document.body.style.overflow = mobile ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [mobile]);
  const close = () => { setOpen(null); setMobile(false); };
  const menus = Menus({ close });
  const ctas = signedIn
    ? <><button type="button" className="nav-signin" onClick={onDemo}>Book a demo</button><Link className="btn btn-dark" to="/app">Visit workspace</Link></>
    : <><Link className="nav-signin" to="/signin">Sign in</Link><Link className="btn btn-dark" to="/signup">Get started — it’s free</Link></>;
  return (
    <>
      <header className={`site-header${scrolled ? " scrolled" : ""}`} id="top">
        <nav className="nav" aria-label="Main">
          <a href="#top" className="logo" aria-label="Melo business home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}><img src="/logo.svg" alt="" width={150} height={30} className="logo-img" /></a>
          <ul className="nav-links">
            {Object.entries(menus).map(([name, m]) => (
              <li key={name} className={`nav-item${open === name ? " open" : ""}`} data-menu=""
                onMouseEnter={() => { if (hover) { if (timer.current) clearTimeout(timer.current); setOpen(name); } }} onMouseLeave={() => { if (hover) timer.current = setTimeout(() => setOpen(null), 160); }}>
                <button type="button" className="nav-link" aria-expanded={open === name} onClick={(e) => { e.stopPropagation(); setOpen(open === name ? null : name); }}>{name} <Icon name="chev-down" className="icon" /></button>
                <div className="mega" style={{ width: m.width }}><div className="mega-body">{m.body}</div><div className="mega-foot">{m.foot}</div></div>
              </li>
            ))}
          </ul>
          <span className="nav-spacer" />
          {ctas}
          <button type="button" className="nav-toggle" aria-label="Open menu" aria-expanded={mobile} onClick={() => setMobile(true)}><Icon name="menu" className="icon" /></button>
        </nav>
      </header>
      <div className={`mobile-menu${mobile ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="mm-head"><span className="logo"><img src="/logo.svg" alt="Melo business" width={150} height={30} className="logo-img" /></span>
          <button type="button" className="mm-close" aria-label="Close menu" onClick={() => setMobile(false)}><Icon name="x" className="icon" /></button></div>
        <div className="mm-list">
          {([["Product", [["#product", "mail", "Mail", "Split inbox and AI summaries"], ["#product", "users", "Team", "Channels, DMs and huddles"], ["#product", "task", "Work", "Tasks, projects and tags"], ["#booking", "calendar", "Calendar", "Your week plus booking links"], ["#rules", "shield", "Workspace rules", "Filter the noise for everyone"]]],
            ["Solutions", [["#product", "settings", "Operations", "Quiet inboxes, clear owners"], ["#product", "star", "Agencies", "Client mail, chat and booking"], ["#booking", "bolt", "Sales", "Book meetings, track every thread"]]],
            ["Resources", [["#faq", "doc", "Help center", "Answers in minutes"], ["#rules", "board", "Guides", "Set up rules, migrate mail"]]]] as [string, [string, IconName, string, string][]][]).map(([sec, rows]) => (
            <div key={sec} className={`mm-section${mmOpen[sec] ? " open" : ""}`}>
              <button type="button" className="mm-trigger" aria-expanded={Boolean(mmOpen[sec])} onClick={() => setMmOpen((o) => ({ ...o, [sec]: !o[sec] }))}>{sec} <Icon name="chev-down" className="icon" /></button>
              <div className="mm-panel">{rows.map(([href, ic, t, d]) => <a key={t} className="mm-row" href={href} onClick={close}><span className="mf-icon" style={{ background: "var(--bg-hover)" }}><Icon name={ic} className="icon" /></span><span><span className="mf-title">{t}</span><span className="mf-desc">{d}</span></span></a>)}</div>
            </div>
          ))}
        </div>
        <div className="mm-cta">
          {signedIn ? <><Link className="btn btn-dark" to="/app" onClick={close}>Visit workspace</Link><button type="button" className="btn btn-soft" onClick={() => { close(); onDemo(); }}>Book a demo</button></>
            : <><Link className="btn btn-dark" to="/signup" onClick={close}>Get started — it’s free</Link><Link className="btn btn-soft" to="/signin" onClick={close}>Sign in</Link></>}
        </div>
      </div>
    </>
  );
}
