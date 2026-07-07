import type { GoalMapResult, GeneratedNode } from "@/lib/ai/types";
import type { NodeResource } from "@/types";

// Starter goals: proven, pre-built plans a user can adopt in one tap. A template
// IS a goal map, so adopting it reuses the normal creation path with NO AI call
// (instant + free), and its video steps still resolve to real YouTube on open.

export interface TemplateStep {
  title: string;
  minutes?: number;
  resource?: NodeResource;
  subs?: { title: string; minutes?: number; resource?: NodeResource }[];
}
export interface GoalTemplate {
  id: string;
  title: string;
  blurb: string;
  category: string;
  /** an icon key from GOAL_ICON_KEYS */
  icon: string;
  targetWeeks: number;
  milestones: TemplateStep[];
}

const watch = (label: string, query: string): NodeResource => ({ kind: "watch", label, query });
const practice = (label: string, query: string): NodeResource => ({ kind: "practice", label, query });
const read = (label: string, query: string): NodeResource => ({ kind: "read", label, query });

export const TEMPLATES: GoalTemplate[] = [
  {
    id: "run-5k",
    title: "Run your first 5K",
    blurb: "Go from the couch to a full 5K in eight weeks.",
    category: "Fitness",
    icon: "fitness",
    targetWeeks: 8,
    milestones: [
      { title: "Build a walk-run base, 3× a week", minutes: 30, resource: watch("Couch to 5K week 1", "couch to 5k week 1 walk run guide") },
      { title: "Reach 20 minutes of continuous running", minutes: 30, subs: [{ title: "Run 5 min, walk 1 min — repeat 4×", minutes: 30 }] },
      { title: "Run 3K without stopping", minutes: 35 },
      { title: "Complete a full 5K", minutes: 45, resource: read("Beginner race-day tips", "beginner 5k race day tips") },
    ],
  },
  {
    id: "spanish-convo",
    title: "Hold a conversation in Spanish",
    blurb: "Reach a real 5-minute conversation in three months.",
    category: "Language",
    icon: "language",
    targetWeeks: 12,
    milestones: [
      { title: "Learn the 100 most common words", minutes: 30, resource: watch("Most common Spanish words", "100 most common spanish words for beginners"), subs: [{ title: "Do 10 minutes of flashcards daily", minutes: 10 }] },
      { title: "Master present-tense verbs", minutes: 30, resource: practice("Present-tense practice", "spanish present tense conjugation practice") },
      { title: "Have your first 5-minute chat", minutes: 30, resource: read("Find a language partner", "spanish conversation exchange apps") },
      { title: "Handle past and future tense", minutes: 30 },
    ],
  },
  {
    id: "side-project",
    title: "Ship a side project",
    blurb: "Take an idea to a public launch in ten weeks.",
    category: "Build",
    icon: "code",
    targetWeeks: 10,
    milestones: [
      { title: "Write the idea in one sentence", minutes: 20 },
      { title: "Build the smallest usable version", minutes: 90, subs: [{ title: "List the 3 must-have features", minutes: 20 }] },
      { title: "Get 5 people to try it", minutes: 45 },
      { title: "Launch it publicly", minutes: 60, resource: read("How to launch well", "how to launch a side project on product hunt") },
    ],
  },
  {
    id: "read-12",
    title: "Read 12 books this year",
    blurb: "One book a month, built on a daily habit.",
    category: "Habit",
    icon: "study",
    targetWeeks: 52,
    milestones: [
      { title: "Pick your first 3 books", minutes: 20 },
      { title: "Build a 20-minute daily reading habit", minutes: 20, resource: watch("Build a reading habit", "how to build a daily reading habit") },
      { title: "Finish book #1", minutes: 30 },
      { title: "Keep a one-line takeaway per book", minutes: 10 },
    ],
  },
  {
    id: "first-pullup",
    title: "Get your first pull-up",
    blurb: "Build to a strict, unassisted pull-up.",
    category: "Fitness",
    icon: "fitness",
    targetWeeks: 10,
    milestones: [
      { title: "Build grip and hang strength", minutes: 20, resource: practice("Dead hang progression", "dead hang progression for beginners") },
      { title: "Do negative pull-ups 3× a week", minutes: 25, resource: watch("Negative pull-ups", "negative pull up progression tutorial") },
      { title: "Move to band-assisted pull-ups", minutes: 25 },
      { title: "Nail your first unassisted rep", minutes: 20 },
    ],
  },
  {
    id: "emergency-fund",
    title: "Build a 3-month emergency fund",
    blurb: "A cushion that covers three months of essentials.",
    category: "Money",
    icon: "money",
    targetWeeks: 24,
    milestones: [
      { title: "Total your monthly essentials", minutes: 30 },
      { title: "Open a separate high-yield savings account", minutes: 30 },
      { title: "Automate a weekly transfer", minutes: 20, resource: read("Automate your savings", "how to automate savings transfers") },
      { title: "Reach one month, then three", minutes: 15 },
    ],
  },
  {
    id: "cook-10",
    title: "Cook 10 meals you love",
    blurb: "Build a rotation of meals you can make from memory.",
    category: "Cooking",
    icon: "cooking",
    targetWeeks: 10,
    milestones: [
      { title: "Pick 10 meals to master", minutes: 20 },
      { title: "Learn 5 knife and prep basics", minutes: 30, resource: watch("Basic knife skills", "basic knife skills for beginners") },
      { title: "Cook two new meals a week", minutes: 45 },
      { title: "Host someone with your best dish", minutes: 60 },
    ],
  },
  {
    id: "newsletter",
    title: "Start a weekly newsletter",
    blurb: "Find your angle and publish four weeks straight.",
    category: "Creative",
    icon: "writing",
    targetWeeks: 8,
    milestones: [
      { title: "Define who it's for and the promise", minutes: 30 },
      { title: "Set up the publishing tool", minutes: 30, resource: read("Pick a platform", "best newsletter platforms for beginners") },
      { title: "Write and send issue #1", minutes: 60 },
      { title: "Publish four weeks in a row", minutes: 45 },
    ],
  },
];

/** Flatten a template into a GoalMapResult (chronological spine + sub-steps). */
export function templateToMap(t: GoalTemplate, todayMs: number): GoalMapResult {
  const nodes: GeneratedNode[] = [];
  let prevMilestone: number | null = null;
  for (const m of t.milestones) {
    const idx = nodes.length;
    nodes.push({
      title: m.title,
      description: "",
      status: "not_started",
      estimatedMinutes: m.minutes ?? 60,
      priority: idx + 1,
      aiReason: "",
      parentIndex: prevMilestone,
      resource: m.resource ?? null,
    });
    prevMilestone = idx;
    for (const s of m.subs ?? []) {
      nodes.push({
        title: s.title,
        description: "",
        status: "not_started",
        estimatedMinutes: s.minutes ?? 30,
        priority: 3,
        aiReason: "",
        parentIndex: idx,
        resource: s.resource ?? null,
      });
    }
  }
  const target = new Date(todayMs + t.targetWeeks * 7 * 86_400_000).toISOString().slice(0, 10);
  return {
    title: t.title,
    description: t.blurb,
    suggestedTargetDate: target,
    nodes,
    firstNextAction: "",
    weeklyRhythm: "",
    icon: t.icon,
  };
}
