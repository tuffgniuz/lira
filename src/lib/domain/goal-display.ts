import type { JournalEntrySummary } from "@/models/journal";
import type { Item } from "@/models/workspace-item";
import { resolveGoalProgressForDate } from "./goal-progress";

export type GoalProgressContext = {
  items: Item[];
  journalSummaries: JournalEntrySummary[];
  todayDate: string;
};

export type GoalWeekDay = {
  id: string;
  label: string;
  shortLabel: string;
  date: string;
};

export type GoalWeekDayStatus = {
  kind: "met" | "missed" | "pending" | "off-day";
  label: string;
  symbol: string;
};

export function formatGoalMetricLabel(goal: Item) {
  if (goal.goalMilestones?.length) {
    return "Milestones";
  }

  switch (goal.goalMetric) {
    case "tasks_completed":
      return "Tasks";
    default:
      return "Direct";
  }
}

export function getCurrentGoalWeekDays(todayDate: string): GoalWeekDay[] {
  const start = getWeekStart(todayDate);
  const dayLabels = [
    { id: "monday", label: "Monday", shortLabel: "Mon" },
    { id: "tuesday", label: "Tuesday", shortLabel: "Tue" },
    { id: "wednesday", label: "Wednesday", shortLabel: "Wed" },
    { id: "thursday", label: "Thursday", shortLabel: "Thu" },
    { id: "friday", label: "Friday", shortLabel: "Fri" },
    { id: "saturday", label: "Saturday", shortLabel: "Sat" },
    { id: "sunday", label: "Sunday", shortLabel: "Sun" },
  ] as const;

  return dayLabels.map((day, index) => ({
    ...day,
    date: formatDate(addDays(start, index)),
  }));
}

export function resolveGoalWeekDayStatus(
  goal: Item,
  progressContext: GoalProgressContext,
  date: string,
  todayDate: string,
): GoalWeekDayStatus {
  if (isGoalOffDay(goal, date)) {
    return {
      kind: "off-day",
      label: "off day",
      symbol: "◦",
    };
  }

  const progress = resolveGoalProgressForDate(goal, progressContext, date);
  const met = progress >= goal.goalTarget;

  if (met) {
    return {
      kind: "met",
      label: "met",
      symbol: "✓",
    };
  }

  if (date < todayDate) {
    return {
      kind: "missed",
      label: "missed",
      symbol: "×",
    };
  }

  return {
    kind: "pending",
    label: "pending",
    symbol: "—",
  };
}

function isGoalOffDay(goal: Item, date: string) {
  if (goal.goalPeriod !== "daily") {
    return false;
  }

  const scheduleDays = goal.goalScheduleDays ?? [];

  if (scheduleDays.length === 0) {
    return false;
  }

  const weekday = getWeekdayName(date);
  return weekday ? !scheduleDays.includes(weekday) : false;
}

function getWeekStart(date: string) {
  const current = new Date(`${date}T00:00:00`);
  const mondayOffset = current.getDay() === 0 ? -6 : 1 - current.getDay();
  const monday = new Date(current);
  monday.setDate(current.getDate() + mondayOffset);
  return monday;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekdayName(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const current = new Date(`${date}T00:00:00`);
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;

  return weekdays[current.getDay()] ?? null;
}
