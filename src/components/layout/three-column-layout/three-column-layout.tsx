import type { ReactNode } from "react";

type ThreeColumnLayoutProps = {
  className?: string;
  leftClassName?: string;
  centerClassName?: string;
  rightClassName?: string;
  centerOnly?: boolean;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  leftLabel?: string;
  centerLabel?: string;
  rightLabel?: string;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
};

export function ThreeColumnLayout({
  className = "",
  leftClassName = "",
  centerClassName = "",
  rightClassName = "",
  centerOnly = false,
  leftCollapsed = false,
  rightCollapsed = false,
  leftLabel,
  centerLabel,
  rightLabel,
  left,
  center,
  right,
}: ThreeColumnLayoutProps) {
  const collapseLeft = centerOnly || leftCollapsed;
  const collapseRight = centerOnly || rightCollapsed;

  return (
    <div
      className={`three-column-layout ${centerOnly ? "is-center-only" : ""} ${
        collapseLeft ? "is-left-collapsed" : ""
      } ${collapseRight ? "is-right-collapsed" : ""} ${className}`.trim()}
    >
      <aside
        className={`three-column-layout__side three-column-layout__side--left ${
          collapseLeft ? "is-collapsed" : ""
        } ${leftClassName}`.trim()}
        aria-hidden={collapseLeft}
        aria-label={leftLabel}
      >
        {left}
      </aside>
      <main className={`three-column-layout__center ${centerClassName}`.trim()} aria-label={centerLabel}>
        {center}
      </main>
      <aside
        className={`three-column-layout__side three-column-layout__side--right ${
          collapseRight ? "is-collapsed" : ""
        } ${rightClassName}`.trim()}
        aria-hidden={collapseRight}
        aria-label={rightLabel}
      >
        {right}
      </aside>
    </div>
  );
}
