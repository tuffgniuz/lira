import type { ReactNode } from "react";

type FloatingPanelProps = {
  ariaLabelledBy?: string;
  children: ReactNode;
  className?: string;
  onClose: () => void;
};

export function FloatingPanel({
  ariaLabelledBy,
  children,
  className,
  onClose,
}: FloatingPanelProps) {
  return (
    <div className="floating-panel__backdrop" role="presentation" onClick={onClose}>
      <section
        className={`floating-panel ${className ?? ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );
}
