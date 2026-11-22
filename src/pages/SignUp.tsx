/* Onboarding — Figma “Onboarding · 1–7”.
   Personal Melo Mail: pick a @melo.to address + password — no other email needed — and land in Mail.
   Business: start from an email you already have (we send a code), or create a @melo.to address first;
   then create a workspace (with or without a company domain) or join one from an invite. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, auth, type MailProvider, type Role } from "../lib/api";
import { personalSignup } from "../lib/site";
import { Link, navigate, useLocation } from "../lib/router";
import { useSession } from "../lib/session";
import { colorFor, copy, initials, isEmail, slugUser, slugWs } from "../lib/util";
import { Icon, MeloMark } from "../components/icons";
import { AuthShell, CodeBoxes, Err, InboxPreview, Mark, Msg, Title, useCountdown, type Grad } from "./AuthShell";

type Step = "signup" | "claim" | "verify" | "alt" | "workspace" | "connect" | "dns" | "invite" | "rules" | "done";
const ORDER: Partial<Record<Step, number>> = { verify: 1, alt: 1, workspace: 2, connect: 3, dns: 3, invite: 4, rules: 5 };
const PUBLIC = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol|proton|protonmail|gmx|yandex|zoho)\./i;
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");

interface State {
  path: "work" | "melo"; personal: boolean; name: string; email: string; alt: string; user: string; codeTo: "email" | "alt";
  join: boolean; invite: string; ws: string; slug: string; domainMode: "domain" | "none" | null; domain: string; size: string;
  mail: MailProvider | null; hasMail: boolean | null; registrar: string; dnsFound: boolean; dnsChecked: boolean; token: string;
  invites: string[]; role: Role; rules: Record<"digests" | "random" | "invites", boolean>;
}

export default function SignUp() {
  const { query } = useLocation();
  const session = useSession();
  const [s, setS] = useState<State>(() => ({
    path: "work", personal: false, name: "", email: "", alt: "", user: "", codeTo: "email", join: Boolean(query.get("join")), invite: (query.get("join") ?? "").slice(0, 200),
    ws: "", slug: "", domainMode: null, domain: "", size: "11–50", mail: null, hasMail: null, registrar: "", dnsFound: false, dnsChecked: false, token: token(),
    invites: [], role: "member", rules: { digests: true, random: true, invites: false },
  }));
  const [step, setStep] = useState<Step>("signup");
  const hist = useRef<Step[]>([]);
  const up = (p: Partial<State>) => setS((x) => ({ ...x, ...p }));
  const go = (n: Step) => { hist.current.push(step); setStep(n); window.scrollTo(0, 0); };
  const back = () => { const p = hist.current.pop(); if (p) setStep(p); };

  /* Entry points: ?start=melo, ?email= (from sign-in), signed in already (?resume / ?join), or a visitor who's already signed in */
  useEffect(() => {
    const pre = (query.get("email") ?? "").trim().toLowerCase();
    if (session && (query.get("resume") || query.get("join"))) { setS((x) => ({ ...x, path: session.user.email.endsWith("@melo.to") ? "melo" : "work", email: session.user.email })); hist.current = []; setStep("workspace"); return; }
    if (session) { navigate("/app", { replace: true }); return; }
    if (query.get("start") === "personal") { up({ path: "melo", personal: true }); hist.current = []; setStep("claim"); return; }
    if (query.get("start") === "melo") { up({ path: "melo", personal: false }); hist.current = ["signup"]; setStep("claim"); return; }
    if (pre && isEmail(pre) && !pre.endsWith("@melo.to")) { up({ path: "work", email: pre }); hist.current = ["signup"]; setStep("verify"); }
  }, []); // eslint-disable-line

  const wd = s.path === "work" && s.email && !PUBLIC.test(s.email) && !s.email.endsWith("@melo.to") ? s.email.split("@")[1] : "";
  const titles: Record<Step, string> = { signup: "Create your account", claim: s.personal ? "Create your Melo Mail" : "Get your Melo address", verify: "Verify", alt: "Verify", workspace: "Create your workspace", connect: "Connect email", dns: "Connect your domain", invite: "Invite your team", rules: "Workspace rules", done: "Welcome" };
  useEffect(() => { document.title = `${titles[step]} — Melo`; }, [step]); // eslint-disable-line
  const n = ORDER[step];
  const props = { s, up, go, back, canBack: hist.current.length > 0, wd, step, n };
  const view = {
    signup: <SignupStep {...props} />, claim: <ClaimStep {...props} />, verify: <VerifyStep {...props} />, alt: <AltStep {...props} />,
    workspace: <WorkspaceStep {...props} />, connect: <ConnectStep {...props} />, dns: <DnsStep {...props} />, invite: <InviteStep {...props} />,
    rules: <RulesStep {...props} />, done: <Done s={s} />,
  }[step];
  return view;
}
type P = { s: State; up: (p: Partial<State>) => void; go: (n: Step) => void; back: () => void; canBack: boolean; wd: string; step: Step; n?: number };

