/* Melo Personal — sign-up (Figma: Personal / Onboarding, steps 1–4 + All set).
   Two ways in:
   1. Email first: email → 6-digit code → pick a @melo.to address (or bring the one you have) → connect → quiet inbox → all set
   2. No email: "Create a @melo.to address" → name, address, password → connect → quiet inbox → all set */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api, type Profile } from "../lib/api";
import { Link, navigate, useLocation } from "../lib/router";
import { useSession } from "../lib/session";
import { cx } from "../lib/util";
import { Icon, type IconName } from "../components/icons";
import { Spinner, useToast } from "../components/ui";

type Step = "start" | "verify" | "pick" | "create" | "connect" | "quiet" | "done";
const STEP_NO: Partial<Record<Step, number>> = { verify: 1, pick: 2, create: 2, connect: 3, quiet: 4 };
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const handle = (v: string) => v.toLowerCase().replace(/[^a-z0-9.]/g, "").replace(/^\.+/, "").slice(0, 30);
const suggest = (name: string) => handle(name.trim().split(/\s+/)[0] ?? "");
const validHandle = (u: string) => /^[a-z0-9][a-z0-9.]{1,28}[a-z0-9]$/.test(u) && !/\.\./.test(u);

const INPUT = "h-10 w-full rounded-full border border-line-2 bg-white px-4 text-[14px] outline-none transition-[border-color,box-shadow] focus:border-pa focus:shadow-[0_0_0_3px_var(--color-pa-soft)] aria-[invalid=true]:border-bad";
const DARK = "flex h-11 w-full items-center justify-center gap-2 rounded-full bg-inverse text-[14px] font-semibold text-white transition-[background-color,transform] hover:bg-[#333] active:scale-[.99] disabled:opacity-60";

interface State { email: string; name: string; address: string; filters: { newsletters: boolean; receipts: boolean; screener: boolean }; prefs: Record<string, unknown>; viaPassword: boolean }

export default function PersonalOnboarding() {
  const session = useSession();
  const { query } = useLocation();
  const toast = useToast();
  const soon = (w: string) => toast(`${w} is coming soon`, "info");
  const [step, setStep] = useState<Step>("start");
  const [s, setS] = useState<State>({ email: (query.get("email") ?? "").trim().toLowerCase(), name: "", address: "", filters: { newsletters: true, receipts: true, screener: false }, prefs: {}, viaPassword: false });
  const up = (p: Partial<State>) => setS((x) => ({ ...x, ...p }));
  const hist = useRef<Step[]>([]);
  const go = (to: Step) => { hist.current.push(step); setStep(to); window.scrollTo(0, 0); };
  const back = () => { const b = hist.current.pop(); if (b) setStep(b); };
  useEffect(() => { document.title = "Create your Melo account"; }, []);

  /* Already signed in (e.g. came back from the app): carry on from where the account is */
  const resumed = useRef(false);
  useEffect(() => {
    if (!session || resumed.current || step !== "start") return;
    resumed.current = true;
    api.account().then((a) => {
      if (!a) return;
      up({ email: a.email, name: a.profile?.full_name ?? "", address: a.profile?.melo_address ? `${a.profile.melo_address}@melo.to` : "", prefs: a.profile?.prefs ?? {} });
      if (a.profile?.melo_address) { if (!a.workspaces.some((w) => w.kind === "personal")) api.ensurePersonalSpace().catch(() => {}); navigate("/app/mail", { replace: true }); }
      else setStep("pick");
    }, () => {});
  }, [session, step]);

  /* After verifying or creating: make sure there is a personal space and remember the profile */
  const afterAccount = async () => {
    const a = await api.account();
    if (a?.profile) up({ prefs: a.profile.prefs ?? {}, name: a.profile.full_name ?? s.name, address: a.profile.melo_address ? `${a.profile.melo_address}@melo.to` : "" });
    return a;
  };

  const p = { s, up, go, back, soon, afterAccount };
  if (step === "done") return <Done {...p} />;
  const panel = PANELS[step];
  return (
    <div className="melo-app grid min-h-dvh bg-white lg:grid-cols-[640px_1fr]">
      <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-20 sm:py-12">
        <header className="flex items-center justify-between">
          <Link to="/" aria-label="Melo home"><img src="/wordmark.svg" alt="melo" width={59} height={16} className="h-4 w-auto" /></Link>
          {STEP_NO[step] && <span className="text-[12px] text-ink-3">Step {STEP_NO[step]} of 4</span>}
        </header>
        <main key={step} className="my-auto flex w-full max-w-[440px] flex-col gap-5 py-10 animate-fade-up">
          {STEP_NO[step] && <Progress n={STEP_NO[step]!} />}
          {step === "start" && <Start {...p} />}
          {step === "verify" && <Verify {...p} />}
          {step === "pick" && <Pick {...p} />}
          {step === "create" && <Create {...p} />}
          {step === "connect" && <Connect {...p} />}
          {step === "quiet" && <Quiet {...p} />}
        </main>
        <footer className="text-[12px] text-ink-3">© 2026 Melo · <button type="button" onClick={() => soon("The privacy page")} className="hover:text-ink">Privacy</button> · <button type="button" onClick={() => soon("The terms page")} className="hover:text-ink">Terms</button></footer>
      </div>
      <aside className="hidden p-4 lg:block">
        <div key={step} className="flex h-full min-h-[600px] items-center justify-center rounded-[28px] p-10 transition-[background] duration-500 animate-fade-in" style={{ background: panel.bg }}>
          <div className="flex w-full max-w-[560px] flex-col gap-4">{panel.render(s)}<Caption h={panel.h} p={typeof panel.p === "function" ? panel.p(s) : panel.p} /></div>
        </div>
      </aside>
    </div>
  );
}

