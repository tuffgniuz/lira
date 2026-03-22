import type { ReactNode } from "react";

export function Stack({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`ui-stack ${className}`.trim()}>{children}</div>;
}
