import type { ReactNode } from "react";

export function FormField({
  label,
  hint,
  className = "",
  children,
}: {
  label?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`ui-form-field ${className}`.trim()}>
      {(label || hint) ? (
        <span className="ui-form-field__header">
          {label ? <span className="ui-form-field__label">{label}</span> : null}
          {hint ? <span className="ui-form-field__hint">{hint}</span> : null}
        </span>
      ) : null}
      {children}
    </label>
  );
}
