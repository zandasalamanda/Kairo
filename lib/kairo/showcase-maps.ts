// Pre-built, hardcoded maps shown on the landing (the planet cluster + the "watch a
// goal become a plan" surface). NOT AI-generated, but written to read exactly like the
// app's own deep research: every step carries a short, specific answer (the "info")
// AND one real, hand-checked source — a specific YouTube video (with its thumbnail) or
// a cited article from a reputable site. No search queries; real URLs, verified to load.

export interface ShowcaseResource {
  /** The specific, useful answer for this step — written the way Sola's research reads. */
  summary: string;
  kind: "watch" | "read";
  /** Real title of the video or article. */
  title: string;
  /** watch: a real YouTube video id (drives the thumbnail + link). */
  videoId?: string;
  /** read: a real article URL. */
  url?: string;
  /** read: the publisher, e.g. "NerdWallet". */
  source?: string;
}

export interface ShowcaseNode {
  title: string;
  res?: ShowcaseResource;
}
export interface ShowcaseMilestone {
  title: string;
  subs: ShowcaseNode[];
  res?: ShowcaseResource;
}
export interface ShowcaseMap {
  id: string;
  title: string;
  short: string;
  /** The plain, first-person sentence a person would actually type — drives the
   *  hero's "say it, see it" typing demo. */
  prompt: string;
  icon: string;
  color: string;
  milestones: ShowcaseMilestone[];
}

const watch = (videoId: string, title: string, summary: string): ShowcaseResource => ({ kind: "watch", videoId, title, summary });
const read = (url: string, title: string, source: string, summary: string): ShowcaseResource => ({ kind: "read", url, title, source, summary });

// Reused reputable sources (the summary carries the step-specific detail).
const NW_BUDGET = "https://www.nerdwallet.com/article/finance/how-to-budget";
const NW_TRIP = "https://www.nerdwallet.com/travel/learn/how-to-plan-a-trip";
const ANKI = "https://ankilanguagelearning.com/";
const ITALKI = "https://www.italki.com/";
const BABELFISH = "https://www.towerofbabelfish.com/";
const PH_LAUNCH = "https://www.producthunt.com/launch";
const NNG_5 = "https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/";

