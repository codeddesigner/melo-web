/* Melo icon set (16px grid, 1.5 stroke) — same drawings as the Figma icon library. */
import type { ReactNode } from "react";

const P: Record<string, ReactNode> = {
  mail: <><rect x="1.75" y="3.25" width="12.5" height="9.5" rx="2" /><path d="M2.5 4.5 8 8.5l5.5-4" /></>,
  users: <><circle cx="6" cy="5.5" r="2.5" /><path d="M1.75 13.25c.4-2.3 2.1-3.5 4.25-3.5s3.85 1.2 4.25 3.5" /><path d="M10.5 3.2a2.4 2.4 0 0 1 0 4.6M12 9.9c1.3.4 2.1 1.5 2.3 3.35" /></>,
  task: <><circle cx="8" cy="8" r="6.25" /><path d="m5.6 8.1 1.6 1.6 3.3-3.4" /></>,
  calendar: <><rect x="2" y="3" width="12" height="11" rx="2" /><path d="M2 6.5h12M5.25 1.75v2.5M10.75 1.75v2.5" /></>,
  settings: <><circle cx="8" cy="8" r="2" /><path d="M8 1.75v1.5M8 12.75v1.5M14.25 8h-1.5M3.25 8h-1.5M12.4 3.6l-1.05 1.05M4.65 11.35 3.6 12.4M12.4 12.4l-1.05-1.05M4.65 4.65 3.6 3.6" /></>,
  plus: <path d="M8 3v10M3 8h10" />,
  search: <><circle cx="7.25" cy="7.25" r="4.5" /><path d="m10.6 10.6 3 3" /></>,
  inbox: <><path d="M2 9.5 3.6 3.9a1 1 0 0 1 1-.65h6.8a1 1 0 0 1 1 .65L14 9.5v3.25a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" /><path d="M2 9.5h3.25l.9 1.5h3.7l.9-1.5H14" /></>,
  clock: <><circle cx="8" cy="8" r="6.25" /><path d="M8 4.75V8l2.25 1.5" /></>,
  send: <path d="M14 2 7 9M14 2l-4.25 12-2.75-5-5-2.75z" />,
  doc: <><path d="M9.25 1.75H4.5a1.25 1.25 0 0 0-1.25 1.25v10a1.25 1.25 0 0 0 1.25 1.25h7a1.25 1.25 0 0 0 1.25-1.25V5.25z" /><path d="M9.25 1.75v3.5h3.5M5.75 8.5h4.5M5.75 11h4.5" /></>,
  archive: <><rect x="1.75" y="2.75" width="12.5" height="3" rx="1" /><path d="M2.75 5.75v6.5a1 1 0 0 0 1 1h8.5a1 1 0 0 0 1-1v-6.5M6.5 8.5h3" /></>,
  shield: <path d="M8 1.75 2.75 3.75v4c0 3.25 2.25 5.4 5.25 6.5 3-1.1 5.25-3.25 5.25-6.5v-4z" />,
  filter: <path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3" />,
  more: <><circle cx="3.5" cy="8" r=".75" fill="currentColor" /><circle cx="8" cy="8" r=".75" fill="currentColor" /><circle cx="12.5" cy="8" r=".75" fill="currentColor" /></>,
  sparkle: <path d="M7 2.5c.4 2.6 1.9 4.1 4.5 4.5-2.6.4-4.1 1.9-4.5 4.5-.4-2.6-1.9-4.1-4.5-4.5 2.6-.4 4.1-1.9 4.5-4.5zM12.25 9.75c.2 1.2.8 1.8 2 2-1.2.2-1.8.8-2 2-.2-1.2-.8-1.8-2-2 1.2-.2 1.8-.8 2-2z" />,
  clip: <path d="m13.25 7.25-5.6 5.6a3.2 3.2 0 0 1-4.5-4.5l5.6-5.6a2.1 2.1 0 0 1 3 3l-5.6 5.6a1.05 1.05 0 0 1-1.5-1.5l5.1-5.1" />,
  check: <path d="m3.25 8.25 3 3 6.5-6.5" />,
  x: <path d="m4 4 8 8M12 4l-8 8" />,
  "chev-down": <path d="m4.5 6.25 3.5 3.5 3.5-3.5" />,
  "chev-right": <path d="m6.25 4.5 3.5 3.5-3.5 3.5" />,
  "chev-left": <path d="m9.75 4.5-3.5 3.5 3.5 3.5" />,
  link: <><path d="M6.75 9.25a3 3 0 0 0 4.25 0l2-2a3 3 0 0 0-4.25-4.25l-.75.75" /><path d="M9.25 6.75a3 3 0 0 0-4.25 0l-2 2a3 3 0 0 0 4.25 4.25l.75-.75" /></>,
  lock: <><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.25 7V5a2.75 2.75 0 0 1 5.5 0v2" /></>,
  grid: <g fill="currentColor" stroke="none"><circle cx="4" cy="4" r="1" /><circle cx="8" cy="4" r="1" /><circle cx="12" cy="4" r="1" /><circle cx="4" cy="8" r="1" /><circle cx="8" cy="8" r="1" /><circle cx="12" cy="8" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="8" cy="12" r="1" /><circle cx="12" cy="12" r="1" /></g>,
  comment: <path d="M2.25 4a1.5 1.5 0 0 1 1.5-1.5h8.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H6.5l-3 2.5v-2.5h.25A1.5 1.5 0 0 1 2.25 10z" />,
  hash: <path d="M6.25 2 5 14M11 2 9.75 14M2.5 5.75h11M2.5 10.25h11" />,
  at: <><circle cx="8" cy="8" r="2.5" /><path d="M10.5 8v1a1.75 1.75 0 0 0 3.5 0V8a6 6 0 1 0-2.4 4.8" /></>,
  phone: <path d="M3.25 2h2.5l1.25 3-1.6 1a7.6 7.6 0 0 0 3.6 3.6l1-1.6 3 1.25v2.5a1.5 1.5 0 0 1-1.5 1.5A10.75 10.75 0 0 1 1.75 3.5 1.5 1.5 0 0 1 3.25 2" />,
  bell: <><path d="M4 11.5V7a4 4 0 0 1 8 0v4.5l1.25 1.25H2.75z" /><path d="M6.5 14a1.6 1.6 0 0 0 3 0" /></>,
  user: <><circle cx="8" cy="5.5" r="2.75" /><path d="M2.75 14c.5-2.75 2.6-4.25 5.25-4.25s4.75 1.5 5.25 4.25" /></>,
  bolt: <path d="M8.75 1.75 3.25 9h4.5l-.5 5.25L12.75 7h-4.5z" />,
  flag: <path d="M3.5 14V2.5M3.5 3h8.25l-1.5 3 1.5 3H3.5" />,
  trash: <path d="M2.75 4.25h10.5M6.25 4.25V2.75h3.5v1.5M4.25 4.25l.6 9a1 1 0 0 0 1 .95h4.3a1 1 0 0 0 1-.95l.6-9" />,
  copy: <><rect x="5.25" y="5.25" width="8.5" height="8.5" rx="1.5" /><path d="M10.75 5.25V3.75a1.5 1.5 0 0 0-1.5-1.5h-5.5a1.5 1.5 0 0 0-1.5 1.5v5.5a1.5 1.5 0 0 0 1.5 1.5h1.5" /></>,
  out: <><path d="M9.5 2.75h2.75a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H9.5" /><path d="M6.5 5 3.5 8l3 3M3.5 8h7" /></>,
  list: <path d="M5.5 4.25h8M5.5 8h8M5.5 11.75h8M2.5 4.25h.5M2.5 8h.5M2.5 11.75h.5" />,
  board: <><rect x="2" y="2.5" width="12" height="11" rx="1.5" /><path d="M6 2.5v11M10 2.5v11" /></>,
  globe: <><circle cx="8" cy="8" r="6.25" /><path d="M1.75 8h12.5M8 1.75c1.8 1.7 2.7 3.8 2.7 6.25S9.8 12.55 8 14.25C6.2 12.55 5.3 10.45 5.3 8S6.2 3.45 8 1.75" /></>,
  menu: <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />,
  smile: <><circle cx="8" cy="8" r="6.25" /><path d="M5.75 9.5a3 3 0 0 0 4.5 0M6 6.25h.01M10 6.25h.01" /></>,
  star: <path d="m8 1.9 1.85 3.9 4.15.55-3.05 2.9.8 4.15L8 11.35 4.25 13.4l.8-4.15L2 6.35l4.15-.55z" />,
  "eye-off": <path d="M2.5 2.5l11 11M6.6 4.05A6.6 6.6 0 0 1 8 3.9c3.25 0 5.4 2.6 6 4.1-.3.75-.95 1.75-1.9 2.6M10.2 10.9a5.7 5.7 0 0 1-2.2.45C4.75 11.35 2.6 8.75 2 7.25c.35-.9 1.05-1.95 2.05-2.8M6.6 6.6a1.8 1.8 0 0 0 2.6 2.55" />,
  refresh: <path d="M13.25 4.5v3h-3M2.75 11.5v-3h3M12.6 7.5A4.75 4.75 0 0 0 4 5.25M3.4 8.5a4.75 4.75 0 0 0 8.6 2.25" />,
};
export type IconName = keyof typeof P;

