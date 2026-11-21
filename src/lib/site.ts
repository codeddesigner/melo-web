/* Two front doors, one app:
   melo.to            → Melo Personal (personal mail)
   business.melo.to   → Melo for Business
   Anywhere else (previews, localhost) both live side by side: "/" is Business, "/personal" is Personal. */
const host = () => (typeof location === "undefined" ? "" : location.hostname);
export const onPersonalHost = () => /^(www\.)?melo\.to$/.test(host());
export const onBusinessHost = () => host() === "business.melo.to";
const live = () => onPersonalHost() || onBusinessHost();

/* Links between the two sites */
export const personalHome = () => (live() ? "https://melo.to/" : "/personal");
export const businessHome = () => (live() ? "https://business.melo.to/" : "/");
/* Personal sign-up: on melo.to plain /signup is personal; elsewhere it needs the flag */
export const personalSignup = () => (onPersonalHost() ? "/signup" : "/signup?start=personal");