type P = { s: State; up: (p: Partial<State>) => void; go: (s: Step) => void; back: () => void; soon: (w: string) => void; afterAccount: () => Promise<Awaited<ReturnType<typeof api.account>>> };

function Progress({ n }: { n: number }) {
  return <div className="flex gap-1.5" aria-label={`Step ${n} of 4`}>{[1, 2, 3, 4, 5, 6].map((k) => <span key={k} className={cx("h-1 rounded-full transition-[width,background-color] duration-500", k <= n + 1 ? "bg-accent" : "bg-line", k === n + 1 ? "w-6" : "w-4")} />)}</div>;
}
function Title({ h, p }: { h: string; p: ReactNode }) {
  return <div className="flex flex-col gap-2"><h1 className="text-[28px] leading-[34px] font-medium tracking-[-0.01em]">{h}</h1><p className="text-[14px] text-ink-sec">{p}</p></div>;
}
function Err({ msg }: { msg: ReactNode }) { return msg ? <p role="alert" className="text-[13px] text-bad animate-fade-in">{msg}</p> : null; }
function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) { return <label htmlFor={htmlFor} className="mb-1.5 block text-[12px] font-medium text-ink-2">{children}</label>; }
function Caption({ h, p }: { h: string; p: string }) { return <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-[0_1px_2px_rgba(0,0,0,.04)]"><b className="block text-[17px] font-medium">{h}</b><p className="mt-1 text-[13px] text-ink-sec">{p}</p></div>; }
export function PToggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cx("relative h-5 w-8 shrink-0 rounded-full transition-colors", on ? "bg-pa" : "bg-line-2")}>
      <span className={cx("absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-[left] duration-300 ease-[cubic-bezier(.22,1,.36,1)]", on ? "left-[14px]" : "left-0.5")} />
    </button>
  );
}

