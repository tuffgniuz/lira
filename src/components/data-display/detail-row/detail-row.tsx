import type { ReactNode } from "react";

export function DetailRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="ui-detail-row">
      <span className="ui-detail-row__label">{label}</span>
      <span className="ui-detail-row__value">
        {value}
        {hint ? <span className="ui-detail-row__hint">{hint}</span> : null}
      </span>
    </div>
  );
}
