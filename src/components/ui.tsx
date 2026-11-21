/* Melo UI kit — mirrors the Figma components (Button size M, pill inputs, toggles, tags, avatars). */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./icons";
import { avatarColors, cx, initials } from "../lib/util";

/* ---- Motion helpers ---- */
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ENTER = /\banimate-(fade-up|fade-in|pop|rise|tick|sheet-in)\b/g;

/* When a floating element unmounts, leave a short-lived, inert copy behind that animates out.
   Children marked data-exit="pop-out" (etc.) get that exit animation; the root fades by default. */
export function useExitGhost(ref: RefObject<HTMLElement | null>, rootExit = "fade-out") {
  useLayoutEffect(() => {
    const node = ref.current;
    return () => {
      if (!node || !node.isConnected || reduced()) return;
      const r = node.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const ghost = node.cloneNode(true) as HTMLElement;
      /* Clones lose live field state; copy it so the fading copy matches what was on screen */
      const live = node.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea");
      ghost.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea").forEach((el, i) => {
        const src = live[i]; if (!src) return;
        if (el instanceof HTMLSelectElement && src instanceof HTMLSelectElement) el.selectedIndex = src.selectedIndex;
        else if (el instanceof HTMLInputElement && src instanceof HTMLInputElement && (src.type === "checkbox" || src.type === "radio")) el.checked = src.checked;
        else el.value = src.value;
      });
      ghost.querySelectorAll<HTMLElement>("[class*='animate-']").forEach((el) => { el.className = el.className.replace(ENTER, ""); });
      ghost.querySelectorAll<HTMLElement>("[data-exit]").forEach((el) => { el.className = `${el.className.replace(ENTER, "")} animate-${el.dataset.exit}`; });
      ghost.className = ghost.className.replace(ENTER, "");
      Object.assign(ghost.style, { position: "absolute", inset: "0", margin: "0", width: "100%", height: "100%", transform: "none", left: "0", top: "0" });
      const wrap = document.createElement("div");
      wrap.className = `melo-app animate-${rootExit}`;
      wrap.setAttribute("aria-hidden", "true");
      Object.assign(wrap.style, { position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, zIndex: "70", pointerEvents: "none" });
      wrap.appendChild(ghost);
      document.body.appendChild(wrap);
      setTimeout(() => wrap.remove(), 220);
    };
  }, [ref, rootExit]);
}

/* Keeps something mounted for the length of its exit animation */
export function usePresence(open: boolean, ms = 200) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    const t = setTimeout(() => setMounted(false), reduced() ? 0 : ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return { mounted: open || mounted, leaving: !open && mounted };
}

type BtnVariant = "dark" | "soft" | "line" | "ghost" | "danger" | "accent";
const BTN: Record<BtnVariant, string> = {
  dark: "bg-inverse text-white hover:bg-[#333] disabled:bg-[#9a9a9a]",
  soft: "bg-hover text-ink hover:bg-active",
  line: "bg-white text-ink shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:bg-subtle",
  ghost: "text-ink hover:bg-hover",
  danger: "bg-bad-soft text-bad hover:bg-[#fbdad6]",
  accent: "bg-accent text-[var(--color-accent-on,#fff)] hover:brightness-95",
};
export function Button({ variant = "dark", size = "m", icon, children, className, busy, ...rest }: {
  variant?: BtnVariant; size?: "s" | "m" | "l"; icon?: IconName; children?: ReactNode; className?: string; busy?: boolean;
  type?: "button" | "submit"; disabled?: boolean; onClick?: () => void; title?: string; "aria-label"?: string; "aria-pressed"?: boolean;
}) {
  const sz = size === "s" ? "h-7 px-2.5 text-[13px] gap-1.5" : size === "l" ? "h-11 px-5 text-[15px] gap-2" : "h-8 px-3 text-sm gap-1.5";
  return (
    <button type="button" {...rest} disabled={rest.disabled || busy}
      className={cx("inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap active:scale-[.97] disabled:cursor-default disabled:active:scale-100", sz, BTN[variant], className)}>
      {busy ? <span className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : icon && <Icon name={icon} className="size-4" />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, onClick, className, active }: { icon: IconName; label: string; onClick?: () => void; className?: string; active?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className={cx("inline-flex size-8 items-center justify-center rounded-full text-icon hover:bg-hover active:scale-90", active && "bg-active", className)}>
      <Icon name={icon} />
    </button>
  );
}

export function Field({ label, hint, error, children, className }: { label?: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      {label && <span className="text-[13px] font-medium text-ink">{label}</span>}
      {children}
      {error ? <span className="text-xs text-bad" role="alert">{error}</span> : hint && <span className="text-xs text-ink-3">{hint}</span>}
    </label>
  );
}
const inputCls = "h-9 w-full rounded-full border border-line bg-white px-3.5 text-sm outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(27,135,245,.15)] disabled:bg-subtle";
export function Input(props: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoFocus?: boolean; disabled?: boolean; className?: string; onEnter?: () => void; maxLength?: number; "aria-label"?: string; autoComplete?: string }) {
  const { value, onChange, onEnter, className, ...rest } = props;
  return <input {...rest} value={value} className={cx(inputCls, className)} onChange={(e) => onChange((e.target as HTMLInputElement).value)}
    onKeyDown={(e) => { if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); } }} />;
}
export function TextArea({ value, onChange, placeholder, rows = 4, className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string; autoFocus?: boolean }) {
  return <textarea value={value} rows={rows} placeholder={placeholder} autoFocus={autoFocus} onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
    className={cx("w-full resize-none rounded-2xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(27,135,245,.15)]", className)} />;
}
export function Select<T extends string>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; label?: string }) {
  return (
    <span className={cx("relative inline-flex", className)}>
      <select aria-label={label} value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value as T)}
        className="h-8 w-full appearance-none rounded-full bg-hover pl-3 pr-8 text-sm font-medium outline-none transition hover:bg-active focus:shadow-[0_0_0_3px_rgba(27,135,245,.15)]">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chev-down" className="pointer-events-none absolute right-2.5 top-2 size-4 text-icon-2" />
    </span>
  );
}

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={cx("relative h-5 w-8 shrink-0 rounded-full transition-colors disabled:opacity-50", on ? "bg-accent" : "bg-line-2")}>
      <span className={cx("absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-[left,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] active:scale-x-110", on ? "left-[14px]" : "left-0.5")} />
    </button>
  );
}

