export const cx = (...c: (string | false | null | undefined | 0)[]) => c.filter(Boolean).join(" ");

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function initials(s: string | null | undefined) {
  const parts = String(s ?? "").replace(/@.*/, "").split(/[.\s_-]+/).filter(Boolean);
  return (parts.map((p) => p[0]).join("").slice(0, 2) || "?").toUpperCase();
}

const PALETTE = ["#f07b1e", "#14a3a0", "#5b3fd9", "#e2468b", "#1b87f5", "#2ea44f", "#1f1f1f"];
export function colorFor(key: string | null | undefined) {
  let h = 0;
  for (const c of String(key ?? "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export const slugUser = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9.]+/g, "").replace(/^\.+|\.+$/g, "").replace(/\.{2,}/g, ".").slice(0, 30);
export const slugWs = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
export const slugChannel = (s: string) => s.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/* Dates */
const DAY = 86_400_000;
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
export const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7)); // Monday
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

export const fmtTime = (d: Date | string) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export function fmtShort(d: Date | string) {
  const t = new Date(d), now = new Date();
  if (sameDay(t, now)) return fmtTime(t);
  const diff = (startOfDay(now).getTime() - startOfDay(t).getTime()) / DAY;
  if (diff === 1) return "Yesterday";
  if (diff < 7) return t.toLocaleDateString("en-US", { weekday: "short" });
  return t.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
export function dayLabel(d: Date | string) {
  const t = new Date(d), now = new Date();
  if (sameDay(t, now)) return "Today";
  if (sameDay(t, addDays(now, -1))) return "Yesterday";
  return t.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
export function dueLabel(s: string | null) {
  if (!s) return { text: "", tone: "" as const };
  const d = parseDate(s), today = startOfDay(new Date());
  const diff = Math.round((d.getTime() - today.getTime()) / DAY);
  if (diff === 0) return { text: "Today", tone: "bad" as const };
  if (diff < 0) return { text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), tone: "bad" as const };
  if (diff === 1) return { text: "Tomorrow", tone: "warn" as const };
  if (diff < 7) return { text: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), tone: "warn" as const };
  return { text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), tone: "" as const };
}
export const ago = (d: string | Date) => {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < DAY / 1000) return `${Math.round(s / 3600)} h ago`;
  return fmtShort(d);
};

export async function copy(text: string) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }
