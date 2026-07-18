"use client";

import { useEffect, useState } from "react";

import { missionsApi } from "@/api/missions";
import type { Mission } from "@/types/mission";

export interface MissionSubscription {
  subscribe(id: string, onMission: (mission: Mission) => void, onError: (error: Error) => void): () => void;
}

/** Polling transport; replace this implementation with SSE/WebSocket without changing workspace components. */
export class PollingMissionSubscription implements MissionSubscription {
  constructor(private readonly intervalMs = 2_500) {}

  subscribe(id: string, onMission: (mission: Mission) => void, onError: (error: Error) => void): () => void {
    let active = true;
    const read = async (): Promise<void> => {
      try {
        const mission = await missionsApi.get(id);
        if (active) onMission(mission);
      } catch (error) {
        if (active) onError(error instanceof Error ? error : new Error("Mission polling failed"));
      }
    };
    void read();
    const timer = window.setInterval(() => void read(), this.intervalMs);
    return () => { active = false; window.clearInterval(timer); };
  }
}

const defaultSubscription = new PollingMissionSubscription();

export function useMission(id: string, subscription: MissionSubscription = defaultSubscription): { mission?: Mission; error?: string } {
  const [mission, setMission] = useState<Mission>();
  const [error, setError] = useState<string>();
  useEffect(() => subscription.subscribe(id, setMission, (nextError) => setError(nextError.message)), [id, subscription]);
  return { mission, error };
}
