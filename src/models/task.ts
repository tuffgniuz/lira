export type TaskStatus = "inbox" | "today" | "to do" | "upcoming" | "done";

export type TaskPriority = "low" | "medium" | "high" | "urgent" | "";

export type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string;
  priority: TaskPriority;
  project: string;
  tags: string[];
  notes: string;
  estimate: string;
  source: string;
  createdAt: string;
};
