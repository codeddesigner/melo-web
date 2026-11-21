/* Melo Personal settings: Filters (live), Custom domain and Plan (shown as designed; Plus isn't on sale yet) */
import { useState } from "react";
import { api } from "../../lib/api";
import { copy, cx } from "../../lib/util";
import { Icon, type IconName } from "../../components/icons";
import { Button, IconButton, Input, Select, Skeleton, Tag, Toggle, useAsync, useToast } from "../../components/ui";
import { useApp } from "../context";
import { Body, Card, Header } from "./kit";

type Dest = "primary" | "newsletters" | "receipts" | "updates" | "screener";
type Rule = { match: string; to: Dest; on?: boolean };
type Filters = { newsletters?: boolean; receipts?: boolean; updates?: boolean; screener?: boolean; senders?: Rule[] };
const DEST: { value: Dest; label: string }[] = [
  { value: "primary", label: "Always Primary" }, { value: "newsletters", label: "Newsletters" }, { value: "receipts", label: "Receipts" },
  { value: "updates", label: "Updates" }, { value: "screener", label: "Screener" },
];

/* ---------------- Filters ---------------- */
export function FiltersPage() {
  const { account, reloadAccount } = useApp();
  const toast = useToast();
  const [f, setF] = useState<Filters>(((account.profile?.prefs ?? {}).filters ?? {}) as Filters);
  const [match, setMatch] = useState(""), [to, setTo] = useState<Dest>("newsletters");
  const senders = useAsync(() => api.senders(), []);
  const save = async (next: Filters, msg?: string) => {
    const prev = f; setF(next);
    try { await api.updateProfile({ prefs: { ...(account.profile?.prefs ?? {}), filters: next } }); reloadAccount(); if (msg) toast(msg); }
    catch (e) { setF(prev); toast((e as Error).message, "bad"); }
  };
  const on = (k: keyof Omit<Filters, "senders">) => (k === "screener" ? f[k] === true : f[k] !== false);
  const rules = f.senders ?? [];
  const add = () => {
    const m = match.trim().toLowerCase();
    if (!m) return;
    if (rules.some((r) => r.match === m)) return toast("You already have a filter for that", "bad");
    save({ ...f, senders: [...rules, { match: m, to, on: true }] }, "Filter saved — it applies to new mail");
    setMatch("");
  };
  const built: [keyof Omit<Filters, "senders">, IconName, string, string][] = [
    ["newsletters", "doc", "Newsletters", "Moved to the Newsletters tab"],
    ["receipts", "archive", "Receipts & orders", "Moved to Receipts and bundled by order"],
    ["updates", "bell", "Updates", "Sign-in alerts, codes and account notices"],
    ["screener", "shield", "Screen first-time senders", "New people wait in Screener until you say yes"],
  ];
  const blocked = (senders.data ?? []).filter((s) => s.status === "blocked"), allowed = (senders.data ?? []).filter((s) => s.status === "allowed");
  const unscreen = async (addr: string) => {
    senders.set((d) => (d ?? []).filter((s) => s.address !== addr));
    try { await api.setSender(addr, null); toast(`Removed ${addr}`); } catch (e) { toast((e as Error).message, "bad"); senders.reload(); }
  };
  return (
    <>
      <Header title="Filters" sub="Choose what reaches Primary. Nothing is deleted — it waits in the right place." />
      <Body>
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-ink-2">Sorted by Melo</h3>
          <Card>{built.map(([k, ic, t, d], i) => (
            <div key={k} className={cx("flex items-center gap-4 px-5 py-4", i && "border-t border-line")}>
              <span className="flex size-8 items-center justify-center rounded-full bg-subtle"><Icon name={ic} className="size-4 text-icon" /></span>
              <div className="flex-1"><p className="font-medium">{t}</p><p className="text-sm text-ink-3">{d}</p></div>
              <Toggle on={on(k)} onChange={(v) => save({ ...f, [k]: v })} label={t} />
            </div>))}</Card>
        </section>
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-ink-2">Your filters</h3>
          <Card>
            {rules.map((r, i) => (
              <div key={r.match} className={cx("flex items-center gap-4 px-5 py-3.5 animate-fade-up", i && "border-t border-line")}>
                <span className="flex size-8 items-center justify-center rounded-full bg-subtle"><Icon name="filter" className="size-4 text-icon" /></span>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.match}</p><p className="text-sm text-ink-3">{r.on === false ? "Paused" : r.to === "primary" ? "Always in Primary" : `Skips Primary → ${DEST.find((d) => d.value === r.to)?.label}`}</p></div>
                <Toggle on={r.on !== false} onChange={(v) => save({ ...f, senders: rules.map((x) => (x.match === r.match ? { ...x, on: v } : x)) })} label={`Filter for ${r.match}`} />
                <IconButton icon="trash" label={`Delete filter for ${r.match}`} onClick={() => save({ ...f, senders: rules.filter((x) => x.match !== r.match) }, "Filter deleted")} />
              </div>
            ))}
            <form className={cx("flex flex-wrap items-center gap-2 px-5 py-4", rules.length && "border-t border-line")} onSubmit={(e) => { e.preventDefault(); add(); }}>
              <Input value={match} onChange={setMatch} placeholder="Sender or domain, e.g. deals@shop.com or @shop.com" className="min-w-[220px] flex-1" aria-label="Sender or domain" />
              <Select value={to} onChange={setTo} options={DEST} label="Send to" />
              <Button icon="plus" type="submit" disabled={!match.trim()}>Add filter</Button>
            </form>
          </Card>
        </section>
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-ink-2">Screener decisions</h3>
          <Card>
            {senders.loading && !senders.data ? <div className="p-5"><Skeleton className="h-10" /></div>
              : !blocked.length && !allowed.length ? <p className="px-5 py-4 text-sm text-ink-3">Senders you allow or block from Screener show up here. People you email are allowed automatically.</p>
              : [...blocked, ...allowed].map((s, i) => (
                <div key={s.address} className={cx("flex items-center gap-3 px-5 py-3", i && "border-t border-line")}>
                  <span className="min-w-0 flex-1 truncate">{s.address}</span>
                  <Tag tone={s.status === "blocked" ? "bad" : "ok"}>{s.status === "blocked" ? "Blocked" : "Allowed"}</Tag>
                  <Button size="s" variant="soft" onClick={() => unscreen(s.address)}>{s.status === "blocked" ? "Unblock" : "Forget"}</Button>
                </div>
              ))}
          </Card>
        </section>
      </Body>
    </>
  );
}

