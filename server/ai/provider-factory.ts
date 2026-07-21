import type { AIProvider } from "./types";
import { createOpenAICompatibleProvider } from "./provider";

export function getAIProvider(): AIProvider {
  console.log("[provider-factory] getAIProvider() called, AI_PROVIDER=", process.env.AI_PROVIDER);
  const provider = process.env.AI_PROVIDER ?? "nvidia";

  const configs: Record<string, { apiKey: string; baseUrl: string; model: string; maxOutputTokens: number }> = {
    nvidia: {
      apiKey: process.env.NVIDIA_API_KEY ?? "",
      baseUrl: process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
      model: process.env.NVIDIA_MODEL ?? "meta/llama-3.3-70b-instruct",
      maxOutputTokens: parseInt(process.env.NVIDIA_MAX_OUTPUT_TOKENS ?? "4096", 10),
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY ?? "",
      baseUrl: process.env.OPENAI_BASE_URL ?? "https://openrouter.ai/api/v1",
      model: process.env.OPENAI_MODEL ?? "openai/gpt-4o-mini",
      maxOutputTokens: parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? "4096", 10),
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY ?? "",
      baseUrl: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      maxOutputTokens: parseInt(process.env.GROQ_MAX_OUTPUT_TOKENS ?? "4096", 10),
    },
    ollama: {
      apiKey: "ollama",
      baseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1",
      model: process.env.OLLAMA_MODEL ?? "qwen2.5:3b",
      maxOutputTokens: parseInt(process.env.OLLAMA_MAX_OUTPUT_TOKENS ?? "4096", 10),
    },
  };

  const cfg = configs[provider] ?? configs.nvidia;
  if (!cfg.apiKey) throw new Error(`No API key configured for provider: ${provider}`);
  return createOpenAICompatibleProvider(cfg);
}
