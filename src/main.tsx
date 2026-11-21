import { createRoot } from "react-dom/client";
import { lazy, Suspense, useEffect } from "react";
import { navigate, useLocation } from "./lib/router";
import { ToastProvider } from "./components/ui";

const Home = lazy(() => import("./pages/Home"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const AppRoot = lazy(() => import("./app/AppRoot"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Routes() {
  const { parts } = useLocation();
  const top = parts[0] ?? "";
  const isApp = top === "app";
  useEffect(() => { document.body.style.background = isApp ? "#f7f7f7" : ""; }, [isApp]);
  useEffect(() => { if (top === "index") navigate("/", { replace: true }); }, [top]);
  if (top === "index") return null;
  const page = top === "" || ["product", "rules", "booking", "vs-slack", "faq", "demo"].includes(top) && parts.length === 1 ? <Home /> : top === "signin" ? <SignIn /> : top === "signup" ? <SignUp /> : isApp ? <AppRoot /> : <NotFound />;
  return <Suspense fallback={<div className="min-h-screen" />}>{page}</Suspense>;
}

/* Old *.html links keep working */
const legacy = location.pathname.match(/^\/(index|signin|signup|app)\.html$/);
if (legacy) history.replaceState(null, "", (legacy[1] === "index" ? "/" : "/" + legacy[1]) + location.search + location.hash);

createRoot(document.getElementById("root")!).render(<ToastProvider><Routes /></ToastProvider>);
