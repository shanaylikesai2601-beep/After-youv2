import type { ReactNode } from "react";

export type StatusCardState = "Idle" | "Planning" | "Running" | "Reviewing" | "Completed" | "Failed";

const stateClass: Record<StatusCardState, string> = {
  Idle: "status-card__badge--idle", Planning: "status-card__badge--planning", Running: "status-card__badge--running",
  Reviewing: "status-card__badge--reviewing", Completed: "status-card__badge--completed", Failed: "status-card__badge--failed",
};

export function StatusCard({ title, status, timestamp, description, children }: {
  title: string; status: StatusCardState; timestamp: string; description?: string; children?: ReactNode;
}) {
  return <section className="status-card" aria-label={`${title}: ${status}`}>
    <div className="status-card__header"><h3>{title}</h3><span className={`status-card__badge ${stateClass[status]}`}>{status}</span></div>
    {description ? <p className="status-card__description">{description}</p> : null}
    <footer><time>{timestamp}</time></footer>{children}
  </section>;
}
