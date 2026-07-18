import type { CreateMissionInput, Mission, UpdateMissionInput } from "@/types/mission";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
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
};
