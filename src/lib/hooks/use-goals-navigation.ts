import { useEffect, useState } from "react";
import type { GoalPeriod, Item } from "@/models/workspace-item";

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable ||
      target.getAttribute("contenteditable") === "true" ||
      target.closest("[contenteditable]") !== null)
  );
}

export function useGoalsNavigation({
  goals,
  activePeriod,
  setActivePeriod,
  onSelectGoal,
  onDeleteGoal,
  leftCollapsed,
  rightCollapsed,
}: {
  goals: Item[];
  activePeriod: GoalPeriod;
  setActivePeriod: (period: GoalPeriod) => void;
  onSelectGoal: (goalId: string) => void;
  onDeleteGoal: (goal: Item) => void;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
}) {
  const [activeColumn, setActiveColumn] = useState<"left" | "center" | "right">("center");
  const [focusedGoalId, setFocusedGoalId] = useState<string>("");

  const periods: GoalPeriod[] = ["daily", "weekly", "monthly", "yearly"];

  useEffect(() => {
    if (goals.length > 0 && (!focusedGoalId || !goals.some((g) => g.id === focusedGoalId))) {
      setFocusedGoalId(goals[0].id);
    } else if (goals.length === 0) {
      setFocusedGoalId("");
    }
  }, [goals, focusedGoalId]);

  useEffect(() => {
    let lastKey = "";
    let lastKeyTime = 0;

    function processKey(event: KeyboardEvent) {
      if (isTypingTarget(event.target) || event.metaKey || event.altKey) {
        return;
      }

      if ((event.key === "h" || event.key === "ArrowLeft") && event.ctrlKey) {
        event.preventDefault();
        setActiveColumn((prev) => {
          if (prev === "right") return "center";
          if (prev === "center" && !leftCollapsed) return "left";
          return prev;
        });
        return;
      }
      
      if ((event.key === "l" || event.key === "ArrowRight") && event.ctrlKey) {
        event.preventDefault();
        setActiveColumn((prev) => {
          if (prev === "left") return "center";
          if (prev === "center" && !rightCollapsed) return "right";
          return prev;
        });
        return;
      }

      // If left is collapsed, fallback to center logic for filters if they want to navigate them with j/k? 
      // Actually, if left is collapsed, left is never active.

      if (activeColumn === "left" || (activeColumn === "center" && leftCollapsed)) {
        // When left is collapsed, we allow j/k to navigate filters if no goal card is focused or we just want to be lenient.
        // Let's just strictly follow: if left is active, we navigate filters.
        const isNextFilter =
          event.key === "j" ||
          event.key === "ArrowDown" ||
          (event.key === "Tab" && !event.shiftKey);
        const isPrevFilter =
          event.key === "k" ||
          event.key === "ArrowUp" ||
          (event.key === "Tab" && event.shiftKey);

        if ((isNextFilter || isPrevFilter) && activeColumn === "left") {
          event.preventDefault();
          const currentIndex = periods.indexOf(activePeriod);
          const startIndex = currentIndex >= 0 ? currentIndex : 0;
          const offset = isPrevFilter ? -1 : 1;
          const nextIndex = (startIndex + offset + periods.length) % periods.length;
          setActivePeriod(periods[nextIndex]);
          return;
        }
      }

      if (activeColumn === "center") {
        const isNextCard = (event.key === "Tab" && !event.shiftKey) || event.key === "j" || event.key === "ArrowDown";
        const isPrevCard = (event.key === "Tab" && event.shiftKey) || event.key === "k" || event.key === "ArrowUp";

        if (isNextCard || isPrevCard) {
          event.preventDefault();
          if (goals.length === 0) return;

          const currentIndex = goals.findIndex((g) => g.id === focusedGoalId);
          const startIndex = currentIndex >= 0 ? currentIndex : 0;
          const offset = isPrevCard ? -1 : 1;
          const nextIndex = (startIndex + offset + goals.length) % goals.length;
          setFocusedGoalId(goals[nextIndex].id);
          return;
        }

        if (event.key === "Enter") {
          if (focusedGoalId) {
            event.preventDefault();
            onSelectGoal(focusedGoalId);
          }
          return;
        }

        if (event.key === "d" && !event.ctrlKey) {
          const now = Date.now();
          if (lastKey === "d" && now - lastKeyTime < 500) {
            event.preventDefault();
            const goalToDelete = goals.find((g) => g.id === focusedGoalId);
            if (goalToDelete) {
              onDeleteGoal(goalToDelete);
            }
            lastKey = "";
          } else {
            lastKey = "d";
            lastKeyTime = now;
          }
          return;
        }
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") return; 
      processKey(event);
    }

    function handleTabCapture(event: KeyboardEvent) {
      if (event.key === "Tab") {
        processKey(event);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleTabCapture, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleTabCapture, true);
    };
  }, [
    activeColumn,
    activePeriod,
    focusedGoalId,
    goals,
    setActivePeriod,
    onSelectGoal,
    onDeleteGoal,
    leftCollapsed,
    rightCollapsed,
  ]);

  return {
    activeColumn,
    focusedGoalId,
    setActiveColumn,
    setFocusedGoalId,
  };
}
