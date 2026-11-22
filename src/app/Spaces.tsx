/* Your spaces: Personal (your @melo.to mail) and each business workspace. One tap between them, with what's unread in each. */
import { useEffect, useRef, useState } from "react";
import type { WorkspaceSummary } from "../lib/api";
import { navigate } from "../lib/router";
import { cx } from "../lib/util";
import { Icon, MeloMark } from "../components/icons";
import { appLock, appUrl } from "../lib/site";
import { useApp } from "./context";

export function SpaceTile({ ws, size = 34 }: { ws: WorkspaceSummary; size?: number }) {
  const personal = ws.kind === "personal";
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size * 0.3 }}
      className={cx("flex shrink-0 items-center justify-center font-semibold", personal ? "bg-[#f1e289] text-[#2b2600]" : "bg-inverse text-white")}>
      {personal ? <MeloMark className="h-[11px] w-[17px]" /> : <span style={{ fontSize: size * 0.42 }}>{(ws.name.trim()[0] ?? "M").toUpperCase()}</span>}
    </span>
  );
}

const spaceName = (w: WorkspaceSummary) => (w.kind === "personal" ? "Personal" : w.name);

/* The list itself: used in the rail popover and in Mail's sidebar (which is the phone menu too) */
export function SpaceList({ compact, onPick }: { compact?: boolean; onPick?: () => void }) {
  const { account, ws, inboxes, switchWorkspace } = useApp();
  const addr = account.profile?.melo_address ? `${account.profile.melo_address}@melo.to` : null;
  const lock = appLock();
  const spaces = [...account.workspaces].filter((w) => !lock || w.kind === lock).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "personal" ? -1 : 1));
  const hasPersonal = account.workspaces.some((w) => w.kind === "personal");
  const sub = (w: WorkspaceSummary) => (w.kind === "personal" ? addr ?? "Personal mail" : w.domain ? `@${w.domain}` : "Business workspace");
  return (
    <div className="flex flex-col gap-0.5">
      {spaces.map((w) => {
        const on = w.id === ws.id, n = inboxes[w.id] ?? 0;
        return (
          <button key={w.id} type="button" aria-current={on ? "true" : undefined} onClick={() => { onPick?.(); if (!on) switchWorkspace(w.id); }}
            className={cx("flex w-full items-center gap-2.5 rounded-xl px-2 text-left active:scale-[.98]", compact ? "h-11" : "h-12", on ? "bg-active" : "hover:bg-hover")}>
            <SpaceTile ws={w} size={compact ? 26 : 30} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className={cx("block truncate text-[13px]", on ? "font-semibold" : "font-medium")}>{spaceName(w)}</span>
              <span className="block truncate text-[11px] text-ink-3">{sub(w)}</span>
            </span>
            {n > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-[var(--color-accent-on,#fff)]" aria-label={`${n} unread`}>{n > 99 ? "99+" : n}</span>}
            {on && <Icon name="check" className="size-4 text-ink-2" />}
          </button>
        );
      })}
      {lock && (
        /* The other Melo opens on its own site, signed in separately */
        <a href={appUrl(lock === "personal" ? "business" : "personal")} onClick={onPick} className={cx("flex w-full items-center gap-2.5 rounded-xl px-2 text-left hover:bg-hover", compact ? "h-11" : "h-12")}>
          <span className={cx("flex shrink-0 items-center justify-center rounded-lg", compact ? "size-[26px]" : "size-[30px]", lock === "personal" ? "bg-inverse text-white" : "bg-[#f1e289] text-[#2b2600]")}><MeloMark className="h-[10px] w-[15px]" /></span>
          <span className="min-w-0 flex-1 leading-tight"><span className="block truncate text-[13px] font-medium">{lock === "personal" ? "Melo Business" : "Melo Personal"}</span><span className="block truncate text-[11px] text-ink-3">{lock === "personal" ? "business.melo.to" : "melo.to"}</span></span>
          <Icon name="out" className="size-4 text-icon-2" />
        </a>
      )}
      {!lock && !hasPersonal && (
        <button type="button" onClick={() => { onPick?.(); navigate("/signup?start=personal"); /* only shown off the real domains */ }} className={cx("flex w-full items-center gap-2.5 rounded-xl px-2 text-left text-[13px] font-medium hover:bg-hover", compact ? "h-10" : "h-11")}>
          <span className="flex size-[26px] items-center justify-center rounded-lg border border-dashed border-line-2 text-icon"><Icon name="plus" className="size-3.5" /></span>
          Add personal mail
        </button>
      )}
    </div>
  );
}

/* Rail button: shows where you are; opens the switcher */
export function SpaceSwitcher() {
  const { ws, account, inboxes } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); window.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", key); };
  }, [open]);
  const lock = appLock();
  const elsewhere = account.workspaces.filter((w) => w.id !== ws.id && (!lock || w.kind === lock)).reduce((n, w) => n + (inboxes[w.id] ?? 0), 0);
  return (
    <div ref={ref} className="relative mb-4">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`${spaceName(ws)} — switch space`} title={spaceName(ws)} className="relative block transition hover:scale-105">
        <SpaceTile ws={ws} />
        {elsewhere > 0 && <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-app bg-accent" aria-label="Unread mail in another space" />}
      </button>
      {open && (
        <div role="dialog" aria-label="Switch space" className="absolute left-0 top-full z-50 mt-2 w-[290px] rounded-2xl bg-white p-2 shadow-pop animate-pop origin-top-left">
          <p className="px-2 pt-1 pb-2 text-[11px] font-medium text-ink-3">{appLock() === "business" ? "Your workspaces" : "Your spaces"}</p>
          <SpaceList onPick={() => setOpen(false)} />
          <div className="my-1.5 h-px bg-line" />
          {lock !== "personal" && <button type="button" onClick={() => { setOpen(false); navigate("/signup?resume=1"); }} className="flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] hover:bg-hover"><Icon name="plus" className="size-4 text-icon" />{lock ? "New workspace" : "Create a business workspace"}</button>}
          <button type="button" onClick={() => { setOpen(false); navigate("/"); }} className="flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] hover:bg-hover"><Icon name="globe" className="size-4 text-icon" />Melo website</button>
        </div>
      )}
    </div>
  );
}
