import { useEffect, useRef } from "react";

export function useTaskDetailNavigation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        const activeElement = document.activeElement as HTMLElement | null;

        if (
          activeElement &&
          !activeElement.closest(".cm-editor") &&
          ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName)
        ) {
          event.preventDefault();
          event.stopPropagation();
          activeElement.blur();
        }
        return;
      }

      if (
        event.metaKey ||
        event.altKey ||
        (event.key === "Tab" && event.ctrlKey) ||
        (event.key !== "Tab" && !event.ctrlKey)
      ) {
        return;
      }

      const loweredKey = event.key.toLowerCase();
      const isNext = (event.ctrlKey && loweredKey === "n") || (event.key === "Tab" && !event.shiftKey);
      const isPrev = (event.ctrlKey && loweredKey === "p") || (event.key === "Tab" && event.shiftKey);

      if (!isNext && !isPrev) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;

      if (activeElement?.closest(".cm-editor")) {
        const isVimInsertMode = document.querySelector(".cm-fat-cursor") === null;

        if (isVimInsertMode) {
          return;
        }

        if (event.key === "Tab") {
          return;
        }
      }

      const focusableSelectors = [
        "textarea:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        ".cm-content",
      ].join(", ");

      const focusableElements = Array.from(
        container?.querySelectorAll<HTMLElement>(focusableSelectors) ?? []
      ).filter(el => {
        if (el.closest('[role="dialog"]') || el.closest(".ui-modal") || el.closest(".task-detail-page__header-actions")) {
          return false;
        }

        if (el.classList.contains("cm-content")) {
          return true;
        }

        return (el.tabIndex !== -1 || el.isContentEditable) && el.offsetParent !== null;
      });

      if (focusableElements.length === 0) {
        return;
      }

      let currentIndex = activeElement ? focusableElements.indexOf(activeElement) : -1;

      if (currentIndex === -1 && activeElement?.closest(".cm-editor")) {
        const cmContent = activeElement.closest(".cm-editor")?.querySelector(".cm-content");
        if (cmContent) {
           currentIndex = focusableElements.indexOf(cmContent as HTMLElement);
        }
      }

      event.preventDefault();

      if (currentIndex === -1) {
        focusableElements[0]?.focus();
        return;
      }

      let nextIndex;

      if (isNext) {
        nextIndex = (currentIndex + 1) % focusableElements.length;
      } else {
        nextIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
      }

      const targetElement = focusableElements[nextIndex];

      if (targetElement) {
        targetElement.focus();
      }
    }

    container.addEventListener("keydown", handleKeyDown, true);

    return () => {
      container.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return containerRef;
}