/* ---------------- Custom domain (Plus) ---------------- */
export function CustomDomainPage() {
  const { account, reloadAccount } = useApp();
  const toast = useToast();
  const prefs = account.profile?.prefs ?? {};
  const [domain, setDomain] = useState(String(prefs.custom_domain ?? ""));
  const [draft, setDraft] = useState("");
  const [checked, setChecked] = useState<Date | null>(null);
  const valid = (d: string) => /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d);
  const start = async () => {
    const d = draft.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!valid(d)) return toast("Enter a domain like alexmorgan.com", "bad");
    if (d === "melo.to" || d.endsWith(".melo.to")) return toast("Pick a domain you own", "bad");
    setDomain(d);
    try { await api.updateProfile({ prefs: { ...prefs, custom_domain: d } }); reloadAccount(); } catch (e) { toast((e as Error).message, "bad"); }
  };
  const remove = async () => { setDomain(""); try { await api.updateProfile({ prefs: { ...prefs, custom_domain: null } }); reloadAccount(); } catch { /* keep going */ } };
  if (!domain) return (
    <>
      <Header title="Custom domain" sub="Use your own domain, like alex@alexmorgan.com, for sending and receiving. Included with Melo Plus." />
      <Body>
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-pa-soft text-pa-text"><Icon name="link" className="size-5" /></span>
            <div><p className="font-medium">Add your domain</p><p className="text-sm text-ink-3">We’ll show the four DNS records to add. Most changes show up within an hour.</p></div></div>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); start(); }}>
            <Input value={draft} onChange={setDraft} placeholder="alexmorgan.com" className="min-w-[220px] flex-1" aria-label="Your domain" autoComplete="off" />
            <Button type="submit" disabled={!draft.trim()}>Continue</Button>
          </form>
        </Card>
      </Body>
    </>
  );
  const slug = domain.replace(/\./g, "-");
  const token = `melo-verify=${btoa(`${account.email}:${domain}`).replace(/[^a-z0-9]/gi, "").slice(0, 16)}`;
  const recs: [string, string, string, string][] = [
    ["Ownership", "TXT", "@", token],
    ["Sign mail (DKIM)", "CNAME", "melo1._domainkey", `dkim1.${slug}.melo.to`],
    ["Sender policy (SPF)", "TXT", "@", "v=spf1 include:_spf.melo.to ~all"],
    ["Reporting (DMARC)", "TXT", "_dmarc", `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`],
  ];
  const cp = (v: string) => { copy(v); toast("Copied"); };
  return (
    <>
      <div className="flex items-center gap-1.5 px-6 pt-6 text-[13px] text-ink-3 md:px-10"><button type="button" onClick={remove} className="hover:text-ink">Custom domain</button><Icon name="chev-right" className="size-3.5" /><span className="font-medium text-ink">{domain}</span></div>
      <Header title={`Verify ${domain}`} sub="Add these records at your DNS provider. We check automatically every few minutes — most changes show up within an hour." action={<Tag tone="warn" icon="clock">0 of 4 found</Tag>} />
      <Body>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-pa-soft px-5 py-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white text-[12px] font-semibold text-ink-2">DNS</span>
          <div className="min-w-0 flex-1"><p className="font-medium">Using Cloudflare, GoDaddy or Namecheap?</p><p className="text-sm text-ink-2">Sign in once and Melo adds all four records for you.</p></div>
          <Button icon="link" onClick={() => toast("Automatic DNS setup is coming soon", "info")}>Connect provider</Button>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead><tr className="text-ink-3">{["Purpose", "Type", "Name / host", "Value", "Status"].map((h) => <th key={h} className="px-4 py-3 font-normal">{h}</th>)}</tr></thead>
            <tbody>{recs.map(([p, t, n, v]) => (
              <tr key={p} className="border-t border-line">
                <td className="px-4 py-3">{p}</td>
                <td className="px-4 py-3"><span className="rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[12px]">{t}</span></td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 font-mono text-[12px]">{n}<IconButton icon="copy" label={`Copy name for ${p}`} onClick={() => cp(n)} /></span></td>
                <td className="max-w-[280px] px-4 py-3"><span className="inline-flex max-w-full items-center gap-1.5 font-mono text-[12px]"><span className="truncate">{v}</span><IconButton icon="copy" label={`Copy value for ${p}`} onClick={() => cp(v)} /></span></td>
                <td className="px-4 py-3"><Tag tone="warn" icon="clock">Waiting</Tag></td>
              </tr>))}</tbody>
          </table>
        </Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-[13px] text-ink-3"><Icon name="clock" className="size-4" />{checked ? `Last checked ${checked.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Not checked yet"}</span>
          <span className="flex-1" />
          <Button variant="soft" icon="mail" onClick={() => toast("Emailing setup steps is coming soon", "info")}>Email me these steps</Button>
          <Button onClick={() => { setChecked(new Date()); toast("Custom domains open with Melo Plus soon — your records are saved", "info"); }}>Check now</Button>
        </div>
      </Body>
    </>
  );
}

