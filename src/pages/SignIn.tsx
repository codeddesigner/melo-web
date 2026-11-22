import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "../lib/api";
import { personalSignup } from "../lib/site";
import { Link, navigate, useLocation } from "../lib/router";
import { useSession } from "../lib/session";
import { isEmail } from "../lib/util";
import { Icon } from "../components/icons";
import { AuthShell, CodeBoxes, Err, InboxPreview, Msg, Title, useCountdown } from "./AuthShell";

/* Sign in.
   - Work/personal email → 6-digit code by email.
   - @melo.to address made without another email → password (with reset via recovery email). */
type Step = "email" | "code" | "password" | "reset";
const looksMelo = (v: string) => /@melo\.to$/.test(v) || (!v.includes("@") && /^[a-z0-9.]{3,30}$/.test(v));

export default function SignIn() {
  const session = useSession();
  const { query } = useLocation();
  const next = safeNext(query.get("next"));
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(query.get("email") ?? "");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<ReactNode>("");
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(0);
  const timer = useCountdown(600, `${sentTo}${resent}`);

  useEffect(() => { document.title = step === "password" ? "Enter your password — Melo" : step === "email" ? "Sign in — Melo" : "Check your email — Melo"; }, [step]);
  useEffect(() => { if (session && step === "email") navigate(next, { replace: true }); }, [session]); // eslint-disable-line

  const noAccount = (v: string) => <>There’s no Melo account for {v} yet. <Link className="su-a" to={looksMelo(v) ? personalSignup() : `/signup?email=${encodeURIComponent(v)}`}>{looksMelo(v) ? "Create a Melo address" : "Create one with this email"}</Link></>;

  const sendCode = async (v: string) => {
    const r = await api.sendCode(v, "signin"); setEmail(v); setSentTo(r.to || v); setCode(""); setStep("code");
  };
  const submitEmail = async (e?: FormEvent) => {
    e?.preventDefault();
    let v = email.trim().toLowerCase();
    if (looksMelo(v) && !v.includes("@")) v = `${v}@melo.to`;
    if (!isEmail(v)) return setErr("Enter your email or @melo.to address.");
    setBusy(true); setErr("");
    try {
      if (v.endsWith("@melo.to")) {
        const m = await api.signinMethod(v);
        if (m.method === "password") { setEmail(v); setPw(""); setStep("password"); return; }
      }
      await sendCode(v);
    } catch (x) {
      const ex = x as ApiError;
      setErr(ex.code === "no_account" ? noAccount(v) : ex.message);
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
  const signInPw = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!pw) return setErr("Enter your password.");
    setBusy(true); setErr("");
    try { await api.passwordSignIn(email, pw); navigate(next, { replace: true }); }
    catch (x) { setErr((x as Error).message); setBusy(false); }
  };
  const forgot = async () => {
    setBusy(true); setErr("");
    try { const r = await api.resetSend(email); setSentTo(r.to); setCode(""); setPw(""); setStep("reset"); }
    catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  const reset = async (e?: FormEvent) => {
    e?.preventDefault();
    if (code.length < 6) return setErr("Enter the 6-digit code.");
    if (pw.length < 8) return setErr("Use at least 8 characters for your new password.");
    setBusy(true); setErr("");
    try { await api.resetVerify(email, code, pw); navigate(next, { replace: true }); }
    catch (x) { setErr((x as Error).message); setBusy(false); }
  };
  const back = () => { setStep("email"); setErr(""); setPw(""); setCode(""); };

  if (step === "email") return (
    <AuthShell stepKey="email" grad="blue" preview={<><InboxPreview /><Msg h="Welcome back" p="Your mail, channels and workspace rules are right where you left them." /></>}>
      <Title h="Sign in to Melo" p="Enter your @melo.to address or the email you signed up with." />
      <form className="su-content" style={{ width: "100%", gap: 20 }} noValidate onSubmit={submitEmail}>
        <div className="su-f"><label htmlFor="si-email">Email or Melo address</label>
          <div className={`su-in${err ? " bad" : ""}`}><input id="si-email" type="text" inputMode="email" autoComplete="username" autoCapitalize="off" spellCheck={false} placeholder="you@melo.to or you@company.com" value={email} autoFocus onChange={(e) => { setEmail((e.target as HTMLInputElement).value); setErr(""); }} /></div></div>
        <Err msg={err} />
        <button className="su-btn dark" type="submit" disabled={busy}>{busy ? "Checking…" : "Continue"}</button>
      </form>
      <p className="su-meta">New to Melo? <Link className="su-a" to="/signup">Create an account</Link> · <Link className="su-a" to={personalSignup()}>Get a free @melo.to address</Link></p>
    </AuthShell>
  );

  if (step === "password") return (
    <AuthShell stepKey="password" grad="blue" preview={<><InboxPreview /><Msg h="Your Melo Mail" p="Everything sent to your @melo.to address lands in your Melo inbox." /></>}>
      <Title h="Enter your password" p={<>Signing in as <b>{email}</b></>} />
      <form className="su-content" style={{ width: "100%", gap: 20 }} noValidate onSubmit={signInPw}>
        <input type="text" autoComplete="username" value={email} readOnly hidden />
        <div className="su-f"><label htmlFor="si-pw">Password</label>
          <div className={`su-in${err ? " bad" : ""}`}><input id="si-pw" type={show ? "text" : "password"} autoComplete="current-password" value={pw} autoFocus onChange={(e) => { setPw((e.target as HTMLInputElement).value); setErr(""); }} />
            <button type="button" className="su-a" style={{ fontSize: 12, flex: "none" }} onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button></div></div>
        <Err msg={err} />
        <button className="su-btn dark" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="su-meta"><button type="button" className="su-a" onClick={forgot} disabled={busy}>Forgot password?</button> · <button type="button" className="su-a" onClick={back}>Use a different account</button></p>
    </AuthShell>
  );

  if (step === "reset") return (
    <AuthShell stepKey="reset" grad="purple" preview={<><div className="pv-card pv-code"><div className="env"><Icon name="mail" className="icon" /></div><h5>Your reset code is on its way</h5><div className="num" style={{ fontSize: 18, letterSpacing: 0 }}>{sentTo}</div><small>Sent to your recovery email</small></div></>}>
      <Title h="Reset your password" p={<>We sent a 6-digit code to your recovery email <b>{sentTo}</b>. Enter it with a new password for <b>{email}</b>.</>} />
      <form className="su-content" style={{ width: "100%", gap: 20 }} noValidate onSubmit={reset}>
        <CodeBoxes value={code} onChange={(v) => { setCode(v); setErr(""); }} onComplete={() => document.getElementById("si-new")?.focus()} bad={Boolean(err)} />
        <div className="su-f"><label htmlFor="si-new">New password</label>
          <div className="su-in"><input id="si-new" type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => { setPw((e.target as HTMLInputElement).value); setErr(""); }} placeholder="At least 8 characters" />
            <button type="button" className="su-a" style={{ fontSize: 12, flex: "none" }} onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button></div></div>
        <Err msg={err} />
        <button className="su-btn dark" type="submit" disabled={busy}>{busy ? "Saving…" : "Save password and sign in"}</button>
      </form>
      <p className="su-meta"><button type="button" className="su-a" onClick={() => { setStep("password"); setErr(""); setPw(""); }}>Back</button></p>
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
          <button type="button" className="su-a" style={{ fontSize: 12 }} onClick={back}>Use a different email</button></div>
        <Err msg={err} />
        <button className="su-btn dark" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="su-meta">Didn’t get it? <button type="button" className="su-a" onClick={resend}>{resent ? "Code sent again" : "Resend code"}</button> · Check your spam folder too.</p>
    </AuthShell>
  );
}
const safeNext = (n: string | null) => (n && /^\/app(\/|$)/.test(n) ? n : "/app");
