"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WorkingSession } from "@/types/session";
import { NovaBackground } from "@/components/nova-background";

export function SessionList() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/sessions");
        const payload = await res.json();
        setSessions(payload.data ?? []);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  async function createSession() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), goal: goal.trim() || undefined }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      router.push(`/sessions/${payload.data.id}`);
    } catch { /* ignore */ }
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="sessions-page">
        <NovaBackground />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '16px' }}>
          <div className="loader-ring large" />
          <p className="sessions-loading">Loading sessions…</p>
        </div>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { idle: "badge-idle", running: "badge-running", paused: "badge-paused", completed: "badge-completed", failed: "badge-failed" };
    return `badge ${colors[status] ?? "badge-idle"}`;
  };

  return (
    <div className="sessions-page" style={{ position: 'relative', zIndex: 1 }}>
      <NovaBackground />
      <header className="sessions-header">
        <div>
          <h1 className="sessions-title">Working Sessions</h1>
          <p className="sessions-subtitle">Long-running autonomous work sessions</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Cancel" : "New Session"}
        </button>
      </header>

      {showNew && (
        <div className="sessions-new-card">
          <div className="sessions-new-field">
            <label>Session Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Monday morning review" />
          </div>
          <div className="sessions-new-field">
            <label>Initial Goal (optional)</label>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What should Nova work on first?" rows={2} />
          </div>
          <button className="btn-primary" onClick={createSession} disabled={creating || !name.trim()}>
            {creating ? "Creating…" : "Create Session"}
          </button>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="sessions-empty">
          <p>No working sessions yet.</p>
          <p className="sessions-empty-sub">Create a session to start an autonomous work run.</p>
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`} className="sessions-card">
              <div className="sessions-card-header">
                <span className={statusBadge(s.status)}>{s.status}</span>
                <span className="sessions-card-missions">{s.missions.length} missions</span>
              </div>
              <h3 className="sessions-card-title">{s.name}</h3>
              <p className="sessions-card-meta">
                {s.missions.filter((m) => m.status === "completed").length} completed · {s.missions.filter((m) => m.status === "failed").length} failed
              </p>
              <p className="sessions-card-time">{new Date(s.createdAt).toLocaleDateString()} at {new Date(s.createdAt).toLocaleTimeString()}</p>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .sessions-page { min-height: 100vh; padding: 40px clamp(20px, 5vw, 60px); position: relative; z-index: 1; }
        .sessions-loading { color: rgba(240,242,246,0.5); font-size: 14px; }
        .sessions-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; gap: 20px; }
        .sessions-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(32px, 4vw, 48px); margin: 0; letter-spacing: -0.03em; background: linear-gradient(180deg, #f0f2f6, rgba(240,242,246,0.6)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .sessions-subtitle { margin: 8px 0 0; color: rgba(240,242,246,0.4); font-size: 14px; }
        .sessions-new-card { max-width: 480px; margin-bottom: 40px; padding: 24px; border: 1px solid var(--line); border-radius: 16px; background: rgba(20,22,27,0.8); display: grid; gap: 16px; }
        .sessions-new-field { display: grid; gap: 6px; }
        .sessions-new-field label { font-size: 12px; color: var(--muted); }
        .sessions-new-field input, .sessions-new-field textarea { padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: rgba(16,18,23,0.8); color: var(--text); font-size: 14px; outline: none; }
        .sessions-new-field input:focus, .sessions-new-field textarea:focus { border-color: var(--accent); }
        .sessions-empty { text-align: center; padding: 80px 0; color: var(--muted); }
        .sessions-empty-sub { font-size: 13px; margin-top: 8px; }
        .sessions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
        .sessions-card { display: block; padding: 20px; border: 1px solid var(--line); border-radius: 14px; background: rgba(22,24,30,0.7); text-decoration: none; color: inherit; transition: border-color 0.2s, transform 0.2s; }
        .sessions-card:hover { border-color: var(--accent); transform: translateY(-2px); }
        .sessions-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .badge { font-size: 10px; letter-spacing: 0.08em; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; }
        .badge-idle { background: rgba(146,153,168,0.12); color: #9299a8; }
        .badge-running { background: rgba(141,183,255,0.1); color: #8db7ff; }
        .badge-paused { background: rgba(200,164,107,0.1); color: var(--accent); }
        .badge-completed { background: rgba(110,217,164,0.1); color: var(--success); }
        .badge-failed { background: rgba(255,121,121,0.1); color: var(--danger); }
        .sessions-card-missions { font-size: 11px; color: rgba(240,242,246,0.3); }
        .sessions-card-title { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
        .sessions-card-meta { margin: 8px 0 0; font-size: 12px; color: var(--muted); }
        .sessions-card-time { margin: 4px 0 0; font-size: 11px; color: rgba(240,242,246,0.25); }
        @media (max-width: 640px) { .sessions-header { flex-direction: column; } }
      `}</style>
    </div>
  );
}
