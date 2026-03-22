import type { GoalMetric, GoalPeriod } from "@/models/workspace-item";

export type GoalIntent = "habit" | "outcome" | "progress";

export type GoalSuggestion = {
  id: string;
  label: string;
  sentence: string;
};

export type GoalDraft = {
  sentence: string;
  title: string;
  target: number;
  period: GoalPeriod;
  metric?: GoalMetric;
  projectId: string;
  intent: GoalIntent;
};

export const goalSuggestions: GoalSuggestion[] = [
  {
    id: "tasks-daily",
    label: "Complete tasks daily",
    sentence: "Complete 3 tasks daily",
  },
  {
    id: "journal-daily",
    label: "Write journal daily",
    sentence: "Write a journal entry every day",
  },
  {
    id: "process-inbox",
    label: "Process inbox",
    sentence: "Process inbox every day",
  },
  {
    id: "project-weekly",
    label: "Work on a project",
    sentence: "Work on Lira every week",
  },
];

export function inferGoalDraft(
  sentence: string,
  projects: Array<{ id: string; name: string }>,
): GoalDraft {
  const normalizedSentence = normalizeSentence(sentence);
  const lowered = normalizedSentence.toLowerCase();
  const target = extractTarget(lowered);
  const period = inferPeriod(lowered);
  const project = projects.find((candidate) =>
    lowered.includes(candidate.name.trim().toLowerCase()),
  );
  const metric = inferMetric(lowered);
  const intent = inferIntent();

  return {
    sentence: normalizedSentence,
    title: normalizedSentence,
    target,
    period,
    metric,
    projectId: project?.id ?? "",
    intent,
  };
}

function normalizeSentence(sentence: string) {
  const trimmed = sentence.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return "";
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function extractTarget(sentence: string) {
  const match = sentence.match(/\b(\d+)\b/);

  if (!match) {
    return 1;
  }

  const value = Number.parseInt(match[1], 10);

  return Number.isNaN(value) || value <= 0 ? 1 : value;
}

function inferPeriod(sentence: string): GoalPeriod {
  if (sentence.includes("daily") || sentence.includes("every day")) {
    return "daily";
  }

  if (sentence.includes("weekly") || sentence.includes("every week")) {
    return "weekly";
  }

  if (sentence.includes("monthly") || sentence.includes("every month")) {
    return "monthly";
  }

  if (sentence.includes("yearly") || sentence.includes("every year")) {
    return "yearly";
  }

  return "weekly";
}

function inferMetric(sentence: string): GoalMetric | undefined {
  return sentence.includes("task") ? "tasks_completed" : undefined;
}

function inferIntent(): GoalIntent {
  return "habit";
}
