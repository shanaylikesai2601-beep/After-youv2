export interface AIProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxOutputTokens: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  id: string;
}

export interface ProviderMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ProviderRequest {
  system: string;
  prompt: string;
  messages: ProviderMessage[];
  tools: ToolDefinition[];
  temperature: number;
  maxTokens: number;
}

export interface ProviderResponse {
  text: string;
  toolCalls: ToolCall[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason: "stop" | "tool_calls" | "length" | "error";
}

export interface AIProvider {
  generate(request: ProviderRequest): Promise<ProviderResponse>;
}

export interface AgentContext {
  missionId: string;
  title: string;
  description: string;
  goal: string;
  workspacePath: string;
  memory: Array<{ key: string; value: string; source: string }>;
  toolResults: Array<{ tool: string; input: Record<string, unknown>; output: string; error?: string }>;
}

export interface AgentResult {
  summary: string;
  content: string;
  artifacts: Array<{ name: string; kind: "file" | "link" | "generated"; path?: string; mimeType?: string }>;
}

export interface PlannerTask {
  title: string;
  goal: string;
  expectedOutput: string;
  suggestedTools: string[];
  dependencies: string[];
  completionCriteria: string[];
}

export interface PlannerPlan {
  summary: string;
  tasks: PlannerTask[];
}