/* Every step renders the shared two-column layout with its own preview. */
function Frame({ p, grad, preview, children }: { p: P; grad: Grad; preview: ReactNode; children: ReactNode }) {
  return <AuthShell stepKey={p.step} step={p.n ? `Step ${p.n} of 6` : ""} grad={grad} preview={preview}>{children}</AuthShell>;
}
const Progress = ({ n }: { n: number }) => <div className="su-prog" aria-hidden="true">{[1, 2, 3, 4, 5, 6].map((i) => <i key={i} className={i < n ? "done" : i === n ? "cur" : ""} />)}</div>;
const BackLink = ({ p }: { p: P }) => (p.canBack ? <button type="button" className="su-skip" onClick={p.back}>← Back</button> : null);
function In({ id, label, value, onChange, fix, fixLeft, ...rest }: { id: string; label: string; value: string; onChange: (v: string) => void; fix?: string; fixLeft?: string; placeholder?: string; type?: string; autoComplete?: string; bad?: boolean; autoFocus?: boolean }) {
  return (
    <div className="su-f"><label htmlFor={id}>{label}</label>
      <div className={`su-in${rest.bad ? " bad" : ""}`}>{fixLeft && <span className="fix">{fixLeft}</span>}
        <input id={id} value={value} placeholder={rest.placeholder} type={rest.type} autoComplete={rest.autoComplete} autoFocus={rest.autoFocus} spellCheck={false} onChange={(e) => onChange((e.target as HTMLInputElement).value)} />
        {fix && <span className="fix">{fix}</span>}</div></div>
  );
}

/* 1 — sign up */
function SignupStep(p: P) {
  const [v, setV] = useState(p.s.email);
  const [err, setErr] = useState<ReactNode>("");
  const pv = { grad: "blue" as Grad, preview: <><InboxPreview /><Msg h="Your inbox, your channels, one place" p="Melo for Business brings email and team chat together — with rules that keep the noise out." /></> };
  return <Frame p={p} {...pv}><>
    <Title h="Create your business account" p="Start with an email you already have, or create a free @melo.to address — then set up your workspace." />
    <form className="su-content" style={{ width: "100%", gap: 20 }} noValidate onSubmit={(e) => { e.preventDefault(); const x = v.trim().toLowerCase(); if (!isEmail(x)) return setErr("Enter a valid email address."); if (x.endsWith("@melo.to")) return setErr(<>Already have a Melo address? <Link className="su-a" to={`/signin?email=${encodeURIComponent(x)}`}>Sign in</Link> and create your workspace from there.</>); p.up({ path: "work", personal: false, email: x, codeTo: "email", mail: null }); p.go("verify"); }}>
      <In id="su-email" label="Use an email you already have" type="email" autoComplete="email" placeholder="alex@acme.com or you@gmail.com" value={v} onChange={(x) => { setV(x); setErr(""); }} bad={Boolean(err)} autoFocus />
      <Err msg={err} /><button className="su-btn dark" type="submit">Continue with email</button>
    </form>
    <div className="su-or"><span>or</span></div>
    <button type="button" className="su-alt" onClick={() => { p.up({ path: "melo", personal: false }); p.go("claim"); }}><span className="ic"><Mark /></span><span><b>Create a free @melo.to address</b><small>No other email needed. Use it for your work, then add a company domain any time.</small></span><Icon name="chev-right" className="icon" /></button>
    <p className="su-meta">Just want personal email? <Link className="su-a" to={personalSignup()}>Get Melo Mail free</Link> · Already have an account? <Link className="su-a" to="/signin">Sign in</Link></p>
    <p className="su-meta small">By continuing you agree to Melo’s Terms and Privacy Policy.</p>
  </></Frame>;
}

