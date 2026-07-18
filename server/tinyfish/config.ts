export interface TinyFishConfig {
  apiKey: string;
  baseUrl: string;
}

export function tinyFishConfigFromEnvironment(): TinyFishConfig | undefined {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) return undefined;
  return { apiKey, baseUrl: (process.env.TINYFISH_BASE_URL ?? "https://agent.tinyfish.ai").replace(/\/$/, "") };
}

export function tinyFishServiceUrl(config: TinyFishConfig, service: "search" | "fetch" | "browser"): string {
  const configured = new URL(config.baseUrl);
  if (configured.hostname === `api.${service}.tinyfish.ai`) return config.baseUrl;
  return `https://api.${service}.tinyfish.ai`;
}
