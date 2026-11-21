import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, auth, type Invite, type Overview, type Role } from "../../lib/api";
import { navigate, useLocation } from "../../lib/router";
import { ago, copy, cx, isEmail, slugUser } from "../../lib/util";
import { Icon, type IconName } from "../../components/icons";
import { Avatar, Button, Empty, Field, IconButton, Input, Menu, Modal, Select, Skeleton, Tag, TextArea, Toggle, useAsync, useConfirm, useToast } from "../../components/ui";
import { useApp } from "../context";
import { Panel, SideItem, SideLabel, SideNav } from "../AppRoot";
import { Body, Card, Header } from "./kit";
import { CustomDomainPage, FiltersPage, PlanPage } from "./PersonalSettings";

const PAGES = ["profile", "notifications", "general", "members", "rules", "domains", "billing", "filters", "domain", "plan"] as const;
type Page = (typeof PAGES)[number];

export default function Settings() {
  const { parts } = useLocation();
  const { ws, isAdmin, personal } = useApp();
  const allowed = personal ? ["profile", "notifications", "filters", "domain", "plan"] : ["profile", "notifications", "general", "members", "rules", "domains", "billing"];
  const page = allowed.includes(parts[2] ?? "") ? (parts[2] as Page) : null;
  useEffect(() => { if (!page) navigate("/app/settings/profile", { replace: true }); }, [page]);
  const ov = useAsync<Overview>(() => (personal ? Promise.resolve(undefined as unknown as Overview) : api.overview(ws.id)), [ws.id, personal]);
  const item = (p: Page, icon: IconName, label: string, count?: number) => <SideItem key={p} to={`/app/settings/${p}`} icon={icon} label={label} count={count} active={page === p} />;
  return (
    <>
      <SideNav title="Settings">
        <SideLabel>Your account</SideLabel>
        {item("profile", "user", "Profile")}
        {item("notifications", "bell", "Notifications")}
        {personal ? <>
          {item("filters", "filter", "Filters")}
          <SideLabel>Mail</SideLabel>
          {item("domain", "link", "Custom domain")}
          {item("plan", "bolt", "Plan")}
          <SideLabel>Business</SideLabel>
          <SideItem to="/signup?resume=1" icon="plus" label="Create a business workspace" />
          <p className="px-2.5 pt-1 text-xs text-ink-3">Add team chat, shared tasks, members and your company domain. Your personal mail stays yours.</p>
        </> : <>
          <SideLabel>{ws.name}</SideLabel>
          {item("general", "grid", "General")}
          {item("members", "users", "Members", ov.data?.members.length)}
          {item("rules", "shield", "Rules & filters", ov.data ? Object.values(ov.data.rules).filter(Boolean).length : undefined)}
          {item("domains", "link", "Email domains")}
          {item("billing", "bolt", "Billing")}
        </>}
      </SideNav>
      <Panel>
        <div className="melo-scroll flex-1 overflow-y-auto">
          {page === "profile" && <ProfilePage />}
          {page === "notifications" && <NotificationsPage />}
          {page === "general" && <GeneralPage ov={ov.data} reload={ov.reload} isAdmin={isAdmin} />}
          {page === "members" && <MembersPage ov={ov.data} loading={ov.loading} error={ov.error} reload={ov.reload} />}
          {page === "rules" && <RulesPage ov={ov.data} set={ov.set} isAdmin={isAdmin} />}
          {page === "domains" && <DomainsPage ov={ov.data} reload={ov.reload} />}
          {page === "billing" && <BillingPage />}
          {page === "filters" && <FiltersPage />}
          {page === "domain" && <CustomDomainPage />}
          {page === "plan" && <PlanPage />}
        </div>
      </Panel>
    </>
  );
}

