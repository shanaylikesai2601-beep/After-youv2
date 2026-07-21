import type { CreateMissionInput, Mission, UpdateMissionInput } from "@/types/mission";
import type { RefineResponse } from "@/server/ai/agents/refiner";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(await response.text());
  }
  if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Mission request failed");
  return response.json() as Promise<T>;
}

export const missionsApi = {
  list: async (): Promise<Mission[]> => (await request<{ data: Mission[] }>("/api/missions")).data,
  get: async (id: string): Promise<Mission> => (await request<{ data: Mission }>(`/api/missions/${id}`)).data,
  create: async (input: CreateMissionInput): Promise<Mission> =>
    (await request<{ data: Mission }>("/api/missions", { method: "POST", body: JSON.stringify(input) })).data,
  update: async (id: string, input: UpdateMissionInput): Promise<Mission> =>
    (await request<{ data: Mission }>(`/api/missions/${id}`, { method: "PATCH", body: JSON.stringify(input) })).data,
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/missions/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Mission could not be deleted");
  },
  refine: async (input: {
    goal: string;
    round: number;
    missionId?: string;
    previousSelections?: string[];
    workspacePath?: string;
  }): Promise<RefineResponse> =>
    (await request<{ data: RefineResponse }>("/api/missions/refine", { method: "POST", body: JSON.stringify(input) })).data,
};
