import type { Mission } from "@/types/mission";

export interface MissionRepository {
  create(mission: Mission): Promise<Mission>;
  findAll(): Promise<Mission[]>;
  findById(id: string): Promise<Mission | null>;
  update(mission: Mission): Promise<Mission>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryMissionRepository implements MissionRepository {
  private readonly missions = new Map<string, Mission>();

  async create(mission: Mission): Promise<Mission> {
    this.missions.set(mission.id, structuredClone(mission));
    return structuredClone(mission);
  }

  async findAll(): Promise<Mission[]> {
    return [...this.missions.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((mission) => structuredClone(mission));
  }

  async findById(id: string): Promise<Mission | null> {
    const mission = this.missions.get(id);
    return mission ? structuredClone(mission) : null;
  }

  async update(mission: Mission): Promise<Mission> {
    if (!this.missions.has(mission.id)) throw new Error("Mission not found");
    this.missions.set(mission.id, structuredClone(mission));
    return structuredClone(mission);
  }

  async delete(id: string): Promise<boolean> {
    return this.missions.delete(id);
  }
}