/* ---------------- Profile ---------------- */
function ProfilePage() {
  const { account, ws, reloadAccount, reloadPeople } = useApp();
  const toast = useToast();
  const p = account.profile;
  const [f, setF] = useState({ full_name: p?.full_name ?? "", display_name: p?.display_name ?? "", title: p?.title ?? "" });
  const [busy, setBusy] = useState(false);
  const dirty = f.full_name !== (p?.full_name ?? "") || f.display_name !== (p?.display_name ?? "") || f.title !== (p?.title ?? "");
  const save = async () => {
    if (!f.full_name.trim()) return toast("Enter your full name.", "bad");
    setBusy(true);
    try { await api.updateProfile({ full_name: f.full_name.trim(), display_name: f.display_name.trim() || null, title: f.title.trim() || null }); toast("Profile saved"); reloadAccount(); reloadPeople(); }
    catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); }
  };
  return (
    <>
      <Header title="My account" action={<Button icon="check" onClick={save} busy={busy} disabled={!dirty}>Save changes</Button>} />
      <Body>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={f.full_name || account.email} size={64} dark />
            <div><p className="text-[18px] font-medium">{f.full_name || account.email}</p><p className="text-sm text-ink-3 capitalize">{ws.kind === "personal" ? "Personal account" : `${ws.role} · ${ws.name}`}</p></div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Field label="Full name"><Input value={f.full_name} onChange={(v) => setF({ ...f, full_name: v })} autoComplete="name" /></Field>
            <Field label="Display name" hint="Shown in chat"><Input value={f.display_name} onChange={(v) => setF({ ...f, display_name: v })} placeholder={f.full_name.split(" ")[0]} /></Field>
            <Field label="Title"><Input value={f.title} onChange={(v) => setF({ ...f, title: v })} placeholder="Design lead" /></Field>
          </div>
        </Card>
        <div className="grid gap-6 md:grid-cols-2">
          <SecurityCard />
          <Card className="p-5">
            <h3 className="mb-3 font-medium">Melo address</h3>
            <MeloAddress />
          </Card>
        </div>
        <Card className="flex items-center justify-between p-5">
          <div><h3 className="font-medium">Sign out</h3><p className="text-sm text-ink-3">Sign out of Melo on this browser.</p></div>
          <Button variant="line" icon="out" onClick={() => { auth.signOut(); navigate("/signin"); }}>Sign out</Button>
        </Card>
      </Body>
    </>
  );
}
/* Sign-in & security: password + recovery email for Melo-only accounts, code sign-in otherwise */
function SecurityCard() {
  const { account } = useApp();
  const toast = useToast();
  const info = useAsync(() => api.securityInfo(), []);
  const [mode, setMode] = useState<"" | "password" | "recovery" | "recovery-code">("");
  const [f, setF] = useState({ current: "", next: "", email: "", code: "" });
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, done: string, after: () => void) => {
    setBusy(true);
    try { await fn(); toast(done); after(); } catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); }
  };
  const d = info.data;
  return (
    <Card className="p-5">
      <h3 className="mb-3 font-medium">Sign-in & security</h3>
      {!d ? <div className="flex flex-col gap-2"><Skeleton className="h-6" /><Skeleton className="h-6" /></div> : d.password_account ? <>
        <Row icon="mail" label="Sign in with" value={account.email} />
        <Row icon="lock" label="Password" value={<button type="button" className="text-accent-ink hover:underline" onClick={() => setMode(mode === "password" ? "" : "password")}>Change</button>} />
        <Row icon="shield" label="Recovery email" value={d.recovery_email ? <span>{d.recovery_email} · <button type="button" className="text-accent-ink hover:underline" onClick={() => setMode("recovery")}>Change</button></span> : <button type="button" className="font-medium text-warn hover:underline" onClick={() => setMode("recovery")}>Add one</button>} />
        {!d.recovery_email && mode === "" && <p className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-xs text-warn">Without a recovery email, a forgotten password can’t be reset.</p>}
        {mode === "password" && (
          <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-subtle p-3 animate-fade-up">
            <Field label="Current password"><Input type="password" autoComplete="current-password" value={f.current} onChange={(v) => setF({ ...f, current: v })} /></Field>
            <Field label="New password" hint="At least 8 characters"><Input type="password" autoComplete="new-password" value={f.next} onChange={(v) => setF({ ...f, next: v })} /></Field>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setMode("")}>Cancel</Button>
              <Button busy={busy} onClick={() => run(() => api.setPassword(f.current, f.next), "Password changed", () => { setMode(""); setF({ ...f, current: "", next: "" }); })}>Save password</Button></div>
          </div>
        )}
        {mode === "recovery" && (
          <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-subtle p-3 animate-fade-up">
            <Field label="Recovery email" hint="An email outside Melo, like Gmail. We’ll send a code to confirm it."><Input type="email" autoComplete="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} placeholder="you@gmail.com" /></Field>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setMode("")}>Cancel</Button>
              <Button busy={busy} onClick={() => run(() => api.recoverySend(f.email.trim()), "Code sent", () => setMode("recovery-code"))}>Send code</Button></div>
          </div>
        )}
        {mode === "recovery-code" && (
          <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-subtle p-3 animate-fade-up">
            <Field label={`Code sent to ${f.email.trim()}`}><Input value={f.code} onChange={(v) => setF({ ...f, code: v.replace(/\D/g, "").slice(0, 6) })} placeholder="6-digit code" autoComplete="one-time-code" /></Field>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setMode("recovery")}>Back</Button>
              <Button busy={busy} onClick={() => run(() => api.recoveryVerify(f.email.trim(), f.code), "Recovery email saved", () => { setMode(""); setF({ ...f, code: "", email: "" }); info.reload(); })}>Confirm</Button></div>
          </div>
        )}
      </> : <>
        <Row icon="mail" label="Sign-in email" value={account.email} />
        <Row icon="lock" label="Password" value="Not needed — you sign in with a code" />
        <Row icon="shield" label="Codes" value="Expire after 10 minutes" />
      </>}
    </Card>
  );
}
function Row({ icon, label, value, tone }: { icon: IconName; label: string; value: ReactNode; tone?: string }) {
  return <div className="flex items-center gap-2.5 py-1.5 text-sm"><Icon name={icon} className="size-4 text-icon-2" /><span className="text-ink-2">{label}</span><span className={cx("ml-auto text-right", tone)}>{value}</span></div>;
}
function MeloAddress() {
  const { account, reloadAccount, reloadPeople } = useApp();
  const toast = useToast();
  const addr = account.profile?.melo_address;
  const [v, setV] = useState(slugUser((account.profile?.full_name ?? "").replace(/\s+/, ".")));
  const [state, setState] = useState<"" | "checking" | "free" | "taken">("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (addr || v.length < 3) { setState(""); return; }
    setState("checking");
    const t = setTimeout(() => api.addressAvailable(v).then((ok) => setState(ok ? "free" : "taken"), () => setState("")), 300);
    return () => clearTimeout(t);
  }, [v, addr]);
  if (addr) return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between rounded-xl bg-subtle px-3 py-2.5"><span className="font-medium">{addr}@melo.to</span>
        <IconButton icon="copy" label="Copy address" onClick={() => copy(`${addr}@melo.to`).then(() => toast("Address copied"))} /></div>
      <p className="text-ink-3">Send and receive mail at this address in Melo Mail. Replies land in your Melo inbox.</p>
    </div>
  );
  const claim = async () => {
    setBusy(true);
    try { await api.updateProfile({ melo_address: v }); toast(`${v}@melo.to is yours`); reloadAccount(); reloadPeople(); }
    catch (e) { toast((e as Error).message.includes("duplicate") ? "That address was just taken. Try another." : (e as Error).message, "bad"); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-2.5 text-sm">
      <p className="text-ink-2">Claim a free @melo.to address to send mail from Melo.</p>
      <div className="flex h-9 items-center rounded-full border border-line px-3.5 focus-within:border-accent">
        <input aria-label="Address" value={v} onChange={(e) => setV(slugUser((e.target as HTMLInputElement).value))} className="min-w-0 flex-1 bg-transparent outline-none" />
        <span className="text-ink-3">@melo.to</span>
      </div>
      <div className="flex items-center justify-between">
        <span className={cx("text-xs", state === "free" ? "text-ok" : state === "taken" ? "text-bad" : "text-ink-3")}>
          {v.length < 3 ? "Use at least 3 characters" : state === "checking" ? "Checking…" : state === "free" ? "Available" : state === "taken" ? "Already taken" : ""}
        </span>
        <Button size="s" onClick={claim} busy={busy} disabled={state !== "free"}>Claim address</Button>
      </div>
    </div>
  );
}

