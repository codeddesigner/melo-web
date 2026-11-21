/* Shared two-column layout for sign-in and onboarding (Figma: form on the left, gradient preview on the right). */
import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "../lib/router";
import { onPersonalHost } from "../lib/site";
import { Icon, MeloMark } from "../components/icons";

export const GRAD = {
  blue: "linear-gradient(180deg,#1b87f5 0%,#6fb2f8 55%,#f4f9ff 100%)",
  purple: "linear-gradient(180deg,#7b68ee 0%,#ad9ff4 55%,#f4f4ff 100%)",
  teal: "linear-gradient(180deg,#14a3a0 0%,#72c8c6 55%,#f4f9ff 100%)",
  orange: "linear-gradient(180deg,#f07c1e 0%,#f5ad74 55%,#fff7f0 100%)",
  pink: "linear-gradient(180deg,#e2468b 0%,#ee8fb7 55%,#fff4f8 100%)",
  green: "linear-gradient(180deg,#2ea44f 0%,#86cf97 55%,#f3fbf5 100%)",
};
export type Grad = keyof typeof GRAD;

export function AuthShell({ step, grad, preview, children, stepKey }: { step?: string; grad: Grad; preview: ReactNode; children: ReactNode; stepKey: string }) {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = stage.current; if (!el) return; el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; }, [stepKey]);
  return (
    <div className="su">
      <div className="su-shell">
        <main className="su-form">
          <div className="su-head">{onPersonalHost() ? <Link to="/" aria-label="Melo home"><img src="/logo-mail.svg" alt="Melo Mail" width={110} height={24} /></Link> : <Link to="/" aria-label="Melo business home"><img src="/logo.svg" alt="Melo business" width={140} height={28} /></Link>}<span className="sp" /><span className="su-step" aria-live="polite">{step}</span></div>
          <div className="su-grow" />
          <div className="su-content" key={stepKey}>{children}</div>
          <div className="su-grow" />
          <p className="su-foot">© 2026 Melo · <Link to="/faq">Help</Link></p>
        </main>
        <aside className="su-prev" aria-hidden="true">
          <div className="su-grad" style={{ background: GRAD[grad] }} />
          <Link to="/faq" className="su-help"><Icon name="comment" className="icon" />Questions? Chat with us</Link>
          <div className="su-stage" ref={stage}>{preview}</div>
        </aside>
      </div>
    </div>
  );
}

export const Title = ({ h, p }: { h: ReactNode; p?: ReactNode }) => <div className="su-title"><h1>{h}</h1>{p && <p>{p}</p>}</div>;
export const Err = ({ msg }: { msg?: ReactNode }) => <p className="su-err" role="alert">{msg}</p>;
export const Msg = ({ h, p }: { h: ReactNode; p: ReactNode }) => <div className="pv-msg"><h4>{h}</h4><p>{p}</p></div>;
export const Mark = () => <MeloMark className="w-[15px] h-[10px]" />;

export function InboxPreview() {
  const rows: [string, string, string, string, string, string, boolean][] = [
    ["MK", "#f07c1e", "Maya Kim", "Q4 brand refresh", "Moodboard v2 is up…", "9:12 AM", true],
    ["TB", "#13a39f", "Tom Becker", "New workspace rule", "Turning this on Monday…", "8:40 AM", true],
    ["JL", "#6b4fe0", "Jonas Lind", "Dashboard handoff", "Final Figma link…", "Yesterday", false],
  ];
  return (
    <div className="pv-card pv-rows">
      {rows.map(([i, c, f, s, pre, t, unread]) => (
        <div key={f} className={`pv-row${unread ? "" : " read"}`}><span className={`dot${unread ? "" : " off"}`} /><span className="av" style={{ background: c }}>{i}</span><span className="from">{f}</span><span className="sub">{s}</span><span className="pre">{pre}</span><span className="t">{t}</span></div>
      ))}
    </div>
  );
}

/* Six code boxes with paste, auto-advance and auto-submit */
export function CodeBoxes({ value, onChange, onComplete, bad }: { value: string; onChange: (v: string) => void; onComplete: (v: string) => void; bad?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { if (window.matchMedia("(min-width: 901px)").matches) setTimeout(() => refs.current[Math.min(value.length, 5)]?.focus(), 40); }, []); // eslint-disable-line
  const set = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 6); onChange(d); if (d.length === 6) onComplete(d); };
  return (
    <div className={`su-code${bad ? " bad" : ""}`} role="group" aria-label="6-digit code">
      {Array.from({ length: 6 }, (_, i) => (
        <input key={i} ref={(el: HTMLInputElement | null) => { refs.current[i] = el; }} inputMode="numeric" maxLength={i ? 1 : 6} aria-label={`Digit ${i + 1}`} autoComplete={i ? "off" : "one-time-code"} value={value[i] ?? ""}
          onChange={(e) => {
            const c = (e.target as HTMLInputElement).value.replace(/\D/g, "");
            if (c.length > 1) { set(c); refs.current[Math.min(c.length, 5)]?.focus(); return; }
            const next = (value.slice(0, i) + c + value.slice(i + 1)).slice(0, 6);
            set(next); if (c && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => { if (e.key === "Backspace" && !value[i] && i > 0) { refs.current[i - 1]?.focus(); onChange(value.slice(0, i - 1)); } }}
          onPaste={(e) => { const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6); if (!d) return; e.preventDefault(); set(d); refs.current[Math.min(d.length, 5)]?.focus(); }} />
      ))}
    </div>
  );
}

export function useCountdown(seconds: number, key: unknown) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let left = seconds;
    const paint = () => { if (ref.current) ref.current.textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`; };
    paint();
    const t = setInterval(() => { left = Math.max(0, left - 1); paint(); }, 1000);
    return () => clearInterval(t);
  }, [key, seconds]);
  return ref;
}
