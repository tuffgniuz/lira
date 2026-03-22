import type { Item } from "@/models/workspace-item";
import type { JournalEntrySummary } from "@/models/journal";
import { buildRightRailContext } from "@/lib/domain/right-rail-context";

export function RightRailColumn({
  items,
  journalSummaries,
  todayDate,
}: {
  items: Item[];
  journalSummaries: JournalEntrySummary[];
  todayDate: string;
}) {
  const context = buildRightRailContext(items, journalSummaries, todayDate);

  return (
    <div className="right-rail">
      <section className="right-rail__section">
        <div className="right-rail__heading-row">
          <h2 className="right-rail__heading">Goals</h2>
        </div>
        {context.goals.length > 0 ? (
          <div className="right-rail__goals">
            {context.goals.map((goal) => (
              <div key={goal.id} className="right-rail__goal-item">
                <div className="right-rail__goal-header">
                  <div className="right-rail__goal-copy">
                    <p className="right-rail__goal-title" title={goal.title}>
                      {goal.title}
                    </p>
                    <p className="right-rail__goal-meta">{goal.metaLabel}</p>
                  </div>
                  <span className="right-rail__goal-progress">
                    {goal.completedCount}/{goal.progressDenominator}
                  </span>
                </div>
                <div
                  className="goal-card__week-strip right-rail__goal-week-strip"
                  aria-label={`${goal.title} week status`}
                >
                  <div className="goal-card__week-grid right-rail__goal-week-grid">
                    {goal.weekDays.map((day) => (
                      <span key={`${day.date}-label`} className="goal-card__week-label">
                        {day.shortLabel}
                      </span>
                    ))}
                    {goal.weekDays.map((day) => (
                      <span
                        key={`${day.date}-status`}
                        className={`goal-card__week-status right-rail__goal-week-status is-${day.status.kind}`}
                        aria-label={`${day.label} status: ${day.status.label}`}
                      >
                        {day.status.symbol}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="right-rail__goal-bar" aria-hidden="true">
                  <div
                    className="right-rail__goal-fill"
                    style={{ width: `${goal.progressPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="right-rail__empty">No daily goals yet. A free day for ambition.</p>
        )}
      </section>

      {context.remainingTasksForToday > 0 ? (
        <section className="right-rail__section">
          <div className="right-rail__heading-row">
            <h2 className="right-rail__heading">Tasks</h2>
            <span className="right-rail__count">{context.remainingTasksForToday}</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
