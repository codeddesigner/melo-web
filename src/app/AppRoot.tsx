import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, auth, type Account, type Person } from "../lib/api";
import { Link, navigate, useLocation } from "../lib/router";
import { useSession } from "../lib/session";
import { cx } from "../lib/util";
import { Icon, MeloMark, type IconName } from "../components/icons";
import { Avatar, Button, IconButton, Menu, Sheet, Spinner, useAsync } from "../components/ui";
import { Ctx, useApp, type AppCtx } from "./context";

const loaders = {
  mail: () => import("./Mail"), team: () => import("./Team"), work: () => import("./Work"),
  calendar: () => import("./Calendar"), settings: () => import("./settings/Settings"),
};
const Mail = lazy(loaders.mail);
const Team = lazy(loaders.team);
const Work = lazy(loaders.work);
const Calendar = lazy(loaders.calendar);
const Settings = lazy(loaders.settings);
/* Warm every section in the background so switching tabs never waits on a download */
const preload = () => Object.values(loaders).forEach((l) => l().catch(() => {}));

const WS_KEY = "melo.workspace";
const savedWs = () => { try { return localStorage.getItem(WS_KEY); } catch { return null; } };

function Splash({ children }: { children?: ReactNode }) {
  return <div className="melo-app flex min-h-screen flex-col items-center justify-center gap-4 bg-app text-center animate-fade-in">{children ?? <Spinner className="size-6" delay />}</div>;
}

export default function AppRoot() {
  const session = useSession();
  const { path } = useLocation();
  useEffect(() => { if (!session) navigate(`/signin?next=${encodeURIComponent(path)}`, { replace: true }); }, [session, path]);
  if (!session) return <Splash />;
  return <Loaded key={session.user.id} />;
}

function Loaded() {
  const acct = useAsync<Account | null>(() => api.account(), []);
  const [wsId, setWsId] = useState<string | null>(savedWs);
  const account = acct.data;
  const ws = account?.workspaces.find((w) => w.id === wsId) ?? account?.workspaces.find((w) => w.kind === "business") ?? account?.workspaces[0];
  const people = useAsync<Person[]>(() => (ws ? api.people(ws.id) : Promise.resolve([])), [ws?.id]);
  const [unread, setUnread] = useState({ team: 0 });

  useEffect(() => { if (account && !account.workspaces.length) navigate("/signup?resume=1", { replace: true }); }, [account]);
  useEffect(() => { if (ws) document.title = `${ws.name} — Melo`; }, [ws]);

  const switchWorkspace = useCallback((id: string) => {
    try { localStorage.setItem(WS_KEY, id); } catch { /* ignore */ }
    setWsId(id); navigate("/app/mail");
  }, []);

  const ctx = useMemo<AppCtx | null>(() => {
    if (!account || !ws) return null;
    const list = people.data ?? [];
    const person = (id: string | null | undefined) => list.find((p) => p.user_id === id);
    return {
      account, ws, people: list, me: person(auth.get()?.user.id), person,
      nameOf: (id) => { const p = person(id); return p?.name || p?.email?.split("@")[0] || "Someone"; },
      isAdmin: ws.role === "owner" || ws.role === "admin", personal: ws.kind === "personal",
      reloadAccount: acct.reload, reloadPeople: people.reload, switchWorkspace, unread, setUnread,
    };
  }, [account, ws, people.data, acct.reload, people.reload, switchWorkspace, unread]);

  if (acct.error) return <Splash><p className="text-ink-2">{acct.error}</p><Button onClick={acct.reload}>Try again</Button></Splash>;
  if (!ctx) return <Splash />;
  return <Ctx.Provider value={ctx}><Shell /></Ctx.Provider>;
}

const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: "mail", label: "Mail", icon: "mail" },
  { key: "team", label: "Team", icon: "users" },
  { key: "work", label: "Work", icon: "task" },
  { key: "calendar", label: "Calendar", icon: "calendar" },
];

