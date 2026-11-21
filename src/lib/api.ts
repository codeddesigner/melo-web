/* Melo backend client — Supabase (Postgres + auth) over REST, with codes and mail sent through Delivrie. */
const URL = "https://uvlcltwmlemqzdupxgkb.supabase.co";
const KEY = "sb_publishable_wUVyZTl3FzpfCN7UvCiFjw_Vi8UWgwW";
const STORE = "melo.session";

export interface Session { access_token: string; refresh_token: string; expires_at?: number; user: { id: string; email: string } }
export type Role = "owner" | "admin" | "member" | "guest";
export type MailProvider = "melo" | "melodomain" | "google" | "microsoft" | "imap";

export interface Profile { full_name: string | null; display_name: string | null; title: string | null; melo_address: string | null; work_email: string | null; prefs: Record<string, unknown> }
export interface WorkspaceSummary { id: string; name: string; slug: string; kind: "business" | "personal"; domain: string | null; mail_provider: MailProvider | null; domain_verified_at: string | null; created_at: string; role: Role }
export interface Account { email: string; profile: Profile | null; workspaces: WorkspaceSummary[] }
export interface Person { user_id: string; role: Role; name: string | null; full_name: string | null; email: string; melo_address: string | null }
export interface Invite { id: string; email: string; role: Role; created_at: string; sent_at: string | null; expired: boolean }
export interface Overview {
  my_role: Role;
  workspace: { id: string; name: string; slug: string; domain: string | null; team_size: string | null; mail_provider: MailProvider | null; domain_has_mail: boolean | null; dns_token: string | null; domain_verified_at: string | null; created_at: string };
  members: (Person & { joined: string })[];
  invites: Invite[];
  rules: Record<string, boolean>;
}
export interface Channel { id: string; workspace_id: string; name: string; topic: string | null; is_private: boolean; dm_users: string[] | null; created_at: string }
export interface Message { id: string; channel_id: string; workspace_id: string; user_id: string; body: string; created_at: string; parent_id?: string | null; kind?: "text" | "huddle"; pinned_at?: string | null; pinned_by?: string | null }
export interface Reaction { message_id: string; user_id: string; emoji: string }
export interface Project { id: string; workspace_id: string; name: string; color: string; created_at: string }
export interface BookingLink { id: string; workspace_id: string; user_id: string; slug: string; title: string; duration_min: number; enabled: boolean; description: string | null; location: "video" | "phone" | "in_person"; created_at: string }
export interface BookingSettings { tz: string; hours: Record<string, [number, number]>; buffer_min: number; notice_min: number }
export interface BookingPage { owner: string; tz: string; title?: string; duration?: number; description?: string | null; location?: BookingLink["location"]; workspace?: string; slots?: string[]; links?: { slug: string; title: string; duration: number; description: string | null; location: BookingLink["location"] }[] }
export type TaskStatus = "todo" | "in_progress" | "done";
export type Priority = "low" | "normal" | "high" | "urgent";
export interface Task { id: string; workspace_id: string; title: string; status: TaskStatus; priority: Priority; assignee: string | null; due: string | null; tags: string[]; source: string | null; source_ref?: string | null; project_id?: string | null; created_by: string | null; created_at: string }
export interface CalEvent { id: string; workspace_id: string; user_id: string; title: string; starts_at: string; ends_at: string; color: string; location: string | null }
export type MailCategory = "primary" | "newsletters" | "receipts" | "updates" | "screener";
export interface MailMessage { id: string; folder: "inbox" | "sent" | "draft" | "archive" | "trash"; category?: MailCategory; snoozed_until?: string | null; from_addr: string; from_name?: string | null; to_addrs: string[]; subject: string; body: string; html?: string | null; read_at?: string | null; created_at: string }
export interface SecurityInfo { password_account: boolean; recovery_email: string | null; sign_in_email: string }

