import type { ReactNode } from "react";
import { Stack } from "@/components/layout/stack";

export function EmptyState({
  title,
  copy,
  badge,
  className = "",
  action,
}: {
  title: string;
  copy: ReactNode;
  badge?: string;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`ui-empty-state ${className}`.trim()} data-testid="empty-state-root">
      <div className="ui-empty-state__illustration" aria-hidden="true" data-testid="empty-state-illustration">
        <svg viewBox="0 0 88 88" className="ui-empty-state__svg">
          <rect x="10" y="14" width="68" height="48" rx="10" className="ui-empty-state__svg-frame" />
          <circle cx="24" cy="26" r="2.5" className="ui-empty-state__svg-dot" />
          <circle cx="32" cy="26" r="2.5" className="ui-empty-state__svg-dot is-muted" />
          <path d="M26 41l8 6-8 6" className="ui-empty-state__svg-mark" />
          <path d="M40 53h18" className="ui-empty-state__svg-line" />
          <path d="M18 72h20" className="ui-empty-state__svg-glyph" />
          <path d="M50 72h20" className="ui-empty-state__svg-glyph is-secondary" />
        </svg>
      </div>
      <Stack className="ui-empty-state__stack">
        {badge ? <p className="ui-empty-state__badge">{badge}</p> : null}
        <p className="ui-empty-state__title">{title}</p>
        <p className="ui-empty-state__copy">{copy}</p>
        {action ? <div className="ui-empty-state__action">{action}</div> : null}
      </Stack>
    </div>
  );
}