function Shell() {
  const { parts } = useLocation();
  const section = parts[1] ?? "";
  const ctx = useApp();
  useEffect(() => { if (ctx.personal && section === "team") navigate("/app/mail", { replace: true }); }, [ctx.personal, section]);
  useEffect(() => { if (!section) navigate("/app/mail", { replace: true }); }, [section]);
  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 600));
    idle(preload);
  }, []);
  const view = section === "mail" ? <Mail /> : section === "team" ? <Team /> : section === "work" ? <Work /> : section === "calendar" ? <Calendar /> : section === "settings" ? <Settings /> : null;
  return (
    <div className="melo-app flex h-dvh flex-col overflow-hidden bg-app md:flex-row">
      <Rail section={section} unreadTeam={ctx.unread.team} />
      <main key={section} className="flex min-h-0 min-w-0 flex-1 flex-col animate-fade-in md:flex-row">
        <Suspense fallback={<div className="flex flex-1 items-center justify-center"><Spinner delay /></div>}>{view}</Suspense>
      </main>
      <TabBar section={section} unreadTeam={ctx.unread.team} />
    </div>
  );
}

function Rail({ section, unreadTeam }: { section: string; unreadTeam: number }) {
  const { account, ws, switchWorkspace, personal } = useApp();
  const name = account.profile?.full_name || account.email;
  const others = account.workspaces.filter((w) => w.id !== ws.id);
  const tab = (key: string, label: string, icon: IconName, badge?: number) => (
    <Link key={key} to={`/app/${key}`} aria-current={section === key ? "page" : undefined}
      className={cx("relative flex h-[60px] w-[60px] flex-col items-center justify-center gap-1 rounded-xl text-xs text-ink-2 active:scale-95",
        section === key ? "bg-active font-semibold text-ink" : "hover:bg-hover")}>
      <Icon name={icon} className="size-[18px] text-icon" />{label}
      {!!badge && <span key={badge} className="absolute left-[34px] top-[6px] animate-pop flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-app bg-accent px-1 text-[10px] font-bold leading-none text-white box-content">{badge > 99 ? "99+" : badge}</span>}
    </Link>
  );
  return (
    <nav aria-label="Melo" className="hidden w-[76px] shrink-0 flex-col items-center gap-1 border-r border-line/60 py-4 md:flex">
      <Menu align="left" trigger={(open) => (
        <button type="button" onClick={open} title={ws.name} aria-label={`Workspace: ${ws.name}`} className="mb-4 flex size-[34px] items-center justify-center rounded-[10px] bg-inverse text-white transition hover:scale-105">
          <MeloMark className="h-[11px] w-[17px]" />
        </button>
      )} items={[
        ...others.map((w) => ({ label: w.kind === "personal" ? "Switch to Personal" : `Switch to ${w.name}`, icon: (w.kind === "personal" ? "user" : "grid") as IconName, onSelect: () => switchWorkspace(w.id) })),
        { label: personal ? "Create a business workspace" : "New workspace", icon: "plus", onSelect: () => navigate("/signup?resume=1") },
        { label: "Melo website", icon: "globe", onSelect: () => navigate("/") },
      ]} />
      {TABS.filter((t) => !(personal && t.key === "team")).map((t) => tab(t.key, t.label, t.icon, t.key === "team" ? unreadTeam : undefined))}
      <span className="flex-1" />
      {tab("settings", "Settings", "settings")}
      <Menu align="left" trigger={(open) => (
        <button type="button" onClick={open} aria-label="Your account" className="mt-2 rounded-full transition hover:scale-105"><Avatar name={name} size={30} dark /></button>
      )} items={[
        { label: "Profile", icon: "user", onSelect: () => navigate("/app/settings/profile") },
        { label: "Sign out", icon: "out", onSelect: () => { auth.signOut(); navigate("/signin"); } },
      ]} />
    </nav>
  );
}

