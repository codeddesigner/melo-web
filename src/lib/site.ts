/* Two front doors, one app:
   melo.to            → Melo Personal (personal mail)
   business.melo.to   → Melo for Business
   Anywhere else (previews, localhost) both live side by side: "/" is Business, "/personal" is Personal. */
const host = () => (typeof location === "undefined" ? "" : location.hostname);
export const onPersonalHost = () => /^(www\.)?melo\.to$/.test(host());
export const onBusinessHost = () => host() === "business.melo.to";

/* Switching never reloads: both sites live on every host, so links stay on the current one
   (melo.to/business shows Business, business.melo.to/personal shows Personal) */
export const personalHome = () => (onPersonalHost() ? "/" : "/personal");
export const businessHome = () => (onPersonalHost() ? "/business" : "/");
/* Personal sign-up: on melo.to plain /signup is personal; elsewhere it needs the flag */
export const personalSignup = () => (onPersonalHost() ? "/signup" : onBusinessHost() ? "https://melo.to/signup" : "/signup?start=personal");

/* In the app, each front door is its own experience with its own sign-in:
   melo.to shows only your Personal mail, business.melo.to only your business workspaces.
   (Previews and localhost show every space, with a switcher.) */
export type SpaceKind = "personal" | "business";
export const appLock = (): SpaceKind | null => (onPersonalHost() ? "personal" : onBusinessHost() ? "business" : null);
export const appUrl = (kind: SpaceKind, path = "/app/mail") => (kind === "personal" ? `https://melo.to${path}` : `https://business.melo.to${path}`);
