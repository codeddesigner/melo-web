export type Unread = { team: number; mail?: number };
import { createContext, useContext } from "react";
import type { Account, Person, WorkspaceSummary } from "../lib/api";

export interface AppCtx {
  account: Account;
  ws: WorkspaceSummary;
  people: Person[];
  me: Person | undefined;
  person: (id: string | null | undefined) => Person | undefined;
  nameOf: (id: string | null | undefined) => string;
  isAdmin: boolean;
  personal: boolean;
  reloadAccount: () => void;
  reloadPeople: () => void;
  switchWorkspace: (id: string) => void;
  unread: Unread;
  setUnread: (u: Unread | ((prev: Unread) => Unread)) => void;
  /* unread inbox mail per space id */
  inboxes: Record<string, number>;
}
export const Ctx = createContext<AppCtx | null>(null);
export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside the app");
  return c;
}
