export const leaderKey = " ";

export const pageSequence = [leaderKey, "g", "t", "p"] as const;
export const listProjectsSequence = [leaderKey, "l", "p"] as const;
export const listTasksSequence = [leaderKey, "l", "t"] as const;
export const listGoalsSequence = [leaderKey, "l", "g"] as const;
export const listInboxItemsSequence = [leaderKey, "l", "i"] as const;
export const listDocsSequence = [leaderKey, "l", "d"] as const;
export const listProjectDocsSequence = [leaderKey, "p", "d"] as const;
export const newInboxItemSequence = [leaderKey, "n", "i"] as const;
export const newGoalSequence = [leaderKey, "n", "g"] as const;
export const newTaskSequence = [leaderKey, "n", "t"] as const;
export const newProjectSequence = [leaderKey, "n", "p"] as const;
export const newDocSequence = [leaderKey, "n", "d"] as const;

export const mappedSequences = [
  pageSequence,
  listProjectsSequence,
  listTasksSequence,
  listGoalsSequence,
  listInboxItemsSequence,
  listDocsSequence,
  listProjectDocsSequence,
  newInboxItemSequence,
  newGoalSequence,
  newTaskSequence,
  newProjectSequence,
  newDocSequence,
] as const;

export function normalizeMappedKey(key: string) {
  return key === " " ? leaderKey : key.toLowerCase();
}

export function sequenceStartsWith(sequence: readonly string[], prefix: readonly string[]) {
  return prefix.every((value, index) => sequence[index] === value);
}
