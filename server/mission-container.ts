import { InMemoryMissionRepository } from "@/server/mission-repository";
import { MissionService } from "@/server/mission-service";
import { AgentOrchestrator } from "@/server/agents/agent-orchestrator";
import { AgentRegistry } from "@/server/agents/agent-registry";
import { BrowserAgent, CodingAgent, DocumentAgent, GitHubAgent, PlannerAgent, ResearchAgent, ReviewerAgent } from "@/server/agents/specialized-agents";
import { OpenAIProvider } from "@/server/ai/openai-provider";
import { GeminiProvider } from "@/server/ai/gemini-provider";
import { OllamaProvider } from "@/server/ai/ollama-provider";
import type { AIProvider } from "@/server/ai/types";
import { UnavailableAIProvider } from "@/server/ai/unavailable-provider";
import { tinyFishConfigFromEnvironment } from "@/server/tinyfish/config";
import { createDefaultToolRegistry } from "@/server/tools/default-tools";
import type { ToolRegistry } from "@/server/tools/registry";
import type { AgentRuntimeLimits } from "@/server/agents/runtime-limits";

declare global {
  var afterYouMissionService: MissionService | undefined;
  var afterYouAgentOrchestrator: AgentOrchestrator | undefined;
  var afterYouToolRegistry: ToolRegistry | undefined;
}

export const missionService =
  globalThis.afterYouMissionService ?? new MissionService(new InMemoryMissionRepository());

if (process.env.NODE_ENV !== "production") globalThis.afterYouMissionService = missionService;

function createProvider(): AIProvider {
  if (process.env.AI_PROVIDER?.toLowerCase() === "ollama") {
    return new OllamaProvider({
      model: process.env.OLLAMA_MODEL ?? "gemma4:latest",
      baseUrl: process.env.OLLAMA_BASE_URL,
    });
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return new GeminiProvider({
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL,
      baseUrl: process.env.GEMINI_BASE_URL,
    });
  }
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey) return new UnavailableAIProvider();
  const provider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL,
    baseUrl: process.env.OPENAI_BASE_URL,
  });
  return provider;
}

function createOrchestrator(): AgentOrchestrator {
  const services = { provider: createProvider(), missions: missionService, availableTools: toolRegistry.list().map((tool) => ({ id: tool.id, description: tool.description })) };
  const registry = new AgentRegistry([
    new PlannerAgent(services),
    new ResearchAgent(services),
    new BrowserAgent(services),
    new CodingAgent(services),
    new DocumentAgent(services),
    new GitHubAgent(services),
    new ReviewerAgent(services),
  ]);
  return new AgentOrchestrator(registry, missionService, toolRegistry, runtimeLimitsFromEnvironment());
}

function runtimeLimitsFromEnvironment(): Partial<AgentRuntimeLimits> {
  const number = (name: string): number | undefined => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };
  const configured: Partial<AgentRuntimeLimits> = {};
  const assign = <K extends keyof AgentRuntimeLimits>(key: K, environmentName: string): void => {
    const value = number(environmentName);
    if (value !== undefined) configured[key] = value as AgentRuntimeLimits[K];
  };
  assign("maxReasoningSteps", "AFTERYOU_MAX_REASONING_STEPS");
  assign("maxToolCalls", "AFTERYOU_MAX_TOOL_CALLS");
  assign("runtimeLimitMs", "AFTERYOU_RUNTIME_LIMIT_MS");
  assign("tokenBudget", "AFTERYOU_TOKEN_BUDGET");
  assign("highConfidenceThreshold", "AFTERYOU_HIGH_CONFIDENCE_THRESHOLD");
  assign("maxReviewCycles", "AFTERYOU_MAX_REVIEW_CYCLES");
  assign("reviewQualityThreshold", "AFTERYOU_REVIEW_QUALITY_THRESHOLD");
  return configured;
}

export const toolRegistry = globalThis.afterYouToolRegistry ?? createDefaultToolRegistry({
  missions: missionService,
  workspaceRoot: process.env.AFTERYOU_WORKSPACE_ROOT ?? process.cwd(),
  githubToken: process.env.GITHUB_TOKEN,
  tinyFishConfig: tinyFishConfigFromEnvironment(),
});

if (process.env.NODE_ENV !== "production") globalThis.afterYouToolRegistry = toolRegistry;

export const agentOrchestrator = globalThis.afterYouAgentOrchestrator ?? createOrchestrator();

if (process.env.NODE_ENV !== "production") globalThis.afterYouAgentOrchestrator = agentOrchestrator;
