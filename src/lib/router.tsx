/* A small typed router over the History API — clean URLs like /app/team/general, no .html. */
import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());
if (typeof window !== "undefined") window.addEventListener("popstate", emit);

export function navigate(to: string, opts: { replace?: boolean; scroll?: boolean } = {}) {
  if (to === location.pathname + location.search + location.hash) return;
  history[opts.replace ? "replaceState" : "pushState"](null, "", to);
  if (opts.scroll !== false && !to.includes("#")) window.scrollTo(0, 0);
  emit();
}
const subscribe = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };
const snapshot = () => location.pathname + location.search;

export interface Location { path: string; query: URLSearchParams; parts: string[] }
export function useLocation(): Location {
  const full = useSyncExternalStore(subscribe, snapshot);
  const [p, s = ""] = full.split("?");
  const path = p.replace(/\/+$/, "") || "/";
  return { path, query: new URLSearchParams(s), parts: path.split("/").filter(Boolean).map(decodeURIComponent) };
}

/* <Link> renders a real <a href> (so open-in-new-tab works) and routes in place on a plain click. */
export function Link({ to, className, children, onClick, title, ...rest }: { to: string; className?: string; children?: ReactNode; onClick?: () => void; title?: string; [k: `aria-${string}`]: string | boolean | undefined }) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.();
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || /^https?:/.test(to)) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} className={className} onClick={go} title={title} {...rest}>{children}</a>;
}
