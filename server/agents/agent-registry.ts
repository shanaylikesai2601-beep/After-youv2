import type { Agent } from "@/server/agents/agent";
import type { AgentId } from "@/types/agent";

/** Registry keeps orchestration independent from concrete agent implementations. */
export class AgentRegistry {
  private readonly agents: Map<AgentId, Agent>;

  constructor(agents: Agent[]) {
    this.agents = new Map(agents.map((agent) => [agent.id, agent]));
  }

  get(id: AgentId): Agent {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent '${id}' is not registered`);
    return agent;
  }
}
