import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { Link, navigate, useLocation } from "../lib/router";
import { useSession } from "../lib/session";
import { copy, isEmail } from "../lib/util";
import { Icon } from "../components/icons";
import { Header } from "../marketing/Header";
import { Booker, HeroInbox, Mini, RulesCard } from "../marketing/Previews";
import { FAQ } from "../marketing/data";

/* Sections have clean URLs (/product, /faq …) instead of #anchors.
   Visiting one scrolls there smoothly; in-page links update the URL without reloading. */
const SECTIONS = ["product", "rules", "booking", "vs-slack", "faq"];
function sectionTop(id: string) {
  const el = document.getElementById(id); if (!el) return null;
  const head = document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 0;
  return el.getBoundingClientRect().top + window.scrollY - head - 8;
}
function scrollToSection(id: string, smooth = true) {
  const top = sectionTop(id); if (top !== null) window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
}
function useSectionLinks(openDemo: () => void) {
  const { parts } = useLocation();
  const sec = parts[0] ?? "";
  const first = useRef(true);
  useEffect(() => {
    const arriving = first.current; first.current = false;
    if (sec === "demo") { openDemo(); return; }
    if (!SECTIONS.includes(sec)) return;
    if (!arriving) { const t = setTimeout(() => scrollToSection(sec), 30); return () => clearTimeout(t); }
    /* Arriving from another page: land on the section, then hold it there while fonts and images settle */
    const align = () => { const top = sectionTop(sec); if (top !== null && Math.abs(window.scrollY - top) > 4) window.scrollTo({ top, behavior: "auto" }); };
    const ro = new ResizeObserver(align); ro.observe(document.body);
    const timers = [setTimeout(align, 0), setTimeout(() => { ro.disconnect(); align(); }, 2500)];
    let stop = false; const cancel = () => { stop = true; ro.disconnect(); timers.forEach(clearTimeout); };
    window.addEventListener("wheel", cancel, { once: true, passive: true }); window.addEventListener("touchstart", cancel, { once: true, passive: true });
    return () => { if (!stop) cancel(); window.removeEventListener("wheel", cancel); window.removeEventListener("touchstart", cancel); };
  }, [sec]); // eslint-disable-line
  useEffect(() => {
    /* Old links like /#faq still work, and the URL is tidied to /faq */
    const h = location.hash.slice(1);
    if (h === "top") history.replaceState(null, "", "/");
    else if (h && (SECTIONS.includes(h) || h === "demo")) navigate("/" + h, { replace: true, scroll: false });
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a"); if (!a || a.origin !== location.origin || a.target) return;
      const p = a.pathname.replace(/^\/|\/$/g, "");
      if (p === "demo") { e.preventDefault(); openDemo(); return; }
      if (!SECTIONS.includes(p)) return;
      e.preventDefault();
      if (location.pathname === "/" + p) scrollToSection(p); else navigate("/" + p, { scroll: false });
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []); // eslint-disable-line
}

export default function Home() {
  const signedIn = Boolean(useSession());
  const [demo, setDemo] = useState(false);
  useEffect(() => { document.title = "Melo for Business — Mail, team chat and work in one calm place"; }, []);
  useEffect(() => { const f = () => setDemo(true); window.addEventListener("melo:demo", f); return () => window.removeEventListener("melo:demo", f); }, []);
  useReveal(); useHeroMotion();
  useSectionLinks(() => setDemo(true));
  return (
    <>
      <Header signedIn={signedIn} onDemo={() => setDemo(true)} />
      <main>
        <section className="hero">
          <h1>Mail, team chat and work.<br /> Finally in one calm place.</h1>
          <p className="hero-sub">Melo for Business brings your company email, chats, tasks and calendar together — with workspace rules that keep the noise out for everyone.</p>
          <div className="hero-ctas">
            {signedIn ? <Link className="btn btn-light btn-lg" to="/app">Visit workspace</Link> : <Link className="btn btn-light btn-lg" to="/signup">Get started — it’s free</Link>}
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => setDemo(true)}>Book a demo</button>
          </div>
          {!signedIn && <p className="hero-note">No work email? <Link to="/signup?start=melo" className="underline underline-offset-[3px]">Get a free @melo.to address</Link> · Works with Google Workspace &amp; Microsoft 365</p>}
          <div className="hero-shot"><HeroInbox /></div>
        </section>
        <Features />
        <section id="rules">
          <div className="split">
            <div className="split-copy reveal">
              <h2 className="h-display">Admins set the rules.<br />Everyone gets a quieter inbox.</h2>
              <p className="lede">Admins set workspace rules once: hide marketing digests, mute #random, move outside invites to Later. Employees add their own filters on top.</p>
              <ul className="checks">{["Enforced rules or opt-out defaults", "Live preview before anything goes on", "Audit log of every change"].map((t) => <li key={t}><Icon name="check" className="icon" />{t}</li>)}</ul>
            </div>
            <div className="visual visual-rules reveal"><div><RulesCard /></div></div>
          </div>
        </section>
        <section id="booking">
          <div className="split reverse">
            <div className="visual visual-booking reveal"><div><Booker /></div></div>
            <div className="split-copy reveal" style={{ maxWidth: 551 }}>
              <h2 className="h-display">Your own booking page on yourcompany.melo.to</h2>
              <p className="lede">Share acme.melo.to/alex and let clients pick a time. Melo checks every calendar, adds buffers and sends the video link — then files the thread in Mail.</p>
              <CopyChip />
            </div>
          </div>
        </section>
        <VsSlack />
        <Faq />
      </main>
      <Footer signedIn={signedIn} />
      {demo && <DemoDialog onClose={() => { setDemo(false); if (location.pathname === "/demo") navigate("/", { replace: true, scroll: false }); }} />}
    </>
  );
}

