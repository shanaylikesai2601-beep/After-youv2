"use client";

import Link from "next/link";

import { MissionArtifactViewer } from "@/components/missions/mission-artifact-viewer";
import { StatusCard, type StatusCardState } from "@/components/missions/status-card";
import { useMission } from "@/lib/mission-polling";
import type { MissionCheckpoint, MissionLog } from "@/types/mission";
import { useEffect, useState } from "react";
import { NovaBackground } from "@/components/nova-background";

export function MissionOutputPage({ missionId }: { missionId: string }): React.ReactElement {
  const { mission, error } = useMission(missionId);
  const [checkpoints, setCheckpoints] = useState<MissionCheckpoint[]>([]);
  useEffect(() => { void fetch(`/api/missions/${missionId}/timeline`).then((response) => response.json()).then((payload) => setCheckpoints(payload.data?.checkpoints ?? [])).catch(() => undefined); }, [missionId]);
  if (error) return <main style={{ padding: '120px 24px', textAlign: 'center', position: 'relative', zIndex: 1, color: 'rgba(240,235,227,0.5)' }}><p>{error}</p></main>;
  if (!mission) return <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px' }}><NovaBackground /><div className="loader-ring large" /><p style={{ color: 'rgba(240,235,227,0.4)', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px' }}>Loading mission output…</p></main>;
  const final = mission.outputs.at(-1);
  const terminal = logsFor(mission.logs, "terminal");
  const reviewer = logsFor(mission.logs, "reviewer");
  const github = logsFor(mission.logs, "github");
  const files = mission.artifacts.filter((artifact) => artifact.metadata.toolId === "filesystem" || artifact.metadata.toolId === "github");
  const failureLog = [...mission.logs].reverse().find((log) => log.status === "failed");
  const firstDivergence = failureLog?.metadata.firstDivergence;
  const projectMemory = mission.memory.find((entry) => entry.key === "project-memory-context");

  return <main className="output-page">
    <NovaBackground />
    <header className="output-hero"><Link href="/missions" className="output-back">← Mission control</Link><p className="eyebrow">Verified mission output</p><h1>{mission.title}</h1><p>{mission.goal}</p><span className="output-status">{mission.status}</span><div className="timeline-actions"><Link href={`/missions/${mission.id}/replay`} className="output-back">Replay Mission</Link><a href={`/api/missions/${mission.id}/diagnostics`} className="output-back">Download Diagnostics</a></div></header>
    <section className="output-grid">
      <OutputSection title="Mission Overview"><StatusCard title="Mission execution" status={statusCardState(mission.status)} timestamp={new Date(mission.updatedAt).toLocaleString()} description={mission.goal} /><dl className="output-facts"><dt>Created</dt><dd>{new Date(mission.createdAt).toLocaleString()}</dd><dt>Duration estimate</dt><dd>{mission.estimatedDuration} minutes</dd><dt>Artifacts</dt><dd>{mission.artifacts.length}</dd></dl></OutputSection>
      <OutputSection title="Summary"><p className="output-copy">{final?.content ?? (mission.status === "failed" ? String(failureLog?.metadata.message ?? "Mission failed before a final summary was generated.") : "No final summary was generated.")}</p></OutputSection>
      {mission.status === "failed" && <OutputSection title="Failure Details"><p className="output-copy"><strong>Failure reason</strong>{"\n"}{String(failureLog?.metadata.message ?? "Unknown failure")}{"\n\n"}<strong>First divergence</strong>{"\n"}{firstDivergence ? JSON.stringify(firstDivergence, null, 2) : "No first-divergence record was captured."}</p></OutputSection>}
      {mission.status === "failed" && <OutputSection title="Repair History"><p className="output-copy">{mission.repairHistory.length ? mission.repairHistory.map((repair) => `Attempt ${repair.attempt}: ${repair.status} — ${repair.failureType}${repair.error ? ` — ${repair.error}` : ""}`).join("\n") : "No repair attempts were recorded."}</p></OutputSection>}
      {mission.status === "failed" && <OutputSection title="Project Memory"><p className="output-copy">{projectMemory ? projectMemory.value : "No project-memory retrieval was recorded."}</p></OutputSection>}
      <OutputSection title="Verification Results"><p className="output-copy">{reviewer.at(-1) ? logText(reviewer.at(-1)!) : "Reviewer results were not recorded."}</p></OutputSection>
      <OutputSection title="Reviewer Notes"><LogList logs={reviewer} empty="No reviewer notes." /></OutputSection>
      <OutputSection title="Timeline" full><LogList logs={mission.logs} empty="No timeline entries." /></OutputSection>
      <OutputSection title="Mission Timeline" full><Timeline missionId={missionId} checkpoints={checkpoints} onChange={setCheckpoints} /></OutputSection>
      <OutputSection title="Files Modified"><ArtifactList missionId={mission.id} artifacts={files} empty="No modified files were recorded." /></OutputSection>
      <OutputSection title="Artifacts"><ArtifactList missionId={mission.id} artifacts={mission.artifacts} empty="No artifacts were generated." /></OutputSection>
      <OutputSection title="Generated PDF"><ArtifactList missionId={mission.id} artifacts={mission.artifacts.filter((artifact) => artifact.mimeType === "application/pdf")} empty="No PDF was generated." /></OutputSection>
      <OutputSection title="Terminal Logs"><LogList logs={terminal} empty="No terminal commands were recorded." /></OutputSection>
      <OutputSection title="GitHub Commit"><LogList logs={github} empty="No GitHub activity was recorded." /></OutputSection>
    </section>
  </main>;
}

