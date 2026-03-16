export type ItemKind = "capture" | "task" | "goal" | "document";

export type ItemState = "inbox" | "someday" | "active" | "archived" | "deleted";

export type TaskStatus = "inbox" | "today" | "to do" | "upcoming" | "done";

export type TaskPriority = "low" | "medium" | "high" | "urgent" | "";

export type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type GoalTrackingMode = "automatic" | "manual";

export type GoalMetric =
  | "tasks_completed"
  | "inbox_items_processed"
  | "journal_entries_written"
  | "notes_created"
  | "manual_units";

export type GoalScope = {
  projectId?: string;
  tag?: string;
  taskIds?: string[];
};

export type GoalProgressByDate = Record<string, number>;

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
  projectId?: string;
  project: string;
  taskStatus: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  completedAt?: string;
  estimate: string;
  goalMetric: GoalMetric;
  goalTarget: number;
  goalProgress?: number;
  goalProgressByDate?: GoalProgressByDate;
  goalPeriod: GoalPeriod;
  goalTrackingMode: GoalTrackingMode;
  goalScope?: GoalScope;
};
