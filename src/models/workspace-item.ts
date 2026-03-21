export type WorkspaceItemKind = "capture" | "task" | "goal";

export type WorkspaceItemState = "inbox" | "someday" | "active" | "archived" | "deleted";

export type TaskPriority = "low" | "medium" | "high" | "urgent" | "";

export type TaskScheduleBucket = "inbox" | "today" | "upcoming" | "someday" | "none";

export type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type GoalMetric = "tasks_completed";

export type GoalScope = {
  projectId?: string;
  tag?: string;
  taskIds?: string[];
};

export type GoalProgressByDate = Record<string, number>;

export type WorkspaceItem = {
  id: string;
  kind: WorkspaceItemKind;
  state: WorkspaceItemState;
  sourceType: "capture" | "manual";
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  projectId?: string;
  projectLaneId?: string;
  project: string;
  isCompleted: boolean;
  priority: TaskPriority;
  dueDate: string;
  completedAt?: string;
  estimate: string;
  scheduleBucket?: TaskScheduleBucket;
  sourceCaptureId?: string;
  goalMetric?: GoalMetric;
  goalTarget: number;
  goalProgress?: number;
  goalProgressByDate?: GoalProgressByDate;
  goalPeriod: GoalPeriod;
  goalScope?: GoalScope;
};

export type ItemKind = WorkspaceItemKind;
export type ItemState = WorkspaceItemState;
export type Item = WorkspaceItem;
