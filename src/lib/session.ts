import { useSyncExternalStore } from "react";
import { auth } from "./api";

/* Re-renders whenever someone signs in or out (in this tab or another). */
export const useSession = () => useSyncExternalStore(auth.subscribe, auth.get);
