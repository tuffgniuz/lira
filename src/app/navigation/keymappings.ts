export const leaderKey = " ";

export const pageSequence = [leaderKey, "g", "t", "p"] as const;
export const listProjectsSequence = [leaderKey, "l", "p"] as const;
export const listTasksSequence = [leaderKey, "l", "t"] as const;
export const listGoalsSequence = [leaderKey, "l", "g"] as const;
export const listInboxItemsSequence = [leaderKey, "l", "i"] as const;
export const newInboxItemSequence = [leaderKey, "n", "i"] as const;
export const newGoalSequence = [leaderKey, "n", "g"] as const;
export const newTaskSequence = [leaderKey, "n", "t"] as const;
export const newProjectSequence = [leaderKey, "n", "p"] as const;

export const mappedSequences = [
  pageSequence,
  listProjectsSequence,
  listTasksSequence,
  listGoalsSequence,
  listInboxItemsSequence,
  newInboxItemSequence,
  newGoalSequence,
  newTaskSequence,
  newProjectSequence,
] as const;

export function normalizeMappedKey(key: string) {
  return key === " " ? leaderKey : key.toLowerCase();
}

export function sequenceStartsWith(sequence: readonly string[], prefix: readonly string[]) {
  return prefix.every((value, index) => sequence[index] === value);
}
