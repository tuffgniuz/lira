import type { ReactNode } from "react";

export function Inline({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`ui-inline ${className}`.trim()}>{children}</div>;
}