export class ApiError extends Error { constructor(message: string, public status = 0, public code?: string) { super(message); } }

/* ---------- session store (shared across tabs) ---------- */
const listeners = new Set<() => void>();
function read(): Session | null { try { return JSON.parse(localStorage.getItem(STORE) || "null") as Session | null; } catch { return null; } }
let session: Session | null = read();
function setSession(s: Session | null) {
  session = s;
  try { s ? localStorage.setItem(STORE, JSON.stringify(s)) : localStorage.removeItem(STORE); } catch { /* private mode */ }
  listeners.forEach((l) => l());
}
if (typeof window !== "undefined") window.addEventListener("storage", (e) => { if (e.key === STORE) { session = read(); listeners.forEach((l) => l()); } });
export const auth = {
  get: () => session,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  signOut() { setSession(null); },
};

/* ---------- transport ---------- */
const offline = "Can’t reach Melo right now. Check your connection and try again.";
async function request<T>(path: string, init: RequestInit & { authed?: boolean; prefer?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { apikey: KEY, "Content-Type": "application/json" };
  if (init.authed && session) headers.Authorization = `Bearer ${session.access_token}`;
  if (init.prefer) headers.Prefer = init.prefer;
  let r: Response;
  try { r = await fetch(URL + path, { ...init, headers }); } catch { throw new ApiError(offline); }
  const text = await r.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (r.status === 401 && init.authed) { setSession(null); throw new ApiError("Your session expired. Sign in again.", 401); }
  if (!r.ok) {
    const d = (data ?? {}) as { error?: string; message?: string; msg?: string; code?: string };
    throw new ApiError(d.error || d.message || d.msg || "Something went wrong. Try again.", r.status, d.code);
  }
  return data as T;
}
let refreshing: Promise<void> | null = null;
async function fresh() {
  if (!session?.refresh_token) return;
  if (session.expires_at && session.expires_at * 1000 - Date.now() > 60_000) return;
  refreshing ??= (async () => {
    try {
      const d = await request<{ access_token: string; refresh_token: string; expires_at: number; user: { id: string; email: string } }>(
        "/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session!.refresh_token }) });
      setSession({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at, user: { id: d.user.id, email: d.user.email } });
    } catch (e) { setSession(null); throw e; } finally { refreshing = null; }
  })();
  await refreshing;
}
async function rest<T>(method: string, path: string, body?: unknown, prefer?: string): Promise<T> {
  await fresh();
  if (!session) throw new ApiError("Your session expired. Sign in again.", 401);
  return request<T>("/rest/v1/" + path, { method, authed: true, prefer, body: body === undefined ? undefined : JSON.stringify(body) });
}
const rpc = <T>(name: string, args: Record<string, unknown> = {}) => rest<T>("POST", "rpc/" + name, args);
async function fn<T>(action: string, extra: Record<string, unknown> = {}, authed = true): Promise<T> {
  if (authed) await fresh();
  return request<T>("/functions/v1/email-code", { method: "POST", body: JSON.stringify({ action, ...(authed ? { access_token: session?.access_token } : {}), ...extra }) });
}
const q = encodeURIComponent;

/* ---------- API ---------- */
let mailScope = "";
export const api = {
  /* sign-in and sign-up */
  sendCode: (email: string, mode?: "signin") => fn<{ ok: true; to: string }>("send", { email, mode }, false),
  async verifyCode(email: string, code: string, mode?: "signin") {
    const d = await fn<{ session: Session }>("verify", { email, code, mode }, false);
    setSession(d.session);
    return d.session;
  },
  /* Melo-only accounts (address + password) */
  signinMethod: (email: string) => fn<{ method: "password" | "code"; address?: string }>("signin_method", { email }, false),
  async passwordSignIn(email: string, password: string) { const d = await fn<{ session: Session }>("password_signin", { email, password }, false); setSession(d.session); return d.session; },
  async meloSignup(p: { name: string; address: string; password: string; personal: boolean }) { const d = await fn<{ session: Session }>("melo_signup", p, false); setSession(d.session); return d.session; },
  resetSend: (email: string) => fn<{ ok: true; to: string }>("reset_send", { email }, false),
  async resetVerify(email: string, code: string, password: string) { const d = await fn<{ session?: Session }>("reset_verify", { email, code, password }, false); if (d.session) setSession(d.session); return d.session; },
  securityInfo: () => fn<SecurityInfo>("security_info"),
  setPassword: (current: string, password: string) => fn<{ ok: true }>("set_password", { current, password }),
  recoverySend: (email: string) => fn<{ ok: true }>("recovery_send", { email }),
  recoveryVerify: (email: string, code: string) => fn<{ ok: true; recovery_email: string }>("recovery_verify", { email, code }),
  addressAvailable: (u: string) => request<boolean>("/rest/v1/rpc/melo_address_available", { method: "POST", body: JSON.stringify({ p_user: u }) }),
  slugAvailable: (s: string) => request<boolean>("/rest/v1/rpc/workspace_slug_available", { method: "POST", body: JSON.stringify({ p_slug: s }) }),
  async completeOnboarding(p: Record<string, unknown>) { await fresh(); return request<{ workspace_id?: string; dns_token?: string; joined?: boolean; accepted?: boolean; workspace?: string }>("/rest/v1/rpc/complete_onboarding", { method: "POST", authed: true, body: JSON.stringify({ p }) }); },
  requestDemo: (row: Record<string, string | null>) => request<null>("/rest/v1/demo_requests", { method: "POST", body: JSON.stringify(row), prefer: "return=minimal" }),

  /* account */
  async account(): Promise<Account | null> {
    await fresh();
    if (!session) return null;
    const uid = session.user.id;
    const [profiles, members] = await Promise.all([
      rest<Profile[]>("GET", `profiles?select=full_name,display_name,title,melo_address,work_email,prefs&id=eq.${uid}`),
      rest<{ role: Role; workspaces: Omit<WorkspaceSummary, "role"> | null }[]>("GET", `workspace_members?select=role,workspaces(id,name,slug,kind,domain,mail_provider,domain_verified_at,created_at)&user_id=eq.${uid}&order=created_at.asc`),
    ]);
    return { email: session.user.email, profile: profiles[0] ?? null, workspaces: members.filter((m) => m.workspaces).map((m) => ({ ...m.workspaces!, role: m.role })) };
  },
  ensurePersonalSpace: () => rpc<string>("ensure_personal_space"),
  updateProfile: (patch: Partial<Pick<Profile, "full_name" | "display_name" | "title" | "prefs" | "melo_address">>) =>
    rest<null>("PATCH", `profiles?id=eq.${session?.user.id}`, patch, "return=minimal"),

  /* workspace administration */
  overview: (ws: string) => rpc<Overview>("workspace_overview", { p_ws: ws }),
  people: (ws: string) => rpc<Person[]>("workspace_people", { p_ws: ws }),
  invite: (ws: string, emails: string[], role: Role) => rpc<number>("workspace_invite", { p_ws: ws, p_emails: emails, p_role: role }),
  sendInvites: (ws: string, inviteId?: string) => fn<{ sent: number }>("invites", { workspace_id: ws, invite_id: inviteId }),
  revokeInvite: (id: string) => rpc<null>("workspace_revoke_invite", { p_invite: id }),
  setRole: (ws: string, user: string, role: Role) => rpc<null>("workspace_set_role", { p_ws: ws, p_user: user, p_role: role }),
  removeMember: (ws: string, user: string) => rpc<null>("workspace_remove_member", { p_ws: ws, p_user: user }),
  setRule: (ws: string, key: string, enabled: boolean) => rpc<null>("workspace_set_rule", { p_ws: ws, p_key: key, p_enabled: enabled }),
  rename: (ws: string, name: string) => rpc<null>("workspace_rename", { p_ws: ws, p_name: name }),
  setDomain: (ws: string, domain: string) => rpc<string>("workspace_set_domain", { p_ws: ws, p_domain: domain }),
  verifyDomain: (ws: string) => fn<{ found: boolean; verified_at: string | null; checked_at: string }>("verify_domain", { workspace_id: ws }),

  /* team */
  channels: (ws: string) => rest<Channel[]>("GET", `channels?workspace_id=eq.${ws}&order=created_at.asc`),
  createChannel: async (ws: string, name: string, topic: string) =>
    (await rest<Channel[]>("POST", "channels", { workspace_id: ws, name, topic: topic || null, created_by: session?.user.id }, "return=representation"))[0],
  openDm: (ws: string, user: string) => rpc<string>("dm_open", { p_ws: ws, p_user: user }),
  messages: (channel: string, after?: string) =>
    rest<Message[]>("GET", `messages?channel_id=eq.${channel}${after ? `&created_at=gt.${q(after)}` : ""}&order=created_at.asc&limit=300`),
  latestMessages: (ws: string, since: string) => rest<Pick<Message, "channel_id" | "user_id" | "created_at">[]>("GET", `messages?workspace_id=eq.${ws}&created_at=gt.${q(since)}&select=channel_id,user_id,created_at&order=created_at.desc&limit=200`),
  postMessage: async (ws: string, channel: string, body: string, extra: { parent_id?: string; kind?: "huddle" } = {}) =>
    (await rest<Message[]>("POST", "messages", { workspace_id: ws, channel_id: channel, user_id: session?.user.id, body, ...extra }, "return=representation"))[0],
  pinned: (channel: string) => rest<Message[]>("GET", `messages?channel_id=eq.${channel}&pinned_at=not.is.null&order=pinned_at.desc&limit=50`),
  pin: (id: string, on: boolean) => rpc<null>("message_pin", { p_id: id, p_on: on }),
  reactions: (channel: string) => rest<Reaction[]>("GET", `message_reactions?select=message_id,user_id,emoji,messages!inner(channel_id)&messages.channel_id=eq.${channel}&limit=2000`),
  react: (message: string, emoji: string, on: boolean) => on
    ? rest<null>("POST", "message_reactions", { message_id: message, user_id: session?.user.id, emoji }, "resolution=ignore-duplicates,return=minimal")
    : rest<null>("DELETE", `message_reactions?message_id=eq.${message}&user_id=eq.${session?.user.id}&emoji=eq.${q(emoji)}`),
  /* Workspace-wide views for Threads / Mentions / Huddles */
  workspaceMessages: (ws: string, filter: string) => rest<Message[]>("GET", `messages?workspace_id=eq.${ws}&${filter}&order=created_at.desc&limit=200`),
  /* Chat attachments (private bucket, path starts with the workspace id) */
  async upload(ws: string, file: File) {
    await fresh(); if (!session) throw new ApiError("Your session expired. Sign in again.", 401);
    const path = `${ws}/${crypto.randomUUID()}/${file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file"}`;
    let r: Response;
    try { r = await fetch(`${URL}/storage/v1/object/attachments/${path.split("/").map(q).join("/")}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" }, body: file }); } catch { throw new ApiError(offline); }
    if (!r.ok) { const d = await r.json().catch(() => ({})) as { message?: string; error?: string }; throw new ApiError(r.status === 413 ? "That file is over 25 MB." : d.message || d.error || "Upload failed.", r.status); }
    return path;
  },
  async fileUrl(path: string) {
    await fresh(); if (!session) throw new ApiError("Your session expired. Sign in again.", 401);
    const d = await request<{ signedURL: string }>(`/storage/v1/object/sign/attachments/${path.split("/").map(q).join("/")}`, { method: "POST", authed: true, body: JSON.stringify({ expiresIn: 600 }) });
    return URL + "/storage/v1" + d.signedURL;
  },
  deleteMessage: (id: string) => rest<null>("DELETE", `messages?id=eq.${id}`),

  /* work */
  projects: (ws: string) => rest<Project[]>("GET", `projects?workspace_id=eq.${ws}&order=created_at.asc`),
  createProject: async (ws: string, name: string, color: string) => (await rest<Project[]>("POST", "projects", { workspace_id: ws, name, color }, "return=representation"))[0],
  deleteProject: (id: string) => rest<null>("DELETE", `projects?id=eq.${id}`),
  bookingLinks: () => rest<BookingLink[]>("GET", `booking_links?user_id=eq.${session?.user.id}&order=created_at.asc`),
  createBookingLink: async (l: Pick<BookingLink, "workspace_id" | "slug" | "title" | "duration_min" | "description" | "location">) => (await rest<BookingLink[]>("POST", "booking_links", { ...l, user_id: session?.user.id }, "return=representation"))[0],
  updateBookingLink: (id: string, patch: Partial<BookingLink>) => rest<null>("PATCH", `booking_links?id=eq.${id}`, patch, "return=minimal"),
  bookingCounts: (since: string) => rest<{ link_id: string }[]>("GET", `bookings?select=link_id&created_at=gte.${q(since)}`),
  bookingSettings: async () => (await rest<BookingSettings[]>("GET", `booking_settings?user_id=eq.${session?.user.id}&select=tz,hours,buffer_min,notice_min`))[0] ?? null,
  saveBookingSettings: (b: BookingSettings) => rest<null>("POST", "booking_settings?on_conflict=user_id", { ...b, user_id: session?.user.id }, "resolution=merge-duplicates,return=minimal"),
  deleteBookingLink: (id: string) => rest<null>("DELETE", `booking_links?id=eq.${id}`),
  bookingPage: (handle: string, slug?: string) => request<BookingPage | null>("/rest/v1/rpc/booking_page", { method: "POST", body: JSON.stringify({ p_handle: handle, p_slug: slug ?? null }) }),
  bookSlot: (handle: string, slug: string, start: string, name: string, email: string, note: string) => request<{ ok: true; starts_at: string; ends_at: string }>("/rest/v1/rpc/book_slot", { method: "POST", body: JSON.stringify({ p_handle: handle, p_slug: slug, p_start: start, p_name: name, p_email: email, p_note: note }) }),
  tasks: (ws: string) => rest<Task[]>("GET", `tasks?workspace_id=eq.${ws}&order=created_at.desc`),
  createTask: async (t: Partial<Task> & { workspace_id: string; title: string }) => (await rest<Task[]>("POST", "tasks", { ...t, created_by: session?.user.id }, "return=representation"))[0],
  updateTask: async (id: string, patch: Partial<Task>) => (await rest<Task[]>("PATCH", `tasks?id=eq.${id}`, patch, "return=representation"))[0],
  deleteTask: (id: string) => rest<null>("DELETE", `tasks?id=eq.${id}`),

  /* calendar */
  events: (ws: string, from: string, to: string) => rest<CalEvent[]>("GET", `events?workspace_id=eq.${ws}&starts_at=lt.${q(to)}&ends_at=gt.${q(from)}&order=starts_at.asc`),
  createEvent: async (e: Omit<CalEvent, "id" | "user_id">) => (await rest<CalEvent[]>("POST", "events", { ...e, user_id: session?.user.id }, "return=representation"))[0],
  deleteEvent: (id: string) => rest<null>("DELETE", `events?id=eq.${id}`),

  /* mail */
  /* Each space has its own mailbox. Mail to your @melo.to address (no workspace) lives in Personal;
     a business workspace shows its own mail (and the @melo.to mail too when there is no Personal space). */
  setMailScope(ws: string, includeUnfiled: boolean) { mailScope = includeUnfiled ? `&or=(workspace_id.is.null,workspace_id.eq.${ws})` : `&workspace_id=eq.${ws}`; },
  mail: (folder: MailMessage["folder"]) => rest<MailMessage[]>("GET", `mail_messages?folder=eq.${folder}${mailScope}&select=id,workspace_id,folder,category,snoozed_until,from_addr,from_name,to_addrs,subject,body,read_at,created_at&order=created_at.desc&limit=200`),
  /* Unread inbox mail across every space, for the account switcher */
  unreadMail: () => rest<{ workspace_id: string | null; category: string | null; snoozed_until: string | null }[]>("GET", "mail_messages?folder=eq.inbox&read_at=is.null&select=workspace_id,category,snoozed_until&limit=2000"),
  mailHtml: async (id: string) => (await rest<{ html: string | null }[]>("GET", `mail_messages?id=eq.${id}&select=html`))[0]?.html ?? null,
  markRead: (id: string, read = true) => rest<null>("PATCH", `mail_messages?id=eq.${id}`, { read_at: read ? new Date().toISOString() : null }, "return=minimal"),
  moveMail: (id: string, folder: MailMessage["folder"]) => rest<null>("PATCH", `mail_messages?id=eq.${id}`, { folder }, "return=minimal"),
  sendMail: (to: string[], subject: string, body: string, ws?: string) => fn<{ ok: true; id: string; created_at: string }>("send_mail", { to, subject, body, workspace_id: ws }),
  saveDraft: async (d: { id?: string; to: string[]; subject: string; body: string; from: string; ws?: string }) => d.id
    ? (await rest<MailMessage[]>("PATCH", `mail_messages?id=eq.${d.id}`, { to_addrs: d.to, subject: d.subject, body: d.body }, "return=representation"))[0]
    : (await rest<MailMessage[]>("POST", "mail_messages", { user_id: session?.user.id, workspace_id: d.ws ?? null, folder: "draft", from_addr: d.from, to_addrs: d.to, subject: d.subject, body: d.body }, "return=representation"))[0],
  snooze: (id: string, until: string | null) => rest<null>("PATCH", `mail_messages?id=eq.${id}`, { snoozed_until: until }, "return=minimal"),
  setCategory: (id: string, category: MailCategory) => rest<null>("PATCH", `mail_messages?id=eq.${id}`, { category }, "return=minimal"),
  /* Screener: allow or block a sender; everything they've already sent follows */
  senders: () => rest<{ address: string; status: "allowed" | "blocked"; created_at?: string }[]>("GET", "mail_senders?select=address,status&order=address.asc"),
  async setSender(address: string, status: "allowed" | "blocked" | null) {
    const a = address.toLowerCase();
    if (status === null) return rest<null>("DELETE", `mail_senders?address=eq.${q(a)}`);
    await rest<null>("POST", "mail_senders?on_conflict=user_id,address", { user_id: session?.user.id, address: a, status }, "resolution=merge-duplicates,return=minimal");
    if (status === "allowed") await rest<null>("PATCH", `mail_messages?from_addr=eq.${q(a)}&category=eq.screener&folder=eq.inbox`, { category: "primary" }, "return=minimal");
    else await rest<null>("PATCH", `mail_messages?from_addr=eq.${q(a)}&folder=eq.inbox`, { folder: "trash" }, "return=minimal");
    return null;
  },
  deleteMail: (id: string) => rest<null>("DELETE", `mail_messages?id=eq.${id}`),

  /* public DNS lookups (domain setup) */
  async dns(name: string, type: "TXT" | "MX"): Promise<string[]> {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${q(name)}&type=${type}`, { headers: { accept: "application/dns-json" } });
      const d = (await r.json()) as { Answer?: { data: string }[] };
      return (d.Answer ?? []).map((a) => String(a.data).replace(/^"|"$/g, "").replace(/" "/g, "").replace(/\.$/, "").toLowerCase());
    } catch { return []; }
  },
};