/* ---------------- Plan ---------------- */
export function PlanPage() {
  const { account } = useApp();
  const toast = useToast();
  const soon = () => toast("Melo Plus and Family are coming soon", "info");
  const addr = account.profile?.melo_address ? `${account.profile.melo_address}@melo.to` : "you@melo.to";
  const plans: { name: string; price: string; per: string; items: string[]; current?: boolean; cta: string }[] = [
    { name: "Free", price: "$0", per: "forever", items: [`${addr} address`, "Screener and smart tabs", "15 GB storage"], current: true, cta: "Current plan" },
    { name: "Plus", price: "$4", per: "per month", items: ["Everything in Free", "Your own domain — you@yourname.com", "Up to 5 addresses and aliases", "100 GB storage"], cta: "Upgrade to Plus" },
    { name: "Family", price: "$8", per: "per month · up to 6 people", items: ["Everything in Plus", "A shared family domain", "Separate, private inboxes"], cta: "Switch to Family" },
  ];
  const usage: [string, string, number, string][] = [["Addresses", account.profile?.melo_address ? "1 / 1" : "0 / 1", account.profile?.melo_address ? 100 : 0, "Plus gives you 5"], ["Storage", "Under 1 GB / 15 GB", 3, "Plenty of room"], ["AI summaries", "Included", 20, "Unlimited on Plus"]];
  return (
    <>
      <Header title="You’re on Melo Free" sub="Free forever — Screener, smart tabs and no ads. Upgrade any time for your own domain and more room." />
      <Body>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={cx("flex flex-col gap-4 rounded-2xl border p-6", p.current ? "border-pa bg-[linear-gradient(160deg,#fbf6dc,#fff_60%)] shadow-[0_0_0_3px_var(--color-pa-soft)]" : "border-line bg-white")}>
              <div className="flex items-center justify-between"><b className="text-[15px] font-medium">{p.name}</b>{p.current && <span className="rounded-full bg-pa px-2 py-0.5 text-[11px] font-semibold text-pa-on">Current plan</span>}</div>
              <div className="flex items-baseline gap-2"><b className="text-[30px] leading-none font-medium">{p.price}</b><span className="text-[13px] text-ink-3">{p.per}</span></div>
              <ul className="flex flex-1 flex-col gap-2 text-[13px]">{p.items.map((t) => <li key={t} className="flex items-center gap-2"><Icon name="check" className="size-3.5 text-ok" />{t}</li>)}</ul>
              <Button variant={p.current ? "soft" : p.name === "Plus" ? "dark" : "soft"} disabled={p.current} onClick={soon}>{p.cta}</Button>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {usage.map(([t, v, pct, d]) => (
            <Card key={t} className="flex flex-col gap-2.5 p-4"><div className="flex items-center justify-between text-[13px]"><b className="font-medium">{t}</b><span className="text-ink-2">{v}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-subtle"><div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} /></div><span className="text-[12px] text-ink-3">{d}</span></Card>
          ))}
          <Card className="flex flex-col gap-2 p-4 text-[13px]"><div className="flex items-center justify-between"><b className="font-medium">Payment</b><button type="button" onClick={soon} className="font-medium text-pa-text hover:underline">Add card</button></div>
            <div className="flex justify-between text-ink-2"><span>Card</span><span>None</span></div><div className="flex justify-between text-ink-2"><span>Billed to</span><span className="truncate pl-2">{addr}</span></div></Card>
        </div>
        <Card><div className="flex items-center justify-between px-5 py-4"><b className="font-medium">Invoices</b></div><p className="border-t border-line px-5 py-4 text-sm text-ink-3">No invoices yet — Melo Free never bills you.</p></Card>
      </Body>
    </>
  );
}
