import type { WorkingSession } from "@/types/session";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(await response.text());
  }
  if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Session request failed");
  return response.json() as Promise<T>;
}

export const sessionsApi = {
  list: async (): Promise<WorkingSession[]> =>
    (await request<{ data: WorkingSession[] }>("/api/sessions")).data,
  get: async (id: string): Promise<WorkingSession> =>
    (await request<{ data: WorkingSession }>(`/api/sessions/${id}`)).data,
  create: async (input: { name: string; goal?: string; workspace?: { workspaceName: string; workspacePath: string; indexedAt: string }; budgetMs?: number }): Promise<WorkingSession> =>
    (await request<{ data: WorkingSession }>("/api/sessions", { method: "POST", body: JSON.stringify(input) })).data,
  queueMission: async (id: string, goal: string, title?: string): Promise<WorkingSession> =>
    (await request<{ data: WorkingSession }>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ action: "queue", goal, title }) })).data,
  attachMission: async (id: string, missionId: string): Promise<WorkingSession> =>
    (await request<{ data: WorkingSession }>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ action: "attach", missionId }) })).data,
  startSession: async (id: string): Promise<WorkingSession> =>
    (await request<{ data: WorkingSession }>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ action: "start" }) })).data,
  pauseSession: async (id: string): Promise<WorkingSession> =>
    (await request<{ data: WorkingSession }>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ action: "pause" }) })).data,
  resumeSession: async (id: string): Promise<WorkingSession> =>
    (await request<{ data: WorkingSession }>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ action: "resume" }) })).data,
  abortSession: async (id: string): Promise<WorkingSession> =>
    (await request<{ data: WorkingSession }>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ action: "abort" }) })).data,
};