/* Phones: the rail becomes a bottom tab bar */
function TabBar({ section, unreadTeam }: { section: string; unreadTeam: number }) {
  const { personal } = useApp();
  return (
    <nav aria-label="Melo sections" className="flex shrink-0 items-stretch justify-around border-t border-line bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),4px)] pt-1 backdrop-blur md:hidden">
      {[...TABS.filter((t) => !(personal && t.key === "team")), { key: "settings", label: "Settings", icon: "settings" as IconName }].map((t) => (
        <Link key={t.key} to={`/app/${t.key}`} aria-current={section === t.key ? "page" : undefined}
          className={cx("relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] active:scale-95", section === t.key ? "font-semibold text-ink" : "text-ink-3")}>
          <span className={cx("flex h-7 w-12 items-center justify-center rounded-full", section === t.key && "bg-active")}><Icon name={t.icon} className="size-[18px]" /></span>
          {t.label}
          {t.key === "team" && !!unreadTeam && <span key={unreadTeam} className="absolute right-[calc(50%-22px)] top-1 size-2 rounded-full bg-accent ring-2 ring-white animate-pop" />}
        </Link>
      ))}
    </nav>
  );
}

/* Secondary sidebar used by every section (Figma: 240px column on the app background) */
export function SideNav({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { path, query } = useLocation();
  const where = path + "?" + query.toString();
  useEffect(() => setOpen(false), [where]);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      {/* Phones: compact header; the full menu slides over */}
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-line bg-white px-2 md:hidden">
        <IconButton icon="menu" label={`Open ${title} menu`} onClick={() => setOpen(true)} />
        <h1 className="flex-1 truncate text-[16px] font-medium">{title}</h1>
        {action}
      </div>
      <Sheet open={open} onClose={close} label={`${title} menu`}>
        <div className="mb-3 flex h-8 items-center justify-between pl-2"><h1 className="text-[16px] font-medium">{title}</h1><IconButton icon="x" label="Close menu" onClick={close} /></div>
        {children}
      </Sheet>
      <aside className="melo-scroll hidden w-[240px] shrink-0 flex-col overflow-y-auto px-3 py-4 md:flex">
        <div className="mb-3 flex h-8 items-center justify-between pl-2"><h1 className="text-[16px] font-medium">{title}</h1>{action}</div>
        {children}
      </aside>
    </>
  );
}
export function SideItem({ to, icon, label, count, active, dot, accent, onClick }: { to?: string; icon?: IconName; label: ReactNode; count?: number | string; active?: boolean; dot?: string; accent?: boolean; onClick?: () => void }) {
  const cls = cx("flex h-9 w-full shrink-0 items-center gap-2.5 rounded-xl px-2.5 text-left text-sm active:scale-[.98] md:h-8", active ? "bg-active font-medium" : "hover:bg-hover");
  const inner = <>
    {icon && <Icon name={icon} className="size-4 text-icon" />}
    {dot && <span className="size-2 rounded-full" style={{ background: dot }} />}
    <span className="min-w-0 flex-1 truncate">{label}</span>
    {count !== undefined && count !== 0 && <span key={String(count)} className={cx("text-xs animate-fade-in", accent || active ? "font-semibold text-accent-ink" : "text-ink-3")}>{count}</span>}
  </>;
  return to ? <Link to={to} className={cls} aria-current={active ? "page" : undefined}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}
export function SideLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mt-5 mb-1 flex h-6 items-center justify-between px-2.5 text-xs text-ink-3">{children}{action}</div>;
}
export function SideSearch({ value, onChange, placeholder = "Search" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="mb-3 flex h-8 items-center gap-2 rounded-xl bg-white px-2.5 text-sm text-ink-3 shadow-[0_0_0_1px_var(--color-line)] focus-within:shadow-[0_0_0_1px_var(--color-accent)]">
      <Icon name="search" className="size-4" />
      <input value={value} onChange={(e) => onChange((e.target as HTMLInputElement).value)} placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 bg-transparent text-ink outline-none" />
    </label>
  );
}
/* Content area: white panel to the right of the side nav */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white md:border-l md:border-line", className)}>{children}</section>;
}
