"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { missionsApi } from "@/api/missions";
import type { WorkspaceContextValue } from "./workspace-context";

export function MissionWorkspace() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceContextValue | null>(null);
  const [indexing, setIndexing] = useState(false);

  async function handleChooseWorkspace() {
    setIndexing(true);
    try {
      const pick = await fetch("/api/workspace/pick", { method: "POST" });
      if (!pick.headers.get("content-type")?.includes("application/json")) throw new Error(await pick.text());
      const pickData = await pick.json();
      if (!pick.ok) throw new Error(pickData.error || "Could not select workspace");

      const idx = await fetch("/api/workspace/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspacePath: pickData.data.workspacePath }),
      });
      if (!idx.headers.get("content-type")?.includes("application/json")) throw new Error(await idx.text());
      const idxData = await idx.json();
      if (!idx.ok) throw new Error(idxData.error || "Could not index workspace");

      setWorkspace(idxData.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Workspace selection failed");
    }
    setIndexing(false);
  }

  function handleRemoveWorkspace() {
    setWorkspace(null);
  }

  async function handleSubmit() {
    if (!prompt.trim()) return;
    setPending(true);
    setError("");
    try {
      const mission = await missionsApi.create({
        title: prompt.trim().slice(0, 160),
        description: prompt.trim(),
        goal: prompt.trim(),
        workspace: workspace ?? undefined,
        previewOnly: true,
      });
      router.push(`/missions/${mission.id}/refine`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create mission");
      setPending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  }

  return (
    <div className="mission-new">
      <div className="mission-new-bg" />

      <div className="mission-new-nova">
        <div className="nova-center nova-pulse">
          <div className="nova-core" />
          <div className="nova-ring nova-ring-1" />
          <div className="nova-ring nova-ring-2" />
          <div className="nova-ring nova-ring-3" />
        </div>
      </div>

      <div className="mission-new-content">
        <div className="mission-new-header">
          <span className="mission-new-eyebrow">Autonomous AI Teammate</span>
          <h1 className="mission-new-title">Assign a <span className="highlight">mission</span></h1>
          <p className="mission-new-subtitle">
            Nova plans, delegates, executes, and verifies. You just describe the outcome.
          </p>
        </div>

        <div className="mission-new-card">
          {workspace ? (
            <div className="mission-new-workspace-card">
              <div className="mission-new-workspace-info">
                <strong>{workspace.workspaceName}</strong>
                <span className="mission-new-workspace-path">{workspace.workspacePath}</span>
              </div>
              <div className="mission-new-workspace-actions">
                <span className="mission-new-workspace-ready">Ready</span>
                <button
                  type="button"
                  className="mission-new-workspace-remove"
                  onClick={handleRemoveWorkspace}
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="mission-new-workspace-btn"
              onClick={handleChooseWorkspace}
              disabled={indexing}
            >
              {indexing ? "Indexing workspace…" : "Choose workspace folder"}
            </button>
          )}

          <textarea
            className="mission-new-input"
            placeholder="Tell Nova what to accomplish..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            autoFocus
          />

          {error && <p className="mission-new-error">{error}</p>}

          <button
            type="button"
            className="mission-new-submit"
            onClick={handleSubmit}
            disabled={pending || !prompt.trim()}
          >
            {pending ? "Assigning…" : "Assign Mission"}
          </button>
        </div>
      </div>
    </div>
  );
}