export const SHOWCASE_MAPS: ShowcaseMap[] = [
  {
    id: "financial",
    title: "Build financial freedom",
    short: "Money",
    prompt: "Get my finances under control",
    icon: "money",
    color: "#e6b877",
    milestones: [
      {
        title: "Audit your money",
        res: read(NW_BUDGET, "How to Budget Money: A Step-By-Step Guide", "NerdWallet",
          "You can't fix what you can't see. Track every dollar for a month and sort it into needs, wants, and savings — most people find 10–20% leaking to things they won't miss."),
        subs: [
          { title: "Track 30 days of spending", res: read("https://www.nerdwallet.com/finance/learn/tracking-monthly-expenses", "How to Track Your Monthly Expenses", "NerdWallet",
            "Log every purchase for 30 days in a notes app or a free tracker. The goal isn't judgment — it's a clear picture of where your money actually goes.") },
          { title: "Find your biggest leaks", res: read("https://www.nerdwallet.com/finance/learn/best-expense-tracker-apps", "Best Apps to Track Expenses", "NerdWallet",
            "Rank your spending high to low. The top two or three discretionary categories — dining, subscriptions, impulse buys — are where a small change frees the most cash.") },
        ],
      },
      {
        title: "Build a cushion",
        res: read("https://www.nerdwallet.com/banking/learn/why-you-should-save-a-rainy-day-fund-and-an-emergency-fund", "Rainy Day Fund vs. Emergency Fund", "NerdWallet",
          "Aim for 3–6 months of essential expenses in a separate, easy-to-reach account. Start with a $500–$1,000 mini-fund so one surprise bill never becomes debt."),
        subs: [
          { title: "Open a separate savings account", res: read("https://www.nerdwallet.com/banking/learn/emergency-fund-calculator", "Emergency Fund Calculator", "NerdWallet",
            "Open a high-yield savings account (often 4%+ APY) at a different bank from your checking, so the cushion is out of sight and earning while it waits.") },
          { title: "Automate a weekly transfer", res: read("https://www.nerdwallet.com/finance/learn/how-to-save-money", "How to Save Money: 28 Ways", "NerdWallet",
            "Schedule an automatic transfer the day after payday — even $20/week is over $1,000 a year. Automating it means you save before you can spend it.") },
        ],
      },
      {
        title: "Invest for growth",
        res: read("https://www.nerdwallet.com/retirement/learn/how-and-where-to-open-a-roth-ira", "How to Open a Roth IRA in 5 Steps", "NerdWallet",
          "Once the cushion is set, put long-term money to work. A Roth IRA grows tax-free; low-cost index funds are the simplest core holding for a beginner."),
        subs: [
          { title: "Open a retirement account", res: read("https://www.nerdwallet.com/retirement/learn/how-and-where-to-open-an-ira", "How to Open an IRA in 4 Steps", "NerdWallet",
            "You need earned income to contribute. Open a Roth or traditional IRA at a major broker in about 15 minutes — then actually invest the cash, since contributing is only step one.") },
        ],
      },
      { title: "Lasting stability", res: read(NW_BUDGET, "How to Manage Money: A Step-By-Step Guide", "NerdWallet",
        "With spending mapped, a cushion in place, and money invested, keep the system running: review quarterly, raise contributions when income does, and let compounding do the work."), subs: [] },
    ],
  },
  {
    id: "fitness",
    title: "Get into the best shape of your life",
    short: "Fitness",
    prompt: "Get into the best shape of my life",
    icon: "fitness",
    color: "#d5896f",
    milestones: [
      {
        title: "Set your baseline",
        res: watch("XhYSBi0hePA", "7 Exercises to Test Your Fitness Level at Home",
          "Before you train, measure where you start so progress is undeniable. A few simple tests — a timed run, max push-ups, a plank hold — give you numbers to beat."),
        subs: [
          { title: "Take starting measurements", res: watch("XhYSBi0hePA", "7 Exercises to Test Your Fitness Level at Home",
            "Record your weight, key measurements, and a couple of photos on day one. Progress often shows in the tape and the mirror before the scale — so capture the 'before'.") },
          { title: "Do a fitness test", res: watch("XhYSBi0hePA", "7 Exercises to Test Your Fitness Level at Home",
            "Run a short battery: a 1-mile time or Cooper 12-minute run, max push-ups, and a plank hold. That maps your cardio, strength, and endurance in one session.") },
        ],
      },
      {
        title: "Build the habit",
        res: watch("7GkMHPe_OXw", "20 Min Full Body Workout for Beginners (No Equipment)",
          "Consistency beats intensity early on. Train 3–4 times a week with full-body sessions for a month — the habit is the real adaptation before the muscle is."),
        subs: [
          { title: "Train 4× a week for a month", res: watch("7GkMHPe_OXw", "20 Min Full Body Workout for Beginners (No Equipment)",
            "Four 20–40 minute full-body sessions a week hit each muscle group 2–3 times — the beginner sweet spot. Same days each week makes it automatic.") },
        ],
      },
      {
        title: "Level up strength",
        res: watch("9udG51uTuls", "Every Type of Progressive Overload Explained in 8 Minutes",
          "Once movements feel easy, add stress gradually — progressive overload. Add reps, then sets, then a little weight, and strength climbs week over week."),
        subs: [
          { title: "Increase load each week", res: watch("9udG51uTuls", "Every Type of Progressive Overload Explained in 8 Minutes",
            "Aim to beat last week by a rep or a small load bump on your main lifts. Even 2.5–5 lb jumps compound into big gains over a few months.") },
        ],
      },
      { title: "Hit your peak", res: watch("9udG51uTuls", "Every Type of Progressive Overload Explained in 8 Minutes",
        "Keep progressing, deload when you stall, and prioritize sleep and protein (~0.7–1 g per lb of bodyweight). Peak shape is months of small, repeatable wins."), subs: [] },
    ],
  },
  {
    id: "language",
    title: "Become conversational in a new language",
    short: "Language",
    prompt: "Become conversational in Spanish",
    icon: "language",
    color: "#8fae9f",
    milestones: [
      {
        title: "Learn 500 core words",
        res: watch("pm7Fhq7p6zU", "100 Most Common Spanish Words",
          "A few hundred high-frequency words cover most everyday speech. Learn the first 500–1,000 with spaced repetition and you'll follow the gist of most conversations."),
        subs: [
          { title: "15 min of flashcards daily", res: read(ANKI, "Anki for Language Learning: The Complete Guide", "Anki Language Learning",
            "Use a spaced-repetition app like Anki for 10–15 minutes a day. Learn words inside short example sentences (i+1), not in isolation, so they stick in context.") },
        ],
      },
      {
        title: "Practice speaking",
        res: read(ITALKI, "Find a Tutor on italki", "italki",
          "You learn to speak by speaking. Start early — even at 500 words — because output forces recall and exposes the gaps that silent study hides."),
        subs: [
          { title: "Find a conversation partner", res: read(ITALKI, "Find a Tutor on italki", "italki",
            "Book cheap 1-on-1 lessons or a language exchange (italki, Tandem, HelloTalk). Thirty minutes twice a week with a real person beats any app for fluency.") },
        ],
      },
      {
        title: "Gain confidence",
        res: read(BABELFISH, "How to Learn Any Language: The Method", "Tower of Babelfish",
          "Confidence comes from reps under mild pressure. Narrate your day out loud, think in the language, and let small mistakes happen — fluency is built on them."),
        subs: [
          { title: "Record yourself weekly", res: read(BABELFISH, "How to Learn Any Language: The Method", "Tower of Babelfish",
            "Record a 2-minute monologue each week on the same topic. Playing it back catches pronunciation and hesitation you can't hear live — and the week-to-week jump is motivating.") },
        ],
      },
      { title: "Full conversation", res: read(ITALKI, "Find a Tutor on italki", "italki",
        "The goal: hold a natural 10-minute chat. By now you have the words, the reps, and the ear — keep talking with real people and it becomes automatic."), subs: [] },
    ],
  },
  {
    id: "startup",
    title: "Launch your side project",
    short: "Startup",
    prompt: "Launch my side project",
    icon: "rocket",
    color: "#9aa6d4",
    milestones: [
      {
        title: "Validate the idea",
        res: watch("-nvJIfQnidw", "How to Validate Your Startup Idea for $50",
          "Before you build, prove someone wants it. Talk to 10–15 potential users or run a small landing-page test — the idea isn't validated until people click, pay, or pre-order."),
        subs: [
          { title: "Write a one-line mission", res: watch("-nvJIfQnidw", "How to Validate Your Startup Idea for $50",
            "Force clarity: “[Product] helps [who] do [what] so they can [outcome].” If you can't say it in one sentence, the idea isn't sharp enough to build yet.") },
          { title: "Sketch the core feature", res: watch("Y6YTL_bmVFE", "Steve Blank: How to Build a Minimum Viable Product",
            "Draw the single screen or flow that delivers the core value. One feature done well beats ten half-built — everything else is a distraction until this works.") },
        ],
      },
      {
        title: "Build the MVP",
        res: watch("Y6YTL_bmVFE", "Steve Blank: How to Build a Minimum Viable Product",
          "Build the smallest version that delivers the core value and nothing else. Ship in weeks, not months — the point is to learn from real users, not to be perfect."),
        subs: [
          { title: "Ship the smallest version", res: watch("Y6YTL_bmVFE", "Steve Blank: How to Build a Minimum Viable Product",
            "Cut every 'nice to have.' If you're not slightly embarrassed by v1, you shipped too late. Use no-code or off-the-shelf tools to get it live fast.") },
          { title: "Test with 5 people", res: read(NNG_5, "Why You Only Need to Test With 5 Users", "Nielsen Norman Group",
            "Watch five real users try it without your help — five is enough to surface about 80% of the big usability problems. Take notes; don't defend.") },
        ],
      },
      { title: "Gather momentum", res: read(PH_LAUNCH, "The Product Hunt Launch Guide", "Product Hunt",
        "Turn early feedback into a tight loop: ship a small improvement, share it, repeat weekly. A few vocal early users matter more than a big audience right now."),
        subs: [
          { title: "Refine on feedback", res: read(NNG_5, "Why You Only Need to Test With 5 Users", "Nielsen Norman Group",
            "Group feedback into themes, fix the ones blocking the core value first, and ignore requests that pull you off your one-line mission.") },
        ],
      },
      { title: "Launch day", res: read(PH_LAUNCH, "The Product Hunt Launch Guide", "Product Hunt",
        "Pick a Tuesday–Thursday, prep your assets weeks ahead, and treat launch day as live customer support. On Product Hunt, go live at 12:01 am PT and reply to every comment — never ask for upvotes."), subs: [] },
    ],
  },
  {
    id: "travel",
    title: "Plan the trip of a lifetime",
    short: "Travel",
    prompt: "Plan the trip of a lifetime",
    icon: "travel",
    color: "#7fb0ad",
    milestones: [
      {
        title: "Pick a destination",
        res: read(NW_TRIP, "How to Plan a Trip", "NerdWallet",
          "Start from your constraints — budget, dates, the vibe you want — then pick 2–3 destinations that fit. Shoulder season (spring/fall) means cheaper flights, fewer crowds, better weather."),
        subs: [
          { title: "Research 3 places", res: read(NW_TRIP, "How to Plan a Trip", "NerdWallet",
            "Shortlist three destinations and compare flight cost, daily budget, safety, and season. A quick spreadsheet makes the trade-offs obvious.") },
          { title: "Set budget & dates", res: read("https://www.nerdwallet.com/travel/learn/best-days-book-flight-fly", "The Best Days to Book a Flight and When to Fly", "NerdWallet",
            "Fix a total budget and stay flexible on dates. Flying Tuesday/Wednesday and booking domestic 1–3 months out (international 2–8 months) usually lands the best fares.") },
        ],
      },
      {
        title: "Book the essentials",
        res: read("https://www.nerdwallet.com/travel/learn/how-to-shop-for-flights", "How to Book a Flight", "NerdWallet",
          "Lock the big rocks first — flights and stays — while prices are low, then build the rest around them. Compare two one-ways vs a round-trip, and set fare alerts."),
        subs: [
          { title: "Lock flights & stays", res: read("https://www.nerdwallet.com/travel/learn/how-to-save-money-on-flights", "How to Save Money on Flights", "NerdWallet",
            "Use Google Flights to compare, watch the sweet-spot window, and check nearby airports. Book refundable stays early so you're covered if plans shift.") },
        ],
      },
      { title: "Plan the itinerary", res: read(NW_TRIP, "How to Plan a Trip", "NerdWallet",
        "Plan loosely — 2–3 anchor activities a day, not a packed schedule. Leave room to wander; the best travel memories are usually the unplanned ones."),
        subs: [
          { title: "List must-sees", res: read(NW_TRIP, "How to Plan a Trip", "NerdWallet",
            "Pick the handful of things you'd regret missing and book those ahead — timed-entry sights sell out. Everything else can stay flexible.") },
          { title: "Book experiences", res: read(NW_TRIP, "How to Plan a Trip", "NerdWallet",
            "Reserve only the few experiences that need it — popular tours, restaurants, tickets — a few weeks out. Skip over-planning the rest.") },
        ],
      },
      { title: "Depart ready", res: read(NW_TRIP, "How to Plan a Trip", "NerdWallet",
        "Check documents (passport validity, visas), notify your bank, download offline maps, and pack light. Arrive with the essentials handled so the trip can just happen."), subs: [] },
    ],
  },
];