/* ——— Step 0: create your account ——— */
function Start({ s, up, go, soon }: P) {
  const [v, setV] = useState(s.email), [err, setErr] = useState<ReactNode>("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const x = v.trim().toLowerCase();
    if (!isEmail(x)) return setErr("Enter a valid email address.");
    if (x.endsWith("@melo.to")) return setErr(<>That’s already a Melo address. <Link to={`/signin?email=${encodeURIComponent(x)}`} className="font-medium text-pa-text underline">Sign in</Link> instead.</>);
    up({ email: x }); go("verify");
  };
  return <>
    <Title h="Create your Melo account" p="One calm inbox for your personal email. Free forever." />
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => soon("Continue with Google")} className="flex h-11 items-center justify-center gap-2.5 rounded-full border border-line-2 text-[14px] font-medium hover:bg-hover"><Google />Continue with Google</button>
      <button type="button" onClick={() => soon("Continue with Microsoft")} className="flex h-11 items-center justify-center gap-2.5 rounded-full border border-line-2 text-[14px] font-medium hover:bg-hover"><Microsoft />Continue with Microsoft</button>
    </div>
    <div className="flex items-center gap-3 text-[12px] text-ink-3"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <div><Label htmlFor="po-email">Email</Label><input id="po-email" type="email" autoComplete="email" autoFocus placeholder="you@gmail.com" value={v} aria-invalid={Boolean(err)} onChange={(e) => { setV(e.target.value); setErr(""); }} className={INPUT} /></div>
      <Err msg={err} />
      <button type="submit" className={DARK}>Continue</button>
    </form>
    <button type="button" onClick={() => go("create")} className="group flex items-center gap-3 rounded-2xl border border-pa bg-pa-soft p-4 text-left transition-colors hover:bg-[#f8efc2]">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pa text-pa-on"><Icon name="at" className="size-[18px]" /></span>
      <span className="flex-1"><b className="block text-[14px] font-semibold">No email? Create a @melo.to address</b><span className="text-[12px] text-ink-sec">Free forever. All you need is a password.</span></span>
      <Icon name="chev-right" className="size-4 text-pa-text transition-transform group-hover:translate-x-0.5" />
    </button>
    <p className="text-[13px] text-ink-sec">Already have an account? <Link to="/signin" className="font-medium text-pa-text hover:underline">Log in</Link></p>
    <p className="text-[12px] text-ink-3">By continuing you agree to Melo’s Terms and Privacy Policy.</p>
  </>;
}

/* ——— Step 1: verify the email ——— */
function Verify({ s, go, back, afterAccount }: P) {
  const [code, setCode] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<"sending" | "sent" | "failed">("sending"), [n, setN] = useState(0);
  useEffect(() => { let live = true; setSent("sending"); api.sendCode(s.email).then(() => live && setSent("sent"), (e: Error) => { if (live) { setSent("failed"); setErr(e.message); } }); return () => { live = false; }; }, [s.email, n]);
  const verify = async (c = code) => {
    if (c.length < 6) return setErr("Enter all 6 digits.");
    if (busy) return; setBusy(true); setErr("");
    try {
      await api.verifyCode(s.email, c);
      const a = await afterAccount();
      if (a?.profile?.melo_address) { await api.ensurePersonalSpace().catch(() => {}); go("connect"); } else go("pick");
    } catch (e) { setErr((e as Error).message); setCode(""); setBusy(false); }
  };
  return <>
    <Title h="Check your email" p={sent === "sending" ? <>Sending a 6-digit code to <b className="font-medium text-ink">{s.email}</b>…</> : sent === "failed" ? <>We couldn’t send a code to <b className="font-medium text-ink">{s.email}</b>.</> : <>We sent a 6-digit code to <b className="font-medium text-ink">{s.email}</b>. It expires in 10 minutes.</>} />
    <form noValidate onSubmit={(e) => { e.preventDefault(); verify(); }} className="flex flex-col gap-4">
      <div><Label htmlFor="po-code">6-digit code</Label>
        <input id="po-code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} placeholder="••••••" value={code} aria-invalid={Boolean(err)}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); setErr(""); if (v.length === 6) verify(v); }}
          className={cx(INPUT, "h-12 text-center font-mono text-[22px] tracking-[.5em]")} /></div>
      <Err msg={err} />
      <button type="submit" className={DARK} disabled={busy}>{busy ? <><Spinner className="size-4" />Checking…</> : "Verify"}</button>
    </form>
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-sec">
      <span>Didn’t get it? <button type="button" className="font-medium text-pa-text hover:underline" onClick={() => { setErr(""); setN((x) => x + 1); }}>{n ? "Code sent again" : "Resend code"}</button></span>
      <button type="button" className="font-medium text-pa-text hover:underline" onClick={back}>Wrong email? Change</button>
    </p>
  </>;
}

