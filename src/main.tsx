import { createRoot } from "react-dom/client";
import { lazy, Suspense, useEffect } from "react";
import { navigate, useLocation } from "./lib/router";
import { ToastProvider } from "./components/ui";
import { onPersonalHost } from "./lib/site";

const Home = lazy(() => import("./pages/Home"));
const PersonalOnboarding = lazy(() => import("./personal/Onboarding"));
const PersonalHome = lazy(() => import("./pages/PersonalHome"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const AppRoot = lazy(() => import("./app/AppRoot"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Routes() {
  const { parts, query } = useLocation();
  const top = parts[0] ?? "";
  const isApp = top === "app";
  useEffect(() => { document.body.style.background = isApp ? "#f7f8fa" : ""; }, [isApp]);
  useEffect(() => { if (top === "index") navigate("/", { replace: true }); }, [top]);
  if (top === "index") return null;
  const personalRoot = top === "personal" && parts.length === 1 || onPersonalHost() && top === "";
  const businessRoot = top === "business" && parts.length === 1;
  const page = personalRoot ? <PersonalHome /> : businessRoot ? <Home /> : top === "" || ["product", "rules", "booking", "vs-slack", "faq", "demo"].includes(top) && parts.length === 1 ? <Home /> : top === "signin" ? <SignIn /> : top === "signup" ? (query.get("start") === "personal" || onPersonalHost() && !query.get("start") && !query.get("resume") && !query.get("join") ? <PersonalOnboarding /> : <SignUp />) : isApp ? <AppRoot /> : <NotFound />;
  return <Suspense fallback={<div className="min-h-screen" />}>{page}</Suspense>;
}

/* Old *.html links keep working */
const legacy = location.pathname.match(/^\/(index|signin|signup|app)\.html$/);
if (legacy) history.replaceState(null, "", (legacy[1] === "index" ? "/" : "/" + legacy[1]) + location.search + location.hash);

/* Both front doors are one tap apart (Personal ⇄ Business): load the other one quietly so switching is instant */
const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1200));
idle(() => { void import("./pages/Home"); void import("./pages/PersonalHome"); });

createRoot(document.getElementById("root")!).render(<ToastProvider><Routes /></ToastProvider>);