/* ---------------- Notifications ---------------- */
const NOTIF: { key: string; title: string; sub: string }[] = [
  { key: "desktop", title: "Desktop notifications", sub: "Get notified about mentions, DMs and replies to your threads." },
  { key: "digest", title: "Email digest", sub: "A daily summary of anything you missed while away." },
  { key: "mute_filtered", title: "Mute filtered conversations", sub: "Conversations hidden by your filters never notify you." },
  { key: "quiet_hours", title: "Quiet hours", sub: "Pause notifications from 7 PM to 8 AM." },
];
function NotificationsPage() {
  const { account, reloadAccount } = useApp();
  const toast = useToast();
  const [prefs, setPrefs] = useState<Record<string, unknown>>(account.profile?.prefs ?? {});
  const val = (k: string) => (prefs[k] === undefined ? k !== "quiet_hours" : Boolean(prefs[k]));
  const set = async (k: string, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    if (k === "desktop" && v && "Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    try { await api.updateProfile({ prefs: next }); reloadAccount(); } catch (e) { toast((e as Error).message, "bad"); setPrefs(prefs); }
  };
  return (
    <>
      <Header title="Notifications" sub="Workspace rules decide what reaches you; these decide when you hear about it." />
      <Body>
        <Card>
          {NOTIF.map((n, i) => (
            <div key={n.key} className={cx("flex items-center gap-4 px-5 py-4", i && "border-t border-line")}>
              <div className="flex-1"><p className="font-medium">{n.title}</p><p className="text-sm text-ink-3">{n.sub}</p></div>
              <Toggle on={val(n.key)} onChange={(v) => set(n.key, v)} label={n.title} />
            </div>
          ))}
        </Card>
      </Body>
    </>
  );
}

/* ---------------- General ---------------- */
function GeneralPage({ ov, reload, isAdmin }: { ov?: Overview; reload: () => void; isAdmin: boolean }) {
  const { reloadAccount } = useApp();
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (ov) setName(ov.workspace.name); }, [ov]);
  if (!ov) return <Loading />;
  const save = async () => {
    setBusy(true);
    try { await api.rename(ov.workspace.id, name); toast("Workspace renamed"); reload(); reloadAccount(); } catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); }
  };
  return (
    <>
      <Header title="General" sub="Your workspace’s name and address." />
      <Body>
        <Card className="grid gap-5 p-6 md:grid-cols-2">
          <Field label="Workspace name"><Input value={name} onChange={setName} disabled={!isAdmin} /></Field>
          <Field label="Workspace URL" hint="Your web address can’t be changed yet."><Input value={`melo.to/${ov.workspace.slug}`} onChange={() => {}} disabled /></Field>
          <Field label="Team size"><Input value={ov.workspace.team_size ?? "—"} onChange={() => {}} disabled /></Field>
          <Field label="Created"><Input value={new Date(ov.workspace.created_at).toLocaleDateString("en-US", { dateStyle: "long" })} onChange={() => {}} disabled /></Field>
          {isAdmin && <div className="md:col-span-2 flex justify-end"><Button onClick={save} busy={busy} disabled={!name.trim() || name === ov.workspace.name}>Save</Button></div>}
        </Card>
        {!isAdmin && <p className="text-sm text-ink-3">Only owners and admins can change these settings.</p>}
      </Body>
    </>
  );
}