function Timeline({ missionId, checkpoints, onChange }: { missionId: string; checkpoints: MissionCheckpoint[]; onChange: (items: MissionCheckpoint[]) => void }): React.ReactElement {
  const action = async (checkpointId: string, operation: string) => { const response = await fetch(`/api/missions/${missionId}/timeline`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: operation, checkpointId, name: `Branch from ${checkpointId}` }) }); if (operation === "delete" && response.ok) onChange(checkpoints.filter((item) => item.id !== checkpointId)); };
  if (!checkpoints.length) return <p className="output-empty">No checkpoints have been recorded yet.</p>;
  return <div className="mission-timeline">{checkpoints.map((checkpoint, index) => <article key={checkpoint.id} className="timeline-checkpoint"><span className="timeline-marker">{index === checkpoints.length - 1 ? "●" : "✓"}</span><div><strong>{checkpoint.title}</strong><time>{new Date(checkpoint.timestamp).toLocaleString()}</time><p>{checkpoint.summary}</p><small>{checkpoint.fileCount} files · Build {checkpoint.buildStatus} · Verification {checkpoint.verificationStatus} · {checkpoint.repairHistory.length} repairs</small><div className="timeline-actions"><button type="button" onClick={() => void action(checkpoint.id, "restore")}>Restore</button><button type="button" onClick={() => void action(checkpoint.id, "branch")}>Branch</button><button type="button" onClick={() => void action(checkpoint.id, "delete")}>Delete</button></div></div></article>)}</div>;
}

function OutputSection({ title, children, full = false }: { title: string; children: React.ReactNode; full?: boolean }): React.ReactElement { return <section className={`output-section${full ? " full" : ""}`}><h2>{title}</h2>{children}</section>; }
function ArtifactList({ missionId, artifacts, empty }: { missionId: string; artifacts: Array<{ id: string; name: string; mimeType?: string; kind: "file" | "link" | "generated"; url?: string; createdAt: string; metadata: Record<string, unknown> }>; empty: string }): React.ReactElement { return artifacts.length ? <div className="output-artifacts">{artifacts.map((artifact) => <article key={artifact.id}><strong>{artifact.name}</strong><small>{artifact.mimeType ?? artifact.kind}</small><MissionArtifactViewer missionId={missionId} artifact={artifact} /></article>)}</div> : <p className="output-empty">{empty}</p>; }
function LogList({ logs, empty }: { logs: MissionLog[]; empty: string }): React.ReactElement { return logs.length ? <div className="output-logs">{logs.map((log) => <article key={log.id}><time>{new Date(log.timestamp).toLocaleTimeString()}</time><p>{logText(log)}</p></article>)}</div> : <p className="output-empty">{empty}</p>; }
function logsFor(logs: MissionLog[], subsystem: string): MissionLog[] { return logs.filter((log) => log.metadata.agent === subsystem || log.metadata.toolId === subsystem); }
function logText(log: MissionLog): string { const detail = log.metadata.reasoningSummary ?? log.metadata.message ?? log.metadata.whyTool; return `${log.action}${detail ? ` — ${String(detail)}` : ""}`; }
function statusCardState(status: string): StatusCardState { return ({ queued: "Idle", planning: "Planning", researching: "Running", executing: "Running", reviewing: "Reviewing", completed: "Completed", failed: "Failed" } as Record<string, StatusCardState>)[status] ?? "Idle"; }