export function Avatar({ name, id, size = 28, className, dark, soft }: { name: string | null | undefined; id?: string | null; size?: number; className?: string; dark?: boolean; soft?: boolean }) {
  const [bg, fg] = soft ? ["#e8eaed", "#444746"] : avatarColors(id ?? name);
  return (
    <span className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none", className)}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.36)), background: dark ? "#1f1f1f" : bg, color: dark ? "#fff" : fg }}>
      {initials(name)}
    </span>
  );
}

const TAG_TONES: Record<string, string> = {
  blue: "bg-[#dceeff] text-tag-blue", green: "bg-[#ddf3e4] text-tag-green", purple: "bg-[#eae4ff] text-tag-purple",
  orange: "bg-[#fde8d4] text-tag-orange", pink: "bg-[#fce2ef] text-tag-pink", gray: "bg-hover text-ink-2",
  ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", dark: "bg-inverse text-white",
};
export function Tag({ tone = "gray", children, dot, icon, className }: { tone?: keyof typeof TAG_TONES; children: ReactNode; dot?: string; icon?: IconName; className?: string }) {
  return (
    <span className={cx("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium", TAG_TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full" style={{ background: dot }} />}
      {icon && <Icon name={icon} className="size-3" />}
      {children}
    </span>
  );
}

export function Spinner({ className, delay }: { className?: string; delay?: boolean }) {
  const spin = <span role="status" aria-label="Loading" className={cx("inline-block size-4 rounded-full border-2 border-line-2 border-t-accent animate-spin", className)} />;
  return delay ? <span className="animate-[fade-in_.3s_ease-out_.35s_both]">{spin}</span> : spin;
}
export function Skeleton({ className }: { className?: string }) {
  return <span className={cx("block animate-pulse rounded-xl bg-hover", className)} />;
}

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center animate-fade-up">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-hover text-icon"><Icon name={icon} className="size-5" /></span>
      <h3 className="text-[17px] font-medium">{title}</h3>
      {body && <p className="max-w-sm text-sm text-ink-3">{body}</p>}
      {action}
    </div>
  );
}