/* ---------------- Members ---------------- */
const ROLE_OPTS: { value: Role; label: string }[] = [{ value: "admin", label: "Admin" }, { value: "member", label: "Member" }, { value: "guest", label: "Guest" }];
function MembersPage({ ov, loading, error, reload }: { ov?: Overview; loading: boolean; error?: string; reload: () => void }) {
  const { isAdmin, account, reloadPeople } = useApp();
  const toast = useToast();
  const [filter, setFilter] = useState<"all" | "admins" | "invited" | "guests">("all");
  const [q, setQ] = useState("");
  const [inviting, setInviting] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  if (error) return <Empty icon="users" title="We couldn’t load members" body={error} action={<Button onClick={reload}>Try again</Button>} />;
  if (!ov) return <Loading />;
  const me = auth.get()?.user.id;
  const rows = [
    ...ov.members.map((m) => ({ kind: "member" as const, id: m.user_id, name: m.full_name || m.email.split("@")[0], email: m.email, role: m.role, m })),
    ...ov.invites.map((i) => ({ kind: "invite" as const, id: i.id, name: i.email.split("@")[0], email: i.email, role: i.role, i })),
  ];
  const shown = rows.filter((r) => (filter === "all" || (filter === "admins" ? r.role === "admin" || r.role === "owner" : filter === "invited" ? r.kind === "invite" : r.role === "guest"))
    && (!q || `${r.name} ${r.email}`.toLowerCase().includes(q.toLowerCase())));
  const counts = { all: rows.length, admins: rows.filter((r) => r.role === "admin" || r.role === "owner").length, invited: ov.invites.length, guests: rows.filter((r) => r.role === "guest").length };
  const confirm = useConfirm();
  const act = async (fn: () => Promise<unknown>, done: string) => { try { await fn(); toast(done); reload(); reloadPeople(); } catch (e) { toast((e as Error).message, "bad"); } };
  const selected = ov.members.find((m) => m.user_id === sel);
  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1">
        <Header title={`${ov.members.length} ${ov.members.length === 1 ? "person" : "people"} at ${ov.workspace.name}`}
          sub="Roles decide who can change workspace rules. Admins can enforce rules; members can only add personal filters."
          action={isAdmin && <Button icon="plus" onClick={() => setInviting(true)}>Invite people</Button>} />
        <Body>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-9 w-full max-w-xs items-center gap-2 rounded-full border border-line px-3 text-sm focus-within:border-accent">
              <Icon name="search" className="size-4 text-ink-3" /><input aria-label="Search people" placeholder="Search people" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} className="min-w-0 flex-1 bg-transparent outline-none" />
            </label>
            {(["all", "admins", "invited", "guests"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} className={cx("h-8 rounded-full px-3 text-sm font-medium capitalize transition-colors", filter === k ? "bg-inverse text-white" : "bg-hover hover:bg-active")}>{k} · {counts[k]}</button>
            ))}
          </div>
          <Card className="overflow-hidden">
            <div className="hidden grid-cols-[1fr_150px_110px_48px] border-b border-line bg-subtle px-4 py-2.5 text-xs text-ink-3 md:grid"><span>Name</span><span>Role</span><span>Status</span><span /></div>
            {loading && !rows.length && <div className="p-4"><Skeleton className="h-10" /></div>}
            {shown.map((r) => (
              <div key={r.kind + r.id} onClick={() => r.kind === "member" && setSel(r.id)}
                className={cx("grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-0 md:grid-cols-[1fr_150px_110px_48px]", r.kind === "member" && "cursor-pointer hover:bg-subtle", sel === r.id && "bg-accent-soft")}>
                <div className="flex min-w-0 items-center gap-3">
                  {r.kind === "member" ? <Avatar name={r.name} id={r.id} size={36} /> : <span className="flex size-9 items-center justify-center rounded-full bg-hover text-icon-2"><Icon name="mail" /></span>}
                  <div className="min-w-0"><p className="truncate font-medium">{r.name}{r.id === me && <span className="text-ink-3"> (you)</span>}</p><p className="truncate text-[13px] text-ink-3">{r.email}</p></div>
                </div>
                <div className="hidden md:block" onClick={(e) => e.stopPropagation()}>
                  {r.role === "owner" || !isAdmin || r.id === me
                    ? <span className="inline-flex h-8 items-center rounded-full bg-hover px-3 text-sm font-medium capitalize">{r.role}</span>
                    : r.kind === "member"
                      ? <Select label={`Role for ${r.name}`} value={r.role} options={ROLE_OPTS} onChange={(v) => act(() => api.setRole(ov.workspace.id, r.id, v), `${r.name} is now ${v === "admin" ? "an admin" : `a ${v}`}`)} />
                      : <span className="inline-flex h-8 items-center rounded-full bg-hover px-3 text-sm font-medium capitalize">{r.role}</span>}
                </div>
                <div className="hidden md:block">{r.kind === "member" ? <Tag tone="ok">Active</Tag> : r.i.expired ? <Tag tone="bad">Expired</Tag> : r.i.sent_at ? <Tag tone="warn">Invited</Tag> : <Tag tone="gray">Not sent</Tag>}</div>
                <div onClick={(e) => e.stopPropagation()}>
                  {isAdmin && r.role !== "owner" && r.id !== me && (
                    <Menu trigger={(open) => <IconButton icon="more" label={`More for ${r.name}`} onClick={open} />} items={r.kind === "member" ? [
                      { label: "Remove from workspace", icon: "trash", danger: true, onSelect: async () => { if (await confirm({ title: `Remove ${r.name}?`, body: `They’ll lose access to ${ov.workspace.name} right away. You can invite them again later.`, confirm: "Remove", danger: true })) act(() => api.removeMember(ov.workspace.id, r.id), `${r.name} removed`); } },
                    ] : [
                      { label: r.i.sent_at ? "Resend invite" : "Send invite", icon: "send", onSelect: () => act(() => api.invite(ov.workspace.id, [r.email], r.role).then(() => api.sendInvites(ov.workspace.id)), `Invite sent to ${r.email}`) },
                      { label: "Copy invite link", icon: "link", onSelect: () => copy(`${location.origin}/signup?join=${r.id}`).then(() => toast("Invite link copied")) },
                      { label: "Revoke invite", icon: "x", danger: true, onSelect: () => act(() => api.revokeInvite(r.id), "Invite revoked") },
                    ]} />
                  )}
                </div>
              </div>
            ))}
            {!loading && !shown.length && <p className="px-4 py-8 text-center text-sm text-ink-3">No one matches that.</p>}
          </Card>
          {account.workspaces.length > 0 && !isAdmin && <p className="text-sm text-ink-3">Only owners and admins can invite people or change roles.</p>}
        </Body>
      </div>
      {selected && <MemberPanel m={selected} ov={ov} onClose={() => setSel(null)} />}
      <InviteModal open={inviting} onClose={() => setInviting(false)} ov={ov} done={() => { reload(); reloadPeople(); }} />
    </div>
  );
}
function MemberPanel({ m, ov, onClose }: { m: Overview["members"][number]; ov: Overview; onClose: () => void }) {
  const name = m.full_name || m.email.split("@")[0];
  const RULE_NAMES: Record<string, string> = { digests: "Hide marketing digests", random: "Mute #random", invites: "Outside invites to Later" };
  return (
    <aside className="hidden w-[360px] shrink-0 border-l border-line bg-white p-5 lg:block animate-fade-up">
      <div className="mb-4 flex items-center justify-between"><span className="text-sm text-ink-3">Member</span><IconButton icon="x" label="Close" onClick={onClose} /></div>
      <div className="flex items-center gap-3"><Avatar name={name} id={m.user_id} size={56} /><div><p className="text-[18px] font-medium">{name}</p><p className="text-[13px] text-ink-3">{m.email} · joined {new Date(m.joined).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p></div></div>
      <h4 className="mt-6 mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">Access</h4>
      <Row icon="user" label="Role" value={<span className="capitalize">{m.role}</span>} />
      <Row icon="shield" label="Can create workspace rules" value={m.role === "owner" || m.role === "admin" ? "Yes" : "No"} />
      {m.melo_address && <Row icon="mail" label="Melo address" value={`${m.melo_address}@melo.to`} />}
      <h4 className="mt-6 mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">Rules that apply</h4>
      {Object.entries(ov.rules).map(([k, on]) => <Row key={k} icon="shield" label={RULE_NAMES[k] ?? k} value={on ? "On" : "Off"} tone={on ? "text-ink" : "text-ink-3"} />)}
    </aside>
  );
}
function InviteModal({ open, onClose, ov, done }: { open: boolean; onClose: () => void; ov: Overview; done: () => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [busy, setBusy] = useState(false);
  const emails = useMemo(() => text.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean), [text]);
  const bad = emails.filter((e) => !isEmail(e));
  const submit = async () => {
    if (!emails.length) return toast("Add at least one email.", "bad");
    if (bad.length) return toast(`Check ${bad[0]}`, "bad");
    setBusy(true);
    try {
      await api.invite(ov.workspace.id, emails, role);
      const r = await api.sendInvites(ov.workspace.id);
      toast(r.sent ? `Sent ${r.sent} invite${r.sent > 1 ? "s" : ""}` : "Invites saved");
      setText(""); onClose(); done();
    } catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={`Invite people to ${ov.workspace.name}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon="send" onClick={submit} busy={busy}>{emails.length > 1 ? `Send ${emails.length} invites` : "Send invite"}</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Email addresses" hint="Separate with commas or spaces. They’ll get an email from Melo with a link that expires in 7 days.">
          <TextArea value={text} onChange={setText} rows={3} placeholder={`name@${ov.workspace.domain ?? "company.com"}, another@${ov.workspace.domain ?? "company.com"}`} autoFocus />
        </Field>
        <div className="flex items-center justify-between"><span className="text-sm text-ink-2">Invite as</span><Select label="Role" value={role} onChange={setRole} options={ROLE_OPTS} /></div>
      </div>
    </Modal>
  );
}

/* ---------------- Rules & filters ---------------- */
const RULES: { key: string; title: string; cond: string; act: string; icon: IconName }[] = [
  { key: "digests", title: "Hide marketing digests", cond: "Sender is a marketing tool", act: "Skip inbox", icon: "mail" },
  { key: "random", title: "Mute #random", cond: "Channel is #random", act: "Mute", icon: "hash" },
  { key: "invites", title: "Move outside calendar invites", cond: "Invite from outside the workspace", act: "Move to Later", icon: "calendar" },
];
function RulesPage({ ov, set, isAdmin }: { ov?: Overview; set: (fn: (d: Overview | undefined) => Overview) => void; isAdmin: boolean }) {
  const toast = useToast();
  if (!ov) return <Loading />;
  const toggle = async (key: string, on: boolean) => {
    set((d) => ({ ...d!, rules: { ...d!.rules, [key]: on } }));
    try { await api.setRule(ov.workspace.id, key, on); toast(on ? "Rule turned on" : "Rule paused"); }
    catch (e) { set((d) => ({ ...d!, rules: { ...d!.rules, [key]: !on } })); toast((e as Error).message, "bad"); }
  };
  return (
    <>
      <Header title="Rules & filters" sub={`Decide what reaches everyone at ${ov.workspace.name}. Rules run on every new email and message as it arrives.`} />
      <Body>
        <Card className="overflow-hidden">
          {RULES.map((r, i) => {
            const on = Boolean(ov.rules[r.key]);
            return (
              <div key={r.key} className={cx("flex items-center gap-4 px-5 py-4 transition-colors", i && "border-t border-line", !on && "opacity-70")}>
                <Toggle on={on} onChange={(v) => toggle(r.key, v)} label={r.title} disabled={!isAdmin} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.title}</p>
                  <p className="flex items-center gap-1.5 text-[13px] text-ink-3"><Icon name={r.icon} className="size-3.5" />{r.cond} <span>→</span> <span className="text-ink-2">{r.act}</span></p>
                </div>
                <Tag tone={on ? "dark" : "gray"} icon={on ? "lock" : "shield"}>{on ? "Enforced" : "Paused"}</Tag>
                <span className="hidden w-28 text-right text-sm text-ink-3 md:block">Everyone ({ov.members.length})</span>
              </div>
            );
          })}
        </Card>
        <div className="flex items-center gap-3 rounded-2xl bg-subtle px-4 py-3.5 text-sm text-ink-2"><Icon name="eye-off" className="size-4 text-icon-2" />
          {isAdmin ? "Everyone sees workspace rules in their own filters. Custom rules arrive with shared inboxes." : "Only owners and admins can change workspace rules."}</div>
      </Body>
    </>
  );
}

/* ---------------- Email domains ---------------- */
function DomainsPage({ ov, reload }: { ov?: Overview; reload: () => void }) {
  const { ws, reloadAccount } = useApp();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<{ found: boolean; at: string } | null>(null);
  if (!ov) return <Loading />;
  const w = ov.workspace;
  const isOwner = ov.my_role === "owner", isAdmin = isOwner || ov.my_role === "admin";
  const add = async () => {
    setBusy(true);
    try { await api.setDomain(w.id, domain); toast("Domain added — now add the TXT record"); setAdding(false); reload(); reloadAccount(); }
    catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true);
    try { const r = await api.verifyDomain(w.id); setCheck({ found: r.found, at: r.checked_at }); if (r.found) { toast(`${w.domain} is verified`); reload(); reloadAccount(); } }
    catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); }
  };
  const verified = Boolean(w.domain_verified_at);
  const txt = `melo-verification=${w.dns_token ?? ""}`;
  return (
    <>
      <Header title="Email domains" sub={`Prove ${ws.name} owns its domain so people can use you@${w.domain ?? "yourcompany.com"} in Melo.`}
        action={isOwner && <Button icon="plus" variant={w.domain ? "line" : "dark"} onClick={() => setAdding(true)}>{w.domain ? "Change domain" : "Add domain"}</Button>} />
      <Body>
        {!w.domain ? (
          <Card><Empty icon="globe" title="No domain yet" body="Everyone uses free @melo.to addresses for now. Add your company’s domain to verify it." action={isOwner && <Button onClick={() => setAdding(true)}>Add domain</Button>} /></Card>
        ) : (
          <>
            <Card className="flex items-center gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-hover"><Icon name="globe" /></span>
              <div className="flex-1"><p className="font-medium">{w.domain}</p><p className="text-[13px] text-ink-3">{verified ? `Verified ${ago(w.domain_verified_at!)}` : "Waiting for the TXT record"}</p></div>
              <Tag tone={verified ? "ok" : "warn"} icon={verified ? "check" : "clock"}>{verified ? "Verified" : "Pending"}</Tag>
            </Card>
            {isAdmin && (
              <Card className="overflow-hidden">
                <div className="hidden grid-cols-[150px_70px_110px_1fr_110px] border-b border-line bg-subtle px-4 py-2.5 text-xs text-ink-3 md:grid"><span>Purpose</span><span>Type</span><span>Name / host</span><span>Value</span><span>Status</span></div>
                <DnsRow purpose="Ownership" type="TXT" host="@" value={txt} status={verified ? "found" : check ? (check.found ? "found" : "waiting") : "waiting"} />
                <DnsRow purpose="Mail delivery" type="MX" host="@" value="Sent to you when Melo inboxes open" status="later" />
              </Card>
            )}
            {isAdmin && !verified && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-ink-3"><Icon name="clock" />{check ? `Last checked ${ago(check.at)} — ${check.found ? "found" : "not found yet. DNS changes can take up to an hour."}` : "Add the TXT record where you bought the domain, then check."}</span>
                <div className="flex gap-2">
                  <Button variant="soft" icon="copy" onClick={() => copy(`Please add this DNS record for ${w.domain}:\nType: TXT\nHost: @\nValue: ${txt}`).then(() => toast("Instructions copied — paste them to your IT team"))}>Copy for my IT team</Button>
                  <Button onClick={verify} busy={busy}>Check now</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Body>
      <Modal open={adding} onClose={() => setAdding(false)} title={w.domain ? "Change domain" : "Add a domain"} footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={add} busy={busy} disabled={!domain.trim()}>Continue</Button></>}>
        <Field label="Company domain" hint={w.domain ? "Changing the domain resets verification." : "We’ll give you one TXT record to prove it’s yours. Your current email keeps working."}>
          <Input value={domain} onChange={setDomain} placeholder="acmestudio.com" autoFocus onEnter={add} />
        </Field>
      </Modal>
    </>
  );
}
function DnsRow({ purpose, type, host, value, status }: { purpose: string; type: string; host: string; value: string; status: "found" | "waiting" | "later" }) {
  const toast = useToast();
  return (
    <div className="grid grid-cols-1 gap-1.5 border-b border-line px-4 py-3 text-sm last:border-0 md:grid-cols-[150px_70px_110px_1fr_110px] md:items-center md:gap-0">
      <span className="font-medium">{purpose}</span>
      <span><Tag>{type}</Tag></span>
      <span className="font-mono text-[13px]">{host}</span>
      <span className="flex min-w-0 items-center gap-1.5"><code className="truncate rounded-lg bg-subtle px-2 py-1 font-mono text-[12.5px]">{value}</code>
        {status !== "later" && <IconButton icon="copy" label={`Copy ${type} value`} onClick={() => copy(value).then(() => toast("Copied"))} />}</span>
      <span>{status === "found" ? <Tag tone="ok" icon="check">Found</Tag> : status === "waiting" ? <Tag tone="warn" icon="clock">Waiting</Tag> : <Tag>Later</Tag>}</span>
    </div>
  );
}

/* ---------------- Billing ---------------- */
function BillingPage() {
  const { ws, people } = useApp();
  return (
    <>
      <Header title="Billing" sub="Melo for Business is free while it’s in early access." />
      <Body>
        <Card className="flex flex-wrap items-center gap-4 p-6">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Icon name="bolt" className="size-5" /></span>
          <div className="flex-1"><p className="text-[18px] font-medium">Early access · Free</p><p className="text-sm text-ink-3">{ws.name} · {people.length} {people.length === 1 ? "member" : "members"} · no card on file</p></div>
          <Tag tone="ok" icon="check">Active</Tag>
        </Card>
        <p className="text-sm text-ink-3">We’ll email workspace owners well before paid plans start. Nothing changes until you choose a plan.</p>
      </Body>
    </>
  );
}

function Loading() {
  return <div className="flex flex-col gap-4 px-10 pt-10"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96" /><Skeleton className="mt-4 h-40" /></div>;
}
export type { Invite };