/* Address field with a live availability check */
function useAvailability(u: string) {
  const [state, setState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  useEffect(() => {
    if (!u) return setState("idle");
    if (!validHandle(u)) return setState("invalid");
    setState("checking");
    let live = true;
    const t = setTimeout(() => api.addressAvailable(u).then((ok) => live && setState(ok ? "ok" : "taken"), () => live && setState("idle")), 350);
    return () => { live = false; clearTimeout(t); };
  }, [u]);
  return state;
}
function AddressField({ id, u, set, state }: { id: string; u: string; set: (v: string) => void; state: ReturnType<typeof useAvailability> }) {
  return <div>
    <Label htmlFor={id}>Your new address</Label>
    <div className="relative"><input id={id} autoComplete="username" spellCheck={false} placeholder="alex" value={u} aria-invalid={state === "taken" || state === "invalid"} onChange={(e) => set(handle(e.target.value))} className={cx(INPUT, "pr-[84px]")} /><span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[14px] text-ink-3">@melo.to</span></div>
    <p className={cx("mt-2 flex h-4 items-center gap-1.5 text-[12px]", state === "ok" ? "text-ok" : state === "checking" || state === "idle" ? "text-ink-3" : "text-bad")} aria-live="polite">
      {state === "ok" && <><Icon name="check" className="size-3.5" />{u}@melo.to is available</>}
      {state === "checking" && "Checking…"}
      {state === "taken" && `${u}@melo.to is taken — try another`}
      {state === "invalid" && "Use 3–30 letters, numbers or dots."}
    </p>
  </div>;
}

/* ——— Step 2: pick your address (or bring one) ——— */
function Pick({ s, up, go, afterAccount }: P) {
  const [name, setName] = useState(s.name), [u, setU] = useState(s.address.replace(/@melo\.to$/, "") || suggest(s.name)), [touched, setTouched] = useState(Boolean(s.address));
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const state = useAvailability(u);
  const finish = async (claim: boolean) => {
    if (!name.trim()) return setErr("Add your name.");
    if (claim && state !== "ok") return setErr(state === "taken" ? "That address is taken." : "Pick an available address.");
    setBusy(true); setErr("");
    try {
      await api.updateProfile(claim ? { full_name: name.trim(), display_name: name.trim().split(/\s+/)[0], melo_address: u } : { full_name: name.trim(), display_name: name.trim().split(/\s+/)[0] });
      await api.ensurePersonalSpace();
      await afterAccount();
      up({ name: name.trim(), address: claim ? `${u}@melo.to` : "" });
      go("connect");
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return <>
    <Title h="Pick your address" p="Claim a free @melo.to address, or bring the email you already use." />
    <form noValidate onSubmit={(e) => { e.preventDefault(); finish(true); }} className="flex flex-col gap-4">
      <div><Label htmlFor="po-name">Your name</Label><input id="po-name" autoComplete="name" autoFocus value={name} placeholder="Alex Morgan" onChange={(e) => { setName(e.target.value); setErr(""); if (!touched) setU(suggest(e.target.value)); }} className={INPUT} /></div>
      <AddressField id="po-addr" u={u} set={(v) => { setU(v); setTouched(true); setErr(""); }} state={state} />
      <div className="flex flex-col gap-2.5"><span className="text-[12px] text-ink-2">Already have an address you love? Bring it.</span>
        <div className="flex flex-wrap gap-2">{["Gmail", "Outlook", "iCloud", "Other"].map((t) => <button key={t} type="button" disabled={busy} onClick={() => finish(false)} className="h-7 rounded-full bg-active px-3 text-[12px] font-medium hover:bg-line-2">{t}</button>)}</div></div>
      <Err msg={err} />
      <button type="submit" className={DARK} disabled={busy}>{busy ? <><Spinner className="size-4" />Claiming…</> : `Claim ${u || "your"}@melo.to`}</button>
    </form>
    <p className="text-[12px] text-ink-3">Signed in as {s.email}. Your @melo.to address is yours for good — it can’t be changed later.</p>
  </>;
}

/* ——— Step 2 (no email): create a @melo.to address with a password ——— */
function Create({ s, up, go, back, afterAccount }: P) {
  const [name, setName] = useState(s.name), [u, setU] = useState(""), [touched, setTouched] = useState(false), [pw, setPw] = useState(""), [show, setShow] = useState(false);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const state = useAvailability(u);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("Add your name.");
    if (state !== "ok") return setErr(state === "taken" ? "That address is taken." : "Pick an available address.");
    if (pw.length < 8) return setErr("Use at least 8 characters for your password.");
    setBusy(true); setErr("");
    try {
      await api.meloSignup({ name: name.trim(), address: u, password: pw, personal: true });
      await afterAccount();
      up({ name: name.trim(), address: `${u}@melo.to`, email: `${u}@melo.to`, viaPassword: true });
      go("connect");
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return <>
    <Title h="Create your Melo address" p="No other email needed. Pick a free @melo.to address and a password — you’ll sign in with both." />
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <div><Label htmlFor="pc-name">Your name</Label><input id="pc-name" autoComplete="name" autoFocus value={name} placeholder="Alex Morgan" onChange={(e) => { setName(e.target.value); setErr(""); if (!touched) setU(suggest(e.target.value)); }} className={INPUT} /></div>
      <AddressField id="pc-addr" u={u} set={(v) => { setU(v); setTouched(true); setErr(""); }} state={state} />
      <div><Label htmlFor="pc-pw">Password</Label>
        <div className="relative"><input id="pc-pw" type={show ? "text" : "password"} autoComplete="new-password" value={pw} placeholder="At least 8 characters" onChange={(e) => { setPw(e.target.value); setErr(""); }} className={cx(INPUT, "pr-16")} />
          <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full px-2 py-1 text-[12px] font-medium text-ink-3 hover:text-ink">{show ? "Hide" : "Show"}</button></div></div>
      <Err msg={err} />
      <button type="submit" className={DARK} disabled={busy}>{busy ? <><Spinner className="size-4" />Creating your address…</> : `Create ${u || "your"}@melo.to`}</button>
    </form>
    <p className="text-[13px] text-ink-sec">Have an email already? <button type="button" onClick={back} className="font-medium text-pa-text hover:underline">Use it instead</button></p>
    <p className="text-[12px] text-ink-3">Add a recovery email in Settings later so you can always get back in.</p>
  </>;
}

/* ——— Step 3: connect existing email (shown as designed; importing isn't live yet) ——— */
const PROVIDERS: { key: string; name: string; sub: string; icon: ReactNode }[] = [
  { key: "Gmail", name: "Gmail", sub: "Personal Gmail or Google account", icon: <Google /> },
  { key: "Outlook", name: "Outlook", sub: "Outlook.com, Hotmail and Live", icon: <Microsoft /> },
  { key: "iCloud", name: "iCloud & others", sub: "iCloud Mail, Yahoo or any IMAP account", icon: <Icon name="mail" className="size-4" /> },
];
function Connect({ go, soon }: P) {
  const [pick, setPick] = useState("Gmail");
  return <>
    <Title h="Connect your existing email" p="Melo works on top of the address you already have. Nothing changes for people who email you." />
    <div role="radiogroup" aria-label="Email provider" className="flex flex-col gap-2.5">
      {PROVIDERS.map((x) => (
        <button key={x.key} type="button" role="radio" aria-checked={pick === x.key} onClick={() => setPick(x.key)}
          className={cx("flex items-center gap-3 rounded-2xl border p-4 text-left transition-[background-color,border-color]", pick === x.key ? "border-pa bg-pa-soft" : "border-line hover:bg-subtle")}>
          <span className="flex size-9 items-center justify-center rounded-full border border-line bg-white">{x.icon}</span>
          <span className="flex-1"><b className="block text-[13px] font-medium">{x.name}</b><span className="text-[12px] text-ink-3">{x.sub}</span></span>
          <span className={cx("flex size-[18px] items-center justify-center rounded-full border-2 transition-colors", pick === x.key ? "border-pa" : "border-line-2")}>{pick === x.key && <span className="size-2 rounded-full bg-pa animate-tick" />}</span>
        </button>
      ))}
    </div>
    <div className="flex flex-col gap-2 rounded-2xl bg-subtle p-4 text-[12px]">
      <span className="text-ink-3">Melo will be able to</span>
      {["Read, send and organise your mail", "Read your calendar to show invites", "Sort mail into Primary, Newsletters and Receipts"].map((t) => <span key={t} className="flex items-center gap-2"><Icon name="check" className="size-3.5 text-ok" />{t}</span>)}
      <span className="flex items-center gap-2 font-medium"><span className="size-3.5 rounded-full border-2 border-pa" />We never train AI models on your mail.</span>
    </div>
    <button type="button" onClick={() => soon(`Connecting ${pick === "iCloud" ? "iCloud and IMAP" : pick}`)} className={DARK}>Connect {pick === "iCloud" ? "iCloud" : pick}</button>
    <button type="button" onClick={() => go("quiet")} className="self-start text-[13px] font-medium text-ink-2 hover:text-ink">Skip for now</button>
  </>;
}

/* ——— Step 4: quiet inbox ——— */
function Quiet({ s, up, go }: P) {
  const [f, setF] = useState(s.filters), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const rows: [keyof State["filters"], string, string][] = [
    ["newsletters", "Newsletters get their own tab", "Read them in a calm, magazine-style view"],
    ["receipts", "Receipts and orders go to Receipts", "Shipping updates bundle into one thread"],
    ["screener", "Screen first-time senders", "New people wait in Screener until you say yes"],
  ];
  const save = async () => {
    setBusy(true); setErr("");
    try {
      const old = (s.prefs.filters ?? {}) as Record<string, unknown>;
      const prefs = { ...s.prefs, filters: { ...old, ...f, updates: old.updates ?? true } };
      await api.updateProfile({ prefs } as Partial<Profile>);
      up({ filters: f, prefs }); go("done");
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return <>
    <Title h="Make your inbox quiet" p="Choose what skips Primary. People you know always come first." />
    <div className="flex flex-col">
      {rows.map(([k, h, d]) => (
        <label key={k} className="flex cursor-pointer items-center gap-4 border-b border-line py-4">
          <span className="flex-1"><b className="block text-[13px] font-medium">{h}</b><span className="text-[12px] text-ink-3">{d}</span></span>
          <PToggle label={h} on={f[k]} onChange={(v) => setF({ ...f, [k]: v })} />
        </label>
      ))}
    </div>
    <p className="flex items-center gap-2 rounded-xl bg-[#f1f7ff] px-4 py-3 text-[12px]"><Icon name="sparkle" className="size-4 text-warn" />Change these anytime in Settings → Filters.</p>
    <Err msg={err} />
    <button type="button" onClick={save} disabled={busy} className={DARK}>{busy ? <><Spinner className="size-4" />Saving…</> : "Continue"}</button>
  </>;
}

/* ——— All set ——— */
function Done({ s, soon }: P) {
  const first = (s.name || "").split(/\s+/)[0];
  const n = Object.values(s.filters).filter(Boolean).length;
  const items: [string, boolean, (() => void) | null][] = [
    [s.viaPassword ? "Account created" : "Account verified", true, null],
    [s.address ? `Address claimed — ${s.address}` : `Using ${s.email}`, true, null],
    ["Connect Gmail, Outlook or iCloud", false, () => soon("Connecting other accounts")],
    [`${n} filter${n === 1 ? "" : "s"} turned on`, true, null],
  ];
  useEffect(() => { document.title = "You’re all set — Melo"; }, []);
  return (
    <div className="melo-app flex min-h-dvh items-start justify-center bg-[linear-gradient(180deg,#f1e289_0%,#f7efbf_45%,#fffdf5_100%)] px-4 py-6 sm:py-10">
      <div className="flex w-full max-w-[660px] flex-col items-center gap-6 rounded-[28px] bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(0,0,0,.05),0_20px_40px_-20px_rgba(0,0,0,.15)] animate-pop sm:px-12">
        <img src="/wordmark.svg" alt="melo" width={59} height={16} className="h-4 w-auto" />
        <span className="flex size-[72px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#fbf6dc,#f1e289)] text-white animate-tick"><Icon name="check" className="size-8" /></span>
        <div className="flex flex-col gap-2"><h1 className="text-[28px] leading-[34px] font-medium tracking-[-0.01em]">You’re all set{first ? `, ${first}` : ""}</h1><p className="text-[14px] text-ink-sec">Your inbox is already sorting itself. Finish the last step whenever you like.</p></div>
        <ul className="flex w-full max-w-[420px] flex-col gap-2 text-left">
          {items.map(([t, done, act], k) => (
            <li key={t} className={cx("flex items-center gap-3 rounded-full px-3 py-2.5 text-[13px] animate-fade-up", done ? "bg-subtle text-ink-3" : "border border-line font-medium")} style={{ animationDelay: `${120 + k * 50}ms` }}>
              {done ? <span className="flex size-5 items-center justify-center rounded-full bg-ok text-white"><Icon name="check" className="size-3" /></span> : <span className="size-5 rounded-full border-2 border-line-2" />}
              <span className="flex-1 truncate">{t}</span>
              {done ? <span className="text-[12px] font-medium text-ok">Done</span> : <button type="button" onClick={act!} className="text-[12px] font-medium text-pa-text hover:underline">Start</button>}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => navigate("/app/mail", { replace: true })} className="flex h-11 items-center rounded-full bg-inverse px-14 text-[14px] font-semibold text-white hover:bg-[#333]">Open Melo</button>
        <p className="text-[12px] text-ink-3">Tip: press <kbd className="rounded-md border border-line px-1.5 py-0.5 font-sans">⌘</kbd> <kbd className="rounded-md border border-line px-1.5 py-0.5 font-sans">K</kbd> anywhere to search mail and people</p>
      </div>
    </div>
  );
}

/* ——— Right-hand previews ——— */
const Row = ({ c, i, n, s, x, t, dot, bold }: { c: string; i: string; n: string; s: string; x: string; t: string; dot?: boolean; bold?: boolean }) => (
  <div className="flex items-center gap-3 border-b border-line px-4 py-3 text-[12px] last:border-0">
    <span className={cx("size-1.5 rounded-full", dot ? "bg-bad" : "bg-transparent")} />
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: c }}>{i}</span>
    <span className={cx("w-[110px] truncate", bold ? "font-semibold" : "text-ink-2")}>{n}</span>
    <span className={cx("shrink-0", bold && "font-semibold")}>{s}</span><span className="min-w-0 flex-1 truncate text-ink-3">{x}</span><span className="text-ink-3">{t}</span>
  </div>
);
const Card = ({ children }: { children: ReactNode }) => <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]">{children}</div>;
const Chip = ({ children, soft }: { children: ReactNode; soft?: boolean }) => <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px]", soft ? "bg-pa-soft text-pa-text" : "border border-line")}>{children}</span>;
const PANELS: Record<Exclude<Step, "done">, { bg: string; h: string; p: string | ((s: State) => string); render: (s: State) => ReactNode }> = {
  start: { bg: "linear-gradient(180deg,#f1e289 0%,#f6edbd 50%,#fffdf6 100%)", h: "People first. Everything else, later.", p: "Melo sorts newsletters, receipts and updates out of the way, so mail from people lands on top.",
    render: () => <Card><Row dot bold c="#f2994a" i="MM" n="Mum" s="Sunday lunch?" x="Bring the kids, I’m making…" t="9:12 AM" /><Row dot bold c="#14a3a3" i="SC" n="Sofia Costa" s="Lisbon photos" x="Finally sorted them…" t="8:40 AM" /><Row c="#6b4fd8" i="DR" n="Dr. Reyes Dental" s="Appointment reminder" x="Tuesday at 10…" t="Yesterday" /></Card> },
  verify: { bg: "linear-gradient(180deg,#8f7cf0 0%,#c4b8f7 50%,#f6f3ff 100%)", h: "Your code is on its way", p: (s) => `Check ${s.email || "your inbox"} — and the spam folder if it’s not there in a minute.`,
    render: (s) => <Card><div className="flex flex-col items-center gap-3 px-6 py-8"><span className="flex size-11 items-center justify-center rounded-full bg-subtle"><Icon name="mail" className="size-5" /></span><b className="text-[13px] font-medium">Your Melo code</b><span className="font-mono text-[28px] tracking-[.3em] text-ink-3">••••••</span><span className="text-[12px] text-ink-3">Sent to {s.email}</span></div></Card> },
  pick: { bg: "linear-gradient(180deg,#14a3a3 0%,#7fcfca 55%,#f2fbfa 100%)", h: "alex@melo.to", p: "Short, yours and free forever. Add your own domain anytime with Melo Plus.", render: () => <AddrCard /> },
  create: { bg: "linear-gradient(180deg,#14a3a3 0%,#7fcfca 55%,#f2fbfa 100%)", h: "Email that’s yours from day one", p: "No phone number, no other inbox. Send and receive at your @melo.to address straight away.", render: () => <AddrCard /> },
  connect: { bg: "linear-gradient(180deg,#f07a1f 0%,#f6b07a 55%,#fff7f0 100%)", h: "Your mail comes with you", p: "Folders and labels come over too. Your old account keeps working as before.",
    render: () => <><div className="flex items-center gap-2 rounded-full bg-ok-soft px-4 py-2 text-[12px] text-ok"><Icon name="check" className="size-3.5" /><span className="flex-1 text-ink">Gmail connected — importing your mail</span><b className="font-medium">View</b></div>
      <Card><Row dot bold c="#e0e0e0" i="A" n="Airbnb" s="Reservation confirmed" x="Lisbon, Dec…" t="8:02 AM" /><Row c="#e0e0e0" i="P" n="Product Hunt" s="Today’s top launches" x="5 products…" t="Yesterday" /><Row c="#e0e0e0" i="N" n="Notion" s="Your receipt" x="Plus plan · $10.00" t="Nov 18" /></Card></> },
  quiet: { bg: "linear-gradient(180deg,#2ea44f 0%,#8fd3a2 55%,#f2fbf4 100%)", h: "Quiet by design", p: "Filters run on every new email. Nothing is deleted — it just waits in the right place.",
    render: (s) => <Card>{([["newsletters", "Newsletters get their own tab", "From a newsletter", "Newsletters tab"], ["receipts", "Receipts & orders", "Looks like a receipt", "Receipts tab"], ["screener", "First-time senders", "First email from sender", "Screener"]] as const).map(([k, h, a, b]) => (
      <div key={k} className={cx("flex items-start gap-3 border-b border-line px-4 py-3 transition-opacity duration-300 last:border-0", !s.filters[k] && "opacity-50")}>
        <span className={cx("mt-0.5 h-4 w-7 shrink-0 rounded-full transition-colors", s.filters[k] ? "bg-pa" : "bg-line-2")} />
        <div className="flex flex-col gap-1.5"><b className="text-[12px] font-medium">{h}</b><span className="flex items-center gap-2"><Chip><Icon name="mail" className="size-3" />{a}</Chip><span className="text-ink-4">→</span><Chip soft><Icon name="eye-off" className="size-3" />{b}</Chip></span></div>
      </div>))}</Card> },
};
function AddrCard() {
  return <Card><div className="flex flex-col gap-1 p-3 text-[13px]">
    <span className="mb-1 flex w-fit items-center gap-2 rounded-full bg-subtle px-2 py-1 font-medium"><span className="flex size-5 items-center justify-center rounded-full bg-inverse text-[10px] text-white">m</span>Your inbox<Icon name="chev-down" className="size-3.5" /></span>
    {([["inbox", "Inbox"], ["doc", "Newsletters"], ["archive", "Receipts"], ["shield", "Screener"]] as [IconName, string][]).map(([ic, t], k) => <span key={t} className={cx("flex items-center gap-2.5 rounded-lg px-2 py-1.5", !k && "bg-active font-medium")}><Icon name={ic} className="size-4 text-icon" />{t}</span>)}
  </div></Card>;
}

function Google() {
  return <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" /><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" /><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" /><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" /></svg>;
}
function Microsoft() {
  return <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path fill="#F25022" d="M1 1h10.5v10.5H1z" /><path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" /><path fill="#00A4EF" d="M1 12.5h10.5V23H1z" /><path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" /></svg>;
}