/* Modal dialog with focus on open and Escape to close */
export function Modal({ open, onClose, title, children, footer, width = 480 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>("input,textarea,select,button:not([data-close])")?.focus(), 30);
    const key = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { clearTimeout(t); window.removeEventListener("keydown", key); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(<ModalBody onClose={onClose} title={title} footer={footer} width={width} dialogRef={ref}>{children}</ModalBody>, document.body);
}
function ModalBody({ onClose, title, children, footer, width, dialogRef }: { onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width: number; dialogRef: RefObject<HTMLDivElement | null> }) {
  const root = useRef<HTMLDivElement>(null);
  useExitGhost(root);
  return (
    <div ref={root} className="melo-app fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-3 animate-fade-in sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} data-exit="pop-out" role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[90vh] w-full flex-col rounded-3xl bg-white shadow-modal animate-pop" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[17px] font-medium">{title}</h2>
          <button data-close type="button" aria-label="Close" onClick={onClose} className="flex size-8 items-center justify-center rounded-full text-icon hover:bg-hover active:scale-90"><Icon name="x" /></button>
        </div>
        <div className="melo-scroll overflow-y-auto px-6 pb-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/* Popover menu anchored to its trigger */
export function Menu({ trigger, items, align = "right", up }: { trigger: (open: () => void) => ReactNode; items: { label: string; icon?: IconName; danger?: boolean; onSelect: () => void; disabled?: boolean }[]; align?: "left" | "right"; up?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); window.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-flex">
      {trigger(() => setOpen((o) => !o))}
      {open && <MenuList items={items} align={align} up={up} close={() => setOpen(false)} />}
    </div>
  );
}
function MenuList({ items, align, close, up }: { items: { label: string; icon?: IconName; danger?: boolean; onSelect: () => void; disabled?: boolean }[]; align: "left" | "right"; close: () => void; up?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useExitGhost(ref, "pop-out");
  return (
    <div ref={ref} role="menu" className={cx("absolute z-50 min-w-[180px] rounded-2xl bg-white p-1.5 shadow-pop animate-pop", up ? "bottom-full mb-1" : "top-full mt-1", align === "right" ? (up ? "right-0 origin-bottom-right" : "right-0 origin-top-right") : (up ? "left-0 origin-bottom-left" : "left-0 origin-top-left"))}>
      {items.map((it) => (
        <button key={it.label} role="menuitem" type="button" disabled={it.disabled} onClick={() => { close(); it.onSelect(); }}
          className={cx("flex h-8 w-full items-center gap-2 whitespace-nowrap rounded-xl px-2.5 text-left text-sm hover:bg-hover disabled:opacity-40", it.danger && "text-bad hover:bg-bad-soft")}>
          {it.icon && <Icon name={it.icon} />}{it.label}
        </button>
      ))}
    </div>
  );
}

/* Toasts */
interface ToastItem { id: number; text: string; tone: "ok" | "bad" | "info"; leaving?: boolean }
const ToastCtx = createContext<(text: string, tone?: ToastItem["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: ToastItem["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.filter((t) => t.text !== text).slice(-2), { id, text, tone }]);
    const life = tone === "bad" ? 6000 : 3200;
    setTimeout(() => setItems((x) => x.map((t) => (t.id === id ? { ...t, leaving: true } : t))), life);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), life + 200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      <ConfirmProvider>{children}</ConfirmProvider>
      <div aria-live="polite" className="melo-app pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {items.map((t) => (
          <div key={t.id} className={cx("pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-pop", t.leaving ? "animate-sink" : "animate-fade-up", t.tone === "bad" ? "bg-bad text-white" : "bg-inverse text-white")}>
            <Icon name={t.tone === "bad" ? "x" : t.tone === "info" ? "sparkle" : "check"} className="size-4" />{t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* Data loading with cancellation and manual refresh */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    load().then((data) => live && setState({ data, loading: false }), (e: Error) => live && setState((s) => ({ ...s, error: e.message, loading: false })));
    return () => { live = false; };
  }, [...deps, n]); // eslint-disable-line
  const reload = useCallback(() => setN((x) => x + 1), []);
  const set = useCallback((fn: (d: T | undefined) => T) => setState((s) => ({ ...s, data: fn(s.data) })), []);
  return { ...state, reload, set };
}

/* A calm, in-app confirm (replaces the browser's blocking confirm()) */
interface ConfirmOpts { title: string; body?: ReactNode; confirm?: string; danger?: boolean }
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);
function ConfirmProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const ask = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setReq({ ...o, resolve })), []);
  const done = (v: boolean) => { req?.resolve(v); setReq(null); };
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal open={!!req} onClose={() => done(false)} title={req?.title ?? ""} width={400}
          footer={<><Button variant="ghost" onClick={() => done(false)}>Cancel</Button><Button variant={req?.danger ? "danger" : "dark"} onClick={() => done(true)}>{req?.confirm ?? "Confirm"}</Button></>}>
          {req?.body && <p className="text-sm text-ink-2">{req.body}</p>}
      </Modal>
    </ConfirmCtx.Provider>
  );
}

/* Mobile slide-over sheet (used for section menus on phones) */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const { mounted, leaving } = usePresence(open, 200);
  useEffect(() => {
    if (!open) return;
    const key = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className="melo-app fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={label}>
      <div className={cx("absolute inset-0 bg-black/25", leaving ? "animate-fade-out" : "animate-fade-in")} onClick={onClose} />
      <div className={cx("melo-scroll absolute inset-y-0 left-0 flex w-[min(300px,86vw)] flex-col overflow-y-auto bg-app px-3 py-4 shadow-modal", leaving ? "animate-sheet-out" : "animate-sheet-in")}>{children}</div>
    </div>, document.body);
}
