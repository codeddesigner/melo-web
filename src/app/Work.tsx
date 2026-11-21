import { useMemo, useState } from "react";
import { Link } from "../lib/router";
import { api, auth, type Priority, type Project, type Task, type TaskStatus } from "../lib/api";
import { navigate, useLocation } from "../lib/router";
import { addDays, colorFor, cx, dueLabel, isoDate, parseDate, sameDay, startOfDay, startOfWeek } from "../lib/util";
import { Icon } from "../components/icons";
import { Avatar, Button, Empty, Field, IconButton, Input, Menu, Modal, Select, Skeleton, Tag, useAsync, useConfirm, useToast } from "../components/ui";
import { useApp } from "./context";
import { Panel, SideItem, SideLabel, SideNav, SideSearch } from "./AppRoot";

const STATUS: { key: TaskStatus; label: string; dot: string }[] = [
  { key: "in_progress", label: "In progress", dot: "#1b87f5" },
  { key: "todo", label: "To do", dot: "#80868b" },
  { key: "done", label: "Done", dot: "#2ea44f" },
];
const PRIO: Record<Priority, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "#e5484d" }, high: { label: "High", color: "#f7b500" }, normal: { label: "Normal", color: "#4a90e2" }, low: { label: "Low", color: "#a0a6ae" },
};
type View = "mine" | "by-me" | "week" | "all" | "done" | "mail" | "chat" | "project";
const PCOLORS: Record<string, string> = { purple: "#5b3fbf", orange: "#f07b1e", teal: "#14a3a0", blue: "#1b87f5", pink: "#e2468b", green: "#2ea44f" };
const SOFT: Record<string, string> = { purple: "#e8def8", orange: "#ffe0cc", teal: "#c8ece9", blue: "#d3e3fd", pink: "#fddbe7", green: "#c9eed3" };

