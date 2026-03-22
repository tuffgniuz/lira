import type { ReactNode } from "react";
import { FloatingPanel } from "@/components/layout/floating-panel";

export function Modal({
  ariaLabelledBy,
  className = "",
  onClose,
  children,
}: {
  ariaLabelledBy?: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <FloatingPanel
      ariaLabelledBy={ariaLabelledBy}
      className={`ui-modal ${className}`.trim()}
      onClose={onClose}
    >
      {children}
    </FloatingPanel>
  );
}
