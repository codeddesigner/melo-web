/* Melo Personal — website (Figma: "Melo Personal — Website (Desktop)" + mobile). Lives at melo.to. */
import { useEffect, useRef, useState } from "react";
import { Link, navigate } from "../lib/router";
import { useSession } from "../lib/session";
import { businessHome, personalHome, personalSignup } from "../lib/site";
import { cx } from "../lib/util";
import { Icon, type IconName } from "../components/icons";
import { useToast } from "../components/ui";
import { MockWindow, PersonalMock, Scaled, type MockView } from "../personal/Mock";
import { SiteToggle } from "../marketing/SiteToggle";

const H2 = "font-display font-medium tracking-[-0.015em] text-ink text-balance";

export default function PersonalHome() {
  const signedIn = Boolean(useSession());
  const toast = useToast();
  const soon = (what: string) => toast(`${what} is coming soon`, "info");
  useEffect(() => { document.title = "Melo | Relatable Email for the modern world"; window.scrollTo(0, 0); }, []);
  usePersonalMotion();
  const start = signedIn ? "/app" : personalSignup();
  const startLabel = signedIn ? "Open Melo" : "Get Melo free";
  return (
    <div className="melo-app bg-white text-ink">
      <Nav signedIn={signedIn} start={start} startLabel={startLabel} soon={soon} />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f3e48f_0%,#f7eebb_38%,#fbf8e6_68%,#ffffff_100%)] px-4 pt-14 pb-16 text-center md:pt-[72px]">
          <h1 className="mx-auto font-display text-[44px] leading-[1.04] font-medium tracking-[-0.02em] text-ink text-balance lg:text-wrap animate-fade-up max-w-[820px] sm:text-[60px] lg:text-[76px]">Relatable email for the modern world.</h1>
          <p className="mx-auto mt-6 max-w-[680px] text-[17px] leading-[1.45] text-ink-sec animate-fade-up [animation-delay:60ms] md:text-[19px]">Melo is a calm inbox for your personal email. Claim a free @melo.to address, or bring Gmail, Outlook and iCloud.</p>
          <div className="hero-ctas">
            <Link to={start} className="btn btn-dark btn-lg">{startLabel}</Link>
            <button type="button" onClick={() => document.getElementById("product")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="btn btn-light btn-lg">See how it works</button>
          </div>
          <p className="mt-7 text-[13px] text-ink-sec">Free forever · No ads · Works with Gmail, Outlook and iCloud</p>
          <div className="mx-auto mt-7 max-w-[1180px] animate-fade-up [animation-delay:180ms]"><div data-pm-tilt=""><MockWindow view="inbox" /></div></div>
        </section>

        {/* Logos */}
        <section className="flex flex-col items-center gap-6 px-4 py-14 text-ink-3">
          <p className="text-[13px] font-medium">Works with the address you already have</p>
          <div data-pm-stagger="" className="flex flex-wrap justify-center gap-x-[72px] gap-y-3 font-display text-[22px] font-medium opacity-55">{["Gmail", "Outlook", "iCloud Mail", "Yahoo Mail", "Any IMAP"].map((n) => <span key={n}>{n}</span>)}</div>
        </section>

        <PersonalFeatures />

        {/* Sorted before you open it */}
        <section id="features" className="scroll-mt-24 px-4 py-10 md:px-16">
          <div className="mx-auto grid max-w-[1312px] items-center gap-10 lg:grid-cols-[480px_1fr] lg:gap-16">
            <div data-pm="" className="flex flex-col gap-[18px]">
              <h2 className={cx(H2, "text-[36px] leading-[1.08] md:text-[52px]")}>Sorted before<br />you open it.</h2>
              <p className="text-[17px] leading-[1.5] text-ink-sec md:text-[19px]">Newsletters get their own tab, receipts bundle by order and new senders wait in Screener. Nothing is ever deleted.</p>
              <ul className="flex flex-col gap-3 text-[14px] font-medium">{["Newsletters in a calm reading view", "Receipts bundled by order", "Turn any filter off in one tap"].map((t) => <li key={t} className="flex items-center gap-2.5"><Icon name="check" className="size-[18px] text-ok" />{t}</li>)}</ul>
            </div>
            <div data-pm="" className="rounded-[28px] bg-[#eae4ff] p-6 md:p-10"><div data-pm-drift=""><div className="overflow-hidden rounded-2xl shadow-pop"><Scaled><PersonalMock view="filters" /></Scaled></div></div></div>
          </div>
        </section>

        {/* Your own address */}
        <section className="px-4 py-10 md:px-16">
          <div className="mx-auto grid max-w-[1312px] items-center gap-10 lg:grid-cols-[1fr_480px] lg:gap-16">
            <div data-pm="" className="order-2 rounded-[28px] bg-[#ddf3e4] p-6 md:p-10 lg:order-1"><div data-pm-drift=""><AddressVisual /></div></div>
            <div data-pm="" className="order-1 flex flex-col gap-[18px] lg:order-2">
              <h2 className={cx(H2, "text-[36px] leading-[1.08] md:text-[52px]")}>Your own address.<br />Free forever.</h2>
              <p className="text-[17px] leading-[1.5] text-ink-sec md:text-[19px]">Claim you@melo.to in seconds. Upgrade to Plus to use your own domain, like alex@alexmorgan.com.</p>
              <Link to={start} className="inline-flex w-fit items-center gap-2 rounded-full bg-subtle px-4 py-2.5 text-[14px] font-semibold text-pa-text transition-colors hover:bg-pa-soft"><Icon name="link" className="size-4" />alex@melo.to</Link>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="mt-16 flex flex-col items-center gap-12 bg-inverse px-6 py-20 text-center md:px-40 md:py-[110px]">
          <p data-pm="" className="max-w-[1000px] font-display text-[28px] leading-[1.25] font-medium tracking-[-0.01em] text-white md:text-[40px]">“I check email once a day now. Everything that matters is already on top.”</p>
          <div className="flex items-center gap-3 text-left"><span className="flex size-11 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-pa-text">HL</span><span><b className="block text-[14px] font-semibold text-white">Hannah Lind</b><span className="text-[13px] text-white/60">Teacher, Edinburgh</span></span></div>
        </section>

        {/* Privacy */}
        <section className="bg-app px-6 py-16 md:px-16 md:py-20">
          <div className="mx-auto flex max-w-[1312px] flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
            <div data-pm="" className="flex flex-col gap-4 lg:w-[520px]">
              <h2 className={cx(H2, "text-[36px] leading-[1.08] md:text-[52px]")}>Private by design</h2>
              <p className="text-[18px] leading-[22px] text-ink-sec">Your mail is encrypted at rest and in transit. No ads, ever — we never sell your data or train AI on it.</p>
            </div>
            <div data-pm-stagger="" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {([["shield", "No ads, ever"], ["lock", "GDPR & CCPA"], ["users", "Two-factor sign-in"], ["doc", "Encrypted at rest"], ["grid", "Export anytime"], ["lock", "Delete in one click"]] as [IconName, string][]).map(([ic, t]) => (
                <div key={t} className="flex h-14 items-center gap-2.5 rounded-2xl bg-white px-[18px] text-[13px] font-semibold"><Icon name={ic} className="size-4 text-icon" />{t}</div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="bg-app px-4 pb-16 md:px-[120px] md:pb-[100px]">
          <div data-pm="" className="mx-auto flex max-w-[620px] flex-col items-center gap-4 pt-4 text-center">
            <h2 className={cx(H2, "text-[36px] leading-[1.08] md:text-[52px]")}>Why people switch</h2>
            <p className="text-[17px] leading-[22px] text-ink-sec md:text-[19px]">Compared with the free inbox most people use today.</p>
          </div>
          <div data-pm-stagger="" className="mx-auto mt-12 max-w-[1200px] overflow-hidden rounded-[20px] bg-white text-[14px]">
            <div className="grid grid-cols-[1fr_90px_110px] items-center bg-subtle px-4 py-[18px] font-semibold md:grid-cols-[1fr_220px_300px] md:px-7"><span /><span className="text-center text-pa-text">Melo</span><span className="text-center text-ink-sec">A typical free inbox</span></div>
            {([["Mail from people always on top", true, false], ["Screener for first-time senders", true, false], ["Newsletters in their own reading view", true, "Partly"], ["Your own @melo.to address", true, "No"], ["No ads in your inbox", true, false], ["Price per month", "$0", "$0 + ads"]] as [string, boolean | string, boolean | string][]).map(([t, a, b]) => (
              <div key={t} className="grid grid-cols-[1fr_90px_110px] items-center border-t border-line px-4 py-[18px] md:grid-cols-[1fr_220px_300px] md:px-7">
                <span className="font-medium">{t}</span><Cell v={a} /><Cell v={b} muted />
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-24 px-4 py-16 md:px-40 md:py-[100px]">
          <div data-pm="" className="mx-auto flex max-w-[694px] flex-col items-center gap-4 text-center">
            <h2 className={cx(H2, "text-[36px] leading-[1.08] md:text-[52px]")}>Free forever. Plus if you want more.</h2>
            <p className="text-[17px] leading-[22px] text-ink-sec md:text-[19px]">Every plan has Screener, smart tabs and no ads.</p>
          </div>
          <div data-pm-stagger="" className="mx-auto mt-12 grid max-w-[1120px] gap-5 md:grid-cols-3">
            <Plan name="Free" price="$0" per="forever" blurb="For one calm inbox." cta="Get Melo free" to={start} items={["alex@melo.to address", "Screener and smart tabs", "Connect Gmail, Outlook, iCloud", "15 GB storage"]} />
            <Plan dark name="Plus" badge="Most popular" price="$4" per="per month" blurb="For your own domain and more room." cta="Get Plus" onClick={() => soon("Melo Plus")} items={["Everything in Free", "Your own domain", "Up to 5 addresses and aliases", "100 GB storage", "Unlimited AI summaries"]} />
            <Plan name="Family" price="$8" per="per month · up to 6 people" blurb="For households that share a domain." cta="Start Family" onClick={() => soon("Melo Family")} items={["Everything in Plus", "A shared family domain", "Separate, private inboxes", "One bill for everyone"]} />
          </div>
        </section>

        <PersonalFaq />

        {/* CTA band */}
        <section className="px-4 pb-20 md:px-16">
          <div data-pm="" className="flex flex-col items-center gap-7 rounded-[32px] bg-inverse px-6 py-16 text-center md:py-24">
            <h2 className="font-display text-balance text-[36px] leading-[1.08] font-medium tracking-[-0.015em] text-white md:text-[52px]">Give your inbox some quiet.</h2>
            <p className="text-[17px] leading-[22px] text-white/90 md:text-[19px]">Claim your free @melo.to address, or bring Gmail, Outlook or iCloud.</p>
            <div className="flex w-full max-w-[360px] flex-col justify-center gap-3 sm:max-w-none sm:w-auto sm:flex-row">
              <Link to={start} className="btn btn-light btn-lg">{startLabel}</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer soon={soon} />
    </div>
  );
}

function Nav({ signedIn, start, startLabel, soon }: { signedIn: boolean; start: string; startLabel: string; soon: (w: string) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  useEffect(() => { if (!open) return; const c = (e: Event) => { if (!(e.target as HTMLElement).closest("[data-pmenu]")) setOpen(null); }; document.addEventListener("click", c); return () => document.removeEventListener("click", c); }, [open]);
  const scrollTo = (id: string) => { setOpen(null); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const menus: Record<string, [string, string, () => void][]> = {
    Product: [["Primary", "People you know, on top", () => scrollTo("product")], ["Screener", "First-time senders wait", () => scrollTo("product")], ["Later", "Snooze anything", () => scrollTo("product")], ["Summaries", "Long threads in one line", () => scrollTo("product")]],
    Features: [["Smart filters", "Newsletters, receipts, updates", () => scrollTo("features")], ["Your own address", "you@melo.to, free", () => navigate(start)], ["Privacy", "No ads, ever", () => scrollTo("features")]],
  };
  return (
    <header className={cx("sticky top-0 z-40 transition-[background-color,box-shadow] duration-300", scrolled ? "bg-white/90 shadow-[0_1px_0_var(--color-line)] backdrop-blur" : "bg-[#f3e48f]")}>
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-[1440px] lg:h-[76px] items-center gap-3 px-5 md:gap-8 md:px-16">
        <Link to={personalHome()} aria-label="Melo home" className="shrink-0"><img src="/logo-mail.svg" alt="Melo Mail" width={101} height={22} className="h-[22px] w-auto" /></Link>
        <ul className="hidden items-center gap-0.5 lg:flex">
          {Object.entries(menus).map(([name, items]) => (
            <li key={name} className="relative" data-pmenu="">
              <button type="button" aria-expanded={open === name} onClick={() => setOpen(open === name ? null : name)} className="flex h-9 items-center gap-1 rounded-full px-3 text-[14px] font-medium hover:bg-black/5">{name}<Icon name="chev-down" className={cx("size-4 transition-transform duration-200", open === name && "rotate-180")} /></button>
              {open === name && (
                <div role="menu" className="absolute left-0 top-full mt-2 w-[260px] rounded-2xl bg-white p-2 shadow-pop animate-pop">
                  {items.map(([t, d, fn]) => <button key={t} role="menuitem" type="button" onClick={fn} className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left hover:bg-hover"><b className="text-[14px] font-medium">{t}</b><span className="text-[12px] text-ink-3">{d}</span></button>)}
                </div>
              )}
            </li>
          ))}
          <li><a href={businessHome()} onClick={(e) => { if (businessHome().startsWith("/")) { e.preventDefault(); navigate(businessHome()); } }} className="flex h-9 items-center rounded-full px-3 text-[14px] font-medium hover:bg-black/5">For Business</a></li>
          <li><button type="button" onClick={() => scrollTo("pricing")} className="flex h-9 items-center rounded-full px-3 text-[14px] font-medium hover:bg-black/5">Pricing</button></li>
        </ul>
        <span className="flex-1" />
        <SiteToggle current="personal" className="hidden xl:grid" />
        {!signedIn && <Link to="/signin" className="hidden text-[14px] font-medium hover:underline md:block">Sign in</Link>}
        <Link to={start} className="btn btn-dark shrink-0">{startLabel}</Link>
      </nav>
      <div className="flex justify-center pb-3 xl:hidden"><SiteToggle current="personal" /></div>
    </header>
  );
}


function AddressVisual() {
  return (
    <div className="grid overflow-hidden rounded-2xl bg-white shadow-pop sm:grid-cols-2">
      <div className="flex flex-col gap-3 p-6 text-[13px]">
        <img src="/wordmark.svg" alt="" width={70} height={19} className="mb-4 h-[19px] w-auto self-start" />
        <b className="font-display text-[22px] font-medium">Pick your address</b>
        <span className="text-ink-sec">Claim a free @melo.to address, or bring the email you already use.</span>
        <span className="mt-2 text-[12px] text-ink-3">Your name</span><span className="flex h-9 items-center rounded-full border border-pa px-3.5 shadow-[0_0_0_3px_var(--color-pa-soft)]">Alex Morgan</span>
        <span className="text-[12px] text-ink-3">Your new address</span><span className="flex h-9 items-center justify-between rounded-full border border-line px-3.5"><span>alex</span><span className="text-ink-3">@melo.to</span></span>
        <span className="flex items-center gap-1.5 text-[12px] text-ok"><Icon name="check" className="size-3.5" />alex@melo.to is available</span>
        <span className="mt-2 flex h-10 items-center justify-center rounded-full bg-inverse font-semibold text-white">Claim alex@melo.to</span>
      </div>
      <div className="hidden flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,#14a3a3,#9fdcd6)] p-6 sm:flex">
        <div className="w-full rounded-xl bg-white p-3 text-[12px] shadow-pop"><b className="mb-2 flex items-center gap-2 font-medium"><span className="flex size-5 items-center justify-center rounded-full bg-inverse text-[10px] text-white">m</span>Alex Morgan</b>{["Inbox", "Newsletters", "Receipts", "Screener"].map((t, k) => <div key={t} className={cx("rounded-lg px-2 py-1.5", !k && "bg-active font-medium")}>{t}</div>)}</div>
        <div className="w-full rounded-xl bg-white p-3 text-center"><b className="font-display text-[15px] font-medium">alex@melo.to</b><p className="text-[11px] text-ink-3">Short, yours and free forever.</p></div>
      </div>
    </div>
  );
}

function Cell({ v, muted }: { v: boolean | string; muted?: boolean }) {
  if (v === true) return <span className="flex justify-center"><span className="flex rounded-full bg-ok-soft p-[3px]"><Icon name="check" className="size-4 text-ok" /></span></span>;
  if (v === false) return <span className="flex justify-center"><Icon name="x" className="size-4 text-ink-3" /></span>;
  return <span className={cx("text-center font-semibold", muted ? "text-ink-sec" : "text-ink")}>{v}</span>;
}

function Plan({ name, badge, price, per, blurb, cta, to, onClick, items, dark }: { name: string; badge?: string; price: string; per: string; blurb: string; cta: string; to?: string; onClick?: () => void; items: string[]; dark?: boolean }) {
  const btn = cx("btn btn-lg w-full", dark ? "btn-light" : "btn-dark");
  return (
    <div className={cx("flex flex-col gap-5 rounded-[24px] p-8", dark ? "bg-inverse text-white" : "bg-app")}>
      <div className="flex h-7 items-center gap-2"><b className="font-display text-[22px] leading-[22px] font-medium">{name}</b>{badge && <span className="rounded-full bg-tag-purple-bg px-2.5 py-[3px] text-[12px] font-semibold text-ink-sec">{badge}</span>}</div>
      <div className="flex items-baseline gap-2"><b className="font-display text-[48px] leading-[38px] font-medium tracking-[-0.01em]">{price}</b><span className={cx("text-[13px]", dark ? "text-ink-3" : "text-ink-sec")}>{per}</span></div>
      <p className={cx("text-[14px]", dark ? "text-ink-3" : "text-ink-sec")}>{blurb}</p>
      {to ? <Link to={to} className={btn}>{cta}</Link> : <button type="button" onClick={onClick} className={btn}>{cta}</button>}
      <ul className="flex flex-col gap-3 text-[14px]">{items.map((t) => <li key={t} className="flex items-center gap-2.5"><Icon name="check" className={cx("size-4", dark ? "text-white" : "text-ok")} />{t}</li>)}</ul>
    </div>
  );
}

const QA: [string, string][] = [
  ["Can I keep my Gmail or Outlook address?", "Yes. Connect Gmail, Outlook or iCloud and keep your address — nothing changes for people who email you."],
  ["How does Screener work?", "Turn it on and anyone emailing you for the first time waits in Screener. Allow them once and they go straight to Primary from then on; block them and you won’t hear from them again. They never know either way."],
  ["Will I miss important email?", "No. Melo only moves mail — it never deletes it. People you’ve written to always land in Primary, and you can switch any filter off in one tap."],
  ["Is Melo really free?", "Yes. A @melo.to address, Screener, smart tabs and no ads are free forever. Plus adds your own domain and more room for $4 a month."],
  ["Can I use my own domain?", "Yes, with Plus. Add your domain, copy a few DNS records and Melo checks them for you."],
  ["Can I bring my old email with me?", "Yes. Connect your old account and your mail and folders come with you, so everything is in one place."],
];

function Footer({ soon }: { soon: (w: string) => void }) {
  const col = (title: string, links: [string, (() => void) | string][]) => (
    <div className="flex min-w-0 flex-col gap-3 text-[13px] leading-[18px] lg:w-[150px]"><b className="font-semibold">{title}</b>
      {links.map(([t, a]) => typeof a === "string" ? <a key={t} href={a} className="text-ink-sec hover:text-ink">{t}</a> : <button key={t} type="button" onClick={a} className="text-left text-ink-sec hover:text-ink">{t}</button>)}</div>
  );
  const top = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const go = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <footer className="border-t border-line px-6 pt-16 pb-12 md:px-16">
      <div className="mx-auto flex max-w-[1312px] flex-col gap-10 md:flex-row md:gap-12">
        <div className="flex flex-col gap-3.5"><img src="/logo-mail.svg" alt="Melo Mail" width={96} height={21} className="h-[21px] w-auto self-start" /><p className="w-[260px] text-[13px] text-ink-sec">One calm inbox for your personal email.</p></div>
        <span className="hidden flex-1 md:block" />
        <div data-pm-stagger="" className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
          {col("Product", [["Primary", go("product")], ["Screener", go("product")], ["Later", go("product")], ["Summaries", go("product")], ["Melo for Business", businessHome()], ["Pricing", go("pricing")]])}
          {col("Company", [["About", () => soon("About")], ["For Business", businessHome()], ["Careers", () => soon("Careers")], ["Blog", () => soon("The blog")], ["Press", () => soon("Press")]])}
          {col("Resources", [["Help center", go("faq")], ["Guides", () => soon("Guides")], ["Status", () => soon("Status")], ["Security", go("features")]])}
          {col("Legal", [["Privacy", () => soon("The privacy page")], ["Terms", () => soon("The terms page")], ["DPA", () => soon("The DPA")], ["Cookies", () => soon("The cookie page")]])}
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-[1312px] items-center text-[12px] text-ink-3"><button type="button" onClick={top} className="flex-1 text-left">© 2026 Melo, Inc. All rights reserved.</button><span>English · USD</span></div>
    </footer>
  );
}

/* Motion (same feel as the Business site): sections rise in as they scroll into view, groups stagger,
   the hero screenshot settles flat as you scroll and the side visuals drift gently. Off when reduced motion is on. */
function usePersonalMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement; root.classList.add("pm-on");
    const els = [...document.querySelectorAll<HTMLElement>("[data-pm],[data-pm-stagger],.reveal")];
    document.querySelectorAll<HTMLElement>("[data-pm-stagger]").forEach((g) => [...g.children].forEach((c, i) => (c as HTMLElement).style.setProperty("--pm-i", String(Math.min(i, 8)))));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("pm-in", "in"); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((e) => io.observe(e));
    const tilt = document.querySelector<HTMLElement>("[data-pm-tilt]"), drift = [...document.querySelectorAll<HTMLElement>("[data-pm-drift]")];
    const desk = window.matchMedia("(min-width: 961px)");
    let ticking = false;
    const frame = () => {
      ticking = false; const h = window.innerHeight;
      if (tilt) { const p = Math.min(1, Math.max(0, window.scrollY / (h * 0.7))); tilt.style.transform = desk.matches ? `perspective(1800px) rotateX(${(8 * (1 - p)).toFixed(2)}deg) scale(${(0.965 + 0.035 * p).toFixed(4)})` : ""; }
      drift.forEach((v) => { const r = v.parentElement!.getBoundingClientRect(); if (r.bottom < -100 || r.top > h + 100) return; v.style.transform = desk.matches ? `translateY(${(((r.top + r.height / 2 - h / 2) / h) * -24).toFixed(1)}px)` : ""; });
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll); frame();
    return () => { io.disconnect(); root.classList.remove("pm-on"); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
}

/* Same layout and motion as the Business "Four tabs" section */
const FEATS: [string, string, MockView][] = [
  ["Primary", "Mail from people you know, always on top. Everything else waits a tab away.", "inbox"],
  ["Screener", "First-time senders wait until you say yes. Strangers never reach Primary.", "screener"],
  ["Later", "Snooze anything. Newsletters arrive Monday at 8 instead of all week.", "later"],
  ["Summaries", "Long threads in one line, with one-tap replies.", "thread"],
];
function PersonalFeatures() {
  const [cur, setCur] = useState(0), [auto, setAuto] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches), [inView, setInView] = useState(false), [hover, setHover] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 }); io.observe(el); return () => io.disconnect(); }, []);
  const running = auto && inView && !hover;
  useEffect(() => { if (!running) return; const t = setInterval(() => setCur((c) => (c + 1) % FEATS.length), 6000); return () => clearInterval(t); }, [running, cur]);
  return (
    <section className={`site-scope section feat scroll-mt-24${running ? " m-auto" : ""}`} id="product" ref={ref} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="container feat-grid">
        <div className="feat-copy reveal">
          <h2 className="feat-title">Quiet, without<br />missing a thing.</h2>
          <div className="feat-list" role="tablist" aria-label="Melo tabs">
            {FEATS.map(([n, d], i) => (
              <button type="button" key={n + (i === cur && running ? cur : "")} className={`feat-item${i === cur ? " active" : ""}`} role="tab" aria-selected={i === cur} aria-controls={`pfeat-stage-${i}`}
                onClick={() => { setAuto(false); setCur(i); }} onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setAuto(false); setCur((c) => (c + (e.key === "ArrowDown" ? 1 : FEATS.length - 1)) % FEATS.length); } }}>
                <span className="feat-name">{n}</span><span className="feat-body"><span><span className="feat-desc">{d}</span></span></span></button>
            ))}
          </div>
          <p className="feat-foot">Melo sorts every email the moment it arrives, so the ones from people are always on top. Nothing is ever deleted.</p>
        </div>
        <div className="feat-panel reveal">
          {FEATS.map(([, , v], i) => <div key={v} className={`feat-stage${i === cur ? " active" : ""}`} id={`pfeat-stage-${i}`} role="tabpanel"><div className="mini" aria-hidden="true">{Math.abs(i - cur) <= 1 || i === cur ? <MockWindow view={v} /> : null}</div></div>)}
        </div>
      </div>
    </section>
  );
}

/* Same layout as the Business FAQ */
function PersonalFaq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="site-scope faq scroll-mt-24" id="faq">
      <div className="faq-grid">
        <h2 className="faq-title reveal">Frequently<br />asked<br />questions</h2>
        <div className="faq-col">
          <div className="faq-list">{QA.map(([q, a], i) => (
            <div key={q} className={`faq-item m-in${open === i ? " open" : ""}`} style={{ ["--m-i" as string]: i }}>
              <button type="button" className="faq-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{q}<Icon name="chev-down" className="icon" /></button>
              <div className="faq-a"><div><p>{a}</p></div></div></div>))}</div>
          <p className="faq-more">Still have more questions? <a href="mailto:hello@melo.to" className="underline">Email us</a>.</p>
        </div>
      </div>
    </section>
  );
}