export default function Work() {
  const { ws, nameOf, people, personal } = useApp();
  const { parts, query } = useLocation();
  const toast = useToast();
  const me = auth.get()?.user.id ?? "";
  const tasks = useAsync<Task[]>(() => api.tasks(ws.id), [ws.id]);
  const projects = useAsync<Project[]>(() => api.projects(ws.id), [ws.id]);
  const view = (parts[2] === "p" ? "project" : ["mine", "by-me", "week", "all", "done", "mail", "chat"].includes(parts[2] ?? "") ? parts[2] : "all") as View;
  const project = view === "project" ? projects.data?.find((p) => p.id === parts[3]) : undefined;
  const tag = query.get("tag");
  const [prio, setPrio] = useState<Priority | null>(null);
  const [who, setWho] = useState<string | null>(null);
  const [newProject, setNewProject] = useState(false);
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [layout, setLayout] = useState<"list" | "board" | "calendar">("list");
  const [newDue, setNewDue] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const all = tasks.data ?? [];
  const weekEnd = addDays(startOfDay(new Date()), 7);
  const inView = (t: Task, v: View) => v === "mine" ? t.assignee === me && t.status !== "done" : v === "by-me" ? t.created_by === me && t.assignee !== me && t.status !== "done"
    : v === "week" ? Boolean(t.due && parseDate(t.due) < weekEnd && t.status !== "done") : v === "done" ? t.status === "done"
    : v === "mail" ? Boolean(t.source && !/^[#@]/.test(t.source)) : v === "chat" ? Boolean(t.source && /^[#@]/.test(t.source)) : v === "project" ? t.project_id === parts[3] : true;
  const scoped = all.filter((t) => inView(t, view));
  const shown = scoped.filter((t) => (!tag || t.tags.includes(tag)) && (!prio || t.priority === prio) && (!who || t.assignee === who) && (!q || t.title.toLowerCase().includes(q.toLowerCase())));
  const scopedTags = useMemo(() => [...new Set(scoped.flatMap((t) => t.tags))].slice(0, 8), [scoped]);
  const dueThisWeek = shown.filter((t) => t.due && parseDate(t.due) < weekEnd && t.status !== "done").length;
  const tags = useMemo(() => { const m = new Map<string, number>(); all.forEach((t) => t.tags.forEach((g) => m.set(g, (m.get(g) ?? 0) + 1))); return [...m].sort((a, b) => b[1] - a[1]); }, [all]);
  const count = (v: View) => all.filter((t) => inView(t, v)).length;

  const update = async (t: Task, patch: Partial<Task>) => {
    tasks.set((d) => (d ?? []).map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    try { await api.updateTask(t.id, patch); } catch (e) { toast((e as Error).message, "bad"); tasks.reload(); }
  };
  const toggleDone = (t: Task) => update(t, { status: t.status === "done" ? "todo" : "done" });
  const title = project?.name ?? (view === "mine" ? "My tasks" : view === "by-me" ? "Assigned by me" : view === "week" ? "Due this week" : view === "done" ? "Done" : view === "mail" ? "From mail" : view === "chat" ? "From chat" : view === "project" ? "Project" : "All tasks");
  const tagLink = (g: string | null) => { const qs = new URLSearchParams(location.search); if (g) qs.set("tag", g); else qs.delete("tag"); const s2 = qs.toString(); return location.pathname + (s2 ? `?${s2}` : ""); };
  const removeProject = async () => {
    if (!project || !(await confirm({ title: `Delete ${project.name}?`, body: "Its tasks stay, they just won’t belong to a project.", confirm: "Delete project", danger: true }))) return;
    projects.set((d) => (d ?? []).filter((p) => p.id !== project.id)); navigate("/app/work/all");
    try { await api.deleteProject(project.id); tasks.set((d) => (d ?? []).map((t) => (t.project_id === project.id ? { ...t, project_id: null } : t))); toast("Project deleted"); } catch (e) { toast((e as Error).message, "bad"); projects.reload(); }
  };
  const item = (v: View, icon: Parameters<typeof SideItem>[0]["icon"], label: string) => <SideItem key={v} to={`/app/work/${v}`} icon={icon} label={label} count={count(v)} active={view === v && !tag} accent={v === "mine"} />;

  return (
    <>
      <SideNav title="Work" action={<Button size="s" icon="plus" onClick={() => setEditing("new")}>New task</Button>}>
        <SideSearch value={q} onChange={setQ} placeholder="Search tasks" />
        {item("mine", "check", "My tasks")}
        {item("by-me", "users", "Assigned by me")}
        {item("week", "calendar", "Due this week")}
        {item("all", "list", "All tasks")}
        {item("done", "task", "Done")}
        {item("mail", "mail", "From mail")}
        {item("chat", "hash", "From chat")}
        <SideLabel action={<IconButton icon="plus" label="New project" className="size-6" onClick={() => setNewProject(true)} />}>Projects</SideLabel>
        {(projects.data ?? []).map((p) => <SideItem key={p.id} to={`/app/work/p/${p.id}`} dot={PCOLORS[p.color] ?? PCOLORS.purple} label={p.name} count={all.filter((t) => t.project_id === p.id && t.status !== "done").length} active={view === "project" && parts[3] === p.id} />)}
        {projects.data && !projects.data.length && <button type="button" onClick={() => setNewProject(true)} className="px-2.5 py-1 text-left text-xs text-ink-3 hover:text-ink">Group tasks into a project →</button>}
        {!!tags.length && <SideLabel>Tags</SideLabel>}
        {tags.map(([g, n]) => <SideItem key={g} to={`/app/work/${view}?tag=${encodeURIComponent(g)}`} dot={colorFor(g)} label={g} count={n} active={tag === g} />)}
      </SideNav>
      <Panel>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 md:px-6 gap-3">
          <h2 className="flex min-w-0 items-center gap-2 truncate text-[20px] leading-[26px] font-medium tracking-[-.3px]">{project && <span className="size-2.5 rounded-full" style={{ background: PCOLORS[project.color] }} />}{title}</h2>
          <div className="flex rounded-full bg-hover p-0.5">
            {(["list", "board", "calendar"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={layout === l} onClick={() => setLayout(l)} className={cx("flex h-7 items-center gap-1.5 rounded-full px-3 text-sm capitalize", layout === l ? "bg-white font-medium shadow-sm" : "text-ink-2 hover:text-ink")}><Icon name={l === "list" ? "list" : l === "board" ? "board" : "calendar"} className="size-4" />{l}</button>
            ))}
          </div>
          <span className="flex-1" />
          <div className="hidden -space-x-1.5 sm:flex">{people.slice(0, 5).map((p) => <Avatar key={p.user_id} name={p.name || p.email} id={p.user_id} size={26} className="ring-2 ring-white" />)}</div>
          {project && <Menu trigger={(t) => <IconButton icon="more" label="Project options" onClick={t} />} items={[{ label: "Delete project", icon: "trash", danger: true, onSelect: removeProject }]} />}
        </header>
        {/* Figma: Filter · All tags · tag chips · counts */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 pb-3 md:px-6">
          <Menu align="left" trigger={(t) => <button type="button" onClick={t} className={cx("flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px]", prio || who ? "bg-inverse text-white" : "bg-hover text-ink-2 hover:bg-active")}><Icon name="filter" className="size-3.5" />{prio || who ? [prio && PRIO[prio].label, who && nameOf(who).split(" ")[0]].filter(Boolean).join(" · ") : "Filter"}</button>} items={[
            ...(Object.keys(PRIO) as Priority[]).map((p) => ({ label: `${prio === p ? "✓ " : ""}${PRIO[p].label} priority`, icon: "flag" as const, onSelect: () => setPrio(prio === p ? null : p) })),
            ...people.slice(0, 8).map((p) => ({ label: `${who === p.user_id ? "✓ " : ""}${p.name || p.email}`, icon: "user" as const, onSelect: () => setWho(who === p.user_id ? null : p.user_id) })),
            ...(prio || who ? [{ label: "Clear filters", icon: "x" as const, onSelect: () => { setPrio(null); setWho(null); } }] : []),
          ]} />
          <Link to={tagLink(null)} className={cx("flex h-8 items-center rounded-full px-3 text-[13px]", !tag ? "bg-inverse text-white" : "bg-hover text-ink-2 hover:bg-active")}>All tags</Link>
          {scopedTags.map((g) => <Link key={g} to={tagLink(tag === g ? null : g)} className={cx("flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px]", tag === g ? "bg-inverse text-white" : "bg-hover text-ink-2 hover:bg-active")}><span className="size-1.5 rounded-full" style={{ background: colorFor(g) }} />{g}</Link>)}
          <span className="flex-1" />
          <span className="text-[13px] text-ink-3">{shown.length} {shown.length === 1 ? "task" : "tasks"}{dueThisWeek ? ` · ${dueThisWeek} due this week` : ""}</span>
        </div>
        <div className="melo-scroll flex-1 overflow-auto px-2 pb-8 md:px-6">
          {tasks.error ? <Empty icon="task" title="We couldn’t load tasks" body={tasks.error} action={<Button onClick={tasks.reload}>Try again</Button>} />
            : tasks.loading && !tasks.data ? <div className="flex flex-col gap-2 pt-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            : !shown.length && layout !== "calendar" ? <Empty icon="task" title={all.length ? "Nothing here" : "No tasks yet"} body={all.length ? "Try another view or tag." : personal ? "Keep track of your own to-dos with due dates and tags. Only you can see them." : "Track work with owners, due dates and tags. Everyone in the workspace can see and update tasks."} action={<Button icon="plus" onClick={() => setEditing("new")}>New task</Button>} />
            : layout === "calendar" ? <TaskCalendar tasks={shown} nameOf={nameOf} onOpen={setEditing} onNew={(d) => { setNewDue(d); setEditing("new"); }} />
            : layout === "list" ? <ListView tasks={shown} nameOf={nameOf} onOpen={setEditing} onToggle={toggleDone} />
            : <BoardView tasks={shown} nameOf={nameOf} onOpen={setEditing} onMove={(t, s) => update(t, { status: s })} />}
        </div>
      </Panel>
      {editing && <TaskModal task={editing === "new" ? null : editing} projects={projects.data ?? []} defaults={{ tags: tag ? [tag] : [], assignee: view === "mine" ? me : null, project: project?.id ?? null, due: newDue }} onClose={() => { setEditing(null); setNewDue(null); }}
        onSaved={(t, created) => { tasks.set((d) => created ? [t, ...(d ?? [])] : (d ?? []).map((x) => (x.id === t.id ? t : x))); setEditing(null); toast(created ? "Task created" : "Task saved"); }}
        onDeleted={(id) => { tasks.set((d) => (d ?? []).filter((x) => x.id !== id)); setEditing(null); toast("Task deleted"); }} />}
      <NewProject open={newProject} onClose={() => setNewProject(false)} onCreated={(p) => { projects.set((d) => [...(d ?? []), p]); navigate(`/app/work/p/${p.id}`); }} />
    </>
  );
}

function Check({ t, onToggle }: { t: Task; onToggle: (t: Task) => void }) {
  return (
    <button type="button" aria-label={t.status === "done" ? `Mark “${t.title}” not done` : `Mark “${t.title}” done`} onClick={(e) => { e.stopPropagation(); onToggle(t); }}
      className={cx("flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] active:scale-90", t.status === "done" ? "border-ok bg-ok text-white" : t.status === "in_progress" ? "border-accent hover:bg-accent-soft" : "border-icon-2 hover:bg-hover")}>
      {t.status === "done" && <span className="animate-tick"><Icon name="check" className="size-3" /></span>}
    </button>
  );
}
const ROW = "grid grid-cols-[minmax(0,1fr)_88px] items-center gap-x-3 px-3 md:grid-cols-[minmax(0,1fr)_130px_100px] lg:grid-cols-[minmax(0,1fr)_200px_130px_110px_100px]";
function TaskMeta({ t, nameOf }: { t: Task; nameOf: (id: string) => string }) {
  const due = dueLabel(t.due);
  return <>
    <span className="hidden flex-wrap gap-1 lg:flex">{t.tags.map((g) => <Tag key={g} dot={colorFor(g)}>{g}</Tag>)}</span>
    <span className="hidden items-center gap-1.5 text-sm md:flex">{t.assignee ? <><Avatar name={nameOf(t.assignee)} id={t.assignee} size={22} />{nameOf(t.assignee).split(" ")[0]}</> : <span className="text-ink-3">—</span>}</span>
    <span className={cx("text-sm", due.tone === "bad" && t.status !== "done" ? "text-bad" : due.tone === "warn" && t.status !== "done" ? "text-warn" : "text-ink-2")}>{due.text || <span className="text-ink-3">—</span>}</span>
    <span className="hidden items-center gap-1.5 text-sm lg:flex"><span style={{ color: PRIO[t.priority].color }} className="flex"><Icon name="flag" className="size-3.5" label={PRIO[t.priority].label} /></span>{PRIO[t.priority].label}</span>
  </>;
}
function ListView({ tasks, nameOf, onOpen, onToggle }: { tasks: Task[]; nameOf: (id: string) => string; onOpen: (t: Task) => void; onToggle: (t: Task) => void }) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  return (
    <div>
      <div className={cx(ROW, "border-b border-line py-2 text-xs text-ink-3")}><span>Task</span><span className="hidden lg:block">Tags</span><span className="hidden md:block">Assignee</span><span>Due</span><span className="hidden lg:block">Priority</span></div>
      {STATUS.map((s) => {
        const rows = tasks.filter((t) => t.status === s.key);
        if (!rows.length) return null;
        return (
          <div key={s.key}>
            <button type="button" aria-expanded={!closed[s.key]} onClick={() => setClosed((c) => ({ ...c, [s.key]: !c[s.key] }))} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-subtle">
              <Icon name="chev-down" className={cx("size-4 text-icon-2 transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]", closed[s.key] && "-rotate-90")} /><span className="size-2 rounded-full" style={{ background: s.dot }} />{s.label}<span className="font-normal text-ink-3">{rows.length}</span>
            </button>
            <div className={cx("grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)]", closed[s.key] ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100")} inert={closed[s.key] || undefined}>
            <div className="min-h-0 overflow-hidden">
            {rows.map((t) => (
              <div key={t.id} onClick={() => onOpen(t)}
                className={cx(ROW, "cursor-pointer border-b border-line py-2.5 hover:bg-subtle animate-fade-up")}>
                <span className="flex min-w-0 items-center gap-3">
                  <Check t={t} onToggle={onToggle} />
                  <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(t); }} className={cx("truncate text-left font-medium", t.status === "done" && "text-ink-3 line-through")}>{t.title}</button>
                  {t.source && <SourceChip t={t} />}
                </span>
                <TaskMeta t={t} nameOf={nameOf} />
              </div>
            ))}
            </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function BoardView({ tasks, nameOf, onOpen, onMove }: { tasks: Task[]; nameOf: (id: string) => string; onOpen: (t: Task) => void; onMove: (t: Task, s: TaskStatus) => void }) {
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  return (
    <div className="grid min-w-[720px] grid-cols-3 gap-4 pt-2">
      {[STATUS[1], STATUS[0], STATUS[2]].map((s) => {
        const rows = tasks.filter((t) => t.status === s.key);
        return (
          <div key={s.key} onDragOver={(e: unknown) => { (e as DragEvent).preventDefault(); if (over !== s.key) setOver(s.key); }} onDragLeave={(e: unknown) => { const ev = e as DragEvent & { currentTarget: HTMLElement }; if (!ev.currentTarget.contains(ev.relatedTarget as Node)) setOver(null); }}
            onDrop={() => { const t = tasks.find((x) => x.id === drag); if (t && t.status !== s.key) onMove(t, s.key); setDrag(null); setOver(null); }}
            className={cx("flex min-h-[300px] flex-col gap-2 rounded-2xl p-2.5 transition-[background-color,box-shadow] duration-200", over === s.key && drag ? "bg-accent-soft shadow-[inset_0_0_0_1.5px_var(--color-accent)]" : "bg-subtle")}>
            <p className="flex items-center gap-2 px-1.5 py-1 text-sm font-medium"><span className="size-2 rounded-full" style={{ background: s.dot }} />{s.label}<span className="font-normal text-ink-3">{rows.length}</span></p>
            {rows.map((t) => {
              const due = dueLabel(t.due);
              return (
                <div key={t.id} draggable onDragStart={() => setDrag(t.id)} onDragEnd={() => { setDrag(null); setOver(null); }} onClick={() => onOpen(t)}
                  className={cx("cursor-grab rounded-xl bg-white p-3 shadow-[0_0_0_1px_var(--color-line)] animate-fade-up hover:-translate-y-px hover:shadow-pop active:cursor-grabbing", drag === t.id && "rotate-1 opacity-50")}>
                  <p className={cx("font-medium", t.status === "done" && "text-ink-3 line-through")}>{t.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {t.tags.map((g) => <Tag key={g} dot={colorFor(g)}>{g}</Tag>)}
                    <span className="flex-1" />
                    {due.text && <span className={cx("text-xs", due.tone === "bad" ? "text-bad" : "text-ink-3")}>{due.text}</span>}
                    {t.assignee && <Avatar name={nameOf(t.assignee)} id={t.assignee} size={20} />}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function TaskModal({ task, projects, defaults, onClose, onSaved, onDeleted }: { task: Task | null; projects: Project[]; defaults: { tags: string[]; assignee: string | null; project: string | null; due: string | null }; onClose: () => void; onSaved: (t: Task, created: boolean) => void; onDeleted: (id: string) => void }) {
  const { ws, people } = useApp();
  const toast = useToast();
  const [f, setF] = useState({
    title: task?.title ?? "", status: task?.status ?? ("todo" as TaskStatus), priority: task?.priority ?? ("normal" as Priority),
    assignee: task?.assignee ?? defaults.assignee ?? "", due: task?.due ?? defaults.due ?? "", tags: (task?.tags ?? defaults.tags).join(", "), project: task?.project_id ?? defaults.project ?? "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.title.trim()) return toast("Give the task a title.", "bad");
    setBusy(true);
    const body = { title: f.title.trim(), status: f.status, priority: f.priority, assignee: f.assignee || null, due: f.due || null, tags: [...new Set(f.tags.split(",").map((x) => x.trim().toLowerCase().replace(/^#/, "")).filter(Boolean))].slice(0, 8), project_id: f.project || null };
    try { if (task) onSaved(await api.updateTask(task.id, body), false); else onSaved(await api.createTask({ ...body, workspace_id: ws.id }), true); }
    catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); }
  };
  const confirm = useConfirm();
  const del = async () => { if (!task || !(await confirm({ title: "Delete this task?", body: `“${task.title}” will be removed for everyone in the workspace.`, confirm: "Delete", danger: true }))) return; try { await api.deleteTask(task.id); onDeleted(task.id); } catch (e) { toast((e as Error).message, "bad"); } };
  const quickDue = [["Today", isoDate(new Date())], ["Tomorrow", isoDate(addDays(new Date(), 1))], ["Next week", isoDate(addDays(new Date(), 7))]];
  return (
    <Modal open onClose={onClose} title={task ? "Edit task" : "New task"} width={560}
      footer={<>{task && <IconButton icon="trash" label="Delete task" onClick={del} className="mr-auto hover:text-bad" />}<Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} busy={busy}>{task ? "Save" : "Create task"}</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Title"><Input value={f.title} onChange={(v) => setF({ ...f, title: v })} placeholder="Decide dashboard palette" autoFocus onEnter={save} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status"><Select label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={STATUS.map((s) => ({ value: s.key, label: s.label }))} /></Field>
          <Field label="Priority"><Select label="Priority" value={f.priority} onChange={(v) => setF({ ...f, priority: v })} options={(Object.keys(PRIO) as Priority[]).map((p) => ({ value: p, label: PRIO[p].label }))} /></Field>
          <Field label="Assignee"><Select label="Assignee" value={f.assignee} onChange={(v) => setF({ ...f, assignee: v })} options={[{ value: "", label: "Unassigned" }, ...people.map((p) => ({ value: p.user_id, label: p.name || p.email }))]} /></Field>
          <Field label="Due date"><input type="date" aria-label="Due date" value={f.due} onChange={(e) => setF({ ...f, due: (e.target as HTMLInputElement).value })} className="h-8 rounded-full bg-hover px-3 text-sm outline-none hover:bg-active focus:shadow-[0_0_0_3px_rgba(27,135,245,.15)]" /></Field>
        </div>
        <div className="-mt-2 flex gap-1.5">{quickDue.map(([l, d]) => <button key={l} type="button" onClick={() => setF({ ...f, due: d })} className={cx("h-7 rounded-full px-2.5 text-xs active:scale-95", f.due === d ? "bg-inverse text-white" : "bg-hover hover:bg-active")}>{l}</button>)}</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tags" hint="Comma separated, like design, client"><Input value={f.tags} onChange={(v) => setF({ ...f, tags: v })} placeholder="design, client" onEnter={save} /></Field>
          <Field label="Project"><Select label="Project" value={f.project} onChange={(v) => setF({ ...f, project: v })} options={[{ value: "", label: "No project" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} /></Field>
        </div>
        {task?.source && <p className="flex items-center gap-2 text-[13px] text-ink-3">Created from <SourceChip t={task} /></p>}
      </div>
    </Modal>
  );
}

function SourceChip({ t }: { t: Task }) {
  const chat = /^[#@]/.test(t.source!);
  const to = t.source_ref ? (chat ? `/app/team/${t.source_ref}` : `/app/mail/inbox/${t.source_ref}`) : null;
  const inner = <><Icon name={t.source!.startsWith("@") ? "comment" : chat ? "hash" : "mail"} className="size-3" />{t.source!.replace(/^[#@]/, "")}</>;
  const cls = "hidden shrink-0 items-center gap-1 rounded-md bg-hover px-1.5 py-0.5 text-xs text-ink-3 xl:inline-flex";
  return to ? <button type="button" onClick={(e) => { e.stopPropagation(); navigate(to); }} className={cx(cls, "hover:text-ink")}>{inner}</button> : <span className={cls}>{inner}</span>;
}

/* Figma: Work · Calendar — tasks on their due dates */
function TaskCalendar({ tasks, nameOf, onOpen, onNew }: { tasks: Task[]; nameOf: (id: string) => string; onOpen: (t: Task) => void; onNew: (due: string) => void }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const start = startOfWeek(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today = new Date();
  const undated = tasks.filter((t) => !t.due && t.status !== "done");
  return (
    <div className="pt-3">
      <div className="mb-3 flex items-center gap-2">
        <b className="text-[15px] font-medium">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</b>
        <IconButton icon="chev-left" label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
        <IconButton icon="chev-right" label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
        <Button size="s" variant="soft" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</Button>
        <span className="flex-1" />{undated.length > 0 && <span className="text-[13px] text-ink-3">{undated.length} without a due date</span>}
      </div>
      <div className="grid min-w-[700px] grid-cols-7 overflow-hidden rounded-2xl border border-line">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="border-b border-line bg-subtle px-2 py-1.5 text-[12px] text-ink-3">{d}</div>)}
        {days.map((d, i) => {
          const list = tasks.filter((t) => t.due && sameDay(parseDate(t.due), d));
          const out = d.getMonth() !== month.getMonth();
          return (
            <div key={i} onDoubleClick={() => onNew(isoDate(d))} className={cx("group min-h-[104px] border-line p-1.5", i % 7 && "border-l", i >= 7 && "border-t", out && "bg-subtle/60")}>
              <div className="flex items-center justify-between"><span className={cx("flex size-6 items-center justify-center rounded-full text-[12px]", sameDay(d, today) ? "bg-accent font-medium text-[var(--color-accent-on,#fff)]" : out ? "text-ink-4" : "text-ink-2")}>{d.getDate()}</span>
                <button type="button" aria-label={`New task due ${d.toDateString()}`} onClick={() => onNew(isoDate(d))} className="flex size-5 items-center justify-center rounded-md text-ink-3 opacity-0 hover:bg-hover group-hover:opacity-100"><Icon name="plus" className="size-3" /></button></div>
              <div className="mt-1 flex flex-col gap-1">
                {list.slice(0, 3).map((t) => <button key={t.id} type="button" onClick={() => onOpen(t)} className={cx("flex items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-left text-[12px]", t.status === "done" ? "bg-hover text-ink-3 line-through" : "bg-accent-soft text-ink")} title={`${t.title}${t.assignee ? ` · ${nameOf(t.assignee)}` : ""}`}><span className="size-1.5 shrink-0 rounded-full" style={{ background: PRIO[t.priority].color }} /><span className="truncate">{t.title}</span></button>)}
                {list.length > 3 && <span className="px-1.5 text-[11px] text-ink-3">+{list.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewProject({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: Project) => void }) {
  const { ws } = useApp();
  const toast = useToast();
  const [name, setName] = useState(""), [color, setColor] = useState("purple"), [busy, setBusy] = useState(false);
  const create = async () => {
    if (!name.trim()) return toast("Give the project a name.", "bad");
    setBusy(true);
    try { const p = await api.createProject(ws.id, name.trim(), color); setName(""); onClose(); onCreated(p); toast(`${p.name} created`); } catch (e) { toast((e as Error).message, "bad"); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="New project" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={create} busy={busy}>Create project</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Name"><Input value={name} onChange={setName} placeholder="Dashboard Revamp v2" autoFocus onEnter={create} /></Field>
        <Field label="Colour"><div className="flex gap-2">{Object.keys(PCOLORS).map((c) => <button key={c} type="button" aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)} className={cx("size-8 rounded-full ring-offset-2 transition", color === c && "ring-2")} style={{ background: SOFT[c], boxShadow: `inset 0 0 0 6px ${SOFT[c]}`, ["--tw-ring-color" as string]: PCOLORS[c] }}><span className="m-auto block size-3 rounded-full" style={{ background: PCOLORS[c] }} /></button>)}</div></Field>
      </div>
    </Modal>
  );
}
