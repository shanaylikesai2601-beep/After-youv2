export const AI_PROVIDER_IDS = ["openai", "anthropic", "gemini", "ollama", "grok"] as const;
export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];

export interface AIProviderRequest {
  system: string;
  prompt: string;
  temperature?: number;
  metadata: Record<string, string>;
}

export interface AIProviderResponse {
  text: string;
  model: string;
  requestId?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

/** A provider adapter is the only layer permitted to communicate with an LLM. */
export interface AIProvider {
  readonly id: AIProviderId | "unconfigured";
  generate(request: AIProviderRequest): Promise<AIProviderResponse>;
}