function Features() {
  const tabs: [string, string, "mail" | "team" | "work" | "calendar"][] = [
    ["Mail", "Split inbox, AI summaries and one-key archive. Any email becomes a task.", "mail"],
    ["Team", "Channels, DMs and huddles — right next to the email they’re about.", "team"],
    ["Work", "Tasks with tags, owners and dates. See what came from mail or chat.", "work"],
    ["Calendar", "Your week, plus booking links on yourcompany.melo.to.", "calendar"],
  ];
  const [cur, setCur] = useState(0), [auto, setAuto] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches), [inView, setInView] = useState(false), [hover, setHover] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 }); io.observe(el); return () => io.disconnect(); }, []);
  const running = auto && inView && !hover;
  useEffect(() => { if (!running) return; const t = setInterval(() => setCur((c) => (c + 1) % tabs.length), 6000); return () => clearInterval(t); }, [running, cur]); // eslint-disable-line
  return (
    <section className={`section feat${running ? " m-auto" : ""}`} id="product" ref={ref} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="container feat-grid">
        <div className="feat-copy reveal">
          <h2 className="feat-title">Four tabs.<br />One inbox for everything.</h2>
          <div className="feat-list" role="tablist" aria-label="Melo tabs">
            {tabs.map(([n, d], i) => (
              <button type="button" key={n + (i === cur && running ? cur : "")} className={`feat-item${i === cur ? " active" : ""}`} role="tab" aria-selected={i === cur} aria-controls={`feat-stage-${i}`}
                onClick={() => { setAuto(false); setCur(i); }} onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setAuto(false); setCur((c) => (c + (e.key === "ArrowDown" ? 1 : tabs.length - 1)) % tabs.length); } }}>
                <span className="feat-name">{n}</span><span className="feat-body"><span><span className="feat-desc">{d}</span></span></span></button>
            ))}
          </div>
          <p className="feat-foot">Mail, Team, Work and Calendar share one sidebar, one search and one set of rules. Turn an email into a task, a message into a meeting.</p>
        </div>
        <div className="feat-panel reveal">
          {tabs.map(([, , k], i) => <div key={k} className={`feat-stage${i === cur ? " active" : ""}`} id={`feat-stage-${i}`} role="tabpanel"><div className="mini" aria-hidden="true">{Math.abs(i - cur) <= 1 || i === cur ? <Mini kind={k} /> : null}</div></div>)}
        </div>
      </div>
    </section>
  );
}

function CopyChip() {
  const [shown, setShown] = useState(false);
  return <button type="button" className="url-chip" id="copy-link" onClick={() => copy("https://acme.melo.to/alex").then(() => { setShown(true); setTimeout(() => setShown(false), 1600); })}><Icon name="link" className="icon" />acme.melo.to/alex <span className={`copied${shown ? " show" : ""}`} aria-live="polite">Copied</span></button>;
}

