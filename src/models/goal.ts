export type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type GoalMetricType =
  | "tasks_completed"
  | "inbox_items_processed"
  | "journal_entries_written"
  | "notes_created";

export type GoalStatus = "active" | "archived";

export type GoalItem = {
  id: string;
  title: string;
  description: string;
  metricType: GoalMetricType;
  targetValue: number;
  period: GoalPeriod;
  project: string;
  tagFilter: string;
  status: GoalStatus;
  createdAt: string;
};
