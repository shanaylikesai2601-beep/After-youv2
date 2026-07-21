"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { missionsApi } from "@/api/missions";
import { NovaBackground } from "@/components/nova-background";
import type { Mission, MissionPlanStage } from "@/types/mission";

export function MissionSkeleton({ missionId }: { missionId: string }) {
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [tasks, setTasks] = useState<MissionPlanStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const m = await missionsApi.get(missionId);
        setMission(m);

        if (m.finalPlan && m.finalPlan.length > 0) {
          setTasks(m.finalPlan);
          setLoading(false);
          return;
        }

        const res = await fetch("/api/missions/skeleton", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ missionId }),
        });
        if (!res.headers.get("content-type")?.includes("application/json")) throw new Error(await res.text());
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Failed to generate skeleton");

        setTasks(payload.data.tasks);
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
        setLoading(false);
      }
    }
    load();
  }, [missionId]);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await missionsApi.update(missionId, {
        status: "queued",
        finalPlan: tasks,
      });
      router.push(`/missions/${missionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start mission");
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="skel-screen">
        <NovaBackground />
        <div className="skel-content">
          <div className="skel-loading">
            <div className="skel-loader-ring" />
            <h1 className="skel-title" style={{ fontSize: "clamp(24px,3vw,36px)" }}>Planning your mission</h1>
            <p className="skel-subtitle" style={{ animation: "none", color: "rgba(240,235,227,0.4)" }}>Nova is breaking down the work.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="skel-screen">
        <NovaBackground />
        <div className="skel-content">
          <div className="skel-error-block">
            <h1 className="skel-title" style={{ fontSize: "clamp(28px,4vw,40px)" }}>Something went wrong</h1>
            <p className="skel-error-text">{error}</p>
            <button className="btn-primary" onClick={() => router.push(`/missions/${missionId}/refine`)}>
              Back to refinement
            </button>
          </div>
        </div>
      </div>
    );
  }

  const enrichedGoal = mission?.goal ?? "";
  const firstLine = enrichedGoal.split("\n\n")[0];

  return (
    <div className="skel-screen">
      <NovaBackground />
      <div className="skel-content">
        <div className="skel-header">
          <span className="skel-eyebrow">Mission Plan</span>
          <h1 className="skel-title">Mission Skeleton</h1>
          <p className="skel-desc">{firstLine.length > 120 ? firstLine.slice(0, 120) + "…" : firstLine}</p>
        </div>

        <div className="skel-summary">
          <div className="skel-summary-item">
            <span className="skel-summary-value">{tasks.length}</span>
            <span className="skel-summary-label">Total Tasks</span>
          </div>
          <div className="skel-summary-divider" />
          <div className="skel-summary-item">
            <span className="skel-summary-value">{tasks.filter((t) => t.complexity === "high").length}</span>
            <span className="skel-summary-label">Complex</span>
          </div>
          <div className="skel-summary-divider" />
          <div className="skel-summary-item">
            <span className="skel-summary-value">{tasks.filter((t) => t.dependencies.length > 0).length}</span>
            <span className="skel-summary-label">Has Dependencies</span>
          </div>
          <div className="skel-summary-divider" />
          <div className="skel-summary-item">
            <span className="skel-summary-value">{tasks.reduce((a, t) => a + t.estimatedDuration, 0)}m</span>
            <span className="skel-summary-label">Est. Duration</span>
          </div>
        </div>

        <div className="skel-tasks">
          {tasks.map((task, i) => (
            <div key={task.id} className="skel-task" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="skel-task-head">
                <span className={`skel-task-complexity skel-complexity-${task.complexity}`}>
                  {task.complexity}
                </span>
                <span className="skel-task-id">{task.id}</span>
                <span className="skel-task-duration">{task.estimatedDuration}m</span>
              </div>
              <h3 className="skel-task-title">
                <span className="skel-task-index">{i + 1}.</span>
                {task.title}
              </h3>
              <p className="skel-task-desc">{task.objective}</p>
              {task.dependencies.length > 0 && (
                <div className="skel-task-deps">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                  </svg>
                  <span>Depends on: {task.dependencies.join(", ")}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="skel-footer">
          <button
            className="btn-primary skel-confirm"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? "Starting mission…" : "Confirm & Start Mission"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => router.push(`/missions/${missionId}/refine`)}
            disabled={confirming}
          >
            Back to refinement
          </button>
        </div>
      </div>
    </div>
  );
}
