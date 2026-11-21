import { useEffect } from "react";
import { Link } from "../lib/router";
import { useSession } from "../lib/session";

export default function NotFound() {
  const signedIn = Boolean(useSession());
  useEffect(() => { document.title = "Page not found — Melo"; }, []);
  return (
    <div className="melo-app flex min-h-screen flex-col items-center justify-center gap-4 bg-app px-6 text-center">
      <img src="/logo.svg" alt="Melo business" width={140} height={28} />
      <h1 className="mt-6 text-[28px] font-medium">We can’t find that page</h1>
      <p className="max-w-sm text-ink-2">The link may be old or mistyped.</p>
      <div className="mt-2 flex gap-2">
        <Link to="/" className="inline-flex h-9 items-center rounded-full bg-hover px-4 text-sm font-medium">Melo home</Link>
        <Link to={signedIn ? "/app" : "/signin"} className="inline-flex h-9 items-center rounded-full bg-inverse px-4 text-sm font-medium text-white">{signedIn ? "Visit workspace" : "Sign in"}</Link>
      </div>
    </div>
  );
}
