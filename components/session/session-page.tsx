"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SessionVisualization } from "./session-visualization";
import { MorningReportView } from "./morning-report";
import type { WorkingSession, SessionActivity } from "@/types/session";

function useSession(sessionId: string) {
  const [session, setSession] = useState<WorkingSession | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.headers.get("content-type")?.includes("application/json")) throw new Error(await res.text());
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      setSession(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [sessionId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 2500);
    return () => clearInterval(interval);
  }, [load]);

  return { session, error, refresh: load };
}

function useActivities(sessionId: string) {
  const [activities, setActivities] = useState<SessionActivity[]>([]);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/activities`);
        if (!res.headers.get("content-type")?.includes("application/json")) { if (mounted) return; return; }
        const payload = await res.json();
        if (mounted) setActivities(payload.data ?? []);
      } catch { /* ignore */ }
    }
    poll();
    const interval = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, [sessionId]);

  return activities;
}

export function SessionPage({ sessionId }: { sessionId: string }) {
  const { session, error, refresh } = useSession(sessionId);
  const activities = useActivities(sessionId);

  const [queueGoal, setQueueGoal] = useState("");
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showMobileFeed, setShowMobileFeed] = useState(false);
  const [actionPending, setActionPending] = useState("");

  const isCompleted = session?.status === "completed" || session?.status === "failed";
  const isRunning = session?.status === "running";
  const isPaused = session?.status === "paused";

  const handleAction = useCallback(async (action: string) => {
    setActionPending(action);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) refresh();
    } finally {
      setActionPending("");
    }
  }, [sessionId, refresh]);

  const handleQueue = useCallback(async () => {
    if (!queueGoal.trim()) return;
    setActionPending("queue");
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "queue", goal: queueGoal.trim() }),
      });
      setQueueGoal("");
      refresh();
    } finally {
      setActionPending("");
    }
  }, [sessionId, queueGoal, refresh]);

  const completedCount = session?.missions.filter((m) => m.status === "completed").length ?? 0;
  const failedCount = session?.missions.filter((m) => m.status === "failed").length ?? 0;
  const remainingCount = (session?.missions.length ?? 0) - completedCount - failedCount;

  const activeActivity = activities.find((a) => a.status === "active");
  const activeSystem = activeActivity?.system ?? "";
  const activeLabel = activeActivity?.label ?? "";

  if (error) {
    return (
      <div className="sp-page">
        <div className="sp-error">
          <p style={{ color: "var(--danger)" }}>{error}</p>
          <Link href="/sessions">← All Sessions</Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="sp-page">
        <SessionVisualization sessionId={sessionId} />
        <div className="sp-loading">
          <div className="loader-ring large" />
          <p>Loading session…</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return <MorningReportView sessionId={sessionId} />;
  }

  const activeMission = session.missions[session.currentMissionIndex];

  return (
    <div className="sp-page">
      <SessionVisualization sessionId={sessionId} />

      <div className="sp-layout">

        {/* ---- Left Sidebar ---- */}
        <aside className="sp-nav">
          <div className="sp-nav-header">
            <Link href="/sessions" className="sp-nav-back">← Sessions</Link>
            <span className="sp-nav-eyebrow">Working Session</span>
            <h2 className="sp-nav-name">{session.name}</h2>
          </div>

          {activeMission && (
            <div className="sp-current-mission">
              <span className="sp-current-eyebrow">Current Mission</span>
              <div className="sp-current-row">
                <span className={`sp-current-dot ${activeMission.status}`} />
                <div>
                  <strong className="sp-current-title">{activeMission.title}</strong>
                  <span className="sp-current-agent">{activeSystem || activeMission.status}</span>
                </div>
              </div>
              {activeLabel && (
                <p className="sp-current-action">{activeLabel}</p>
              )}
            </div>
          )}

          <div className="sp-queue-scroll">
            <span className="sp-queue-label">Mission Queue</span>
            {session.missions.length === 0 ? (
              <p className="sp-empty">No missions queued.</p>
            ) : (
              <div className="sp-queue-list">
                {session.missions.map((m, i) => {
                  const isActive = i === session.currentMissionIndex;
                  const isDone = m.status === "completed" || m.status === "failed";
                  return (
                    <div key={m.missionId}
                      className={`sp-mission-card ${isActive ? "sp-mission-active" : ""} ${isDone ? "sp-mission-done" : ""} ${m.status === "failed" ? "sp-mission-failed" : ""}`}
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      <div className="sp-mc-head">
                        <span className="sp-mc-idx">{i + 1}</span>
                        <span className={`sp-mc-status sp-mc-s-${m.status === "executing" ? "active" : m.status}`}>
                          {m.status === "executing" ? "active" : m.status}
                        </span>
                      </div>
                      <Link href={`/missions/${m.missionId}`} className="sp-mc-title">{m.title}</Link>
                      {isActive && <div className="sp-mc-bar" />}
                      {isDone && <div className={`sp-mc-bar sp-mc-bar-done ${m.status === "failed" ? "sp-mc-bar-fail" : ""}`} />}
                      <span className="sp-mc-meta">
                        {m.artifactsCount > 0 ? `${m.artifactsCount} artifacts` : ""}
                        {m.repairAttempts > 0 ? ` · ${m.repairAttempts} repairs` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="sp-nav-actions">
            <div className="sp-controls">
              {session.status === "idle" && session.missions.length > 0 && (
                <button className="btn-primary" onClick={() => handleAction("start")} disabled={!!actionPending}>
                  {actionPending === "start" ? "Starting…" : "Start Session"}
                </button>
              )}
              {isRunning && (
                <button className="btn-secondary" onClick={() => handleAction("pause")} disabled={!!actionPending}>
                  {actionPending === "pause" ? "Pausing…" : "Pause"}
                </button>
              )}
              {isPaused && (
                <button className="btn-primary" onClick={() => handleAction("resume")} disabled={!!actionPending}>
                  {actionPending === "resume" ? "Resuming…" : "Resume"}
                </button>
              )}
              {(isRunning || isPaused) && (
                <button className="btn-abort" onClick={() => handleAction("abort")} disabled={!!actionPending}>
                  {actionPending === "abort" ? "Aborting…" : "Abort"}
                </button>
              )}
            </div>

            <div className="sp-add-mission">
              <input
                value={queueGoal}
                onChange={(e) => setQueueGoal(e.target.value)}
                placeholder="Add mission…"
                onKeyDown={(e) => e.key === "Enter" && handleQueue()}
              />
              <button className="btn-primary" onClick={handleQueue} disabled={!queueGoal.trim() || actionPending === "queue"} style={{ padding: "8px 14px", fontSize: "12px" }}>{actionPending === "queue" ? "…" : "Add"}</button>
            </div>

            <div className="sp-nav-stats">
              <div className="sp-stat"><span className="sp-stat-v">{completedCount}</span><span className="sp-stat-l">Done</span></div>
              <div className="sp-stat"><span className="sp-stat-v">{remainingCount}</span><span className="sp-stat-l">Remaining</span></div>
              <div className="sp-stat"><span className="sp-stat-v">{Math.floor(session.runtimeMs / 1000)}s</span><span className="sp-stat-l">Runtime</span></div>
              <div className="sp-stat"><span className="sp-stat-v">{session.diagnostics.totalRepairs}</span><span className="sp-stat-l">Repairs</span></div>
              <div className="sp-stat"><span className="sp-stat-v">{session.diagnostics.totalTokensUsed.toLocaleString()}</span><span className="sp-stat-l">Tokens</span></div>
              <div className="sp-stat"><span className="sp-stat-v">{session.projectMemory.length}</span><span className="sp-stat-l">Memory</span></div>
            </div>
          </div>
        </aside>

        {/* ---- Center ---- */}
        <main className="sp-center">

          {activeMission && (
            <div className="sp-viz-status">
              <div className="sp-viz-mission">{activeMission.title}</div>
              {activeSystem && <div className="sp-viz-specialist">{activeSystem}</div>}
              {activeLabel && <div className="sp-viz-action">{activeLabel}</div>}
              {activities.length > 0 && activities[activities.length - 1].status === "completed" && (
                <div className="sp-viz-event">{activities[activities.length - 1].label}</div>
              )}
            </div>
          )}
        </main>

        {/* ---- Right Sidebar ---- */}
        <aside className="sp-feed">
          <div className="sp-feed-header">
            <h3 className="sp-feed-title">Live Activity</h3>
            <span className="sp-feed-count">{activities.length}</span>
          </div>
          <div className="sp-feed-list">
            {activities.length === 0 ? (
              <p className="sp-empty">Waiting for activity…</p>
            ) : (
              [...activities].reverse().map((act, i) => (
                <div key={`${act.system}-${i}`} className={`sp-activity-card sp-ac-${act.status}`} style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="sp-ac-head">
                    <span className={`sp-ac-dot ${act.status}`} />
                    <span className="sp-ac-system">{act.system}</span>
                  </div>
                  <p className="sp-ac-label">{act.label}</p>
                  {act.detail && <p className="sp-ac-detail">{act.detail}</p>}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Mobile toggles */}
        <button className="sp-mobile-toggle sp-mobile-nav-toggle" onClick={() => setShowMobileNav(!showMobileNav)}>
          {showMobileNav ? "✕" : "☰"}
        </button>
        <button className="sp-mobile-toggle sp-mobile-feed-toggle" onClick={() => setShowMobileFeed(!showMobileFeed)}>
          {showMobileFeed ? "✕" : "○"}
        </button>
      </div>

      {showMobileNav && (
        <div className="sp-mobile-overlay" onClick={() => setShowMobileNav(false)}>
          <div className="sp-mobile-panel" onClick={(e) => e.stopPropagation()}>
            <SessionNavContent session={session} activeMission={activeMission} activeSystem={activeSystem} activeLabel={activeLabel}
              onAction={handleAction} onQueue={handleQueue} queueGoal={queueGoal} setQueueGoal={setQueueGoal}
              isRunning={isRunning} isPaused={isPaused} completedCount={completedCount} remainingCount={remainingCount}
              actionPending={actionPending} />
          </div>
        </div>
      )}

      {showMobileFeed && (
        <div className="sp-mobile-overlay" onClick={() => setShowMobileFeed(false)}>
          <div className="sp-mobile-panel sp-mobile-panel-right" onClick={(e) => e.stopPropagation()}>
            <div className="sp-feed-header">
              <h3 className="sp-feed-title">Live Activity</h3>
              <button className="btn-secondary" onClick={() => setShowMobileFeed(false)} style={{ padding: "4px 12px", fontSize: "11px" }}>Close</button>
            </div>
            <div className="sp-feed-list">
              {activities.length === 0 ? (
                <p className="sp-empty">Waiting for activity…</p>
              ) : (
                [...activities].reverse().map((act, i) => (
                  <div key={`${act.system}-${i}`} className={`sp-activity-card sp-ac-${act.status}`} style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="sp-ac-head">
                      <span className={`sp-ac-dot ${act.status}`} />
                      <span className="sp-ac-system">{act.system}</span>
                    </div>
                    <p className="sp-ac-label">{act.label}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionNavContent({
  session, activeMission, activeSystem, activeLabel, onAction, onQueue, queueGoal, setQueueGoal, isRunning, isPaused, completedCount, remainingCount, actionPending,
}: {
  session: WorkingSession; activeMission: typeof session.missions[number] | undefined; activeSystem: string; activeLabel: string;
  onAction: (a: string) => void; onQueue: () => void; queueGoal: string; setQueueGoal: (v: string) => void;
  isRunning: boolean; isPaused: boolean; completedCount: number; remainingCount: number; actionPending: string;
}) {
  return (
    <>
      <div className="sp-nav-header">
        <Link href="/sessions" className="sp-nav-back">← Sessions</Link>
        <span className="sp-nav-eyebrow">Working Session</span>
        <h2 className="sp-nav-name">{session.name}</h2>
      </div>

      {activeMission && (
        <div className="sp-current-mission">
          <span className="sp-current-eyebrow">Current Mission</span>
          <div className="sp-current-row">
            <span className={`sp-current-dot ${activeMission.status}`} />
            <div>
              <strong className="sp-current-title">{activeMission.title}</strong>
              <span className="sp-current-agent">{activeSystem || activeMission.status}</span>
            </div>
          </div>
          {activeLabel && <p className="sp-current-action">{activeLabel}</p>}
        </div>
      )}

      <div className="sp-queue-scroll">
        <span className="sp-queue-label">Mission Queue</span>
        {session.missions.map((m, i) => (
          <div key={m.missionId} className="sp-mission-card">
            <span className="sp-mc-idx">{i + 1}</span>
            <span className={`sp-mc-status sp-mc-s-${m.status}`}>{m.status}</span>
            <Link href={`/missions/${m.missionId}`} className="sp-mc-title">{m.title}</Link>
          </div>
        ))}
      </div>

      <div className="sp-nav-actions">
        <div className="sp-controls">
          {session.status === "idle" && <button className="btn-primary" onClick={() => onAction("start")} disabled={!!actionPending}>{actionPending === "start" ? "Starting…" : "Start"}</button>}
          {isRunning && <button className="btn-secondary" onClick={() => onAction("pause")} disabled={!!actionPending}>{actionPending === "pause" ? "Pausing…" : "Pause"}</button>}
          {isPaused && <button className="btn-primary" onClick={() => onAction("resume")} disabled={!!actionPending}>{actionPending === "resume" ? "Resuming…" : "Resume"}</button>}
          {(isRunning || isPaused) && <button className="btn-abort" onClick={() => onAction("abort")} disabled={!!actionPending}>{actionPending === "abort" ? "Aborting…" : "Abort"}</button>}
        </div>
        <div className="sp-add-mission">
          <input value={queueGoal} onChange={(e) => setQueueGoal(e.target.value)} placeholder="Add mission…" onKeyDown={(e) => e.key === "Enter" && onQueue()} />
          <button className="btn-primary" onClick={onQueue} disabled={!queueGoal.trim() || actionPending === "queue"} style={{ padding: "8px 14px", fontSize: "12px" }}>{actionPending === "queue" ? "…" : "Add"}</button>
        </div>
        <div className="sp-nav-stats">
          <div className="sp-stat"><span className="sp-stat-v">{completedCount}</span><span className="sp-stat-l">Done</span></div>
          <div className="sp-stat"><span className="sp-stat-v">{remainingCount}</span><span className="sp-stat-l">Remaining</span></div>
          <div className="sp-stat"><span className="sp-stat-v">{Math.floor(session.runtimeMs / 1000)}s</span><span className="sp-stat-l">Runtime</span></div>
          <div className="sp-stat"><span className="sp-stat-v">{session.diagnostics.totalRepairs}</span><span className="sp-stat-l">Repairs</span></div>
          <div className="sp-stat"><span className="sp-stat-v">{session.diagnostics.totalTokensUsed.toLocaleString()}</span><span className="sp-stat-l">Tokens</span></div>
          <div className="sp-stat"><span className="sp-stat-v">{session.projectMemory.length}</span><span className="sp-stat-l">Memory</span></div>
        </div>
      </div>
    </>
  );
}
