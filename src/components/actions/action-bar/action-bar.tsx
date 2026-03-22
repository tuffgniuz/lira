import type { ReactNode } from "react";

export function ActionBar({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`ui-action-bar ${className}`.trim()}>{children}</div>;
}
