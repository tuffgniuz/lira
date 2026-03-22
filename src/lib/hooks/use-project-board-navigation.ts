import { useEffect, useRef, useState } from "react";

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

export function useProjectBoardNavigation<
  TLane extends { id: string },
  TTask extends { id: string },
>({
  boardLanes,
  laneGroups,
  laneModalOpen,
  onSelectTask,
}: {
  boardLanes: TLane[];
  laneGroups: Map<string, TTask[]>;
  laneModalOpen: boolean;
  onSelectTask: (taskId: string) => void;
}) {
  const [draggingTaskId, setDraggingTaskId] = useState("");
  const [activeLaneId, setActiveLaneId] = useState("");
  const [activeTaskId, setActiveTaskId] = useState("");
  const [pendingFocusedTaskId, setPendingFocusedTaskId] = useState("");
  const [draftTaskLaneId, setDraftTaskLaneId] = useState("");
  const [draftTaskTitle, setDraftTaskTitle] = useState("");
  const laneRefs = useRef(new Map<string, HTMLElement>());
  const activeLaneTasks = activeLaneId ? laneGroups.get(activeLaneId) ?? [] : [];

  useEffect(() => {
    if (!boardLanes.length) {
      setActiveLaneId("");
      setDraftTaskLaneId("");
      setActiveTaskId("");
      return;
    }

    if (!boardLanes.some((lane) => lane.id === activeLaneId)) {
      setActiveLaneId(boardLanes[0].id);
    }
  }, [activeLaneId, boardLanes]);

  useEffect(() => {
    if (!activeLaneId) {
      setActiveTaskId("");
      return;
    }

    if (!activeLaneTasks.length) {
      setActiveTaskId("");
      return;
    }

    if (
      pendingFocusedTaskId &&
      activeLaneTasks.some((task) => task.id === pendingFocusedTaskId)
    ) {
      setActiveTaskId(pendingFocusedTaskId);
      setPendingFocusedTaskId("");
      return;
    }

    if (!activeLaneTasks.some((task) => task.id === activeTaskId)) {
      setActiveTaskId(activeLaneTasks[0].id);
    }
  }, [activeLaneId, activeLaneTasks, activeTaskId, pendingFocusedTaskId]);

  useEffect(() => {
    if (!activeLaneId || laneModalOpen) {
      return;
    }

    const lane = laneRefs.current.get(activeLaneId);

    if (!lane) {
      return;
    }

    lane.focus();
    if (typeof lane.scrollIntoView === "function") {
      lane.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeLaneId, laneModalOpen]);

  useEffect(() => {
    function processKey(event: KeyboardEvent) {
      if (laneModalOpen || !boardLanes.length) {
        return;
      }

      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (draftTaskLaneId) {
        return;
      }

      if (event.key === "n") {
        if (!activeLaneId) {
          return;
        }

        event.preventDefault();
        setDraftTaskLaneId(activeLaneId);
        setDraftTaskTitle("");
        return;
      }

      if (event.key === "Enter") {
        if (!activeTaskId) {
          return;
        }

        event.preventDefault();
        onSelectTask(activeTaskId);
        return;
      }

      if ((event.key === "j" || event.key === "k") && activeLaneTasks.length) {
        event.preventDefault();

        const currentIndex = activeLaneTasks.findIndex((task) => task.id === activeTaskId);
        const startIndex = currentIndex >= 0 ? currentIndex : 0;
        const offset = event.key === "j" ? 1 : -1;
        const nextIndex = Math.max(
          0,
          Math.min(activeLaneTasks.length - 1, startIndex + offset),
        );
        setActiveTaskId(activeLaneTasks[nextIndex].id);
        return;
      }

      const isPreviousLaneMotion =
        event.key === "h" ||
        event.key === "ArrowLeft";
      const isNextLaneMotion =
        event.key === "l" ||
        event.key === "ArrowRight" ||
        (event.key === "Tab" && !event.shiftKey);

      if (!isPreviousLaneMotion && !isNextLaneMotion) {
        return;
      }

      event.preventDefault();

      const currentIndex = boardLanes.findIndex((lane) => lane.id === activeLaneId);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const offset = isPreviousLaneMotion ? -1 : 1;
      const nextIndex = (startIndex + offset + boardLanes.length) % boardLanes.length;
      setActiveLaneId(boardLanes[nextIndex].id);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") return; // Handled in capture phase
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
    activeLaneId,
    activeLaneTasks,
    activeTaskId,
    boardLanes,
    draftTaskLaneId,
    laneGroups,
    laneModalOpen,
    onSelectTask,
  ]);

  return {
    activeLaneId,
    activeTaskId,
    draftTaskLaneId,
    draftTaskTitle,
    draggingTaskId,
    laneRefs,
    pendingFocusedTaskId,
    setActiveLaneId,
    setActiveTaskId,
    setDraftTaskLaneId,
    setDraftTaskTitle,
    setDraggingTaskId,
    setPendingFocusedTaskId,
  };
}
