import type { AIProvider, AIProviderRequest, AIProviderResponse } from "@/server/ai/types";

/** Fails safely until a real provider is configured; useful for local and test environments. */
export class UnavailableAIProvider implements AIProvider {
  readonly id = "unconfigured";

  async generate(_: AIProviderRequest): Promise<AIProviderResponse> {
    throw new Error("No reasoning provider is configured. Set OPENAI_API_KEY or inject another chat-completions/Responses-style AIProvider.");
  }
}
