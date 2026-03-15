export type ItemKind = "capture" | "task" | "goal" | "document";

export type ItemState = "inbox" | "someday" | "active" | "archived" | "deleted";

export type TaskStatus = "inbox" | "today" | "to do" | "upcoming" | "done";

export type TaskPriority = "low" | "medium" | "high" | "urgent" | "";

export type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type GoalMetricType =
  | "tasks_completed"
  | "inbox_items_processed"
  | "journal_entries_written"
  | "notes_created";

export type Item = {
  id: string;
  kind: ItemKind;
  state: ItemState;
  sourceType: "capture" | "manual";
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  project: string;
  taskStatus: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  estimate: string;
  goalMetricType: GoalMetricType;
  goalTargetValue: number;
  goalPeriod: GoalPeriod;
};
