import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "../lib/api";
import { Link, navigate, useLocation } from "../lib/router";
import { useSession } from "../lib/session";
import { isEmail } from "../lib/util";
import { Icon } from "../components/icons";
import { AuthShell, CodeBoxes, Err, InboxPreview, Msg, Title, useCountdown } from "./AuthShell";

/* Sign in: email (or @melo.to address) → 6-digit code → straight into the workspace. */
export default function SignIn() {
  const session = useSession();
  const { query } = useLocation();
  const next = safeNext(query.get("next"));
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(query.get("email") ?? "");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<ReactNode>("");
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(0);
  const timer = useCountdown(600, `${sentTo}${resent}`);

  useEffect(() => { document.title = step === "email" ? "Sign in — Melo" : "Check your email — Melo"; }, [step]);
  useEffect(() => { if (session && step === "email") navigate(next, { replace: true }); }, [session]); // eslint-disable-line

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const v = email.trim().toLowerCase();
    if (!isEmail(v)) return setErr("Enter a valid email address.");
    setBusy(true); setErr("");
    try { const r = await api.sendCode(v, "signin"); setEmail(v); setSentTo(r.to || v); setCode(""); setStep("code"); }
    catch (x) {
      const ex = x as ApiError;
      setErr(ex.code === "no_account" ? <>There’s no Melo account for {v} yet. <Link className="su-a" to={`/signup?email=${encodeURIComponent(v)}`}>Create one with this email</Link></> : ex.message);
    } finally { setBusy(false); }
  };
  const verify = async (c = code) => {
    if (c.length < 6) return setErr("Enter all 6 digits.");
    if (busy) return;
    setBusy(true); setErr("");
    try { await api.verifyCode(email, c, "signin"); navigate(next, { replace: true }); }
    catch (x) { setErr((x as Error).message); setCode(""); setBusy(false); }
  };
  const resend = async () => {
    setErr("");
    try { await api.sendCode(email, "signin"); setResent((n) => n + 1); setCode(""); }
    catch (x) { setErr((x as Error).message); }
  };

  if (step === "email") return (
    <AuthShell stepKey="email" grad="blue" preview={<><InboxPreview /><Msg h="Welcome back" p="Your mail, channels and workspace rules are right where you left them." /></>}>
      <Title h="Sign in to Melo" p="Enter your work email or your @melo.to address. We’ll email you a 6-digit code — no password needed." />
      <form className="su-content" style={{ width: "100%", gap: 20 }} noValidate onSubmit={send}>
        <div className="su-f"><label htmlFor="si-email">Email</label>
          <div className={`su-in${err ? " bad" : ""}`}><input id="si-email" type="email" autoComplete="email" placeholder="you@company.com" value={email} autoFocus onChange={(e) => { setEmail((e.target as HTMLInputElement).value); setErr(""); }} /></div></div>
        <Err msg={err} />
        <button className="su-btn dark" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a code"}</button>
      </form>
      <p className="su-meta">New to Melo? <Link className="su-a" to="/signup">Create an account</Link></p>
      <p className="su-meta small">Signed up with a free @melo.to address? Enter it here and we’ll send the code to the email you used to create it.</p>
    </AuthShell>
  );
  return (
    <AuthShell stepKey="code" grad="purple" preview={<>
      <div className="pv-card pv-code"><div className="env"><Icon name="mail" className="icon" /></div><h5>Your sign-in code is on its way</h5><div className="num" style={{ fontSize: 18, letterSpacing: 0 }}>{sentTo}</div><small>From Melo · usually within a minute</small></div>
      <Msg h="No passwords" p="Every sign-in uses a fresh code, so there’s nothing to remember or leak." /></>}>
      <Title h="Check your email" p={<>We sent a 6-digit code to <b>{sentTo}</b>. It expires in 10 minutes.</>} />
      <form className="su-content" style={{ width: "100%", gap: 20 }} noValidate onSubmit={(e) => { e.preventDefault(); verify(); }}>
        <CodeBoxes value={code} onChange={(v) => { setCode(v); setErr(""); }} onComplete={verify} bad={Boolean(err)} />
        <div className="su-row"><span className="su-chip"><Icon name="clock" className="icon" />Code expires in <span ref={timer}>10:00</span></span>
          <button type="button" className="su-a" style={{ fontSize: 12 }} onClick={() => { setStep("email"); setErr(""); }}>Use a different email</button></div>
        <Err msg={err} />
        <button className="su-btn dark" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="su-meta">Didn’t get it? <button type="button" className="su-a" onClick={resend}>{resent ? "Code sent again" : "Resend code"}</button> · Check your spam folder too.</p>
    </AuthShell>
  );
}
const safeNext = (n: string | null) => (n && /^\/app(\/|$)/.test(n) ? n : "/app");
