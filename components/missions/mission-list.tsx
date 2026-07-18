"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { missionsApi } from "@/api/missions";
import { MissionLauncher } from "@/components/missions/mission-launcher";
import type { Mission } from "@/types/mission";

export function MissionList(): React.ReactElement {
  const [missions, setMissions] = useState<Mission[]>();
  const [error, setError] = useState<string>();
  useEffect(() => { void missionsApi.list().then(setMissions).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load missions")); }, []);
  return <main className="content" style={{ maxWidth: 980, margin: "0 auto" }}><header className="topbar"><div><Link href="/" className="brand">After<span>You</span></Link><h1 style={{ marginTop: 28 }}>Mission control</h1><p>Every assignment, its agent activity, and the work it creates.</p></div><MissionLauncher /></header><section className="section"><div className="section-header"><h2>All missions</h2></div>{error ? <div className="empty">{error}</div> : !missions ? <div className="empty">Loading your missions…</div> : missions.length ? <div className="timeline">{missions.map((mission) => <Link href={`/missions/${mission.id}`} className="event-card" style={{ textDecoration: "none", color: "inherit" }} key={mission.id}><div className="event-summary"><span className="event-time">{new Date(mission.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><span className="event-title">{mission.title}</span></div><p className="event-meta">{mission.status} · {mission.progress}% complete · {mission.artifacts.length} artifacts</p></Link>)}</div> : <div className="empty">No missions yet. Assign one when you are ready.</div>}</section></main>;
}
