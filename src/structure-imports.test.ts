import { describe, expect, it } from "vitest";
import { navigationItems } from "./app/navigation/navigation";
import { PageContent } from "./app/shell/page-content";
import { ActionBar } from "./components/actions/action-bar";
import { QuickCaptureModal } from "./components/actions/quick-capture-modal";
import { Card } from "./components/data-display/card";
import { EmptyState } from "./components/feedback/empty-state";
import { FormField } from "./components/data-input/form-field";
import { ThreeColumnLayout } from "./components/layout/three-column-layout";
import { TasksPage } from "./pages/tasks/tasks-page";
import { useWindowWidth } from "./lib/hooks/use-window-width";
import { formatRelativeTimestamp } from "./lib/utils/format-relative-timestamp";

describe("source structure imports", () => {
  it("exposes key modules from the reorganized paths", () => {
    expect(navigationItems.length).toBeGreaterThan(0);
    expect(PageContent).toBeTypeOf("function");
    expect(ActionBar).toBeTypeOf("function");
    expect(QuickCaptureModal).toBeTypeOf("function");
    expect(Card).toBeTypeOf("function");
    expect(EmptyState).toBeTypeOf("function");
    expect(FormField).toBeTypeOf("function");
    expect(ThreeColumnLayout).toBeTypeOf("function");
    expect(TasksPage).toBeTypeOf("function");
    expect(useWindowWidth).toBeTypeOf("function");
    expect(formatRelativeTimestamp("2026-03-22T08:00:00.000Z")).toBeTypeOf("string");
  });
});
