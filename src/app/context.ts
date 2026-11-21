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
  reloadAccount: () => void;
  reloadPeople: () => void;
  switchWorkspace: (id: string) => void;
  unread: { team: number };
  setUnread: (u: { team: number }) => void;
}
export const Ctx = createContext<AppCtx | null>(null);
export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside the app");
  return c;
}