function VsSlack() {
  const [f, setF] = useState({ email: "", first: "", last: "", co: "", tel: "", size: "", using: "" });
  const [bad, setBad] = useState<string[]>([]), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState("");
  const req = ["email", "first", "last", "co", "size", "using"] as const;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const b = req.filter((k) => (k === "email" ? !isEmail(f.email) : !f[k].trim()));
    setBad(b); if (b.length) return setErr("Please fill in the highlighted fields.");
    setBusy(true); setErr("");
    try { await api.requestDemo({ email: f.email.trim(), first_name: f.first.trim(), last_name: f.last.trim(), company: f.co.trim(), phone: f.tel.trim() || null, company_size: f.size, current_tool: f.using, source: "vs-slack" }); setDone(f.email.trim()); }
    catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  const field = (k: keyof typeof f, label: string, full?: boolean, extra: Record<string, string> = {}) => (
    <div className={`vf${full ? " vf-full" : ""}${bad.includes(k) ? " bad" : ""}`}><label htmlFor={`vf-${k}`}>{label} {k !== "tel" && <i>*</i>}</label>
      <input id={`vf-${k}`} {...extra} value={f[k]} onChange={(e) => { setF({ ...f, [k]: (e.target as HTMLInputElement).value }); setBad(bad.filter((x) => x !== k)); }} /></div>
  );
  const select = (k: "size" | "using", label: string, opts: string[]) => (
    <div className={`vf vf-full${bad.includes(k) ? " bad" : ""}`}><label htmlFor={`vf-${k}`}>{label} <i>*</i></label>
      <select id={`vf-${k}`} value={f[k]} onChange={(e) => { setF({ ...f, [k]: (e.target as HTMLSelectElement).value }); setBad(bad.filter((x) => x !== k)); }}><option value="">Please select</option>{opts.map((o) => <option key={o}>{o}</option>)}</select></div>
  );
  return (
    <section className="vs" id="vs-slack">
      <div className="vs-grid">
        <div className="vs-copy reveal">
          <span className="vs-eyebrow">Melo vs. Slack</span>
          <h2 className="vs-title">We make sure you don’t&nbsp;<em>slack</em>.</h2>
          <ul className="vs-list">{["Email and team chat in one inbox, so client threads and internal discussion never drift apart.", "Workspace rules mute #random, digests and outside invites for everyone, so focus is the default.", "Turn any message into a task with an owner and a date, so nothing gets lost in a scrolling channel."].map((t) => <li key={t}><span className="vs-tick"><Icon name="check" className="icon" /></span>{t}</li>)}</ul>
        </div>
        <form className="vs-card reveal" id="demo" noValidate onSubmit={submit}>
          {done ? <div className="vs-done" role="status"><i><Icon name="check" className="icon" /></i><h3>Request received</h3><p>Thanks — we’ll be in touch at {done} with times that work.</p></div> : <>
            <div className="vs-form">
              {field("email", "Work email", true, { type: "email", autoComplete: "email", placeholder: "you@company.com" })}
              {field("first", "First name", false, { autoComplete: "given-name" })}{field("last", "Last name", false, { autoComplete: "family-name" })}
              {field("co", "Company name", false, { autoComplete: "organization" })}{field("tel", "Phone", false, { type: "tel", autoComplete: "tel", placeholder: "+234 801 234 5678" })}
              {select("size", "Company size", ["1–10", "11–50", "51–200", "201–1,000", "1,000+"])}
              {select("using", "What do you use today?", ["Slack", "Slack + Gmail", "Microsoft Teams + Outlook", "Something else"])}
            </div>
            <div className="vs-foot"><span className="vs-err" aria-live="polite">{err}</span><button className="btn btn-dark btn-lg" type="submit" disabled={busy}>{busy ? "Sending…" : "Request demo"}</button></div>
          </>}
        </form>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq" id="faq">
      <div className="faq-grid">
        <h2 className="faq-title reveal">Frequently<br />asked<br />questions</h2>
        <div className="faq-col">
          <div className="faq-list">{FAQ.map(([q, a], i) => (
            <div key={q} className={`faq-item m-in${open === i ? " open" : ""}`} style={{ ["--m-i" as string]: i }}>
              <button type="button" className="faq-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{q}<Icon name="chev-down" className="icon" /></button>
              <div className="faq-a"><div><p>{a}</p></div></div></div>))}</div>
          <p className="faq-more">Still have more questions? <button type="button" className="underline" onClick={() => window.dispatchEvent(new Event("melo:demo"))}>Talk to our team</button>.</p>
        </div>
      </div>
    </section>
  );
}

