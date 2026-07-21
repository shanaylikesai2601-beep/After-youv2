"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { missionsApi } from "@/api/missions";
import { sessionsApi } from "@/api/sessions";

interface MissionCreateModalProps { open: boolean; onClose?: () => void; }

export function MissionCreateModal({ open, onClose }: MissionCreateModalProps): React.ReactElement | null {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [objectives, setObjectives] = useState<string[]>([]);

  if (!open) return null;
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true); setError(undefined);
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const missionDescription = String(form.get("description") ?? "").trim();
    const priority = String(form.get("priority") ?? "normal");
    const deadline = String(form.get("deadline") ?? "");
    const planningContext = [missionDescription, `Priority: ${priority}`, deadline ? `Deadline: ${deadline}` : undefined].filter(Boolean).join("\n\n");
    const nextObjectives = objectives.map((value) => value.trim()).filter(Boolean);
    try {
      if (nextObjectives.length > 0) {
        // Create missions as preview-only so they don't auto-run
        // Create session and queue all missions (session controls execution)
        const session = await sessionsApi.create({ name: title.slice(0, 80), budgetMs: 3_600_000 });
        await sessionsApi.queueMission(session.id, missionDescription, title);
        for (const obj of nextObjectives) {
          await sessionsApi.queueMission(session.id, obj, obj.slice(0, 120));
        }
        router.push(`/sessions/${session.id}`);
      } else {
        // No next objectives — go through refine flow
        // Use previewOnly to prevent the mission from auto-running
        // (the refine flow's finishSession will queue it fresh into the session)
        const mission = await missionsApi.create({ title, description: planningContext, goal: missionDescription, previewOnly: true });
        router.push(`/missions/${mission.id}/refine`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create mission");
      setPending(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose?.(); }}>
    <form className="modal" onSubmit={submit} aria-labelledby="mission-title">
      <div className="eyebrow">New assignment</div><h1 id="mission-title">Give AfterYou a mission.</h1>
      <p>It will plan the work, choose the right tools, and continue while you are away.</p>
      <div className="form-grid">
        <div className="field"><label htmlFor="title">Mission title</label><input id="title" name="title" required maxLength={160} placeholder="Research AI coding frameworks" autoFocus /></div>
        <div className="field"><label htmlFor="description">Mission description</label><textarea id="description" name="description" required maxLength={10_000} placeholder="Compare the leading frameworks and deliver a concise PDF recommendation report." /></div>
        <div className="two-col"><div className="field"><label htmlFor="priority">Priority</label><select id="priority" name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div><div className="field"><label htmlFor="deadline">Optional deadline</label><input id="deadline" name="deadline" type="datetime-local" /></div></div>
        <div className="field"><label>What Next?</label><p>Add up to three dependent objectives. Each starts only after the previous stage completes.</p>{objectives.map((objective, index) => <div key={index} style={{ display: "flex", gap: 8, marginTop: 8 }}><input value={objective} onChange={(event) => setObjectives((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Step ${index + 2}`} maxLength={10_000} /><button className="button" type="button" onClick={() => setObjectives((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>)}{objectives.length < 3 && <button className="button" type="button" onClick={() => setObjectives((items) => [...items, ""])}>+ What Next?</button>}</div>
      </div>
      <div className="form-footer"><div className="error" role="alert">{error}</div><div style={{ display: "flex", gap: 8 }}><button className="button" type="button" onClick={onClose} disabled={pending}>Cancel</button><button className="button primary" type="submit" disabled={pending}>{pending ? "Assigning…" : "Assign mission"}</button></div></div>
    </form>
  </div>;
}
