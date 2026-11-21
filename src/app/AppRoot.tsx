import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, auth, type Account, type Person } from "../lib/api";
import { Link, navigate, useLocation } from "../lib/router";
import { useSession } from "../lib/session";
import { cx } from "../lib/util";
import { Icon, MeloMark, type IconName } from "../components/icons";
import { Avatar, Button, Menu, Spinner, useAsync } from "../components/ui";
import { Ctx, useApp, type AppCtx } from "./context";

const Mail = lazy(() => import("./Mail"));
const Team = lazy(() => import("./Team"));
const Work = lazy(() => import("./Work"));
const Calendar = lazy(() => import("./Calendar"));
const Settings = lazy(() => import("./settings/Settings"));

const WS_KEY = "melo.workspace";
const savedWs = () => { try { return localStorage.getItem(WS_KEY); } catch { return null; } };

function Splash({ children }: { children?: ReactNode }) {
  return <div className="melo-app flex min-h-screen flex-col items-center justify-center gap-4 bg-app text-center">{children ?? <Spinner className="size-6" />}</div>;
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
  const ws = account?.workspaces.find((w) => w.id === wsId) ?? account?.workspaces[0];
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
      isAdmin: ws.role === "owner" || ws.role === "admin",
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
  useEffect(() => { if (!section) navigate("/app/mail", { replace: true }); }, [section]);
  const view = section === "mail" ? <Mail /> : section === "team" ? <Team /> : section === "work" ? <Work /> : section === "calendar" ? <Calendar /> : section === "settings" ? <Settings /> : null;
  return (
    <div className="melo-app flex h-dvh overflow-hidden bg-app">
      <Rail section={section} unreadTeam={ctx.unread.team} />
      <main className="flex min-w-0 flex-1">
        <Suspense fallback={<div className="flex flex-1 items-center justify-center"><Spinner /></div>}>{view}</Suspense>
      </main>
    </div>
  );
}

function Rail({ section, unreadTeam }: { section: string; unreadTeam: number }) {
  const { account, ws, switchWorkspace } = useApp();
  const name = account.profile?.full_name || account.email;
  const others = account.workspaces.filter((w) => w.id !== ws.id);
  const tab = (key: string, label: string, icon: IconName, badge?: number) => (
    <Link key={key} to={`/app/${key}`} aria-current={section === key ? "page" : undefined}
      className={cx("relative flex h-[60px] w-[60px] flex-col items-center justify-center gap-1 rounded-xl text-xs text-ink-2 transition-colors",
        section === key ? "bg-active font-semibold text-ink" : "hover:bg-hover")}>
      <Icon name={icon} className="size-[18px] text-icon" />{label}
      {!!badge && <span className="absolute left-[34px] top-[6px] flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-app bg-accent px-1 text-[10px] font-bold leading-none text-white box-content">{badge > 99 ? "99+" : badge}</span>}
    </Link>
  );
  return (
    <nav aria-label="Melo" className="flex w-[76px] shrink-0 flex-col items-center gap-1 border-r border-line/60 py-4">
      <Menu align="left" trigger={(open) => (
        <button type="button" onClick={open} title={ws.name} aria-label={`Workspace: ${ws.name}`} className="mb-4 flex size-[34px] items-center justify-center rounded-[10px] bg-inverse text-white transition hover:scale-105">
          <MeloMark className="h-[11px] w-[17px]" />
        </button>
      )} items={[
        ...others.map((w) => ({ label: `Switch to ${w.name}`, icon: "grid" as IconName, onSelect: () => switchWorkspace(w.id) })),
        { label: "New workspace", icon: "plus", onSelect: () => navigate("/signup?resume=1") },
        { label: "Melo website", icon: "globe", onSelect: () => navigate("/") },
      ]} />
      {TABS.map((t) => tab(t.key, t.label, t.icon, t.key === "team" ? unreadTeam : undefined))}
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

/* Secondary sidebar used by every section (Figma: 240px column on the app background) */
export function SideNav({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <aside className="melo-scroll hidden w-[240px] shrink-0 flex-col overflow-y-auto px-3 py-4 md:flex">
      <div className="mb-3 flex h-8 items-center justify-between pl-2"><h1 className="text-[16px] font-medium">{title}</h1>{action}</div>
      {children}
    </aside>
  );
}
export function SideItem({ to, icon, label, count, active, dot, accent, onClick }: { to?: string; icon?: IconName; label: ReactNode; count?: number | string; active?: boolean; dot?: string; accent?: boolean; onClick?: () => void }) {
  const cls = cx("flex h-8 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-sm transition-colors", active ? "bg-active font-medium" : "hover:bg-hover");
  const inner = <>
    {icon && <Icon name={icon} className="size-4 text-icon" />}
    {dot && <span className="size-2 rounded-full" style={{ background: dot }} />}
    <span className="min-w-0 flex-1 truncate">{label}</span>
    {count !== undefined && count !== 0 && <span className={cx("text-xs", accent || active ? "font-semibold text-accent-ink" : "text-ink-3")}>{count}</span>}
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
  return <section className={cx("flex min-w-0 flex-1 flex-col overflow-hidden border-l border-line bg-white md:rounded-tl-none", className)}>{children}</section>;
}
