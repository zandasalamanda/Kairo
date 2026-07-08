// Pre-built, hardcoded maps shown on the landing page's interactive planet
// cluster — NOT AI-generated. Each is a real, plausible plan so visitors can see
// what Solaspace produces. Colors are distinct palette hues (the brand gold stays on
// the catchphrase + CTA); GOAL_PALETTE: gold, coral, sage, periwinkle, teal.

export interface ShowcaseMilestone {
  title: string;
  subs: string[];
}
export interface ShowcaseMap {
  id: string;
  /** full title for the opened map header */
  title: string;
  /** short label for the orbiting planet */
  short: string;
  /** icon key from GOAL_ICON_KEYS */
  icon: string;
  color: string;
  milestones: ShowcaseMilestone[];
}

export const SHOWCASE_MAPS: ShowcaseMap[] = [
  {
    id: "financial",
    title: "Build financial freedom",
    short: "Money",
    icon: "money",
    color: "#e6b877", // gold
    milestones: [
      { title: "Audit your money", subs: ["Track 30 days of spending", "Find your biggest leaks"] },
      { title: "Build a cushion", subs: ["Open a separate savings account", "Automate a weekly transfer"] },
      { title: "Invest for growth", subs: ["Open a retirement account"] },
      { title: "Lasting stability", subs: [] },
    ],
  },
  {
    id: "fitness",
    title: "Get into the best shape of your life",
    short: "Fitness",
    icon: "fitness",
    color: "#d5896f", // coral
    milestones: [
      { title: "Set your baseline", subs: ["Take starting measurements", "Do a fitness test"] },
      { title: "Build the habit", subs: ["Train 4× a week for a month"] },
      { title: "Level up strength", subs: ["Increase load each week"] },
      { title: "Hit your peak", subs: [] },
    ],
  },
  {
    id: "language",
    title: "Become conversational in a new language",
    short: "Language",
    icon: "language",
    color: "#8fae9f", // sage
    milestones: [
      { title: "Learn 500 core words", subs: ["15 min of flashcards daily"] },
      { title: "Practice speaking", subs: ["Find a conversation partner"] },
      { title: "Gain confidence", subs: ["Record yourself weekly"] },
      { title: "Full conversation", subs: [] },
    ],
  },
  {
    id: "startup",
    title: "Launch your side project",
    short: "Startup",
    icon: "rocket",
    color: "#9aa6d4", // periwinkle
    milestones: [
      { title: "Validate the idea", subs: ["Write a one-line mission", "Sketch the core feature"] },
      { title: "Build the MVP", subs: ["Ship the smallest version", "Test with 5 people"] },
      { title: "Gather momentum", subs: ["Refine on feedback"] },
      { title: "Launch day", subs: [] },
    ],
  },
  {
    id: "travel",
    title: "Plan the trip of a lifetime",
    short: "Travel",
    icon: "travel",
    color: "#7fb0ad", // teal
    milestones: [
      { title: "Pick a destination", subs: ["Research 3 places", "Set budget & dates"] },
      { title: "Book the essentials", subs: ["Lock flights & stays"] },
      { title: "Plan the itinerary", subs: ["List must-sees", "Book experiences"] },
      { title: "Depart ready", subs: [] },
    ],
  },
];
