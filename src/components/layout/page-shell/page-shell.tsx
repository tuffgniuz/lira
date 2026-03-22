import type { ReactNode } from "react";

export function PageShell({
  ariaLabel,
  eyebrow,
  title,
  headerActions,
  className = "",
  children,
}: {
  ariaLabel: string;
  eyebrow?: string;
  title?: string;
  headerActions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`page ui-page-shell ${className}`.trim()} aria-label={ariaLabel}>
      {(eyebrow || title || headerActions) ? (
        <div className="page__header ui-page-shell__header">
          <div className="ui-page-shell__title-block">
            {eyebrow ? <p className="page__eyebrow">{eyebrow}</p> : null}
            {title ? <h1 className="page__title ui-page-shell__title">{title}</h1> : null}
          </div>
          {headerActions ? <div className="ui-page-shell__actions">{headerActions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
