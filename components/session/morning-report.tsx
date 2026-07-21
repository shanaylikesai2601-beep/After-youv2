"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NovaBackground } from "@/components/nova-background";
import type { MorningReport } from "@/types/session";

export function MorningReportView({ sessionId }: { sessionId: string }) {
  const [report, setReport] = useState<MorningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedMission, setExpandedMission] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/report`);
        const payload = await res.json();
        setReport(payload.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="mr-wrapper">
        <NovaBackground />
        <div className="mr-loading">
          <div className="loader-ring large" />
          <p>Generating morning report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mr-wrapper">
        <NovaBackground />
        <div className="mr-error">
          <h2>Report unavailable</h2>
          <p>{error || "Session data not found"}</p>
          <Link href="/sessions" className="btn-secondary" style={{ marginTop: "20px", display: "inline-block" }}>All Sessions</Link>
        </div>
      </div>
    );
  }

  const allDone = report.missionsFailed === 0;

  return (
    <div className="mr-wrapper">
      <NovaBackground />
      <div className="mr-content">
        <header className="mr-header">
          <Link href="/sessions" className="mr-back">← Sessions</Link>
          <h1 className="mr-greeting">{allDone ? "Good morning." : "Session Complete"}</h1>
          <p className="mr-subhead">
            {allDone
              ? "Nova completed your working session."
              : `${report.missionsCompleted} of ${report.missionsTotal} missions completed.`}
          </p>
          <p className="mr-session-name">{report.sessionName}</p>
          <div className="mr-badges">
            <span className="mr-badge-duration">{report.sessionDuration}</span>
          </div>
        </header>

        <div className="mr-cards">
          <div className="mr-card"><span className="mr-cv">{report.missionsCompleted}</span><span className="mr-cl">Completed</span></div>
          {report.missionsFailed > 0 && <div className="mr-card mr-card-warn"><span className="mr-cv">{report.missionsFailed}</span><span className="mr-cl">Failed</span></div>}
          <div className="mr-card"><span className="mr-cv">{report.filesCreated}</span><span className="mr-cl">Files Created</span></div>
          <div className="mr-card"><span className="mr-cv">{report.filesModified}</span><span className="mr-cl">Files Modified</span></div>
          <div className="mr-card"><span className="mr-cv">{report.repairAttempts}</span><span className="mr-cl">Repairs</span></div>
          <div className="mr-card"><span className="mr-cv">{report.successfulRepairs}</span><span className="mr-cl">Successful</span></div>
          <div className="mr-card"><span className="mr-cv">{report.checkpointsCreated}</span><span className="mr-cl">Checkpoints</span></div>
          <div className="mr-card"><span className="mr-cv">{report.verificationRuns}</span><span className="mr-cl">Verifications</span></div>
          <div className="mr-card"><span className="mr-cv">{report.reviewerPasses}</span><span className="mr-cl">Approvals</span></div>
          <div className="mr-card"><span className="mr-cv">{report.memoryUpdates}</span><span className="mr-cl">Memory Learned</span></div>
          <div className="mr-card"><span className="mr-cv">{report.timelineEntries}</span><span className="mr-cl">Timeline Events</span></div>
          <div className="mr-card"><span className="mr-cv">{report.diagnostics.providerCalls}</span><span className="mr-cl">AI Calls</span></div>
        </div>

        <section className="mr-section">
          <h2 className="mr-sect-title">Mission Timeline</h2>
          <div className="mr-timeline">
            {report.missionSummaries.map((m, i) => (
              <div key={i} className={`mr-tl-row ${m.status === "failed" ? "mr-tl-fail" : ""}`}>
                <div className="mr-tl-head" onClick={() => setExpandedMission(expandedMission === i ? null : i)}>
                  <span className={`mr-tl-icon ${m.status}`}>
                    {m.status === "completed" ? "✓" : m.status === "failed" ? "✕" : "○"}
                  </span>
                  <div className="mr-tl-info">
                    <strong>{m.title}</strong>
                    <span className="mr-tl-meta">{m.status} · {m.duration} · {m.artifacts} artifacts{m.qualityScore ? ` · Score ${m.qualityScore}` : ""}</span>
                  </div>
                  <span className="mr-tl-expand">{expandedMission === i ? "−" : "+"}</span>
                </div>
                {expandedMission === i && (
                  <div className="mr-tl-detail">
                    <p>Status: {m.status}</p>
                    <p>Duration: {m.duration}</p>
                    <p>Artifacts produced: {m.artifacts}</p>
                    {m.qualityScore && <p>Quality score: {m.qualityScore}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mr-section">
          <h2 className="mr-sect-title">What Nova recommends next</h2>
          <div className="mr-recs">
            {report.missionsFailed > 0 && (
              <div className="mr-rec">
                <span className="mr-rec-icon">↻</span>
                <div>
                  <strong>Review and retry</strong>
                  <p>{report.missionsFailed} mission(s) failed. Review diagnostics and re-queue with adjusted parameters.</p>
                </div>
              </div>
            )}
            {report.completionOrder.length > 0 && (
              <div className="mr-rec">
                <span className="mr-rec-icon">→</span>
                <div>
                  <strong>Continue building</strong>
                  <p>Start a new session focused on extending the completed work with additional features or optimizations.</p>
                </div>
              </div>
            )}
            <div className="mr-rec">
              <span className="mr-rec-icon">✦</span>
              <div>
                <strong>Start fresh session</strong>
                <p>Create a new working session with a different objective. Previous project memory is available.</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="mr-actions">
          <Link href="/missions/new" className="btn-primary">Run Another Session</Link>
          <a href={`/api/sessions/${sessionId}/report`} download={`morning-report-${sessionId}.json`} className="btn-secondary">Export Report</a>
          <Link href={`/sessions/${sessionId}`} className="btn-secondary">View Session</Link>
          <Link href="/sessions" className="btn-secondary">All Sessions</Link>
        </footer>
      </div>
    </div>
  );
}
