/* Personal ⇄ Business switch shown on both landing pages */
import { useEffect, useState, type MouseEvent } from "react";
import { navigate } from "../lib/router";
import { businessHome, personalHome } from "../lib/site";
import { cx } from "../lib/util";

/* The other site's header mounts in place of this one, so remember where the pill was and slide it across */
let last: "personal" | "business" | null = null;
export function SiteToggle({ current, className, dark }: { current: "personal" | "business"; className?: string; dark?: boolean }) {
  const [pos, setPos] = useState(last ?? current);
  useEffect(() => { const r = requestAnimationFrame(() => setPos(current)); last = current; return () => cancelAnimationFrame(r); }, [current]);
  const go = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (href.startsWith("/") && !e.metaKey && !e.ctrlKey) { e.preventDefault(); navigate(href); }
  };
  const item = (key: "personal" | "business", label: string, href: string) => (
    <a href={href} onClick={go(href)} aria-current={current === key ? "page" : undefined}
      className={cx("relative z-[1] flex h-7 items-center justify-center rounded-full px-3 text-[13px] font-medium transition-colors duration-200",
        current === key ? "text-ink" : dark ? "text-ink-2 hover:text-ink" : "text-ink-2 hover:text-ink")}>{label}</a>
  );
  return (
    <div role="group" aria-label="Choose Melo for you or your business" className={cx("site-toggle relative grid shrink-0 grid-cols-2 rounded-full p-0.5", dark ? "bg-black/10" : "bg-black/[.06]", className)}>
      <span aria-hidden="true" className={cx("absolute inset-y-0.5 w-[calc(50%-2px)] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.12)] transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]", pos === "business" ? "translate-x-full" : "translate-x-0")} style={{ left: 2 }} />
      {item("personal", "Personal", personalHome())}
      {item("business", "Business", businessHome())}
    </div>
  );
}
