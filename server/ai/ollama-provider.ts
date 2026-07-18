import type { AIProvider, AIProviderRequest, AIProviderResponse } from "@/server/ai/types";

interface OllamaProviderOptions {
  model: string;
  baseUrl?: string;
}

interface OllamaResponse {
  model?: unknown;
  message?: { content?: unknown };
  prompt_eval_count?: unknown;
  eval_count?: unknown;
}

/** Local Ollama chat adapter; no API key or hosted provider is required. */
export class OllamaProvider implements AIProvider {
  readonly id = "ollama";
  private readonly model: string;
  private readonly endpoint: string;

  constructor(options: OllamaProviderOptions) {
    this.model = options.model;
    this.endpoint = `${(options.baseUrl ?? "http://127.0.0.1:11434").replace(/\/$/, "")}/api/chat`;
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    const payload = JSON.stringify({
      model: this.model,
      stream: false,
      think: false,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.prompt },
      ],
      options: { temperature: request.temperature, num_predict: this.maxOutputTokens(request.metadata.action) },
      format: "json",
    });
    let response: Response | undefined;
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        response = await fetch(this.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
    if (!response) throw new Error(`Ollama request failed at ${this.endpoint}: ${lastError instanceof Error ? lastError.message : "connection failed"}`);
    const body = await this.parseBody(response);
    if (!response.ok) throw new Error(`Ollama request failed (${response.status}) at ${this.endpoint}: ${this.bodyText(body)}`);
    if (!this.isBody(body) || typeof body.message?.content !== "string" || !body.message.content.trim()) {
      throw new Error(`Ollama response did not contain text. Complete response body: ${this.bodyText(body)}`);
    }
    return {
      text: body.message.content,
      model: typeof body.model === "string" ? body.model : this.model,
      usage: {
        inputTokens: typeof body.prompt_eval_count === "number" ? body.prompt_eval_count : undefined,
        outputTokens: typeof body.eval_count === "number" ? body.eval_count : undefined,
      },
    };
  }

  private maxOutputTokens(action?: string): number {
    if (action === "plan") return 768;
    if (action === "reason") return 256;
    // Local models need enough room to close JSON objects containing citations
    // and artifact metadata; the parser still enforces the strict schema.
    if (action === "execute" || action === "review") return 1536;
    const configured = Number(process.env.OLLAMA_MAX_OUTPUT_TOKENS);
    return Number.isInteger(configured) && configured > 0 ? configured : 4096;
  }

  private async parseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    try { return JSON.parse(text) as unknown; } catch { return text; }
  }

  private isBody(value: unknown): value is OllamaResponse { return typeof value === "object" && value !== null; }
  private bodyText(value: unknown): string { return typeof value === "string" ? value : JSON.stringify(value); }
}