/* 1b — claim a @melo.to address */
function ClaimStep(p: P) {
  const { s } = p;
  const [name, setName] = useState(s.name), [user, setUser] = useState(s.user), [pw, setPw] = useState(""), [show, setShow] = useState(false);
  const [touched, setTouched] = useState(Boolean(s.user));
  const [avail, setAvail] = useState<{ u: string; ok: boolean | null; msg: ReactNode }>({ u: "", ok: null, msg: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const u = slugUser(user);
  useEffect(() => {
    if (!u) { setAvail({ u, ok: null, msg: "" }); return; }
    if (u.length < 3) { setAvail({ u, ok: false, msg: "Use at least 3 characters." }); return; }
    setAvail({ u, ok: null, msg: "Checking…" });
    const t = setTimeout(() => api.addressAvailable(u).then((ok) => setAvail({ u, ok, msg: ok ? <><Icon name="check" className="icon" />{u}@melo.to is available</> : <>{u}@melo.to isn’t available. <button type="button" className="su-a" onClick={() => { setUser(`${u}${Math.floor(10 + Math.random() * 89)}`); setTouched(true); }}>Try another</button></> }), (e: Error) => setAvail({ u, ok: false, msg: e.message })), 300);
    return () => clearTimeout(t);
  }, [u]);
  const pv = { grad: "blue" as Grad, preview: <><div className="pv-card pv-code pv-addr"><div className="env"><Icon name="mail" className="icon" /></div><h5>Your Melo address</h5><div className="big">{u || "you"}<span>@melo.to</span></div><small style={{ display: "block", marginTop: 8, fontSize: 12, color: "var(--text-tertiary)" }}>Free · Reserved for you when you finish sign-up</small></div>{s.personal ? <Msg h="Email that’s yours from day one" p="No phone number, no other inbox needed. Send and receive at your @melo.to address straight away." /> : <Msg h="Work email, without the IT ticket" p="Start on Melo Mail today. When your team gets a domain, move to you@yourcompany.com in a few clicks." />}</> };
  const strength = pw.length >= 12 && /[^a-z]/i.test(pw) ? "Strong password" : pw.length >= 8 ? "Good — longer is stronger" : pw ? `${8 - pw.length} more character${8 - pw.length === 1 ? "" : "s"}` : "";
  const submit = async () => {
    if (name.trim().length < 2) return setErr("Enter your name.");
    if (pw.length < 8) return setErr("Use at least 8 characters for your password.");
    setBusy(true); setErr("");
    const ok = avail.u === u && avail.ok ? true : await api.addressAvailable(u).catch(() => false);
    if (!ok) { setBusy(false); return setErr("Choose an available address."); }
    try {
      await api.meloSignup({ name: name.trim(), address: u, password: pw, personal: s.personal });
      p.up({ name: name.trim(), user: u, email: `${u}@melo.to`, mail: "melo" });
      if (s.personal) navigate("/app/mail?welcome=1", { replace: true }); else p.go("workspace");
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return <Frame p={p} {...pv}><>
    <Title h={s.personal ? "Create your Melo Mail" : "Create your Melo address"} p={s.personal ? "A free @melo.to email address — no other email needed. Pick an address and a password." : "No other email needed. You’ll use this address to sign in, then set up your workspace."} />
    <form className="su-content" style={{ width: "100%", gap: 20 }} noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <In id="su-name" label="Full name" autoComplete="name" placeholder="Alex Morgan" value={name} autoFocus onChange={(v) => { setName(v); if (!touched) { const w = v.trim().split(/\s+/); setUser(slugUser(w.length > 1 ? `${w[0]}.${w[w.length - 1]}` : w[0] || "")); } }} />
      <div className="su-f"><label htmlFor="su-user">Your address</label><div className="su-in"><input id="su-user" autoComplete="username" spellCheck={false} autoCapitalize="off" placeholder="alex.morgan" value={user} onChange={(e) => { setUser((e.target as HTMLInputElement).value); setTouched(true); }} /><span className="fix">@melo.to</span></div>
        <p className={`su-ok${avail.ok === false ? " bad" : ""}`}>{avail.msg}</p></div>
      <div className="su-f"><label htmlFor="su-pw">Password</label>
        <div className="su-in"><input id="su-pw" type={show ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" value={pw} onChange={(e) => { setPw((e.target as HTMLInputElement).value); setErr(""); }} />
          <button type="button" className="su-a" style={{ fontSize: 12, flex: "none" }} onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button></div>
        <p className={`su-ok${pw && pw.length < 8 ? " bad" : ""}`}>{strength}</p></div>
      <p className="su-meta small" style={{ marginTop: -12 }}>You’ll sign in with {u || "your address"}@melo.to and this password. Add a recovery email in Settings so you can reset it if you forget.</p>
      <Err msg={err} /><button className="su-btn dark" type="submit" disabled={busy}>{busy ? "Creating your address…" : s.personal ? "Create my Melo Mail" : "Create address and continue"}</button>
    </form>
    {s.personal ? <p className="su-meta">Setting up a team? <Link className="su-a" to="/signup">Create a business account</Link> · Have an account? <Link className="su-a" to="/signin">Sign in</Link></p> : <BackLink p={p} />}
  </></Frame>;
}

/* 2 — verify email */
function VerifyStep(p: P) {
  const { s, wd } = p;
  const to = s.codeTo === "alt" ? s.alt : s.email;
  const [code, setCode] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<"sending" | "sent" | "failed">("sending"), [n, setN] = useState(0);
  const timer = useCountdown(600, `${to}${n}`);
  useEffect(() => { let live = true; setSent("sending"); api.sendCode(to).then(() => live && setSent("sent"), (e: Error) => { if (live) { setSent("failed"); setErr(e.message); } }); return () => { live = false; }; }, [to, n]);
  const pv = { grad: "purple" as Grad, preview: <><div className="pv-card pv-code"><div className="env"><Icon name="mail" className="icon" /></div><h5>Your Melo code is on its way</h5><div className="num" style={{ fontSize: 18, letterSpacing: 0 }}>{to}</div><small>From Melo · check spam if it’s not there in a minute</small></div><Msg h="Verified before anyone joins" p="Every account is confirmed by email before a workspace is created." /></> };
  const verify = async (c = code) => {
    if (c.length < 6) return setErr("Enter all 6 digits.");
    if (busy) return; setBusy(true); setErr("");
    try { await api.verifyCode(to, c); p.go("workspace"); } catch (e) { setErr((e as Error).message); setCode(""); setBusy(false); }
  };
  return <Frame p={p} {...pv}><>
    <Progress n={1} />
    <Title h="Check your email" p={sent === "sending" ? <>Sending a 6-digit code to <b>{to}</b>…</> : sent === "failed" ? <>We couldn’t send a code to <b>{to}</b>.</> : <>We sent a 6-digit code to <b>{to}</b>. It expires in 10 minutes.</>} />
    <form className="su-content" style={{ width: "100%", gap: 20 }} noValidate onSubmit={(e) => { e.preventDefault(); verify(); }}>
      <CodeBoxes value={code} onChange={(v) => { setCode(v); setErr(""); }} onComplete={verify} bad={Boolean(err)} />
      <div className="su-row"><span className="su-chip"><Icon name="clock" className="icon" />Code expires in <span ref={timer}>10:00</span></span>
        <button type="button" className="su-a" style={{ fontSize: 12 }} onClick={() => (s.codeTo === "alt" && s.path === "work" ? p.go("alt") : p.back())}>Wrong email? Change</button></div>
      <Err msg={err} /><button className="su-btn dark" type="submit" disabled={busy}>{busy ? "Checking…" : "Verify"}</button>
    </form>
    <p className="su-meta">Didn’t get it? <button type="button" className="su-a" onClick={() => { setErr(""); setN((x) => x + 1); }}>{n ? "Code sent again" : "Resend code"}</button></p>
    {s.path === "work" && wd && s.codeTo === "email" && (
      <div className="su-tip"><Icon name="link" className="icon" /><span><b>Setting up {wd} on Melo?</b> If this address doesn’t have an inbox yet, <button type="button" className="su-a" onClick={() => p.go("alt")}>get the code at another email</button>. You’ll connect the domain with DNS in step 3.</span></div>
    )}
  </></Frame>;
}
function AltStep(p: P) {
  const [v, setV] = useState(p.s.alt), [err, setErr] = useState("");
  const pv = { grad: "purple" as Grad, preview: <><div className="pv-card pv-code"><div className="env"><Icon name="mail" className="icon" /></div><h5>No inbox yet? No problem</h5><div className="num" style={{ fontSize: 20, letterSpacing: 0 }}>{p.wd}</div><small>Verified by DNS in step 3</small></div><Msg h="Bring a brand-new domain" p="Bought a domain but never set up email? Start on Melo now and connect the domain when you’re ready." /></> };
  return <Frame p={p} {...pv}><>
    <Progress n={1} />
    <Title h="Use another email" p={<>Setting up <b>{p.wd}</b> on Melo? If <b>{p.s.email}</b> can’t receive mail yet, we’ll send your code to an email you already use. You’ll prove you own {p.wd} with a DNS record in step 3.</>} />
    <form className="su-content" style={{ width: "100%", gap: 20 }} noValidate onSubmit={(e) => { e.preventDefault(); const a = v.trim().toLowerCase(); if (!isEmail(a) || a === p.s.email) return setErr("Enter a different email that can receive mail today."); p.up({ alt: a, codeTo: "alt", mail: "melodomain" }); p.go("verify"); }}>
      <In id="su-valt" label="Email for your code" type="email" autoComplete="email" placeholder="you@gmail.com" value={v} onChange={(x) => { setV(x); setErr(""); }} bad={Boolean(err)} autoFocus />
      <Err msg={err} /><button className="su-btn dark" type="submit">Email me a code</button>
    </form>
    <button type="button" className="su-skip" onClick={() => { p.up({ codeTo: "email" }); p.back(); }}>Send the code to {p.s.email} instead</button>
  </></Frame>;
}

/* 3 — create or join a workspace */
function WorkspaceStep(p: P) {
  const { s, up } = p;
  const d = p.wd;
  const [err, setErr] = useState("");
  const [touched, setTouched] = useState(Boolean(s.slug));
  const [check, setCheck] = useState<{ slug: string; ok: boolean | null; msg: ReactNode }>({ slug: "", ok: null, msg: "" });
  const mode = s.domainMode ?? (d ? "domain" : "none");
  useEffect(() => { if (s.domainMode === null) up({ domainMode: d ? "domain" : "none", domain: s.domain || d }); }, []); // eslint-disable-line
  const slug = slugWs(s.slug || s.ws);
  useEffect(() => {
    if (s.join) return;
    if (!slug) { setCheck({ slug, ok: null, msg: "" }); return; }
    if (slug.length < 3) { setCheck({ slug, ok: false, msg: "Use at least 3 characters." }); return; }
    setCheck({ slug, ok: null, msg: "Checking…" });
    const t = setTimeout(() => api.slugAvailable(slug).then((ok) => setCheck({ slug, ok, msg: ok ? <><Icon name="check" className="icon" />melo.to/{slug} is available</> : `melo.to/${slug} is taken — try another.` }), (e: Error) => setCheck({ slug, ok: false, msg: e.message })), 300);
    return () => clearTimeout(t);
  }, [slug, s.join]);
  const pv = { grad: "teal" as Grad, preview: <><div className="pv-card pv-side"><div className="pv-ws"><span className="m"><Mark /></span><em>{s.ws || "Acme Studio"}</em><Icon name="chev-down" className="icon" /></div>
    <div className="pv-si on"><Icon name="inbox" className="icon" />Inbox</div><div className="pv-si"><Icon name="hash" className="icon" />general</div><div className="pv-si"><Icon name="hash" className="icon" />announcements</div><div className="pv-si"><span className="tile"><Icon name="users" className="icon" /></span>Design Team</div></div>
    <Msg h={s.ws || "Acme Studio"} p="Your workspace comes with #general and #announcements to start." /></> };
  if (s.join) return <Frame p={p} {...pv}><>
    <Progress n={2} />
    <Title h="Join your team" p="Paste the invite link or code a teammate sent you." />
    <form className="su-content" style={{ width: "100%", gap: 20 }} noValidate onSubmit={(e) => { e.preventDefault(); if (s.invite.trim().length < 4) return setErr("Enter the invite link or code."); p.go("done"); }}>
      <In id="su-inv" label="Invite link or code" placeholder="business.melo.to/signup?join=…" value={s.invite} onChange={(v) => up({ invite: v })} autoFocus />
      <div className="su-tip"><Icon name="mail" className="icon" /><span>Joining a company? Add your work email later in Settings → Profile.</span></div>
      <Err msg={err} /><button className="su-btn dark" type="submit">Join workspace</button>
      <button type="button" className="su-skip" onClick={() => up({ join: false })}>Create a new workspace instead</button>
    </form>
  </></Frame>;
  const submit = async () => {
    if (!s.ws.trim()) return setErr("Name your workspace.");
    const ok = check.slug === slug && check.ok ? true : await api.slugAvailable(slug).catch(() => false);
    if (!ok) return setErr("Choose an available workspace URL.");
    let dom = "";
    if (mode === "domain") {
      dom = s.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
      if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dom)) return setErr("Enter a domain like acmestudio.com, or pick “No domain yet”.");
    }
    up({ slug, domain: dom, domainMode: mode }); p.go("connect");
  };
  return <Frame p={p} {...pv}><>
    <Progress n={2} />
    <Title h="Create your workspace" p="This is where your team’s email, channels and rules live." />
    <form className="su-content" style={{ width: "100%", gap: 20 }} noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <In id="su-ws" label="Workspace name" placeholder="Acme Studio" value={s.ws} autoFocus onChange={(v) => { up({ ws: v, ...(touched ? {} : { slug: slugWs(v) }) }); setErr(""); }} />
      <div className="su-f"><label htmlFor="su-url">Workspace URL</label><div className="su-in"><span className="fix">melo.to/</span><input id="su-url" spellCheck={false} autoCapitalize="off" placeholder="acme-studio" value={s.slug} onChange={(e) => { up({ slug: (e.target as HTMLInputElement).value }); setTouched(true); }} /></div>
        <p className={`su-ok${check.ok === false ? " bad" : ""}`}>{check.msg}</p></div>
      <div className="su-f"><span className="su-lab">Email domain</span><div className="su-pills" role="group" aria-label="Email domain">
        <button type="button" className="su-pill" aria-pressed={mode === "domain"} onClick={() => up({ domainMode: "domain", domain: s.domain || d })}>{d ? `Use ${d}` : "I have a domain"}</button>
        <button type="button" className="su-pill" aria-pressed={mode === "none"} onClick={() => up({ domainMode: "none" })}>No domain yet</button></div></div>
      {mode === "domain" ? <><In id="su-dom" label="Company domain" placeholder="acmestudio.com" value={s.domain} onChange={(v) => up({ domain: v })} /><p className="su-meta small" style={{ marginTop: -14 }}>People get addresses like you@{s.domain || "yourcompany.com"}. You’ll verify it with one DNS record — now or later.</p></>
        : <p className="su-meta small">Everyone gets a free name@melo.to address. Add your own domain any time in Settings → Email domains.</p>}
      <span className="su-lab">How many people work here?</span>
      <div className="su-pills" role="group" aria-label="Team size">{["1–10", "11–50", "51–200", "200+"].map((x) => <button key={x} type="button" className="su-pill" aria-pressed={s.size === x} onClick={() => up({ size: x })}>{x}</button>)}</div>
      <Err msg={err} /><button className="su-btn dark" type="submit">Continue</button>
      <p className="su-meta">Joining a team that’s already on Melo? <button type="button" className="su-a" onClick={() => up({ join: true })}>Use an invite link</button></p>
    </form>
  </></Frame>;
}

/* 4 — connect email */
const G = <svg className="brand" viewBox="0 0 16 16"><path fill="#4285F4" d="M15.7 8.2c0-.6-.1-1.1-.2-1.6H8v3h4.3a3.7 3.7 0 0 1-1.6 2.4v2h2.6c1.5-1.4 2.4-3.4 2.4-5.8z" /><path fill="#34A853" d="M8 16c2.2 0 4-.7 5.3-2l-2.6-2c-.7.5-1.6.8-2.7.8-2.1 0-3.9-1.4-4.5-3.3H.8v2.1A8 8 0 0 0 8 16z" /><path fill="#FBBC05" d="M3.5 9.5a4.8 4.8 0 0 1 0-3V4.4H.8a8 8 0 0 0 0 7.2l2.7-2.1z" /><path fill="#EA4335" d="M8 3.2c1.2 0 2.3.4 3.1 1.2l2.3-2.3A8 8 0 0 0 .8 4.4l2.7 2.1C4.1 4.6 5.9 3.2 8 3.2z" /></svg>;
const MS = <svg className="brand" viewBox="0 0 16 16"><path fill="#F25022" d="M1 1h6.6v6.6H1z" /><path fill="#7FBA00" d="M8.4 1H15v6.6H8.4z" /><path fill="#00A4EF" d="M1 8.4h6.6V15H1z" /><path fill="#FFB900" d="M8.4 8.4H15V15H8.4z" /></svg>;
function ConnectStep(p: P) {
  const { s, up } = p;
  const melo = s.path === "melo", dom = s.domainMode === "domain" ? s.domain : "";
  const opts = useMemo(() => {
    const o: [MailProvider, ReactNode, string, string, string][] = [];
    if (melo || !dom) o.push(["melo", <span className="logo mark"><Mark /></span>, "Melo Mail", melo ? `${s.email} is ready — free` : "Free name@melo.to addresses for everyone", melo ? "Ready" : ""]);
    if (dom) o.push(["melodomain", <span className="logo mark"><Mark /></span>, `Host ${dom} mail on Melo`, `New domain, or moving from another provider · you@${dom}`, s.codeTo === "alt" ? "Recommended" : ""]);
    o.push(["google", <span className="logo">{G}</span>, "Google Workspace", dom ? `Gmail for everyone @${dom}` : "Connect existing Gmail mailboxes", ""]);
    o.push(["microsoft", <span className="logo">{MS}</span>, "Microsoft 365", "Outlook and Exchange Online", ""]);
    if (!melo) o.push(["imap", <span className="logo"><Icon name="mail" className="icon" /></span>, "Other provider", "Any IMAP / SMTP mail server", ""]);
    return o;
  }, [melo, dom, s.email, s.codeTo]);
  const mail = s.mail && opts.some((o) => o[0] === s.mail) ? s.mail : opts[0][0];
  const label: Record<MailProvider, string> = { melo: "Use Melo Mail", melodomain: `Set up ${dom}`, google: "Continue with Google Workspace", microsoft: "Continue with Microsoft 365", imap: "Continue with my mail server" };
  const ours = mail === "melo" || mail === "melodomain";
  const pv = { grad: "orange" as Grad, preview: <><div className="pv-banner"><Icon name="check" className="icon" /><span>{mail === "melo" ? `${s.email.endsWith("@melo.to") ? s.email : "you@melo.to"} — reserved for you` : mail === "melodomain" ? `${dom} — verify with one DNS record next` : "Connect mailboxes in the Melo app"}</span><b>View</b></div>
    <InboxPreview /><Msg h={mail === "melo" ? "Your Melo address" : mail === "melodomain" ? "Prove you own the domain" : "Bring your existing mail"} p={mail === "melodomain" ? `Add one TXT record and we’ll confirm ${dom} is yours.` : mail === "melo" ? "Your melo.to address is saved to your account when you finish sign-up." : "Connecting your provider inside Melo is on the way. Nothing changes for your senders."} /></> };
  return <Frame p={p} {...pv}><>
    <Progress n={3} />
    <Title h={melo ? "Set up your mail" : "Connect your company email"} p={melo ? "You already have a Melo address. Bring a domain or another mailbox now, or later." : "Choose where your team’s mail lives. You can add more later."} />
    <div className="su-opts" role="radiogroup" aria-label="Mail provider">
      {opts.map(([k, logo, t, sub, tag]) => <button key={k} type="button" className="su-opt" role="radio" aria-checked={mail === k} onClick={() => up({ mail: k })}>{logo}<span className="tx"><b>{t}{tag && <span className="su-tag">{tag}</span>}</b><small>{sub}</small></span><span className="radio" /></button>)}
    </div>
    <div className="su-perm"><h6>{ours ? "What you get" : "Coming soon"}</h6>
      {ours ? <><p><Icon name="check" className="icon" />Mail, chat, tasks and calendar on one address</p><p><Icon name="check" className="icon" />{mail === "melodomain" ? `Verify ${dom} with one DNS record next` : "Add a company domain whenever you’re ready"}</p><p><Icon name="check" className="icon" />Workspace rules apply on arrival</p></>
        : <><p><Icon name="clock" className="icon" />Connecting {mail === "google" ? "Google Workspace" : mail === "microsoft" ? "Microsoft 365" : "other providers"} isn’t live yet</p><p><Icon name="check" className="icon" />We’ll save your choice and email you when it’s ready</p><p><Icon name="check" className="icon" />Team chat, tasks and calendar work today</p></>}
    </div>
    <button className="su-btn dark" type="button" onClick={() => { up({ mail }); p.go(mail === "melodomain" ? "dns" : "invite"); }}>{label[mail]}</button>
    <button type="button" className="su-skip" onClick={() => { up({ mail: melo ? "melo" : mail }); p.go("invite"); }}>Skip for now</button>
    <BackLink p={p} />
  </></Frame>;
}

/* 4b — verify a domain with DNS */
function DnsStep(p: P) {
  const { s, up } = p;
  const dom = s.domain, value = `melo-verification=${s.token}`;
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
  const HOW: Record<string, string> = { Namecheap: "Domain List → Manage → Advanced DNS → Add new record → TXT Record. Host: @", GoDaddy: "My Products → Domains → DNS → Add new record → TXT. Name: @", Cloudflare: `Websites → ${dom} → DNS → Records → Add record → TXT. Name: @`, Other: "Open your domain’s DNS settings and add a TXT record. Host “@” means the domain itself." };
  const pv = { grad: "orange" as Grad, preview: <><div className="pv-card pv-rows"><div className="pv-row"><span className="av sq" style={{ background: "#121212", color: "#fff" }}><Mark /></span><span className="from">{dom}</span><span className="sub">{s.dnsFound ? "Verified" : "Waiting for DNS"}</span></div>
    <div className={`pv-row${s.dnsFound ? "" : " read"}`}><span className={`dot${s.dnsFound ? "" : " off"}`} /><span className="from">Ownership</span><span className="pre">TXT record</span><span className="t">{s.dnsFound ? "Verified" : "Pending"}</span></div></div>
    <Msg h={`${dom} on Melo`} p="Once the domain is verified, only people you invite can create a workspace on it." /></> };
  const checkDns = async () => {
    if (s.hasMail === null) return setErr(`Tell us whether ${dom} already has email.`);
    if (s.dnsFound) return p.go("invite");
    setBusy(true);
    const txt = await api.dns(dom, "TXT");
    const found = txt.some((t) => t.includes(value));
    up({ dnsChecked: true, dnsFound: found }); setBusy(false);
    setErr(found ? "" : "We can’t see the record yet. DNS changes can take up to an hour — check again in a few minutes, or add it later.");
  };
  return <Frame p={p} {...pv}><>
    <Progress n={3} />
    <Title h={`Verify ${dom}`} p="Add one TXT record where you bought your domain. It only proves the domain is yours — your current email keeps working." />
    <div className="su-f"><span className="su-lab">Does {dom} already have email?</span><div className="su-pills" role="group" aria-label="Existing email">
      <button type="button" className="su-pill" aria-pressed={s.hasMail === true} onClick={() => up({ hasMail: true })}>Yes, it has email</button>
      <button type="button" className="su-pill" aria-pressed={s.hasMail === false} onClick={() => up({ hasMail: false })}>No, it’s new</button></div></div>
    <div className="su-f"><span className="su-lab">Where is {dom} registered?</span><div className="su-pills" role="group" aria-label="Registrar">{Object.keys(HOW).map((r) => <button key={r} type="button" className="su-pill" aria-pressed={s.registrar === r} onClick={() => up({ registrar: r })}>{r}</button>)}</div>
      {s.registrar && <p className="su-meta small" style={{ marginTop: 6 }}>{HOW[s.registrar]}</p>}</div>
    <div className="dn-list"><div className="dn-rec"><span className="dn-t">TXT</span><span className="dn-b"><span className="dn-h">@</span><code>{value}</code><small>Proves you own {dom}</small></span>
      {s.dnsFound ? <span className="dn-st ok"><Icon name="check" className="icon" />Found</span> : s.dnsChecked ? <span className="dn-st wait"><Icon name="clock" className="icon" />Not found yet</span> : null}
      <button type="button" className={`dn-copy${copied ? " done" : ""}`} aria-label="Copy TXT value" onClick={() => copy(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); })}><Icon name={copied ? "check" : "copy"} className="icon" /></button></div></div>
    <div className="su-tip"><Icon name="mail" className="icon" /><span>{s.hasMail ? `Don’t change your MX records. Keep using your current provider — we’ll send you the mail records when Melo hosting opens for ${dom}.` : `Hosted mailboxes for ${dom} are coming soon. Verify now and we’ll email you the mail records when they’re ready.`}</span></div>
    <Err msg={err} />
    <button className="su-btn dark" type="button" onClick={checkDns} disabled={busy}>{busy ? "Checking DNS…" : s.dnsFound ? "Continue" : s.dnsChecked ? "Check again" : "Check record"}</button>
    <button type="button" className="su-skip" onClick={() => p.go("invite")}>I’ll add it later</button>
  </></Frame>;
}

/* 5 — invite the team */
function InviteStep(p: P) {
  const { s, up } = p;
  const dom = s.domainMode === "domain" ? s.domain : "";
  const [typed, setTyped] = useState(""), [err, setErr] = useState("");
  const add = () => {
    const parts = typed.split(/[\s,;]+/).filter(Boolean); if (!parts.length) return true;
    const bad = parts.filter((x) => !isEmail(x));
    up({ invites: [...new Set([...s.invites, ...parts.filter(isEmail).map((x) => x.toLowerCase())])] });
    setTyped(bad.join(" ")); setErr(bad.length ? `Check ${bad[0]}.` : ""); return !bad.length;
  };
  const pv = { grad: "pink" as Grad, preview: <><div className="pv-card pv-rows pv-mem">
    <div className="pv-row"><span className="av" style={{ background: "#e2468b" }}>{initials(s.name || s.email)}</span><span className="nm"><b>{s.name ? `${s.name} (you)` : "You"}</b><small>{s.email} · Owner</small></span><span className="pv-role">Owner</span></div>
    {s.invites.slice(0, 4).map((m) => <div key={m} className="pv-row"><span className="av" style={{ background: colorFor(m) }}>{initials(m)}</span><span className="nm"><b>{m}</b><small>Invite pending</small></span><span className="pv-role" style={{ textTransform: "capitalize" }}>{s.role}</span></div>)}
    {!s.invites.length && <div className="pv-row read"><span className="av" style={{ background: "var(--bg-active)", color: "var(--text-tertiary)" }}>+</span><span className="nm"><b style={{ color: "var(--text-tertiary)" }}>Your teammates show up here</b><small>Add an email on the left</small></span></div>}
  </div><Msg h="Bring everyone in" p="Admins can change roles anytime." /></> };
  return <Frame p={p} {...pv}><>
    <Progress n={4} />
    <Title h="Invite your team" p="Add people by email. They’ll get access to your channels and shared work." />
    <div className="su-f"><label htmlFor="su-tok">Email addresses</label>
      <div className="su-tokens" onClick={() => document.getElementById("su-tok")?.focus()}>
        {s.invites.map((m) => <span key={m} className="su-tok"><span className="av" style={{ background: colorFor(m) }}>{m[0].toUpperCase()}</span>{m}<button type="button" aria-label={`Remove ${m}`} onClick={() => up({ invites: s.invites.filter((x) => x !== m) })}><Icon name="x" className="icon" /></button></span>)}
        <input id="su-tok" type="email" autoComplete="off" placeholder={s.invites.length ? "Add more…" : `name@${dom || "company.com"}`} value={typed} onChange={(e) => setTyped((e.target as HTMLInputElement).value)} onBlur={add}
          onKeyDown={(e) => { if (["Enter", ",", " ", "Tab"].includes(e.key) && typed.trim()) { e.preventDefault(); add(); } if (e.key === "Backspace" && !typed && s.invites.length) up({ invites: s.invites.slice(0, -1) }); }} />
      </div></div>
    <div className="su-row"><span className="su-meta">Invite as</span><select className="su-sel" aria-label="Invite as" value={s.role} onChange={(e) => up({ role: (e.target as HTMLSelectElement).value as Role })}><option value="member">Member</option><option value="admin">Admin</option><option value="guest">Guest</option></select></div>
    <p className="su-meta small">We’ll email each person an invite from Melo when you finish setup. They can join with any email they use today.</p>
    <Err msg={err} />
    <button className="su-btn dark" type="button" onClick={() => { if (!add()) return; if (!s.invites.length && !typed.trim()) return setErr("Add at least one email, or skip for now."); p.go("rules"); }}>{s.invites.length ? `Send ${s.invites.length} invite${s.invites.length > 1 ? "s" : ""}` : "Send invites"}</button>
    <button type="button" className="su-skip" onClick={() => { up({ invites: [] }); p.go("rules"); }}>Skip for now</button>
  </></Frame>;
}

/* 6 — first workspace rules */
const RULES: [keyof State["rules"], string, string, string, string, "mail" | "hash" | "calendar"][] = [
  ["digests", "Hide marketing digests", "Newsletters and promos skip the inbox for everyone", "Marketing tools", "Skip inbox", "mail"],
  ["random", "Mute #random by default", "People can turn it back on", "Channel is #random", "Mute", "hash"],
  ["invites", "Move outside calendar invites to Later", "Invites from outside your workspace wait in Later", "Outside invite", "Later", "calendar"],
];
function RulesStep(p: P) {
  const { s, up } = p;
  const pv = { grad: "green" as Grad, preview: <><div className="pv-card pv-rows pv-rl">{RULES.map(([k, t, , cond, act, icn]) => <div key={k} className={`pv-row ${s.rules[k] ? "" : "off"}`}><span className={`pv-mtg ${s.rules[k] ? "on" : ""}`} /><span className="rtx"><b>{t.replace(" by default", "").replace("Move outside calendar invites to Later", "Outside calendar invites")}</b><span className="cond"><span><Icon name={icn} className="icon" />{cond}</span>→<span className="act">{act}</span></span></span><span className="enf"><Icon name="lock" className="icon" />Enforced</span></div>)}</div>
    <Msg h="Quiet by design" p="Rules run on every new email and message. Enforced rules show up locked for everyone." /></> };
  return <Frame p={p} {...pv}><>
    <Progress n={5} />
    <Title h="Set your first workspace rules" p="Pick a few starters. You can change them any time in Settings → Rules & filters." />
    <div className="su-rules">{RULES.map(([k, t, sub]) => <div key={k} className="su-rule"><span className="tx"><b>{t}</b><small>{sub}</small></span><button type="button" className="su-tg" role="switch" aria-label={t} aria-checked={s.rules[k]} onClick={() => up({ rules: { ...s.rules, [k]: !s.rules[k] } })} /></div>)}</div>
    <div className="su-tip"><Icon name="sparkle" className="icon" /><span>Employees can add their own filters on top of workspace rules.</span></div>
    <button className="su-btn dark" type="button" onClick={() => p.go("done")}>Finish setup</button>
  </></Frame>;
}

/* 7 — save everything, then open the workspace */
function Done({ s }: { s: State }) {
  const [state, setState] = useState<{ status: "saving" | "ok" | "error"; error?: string; sent?: number; accepted?: boolean; workspace?: string }>({ status: "saving" });
  const ran = useRef(false);
  const save = async () => {
    setState({ status: "saving" });
    try {
      if (!auth.get()) throw new Error("Your session expired. Verify your email again to finish.");
      const r = await api.completeOnboarding({
        name: s.name, melo_address: s.user || "", work_email: s.path === "work" ? s.email : "", join: s.join, invite: s.invite,
        ws: s.ws, ws_slug: slugWs(s.slug || s.ws), domain: s.domainMode === "domain" ? s.domain : "", size: s.size, mail: s.mail ?? (s.path === "melo" ? "melo" : ""),
        has_mail: s.hasMail, dns_token: s.mail === "melodomain" ? s.token : "", domain_verified: s.dnsFound, invites: s.invites, role: s.role, rules: s.rules,
      });
      if (r.workspace_id) try { localStorage.setItem("melo.workspace", r.workspace_id); } catch { /* ignore */ }
      let sent = 0;
      if (s.invites.length && r.workspace_id) sent = (await api.sendInvites(r.workspace_id).catch(() => ({ sent: 0 }))).sent;
      setState({ status: "ok", sent, accepted: r.accepted, workspace: r.workspace });
    } catch (e) { setState({ status: "error", error: (e as Error).message }); }
  };
  useEffect(() => { if (!ran.current) { ran.current = true; save(); } }, []); // eslint-disable-line
  const n = Object.values(s.rules).filter(Boolean).length;
  const items: [boolean, ReactNode, string?][] = s.join
    ? [[true, `Account verified · ${auth.get()?.user.email ?? ""}`], [Boolean(state.accepted), state.accepted ? `You’ve joined ${state.workspace ?? "the workspace"}` : "Join request sent — you’re in as soon as it’s accepted"]]
    : [[true, `Account verified · ${auth.get()?.user.email ?? ""}`], [true, `Workspace created — ${s.ws}`],
      [s.mail === "melo" || s.dnsFound, s.mail === "melo" ? `Melo Mail${s.user ? ` · ${s.user}@melo.to` : ""}` : s.mail === "melodomain" ? (s.dnsFound ? `${s.domain} verified` : `Verify ${s.domain} — Settings → Email domains`) : "Connect your mail provider — coming soon"],
      ...(s.invites.length ? [[Boolean(state.sent), state.sent ? `${state.sent} invite${state.sent > 1 ? "s" : ""} sent` : "Invites saved — send them from Settings → Members"] as [boolean, ReactNode]] : []),
      [n > 0, n ? `${n} workspace rule${n > 1 ? "s" : ""} turned on` : "Turn on workspace rules"]];
  return (
    <div className="su final">
      <div className="su-welcome">
        <div className="su-wcard" role="status">
          <img src="/logo.svg" alt="Melo business" />
          {state.status === "saving" ? <><h1>Saving your workspace…</h1><p>This takes a second.</p></>
            : state.status === "error" ? <><h1>We couldn’t save that</h1><p>{state.error}</p><button className="su-btn dark" type="button" onClick={save}>Try again</button><Link className="su-skip" to="/signin">Sign in again</Link></>
            : <>
              <div className="su-prog prog" aria-hidden="true">{[1, 2, 3, 4, 5, 6].map((i) => <i key={i} className="done" />)}</div>
              <div className="su-wcheck"><Icon name="check" className="icon" /></div>
              <h1>{s.join ? (state.accepted ? `Welcome to ${state.workspace}` : "You’re on your way in") : `${s.ws} is ready`}</h1>
              <p>Here’s what’s saved to your account.</p>
              <div className="su-list">{items.map(([done, t], i) => <div key={i} className={`su-li ${done ? "" : "todo"}`}><span className={`c ${done ? "" : "todo"}`}>{done && <Icon name="check" className="icon" />}</span><span>{t}</span><em>{done ? "Done" : "Later"}</em></div>)}</div>
              {(!s.join || state.accepted) && <button className="su-btn dark" type="button" onClick={() => navigate("/app")}><MeloMark className="w-[15px] h-[10px]" /> Open your workspace</button>}
              {s.join && !state.accepted && <Link className="su-btn line" to="/">Back to Melo</Link>}
              <p className="su-tipk">Tip: press <kbd>C</kbd> in Mail to write an email</p>
            </>}
        </div>
      </div>
    </div>
  );
}
