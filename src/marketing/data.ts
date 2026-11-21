/* Sample content for the homepage product previews (Figma “Website” page). */
export interface Mail { from: string; tag?: "Design" | "Finance" | "Clients"; subj: string; prev: string; time: string; unread?: boolean; to: string; summary: string; body: string[]; attach?: [string, string] }
export type MailRow = Mail | { group: string };

export const TAG_COLORS = { Design: "var(--tag-purple-fg)", Finance: "var(--tag-green-fg)", Clients: "var(--tag-blue-fg)" } as const;
export const AVATARS = ["var(--avatar-orange)", "var(--avatar-purple)", "var(--avatar-teal)", "var(--avatar-blue)", "var(--avatar-pink)", "#1f1f1f"];

export const MAIL: Record<"primary" | "other", MailRow[]> = {
  primary: [
    { group: "Today" },
    { from: "Maya Kim", tag: "Design", subj: "Q4 brand refresh — final assets", prev: "Moodboard v2 is up. I’m leaning toward the softer purple…", time: "9:12 AM", unread: true, to: "to Design Team, Tom",
      summary: "Maya needs a palette decision by Thursday so QA has a day before Friday’s client review.",
      body: ["Hi team — moodboard v2 is up in the Design Team space. I’m leaning toward the softer purple for the dashboard; it holds up better in dark mode and on the data tables.", "Can we lock a direction before Friday’s client review? I’ll prep the final export once we agree.", "Maya"], attach: ["Q4-brand-final.pdf", "2.4 MB"] },
    { from: "Tom Becker", subj: "New workspace rule: hide marketing digests", prev: "Heads up — turning this on Monday for everyone.", time: "8:40 AM", unread: true, to: "to Everyone at Acme",
      summary: "Tom is enabling a workspace rule on Monday that skips the inbox for marketing digests.",
      body: ["Heads up — turning this on Monday for everyone.", "Marketing digests will skip the inbox and land in Later. You can still find them in search, and it’s a default, so you can switch it off in your own filters.", "Tom"] },
    { from: "Stripe", tag: "Finance", subj: "Your November payout", prev: "$48,200 is on its way to your account ending 4412.", time: "8:03 AM", unread: true, to: "to alex@acme.com",
      summary: "A $48,200 payout was sent to the account ending 4412 and should arrive in 2 business days.", body: ["$48,200 is on its way to your account ending 4412.", "It should arrive within 2 business days. You can view the full breakdown in your Stripe dashboard."] },
    { from: "Rina Patel", subj: "Accepted: invite to Acme Studio", prev: "Thanks Alex — joining from the London office on Monday.", time: "7:48 AM", unread: true, to: "to Alex Morgan",
      summary: "Rina accepted the workspace invite and starts Monday in London.", body: ["Thanks Alex — joining from the London office on Monday.", "Looking forward to meeting everyone!", "Rina"] },
    { from: "Notion", subj: "Weekly digest: 4 pages updated", prev: "Brand guidelines, Launch checklist and 2 more were edited.", time: "7:02 AM", to: "to alex@acme.com",
      summary: "Four pages changed this week, including Brand guidelines and the Launch checklist.", body: ["Brand guidelines, Launch checklist and 2 more were edited this week.", "Open Notion to see the full change history."] },
    { group: "Yesterday" },
    { from: "Jonas Lind", tag: "Design", subj: "Re: Dashboard handoff", prev: "Sharing the final Figma link — components are all linked.", time: "Thu", to: "to Maya Kim, Alex",
      summary: "Jonas shared the final Figma file; all components are linked for handoff.", body: ["Sharing the final Figma link — components are all linked.", "Shout if anything looks off before engineering picks it up.", "Jonas"] },
    { from: "Linear", subj: "Weekly digest", prev: "12 issues closed, 3 in review. Cycle 24 ends Friday.", time: "Thu", to: "to alex@acme.com", summary: "12 issues closed and 3 in review; Cycle 24 ends Friday.", body: ["12 issues closed, 3 in review. Cycle 24 ends Friday."] },
    { from: "Sam Lee", tag: "Clients", subj: "Client review notes", prev: "Mostly positive! Two asks on the empty states.", time: "Thu", unread: true, to: "to Design Team",
      summary: "The client review went well; there are two follow-ups on empty states.", body: ["Mostly positive! Two asks on the empty states.", "1) Add a short line of guidance on the empty inbox. 2) Lighten the illustration on the tasks screen.", "Sam"] },
    { group: "Earlier" },
    { from: "Airbnb", subj: "Reservation confirmed", prev: "Your stay in Lisbon, Dec 19–22. Check-in after 3pm.", time: "Nov 18", to: "to alex@acme.com", summary: "Lisbon stay confirmed for Dec 19–22 with check-in after 3pm.", body: ["Your stay in Lisbon, Dec 19–22. Check-in after 3pm."] },
    { from: "Figma", subj: "3 new comments on Melo", prev: "Tom, Maya and Jonas commented on Components.", time: "Nov 17", to: "to alex@acme.com", summary: "Three teammates left comments on the Components page.", body: ["Tom, Maya and Jonas commented on Components."] },
    { from: "Leo Grant", tag: "Clients", subj: "Contract — signed copy", prev: "Attached the countersigned SOW for the Q1 retainer.", time: "Nov 15", to: "to Alex Morgan",
      summary: "Leo sent the countersigned SOW for the Q1 retainer.", body: ["Attached the countersigned SOW for the Q1 retainer.", "Leo"], attach: ["SOW-Q1-signed.pdf", "380 KB"] },
  ],
  other: [
    { group: "Today" },
    { from: "Product Hunt", subj: "Top launches this week", prev: "5 tools your team might like.", time: "9:30 AM", to: "to alex@acme.com", summary: "A weekly newsletter with this week’s top launches.", body: ["5 tools your team might like this week."] },
    { from: "Webflow", subj: "Your site was published", prev: "acme.studio is live with your latest changes.", time: "8:12 AM", to: "to alex@acme.com", summary: "The acme.studio site was published.", body: ["acme.studio is live with your latest changes."] },
    { from: "Dribbble", subj: "New followers", prev: "3 designers followed Acme Studio.", time: "7:40 AM", to: "to hello@acme.com", summary: "Three new followers on Dribbble.", body: ["3 designers followed Acme Studio."] },
    { group: "Yesterday" },
    { from: "Google", subj: "Security alert", prev: "New sign-in on Mac.", time: "Thu", to: "to alex@acme.com", summary: "A routine new sign-in notice.", body: ["New sign-in on Mac. If this was you, there’s nothing to do."] },
    { from: "Medium", subj: "Daily digest", prev: "Design systems at scale, and more.", time: "Thu", to: "to alex@acme.com", summary: "Reading suggestions from Medium.", body: ["Design systems at scale, and more."] },
  ],
};