export function Icon({ name, className = "", label }: { name: IconName; className?: string; label?: string }) {
  /* Always 16px unless the caller sets a size (or uses the site's .icon class) */
  const cls = /(^|\s)(size-|w-|h-|icon(\s|$))/.test(className) ? className : `size-4 ${className}`.trim();
  return (
    <svg viewBox="0 0 16 16" className={cls} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}>
      {P[name]}
    </svg>
  );
}

export function MeloMark({ className = "w-[15px] h-[10px]" }: { className?: string }) {
  return (
    <svg viewBox="49 88 171 108" className={className} aria-hidden="true">
      <path fill="currentColor" d="M51 142.473H75.75V156.234L109.616 101.479C111.905 97.7788 115.338 94.926 119.394 93.353C123.45 91.78 127.909 91.5726 132.094 92.7623C136.279 93.952 139.962 96.4738 142.584 99.9455C145.206 103.417 146.625 107.649 146.625 112V156.234L180.491 101.479C182.78 97.7788 186.213 94.926 190.269 93.353C194.325 91.78 198.784 91.5726 202.969 92.7623C207.154 93.952 210.837 96.4738 213.459 99.9455C216.081 103.417 217.5 107.649 217.5 112V193.223H192.75V128.788L158.884 183.542C156.595 187.242 153.163 190.095 149.106 191.668C145.05 193.241 140.591 193.448 136.407 192.259C132.222 191.069 128.539 188.547 125.916 185.076C123.294 181.604 121.875 177.373 121.875 173.022V128.788L88.009 183.542C85.7203 187.242 82.2876 190.095 78.2313 191.668C74.175 193.241 69.7164 193.448 65.5315 192.259C61.3467 191.069 57.6639 188.547 55.0415 185.076C52.4191 181.604 51.0002 177.373 51 173.022V142.473Z" />
    </svg>
  );
}