function Footer({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="site-foot">
      <div className="sf-inner">
        <div className="sf-top">
          <a href="/" className="sf-logo" aria-label="Melo business home"><img src="/logo.svg" alt="" width={150} height={30} className="logo-img" /></a>
          <nav className="sf-cols" aria-label="Footer">
            <div className="sf-col m-in"><h5>Product</h5><a href="/product">Mail</a><a href="/product">Team</a><a href="/product">Work</a><a href="/booking">Calendar</a><a href="/rules">Rules &amp; filters</a></div>
            <div className="sf-col m-in"><h5>Get started</h5>{signedIn ? <Link to="/app">Visit workspace</Link> : <><Link to="/signup">Create an account</Link><Link to="/signin">Sign in</Link></>}<Link to="/signup?start=melo">Free @melo.to address</Link></div>
            <div className="sf-col m-in"><h5>Resources</h5><a href="/faq">Help center</a><a href="/vs-slack">Melo vs. Slack</a><a href="/demo" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("melo:demo")); }}>Book a demo</a></div>
            <div className="sf-col m-in"><h5>Contact</h5><a href="mailto:hello@melo.to">hello@melo.to</a></div>
          </nav>
        </div>
        <div className="sf-bottom"><span className="sf-copy">© 2026 Melo, Inc. All rights reserved.</span>
          <div className="sf-tools"><span className="sf-pill"><Icon name="globe" className="icon" />English</span></div></div>
      </div>
    </footer>
  );
}

function DemoDialog({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ email: "", name: "", company: "" }), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); document.body.style.overflow = "hidden"; return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; }; }, [onClose]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(f.email)) return setErr("Enter a valid work email.");
    setBusy(true); setErr("");
    const [first, ...rest] = f.name.trim().split(/\s+/);
    try { await api.requestDemo({ email: f.email.trim(), first_name: first || null, last_name: rest.join(" ") || null, company: f.company.trim() || null, source: "dialog" }); setDone(true); }
    catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="dlg open" role="dialog" aria-modal="true" aria-label="Book a demo" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dlg-card"><button type="button" className="x" aria-label="Close" onClick={onClose}><Icon name="x" className="icon" /></button>
        <div className="dlg-content">
          {done ? <div className="ok"><i><Icon name="check" className="icon" /></i><h3>Request received</h3><p>We’ll be in touch at {f.email} with times that work.</p><button className="btn btn-dark" type="button" onClick={onClose}>Done</button></div> : <>
            <h3>Book a demo</h3><p>A 30-minute walkthrough tailored to your team.</p>
            <form noValidate onSubmit={submit}>
              <label htmlFor="dlg-email">Work email</label><input id="dlg-email" type="email" placeholder="you@company.com" autoComplete="email" autoFocus value={f.email} onChange={(e) => setF({ ...f, email: (e.target as HTMLInputElement).value })} />
              <label htmlFor="dlg-name">Your name</label><input id="dlg-name" placeholder="Alex Morgan" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: (e.target as HTMLInputElement).value })} />
              <label htmlFor="dlg-co">Company</label><input id="dlg-co" placeholder="Acme Studio" autoComplete="organization" value={f.company} onChange={(e) => setF({ ...f, company: (e.target as HTMLInputElement).value })} />
              <span className="err" aria-live="polite">{err}</span>
              <button className="btn btn-dark" type="submit" disabled={busy}>{busy ? "Sending…" : "Request a demo"}</button>
            </form>
            <p className="fine">We reply within one working day.</p>
          </>}
        </div>
      </div>
    </div>
  );
}

/* Scroll reveals (classes styled in motion.css) */
function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(".reveal")];
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}
/* Hero screenshot tilts flat as you scroll; product cards drift gently (desktop, motion allowed) */
function useHeroMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const shot = document.querySelector<HTMLElement>(".hero-shot"), vis = [...document.querySelectorAll<HTMLElement>(".visual > div")];
    const desk = window.matchMedia("(min-width: 961px)");
    let ticking = false, tilt = false;
    const frame = () => {
      ticking = false;
      if (shot && tilt) { const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.7))); shot.style.transform = desk.matches ? `perspective(1800px) rotateX(${(9 * (1 - p)).toFixed(2)}deg) scale(${(0.96 + 0.04 * p).toFixed(4)})` : ""; }
      const h = window.innerHeight;
      vis.forEach((v) => { const r = v.parentElement!.getBoundingClientRect(); if (r.bottom < -100 || r.top > h + 100) return; v.style.transform = desk.matches ? `translateY(${(((r.top + r.height / 2 - h / 2) / h) * -28).toFixed(1)}px)` : ""; });
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    const end = (e: AnimationEvent) => { if (e.target === shot) { shot!.classList.add("m-tilt"); tilt = true; frame(); } };
    shot?.addEventListener("animationend", end);
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    frame();
    return () => { shot?.removeEventListener("animationend", end); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
}