export const RULES: [string, string, string, "enf" | "def", boolean][] = [
  ["Hide marketing digests", "Sender is a marketing tool", "Skip inbox", "enf", true],
  ["Mute #random", "Channel is #random", "Mute", "def", true],
  ["Move outside calendar invites", "Invite from outside Acme", "Move to Later", "enf", true],
  ["Quiet build notifications", "Sender is ci-bot@acme.com", "Mute", "def", true],
  ["Mute #watercooler during launch", "Channel is #watercooler", "Mute", "def", false],
];

export const FAQ: [string, string][] = [
  ["Do I need a work email to use Melo?", "No. Sign up with a free @melo.to address and use it for mail, chat and booking links right away. When you join a company workspace, or set one up with your own domain, you can add a work email in Settings."],
  ["Can I keep my Gmail or Outlook address?", "Yes. Melo is built to connect to Google Workspace and Microsoft 365 — your addresses, folders and history stay exactly where they are."],
  ["How do workspace rules work?", "Admins create rules once — by sender, channel or invite source — and choose to enforce them or ship them as defaults. Melo previews what each rule will catch before it goes live, and logs every change."],
  ["Can employees turn rules off?", "Enforced rules stay on for everyone. Default rules can be switched off by each person, and anyone can add personal filters on top — like muting a channel only for themselves."],
  ["How long does migration take?", "Mail stays in Google Workspace or Microsoft 365, so there is nothing to move — you connect accounts, invite people and turn on rules."],
];
