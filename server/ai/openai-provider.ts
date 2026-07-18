import type { AIProvider, AIProviderRequest, AIProviderResponse } from "@/server/ai/types";

interface OpenAIProviderOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface OpenAIResponseBody {
  id?: unknown;
  model?: unknown;
  output_text?: unknown;
  output?: unknown;
  content?: unknown;
  type?: unknown;
  text?: unknown;
  message?: unknown;
  choices?: unknown;
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
}

/** OpenAI Responses API adapter. It intentionally exposes only the shared AIProvider contract. */
export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly maxOutputTokens: number;

  constructor(private readonly options: OpenAIProviderOptions) {
    this.model = options.model ?? "gpt-5";
    this.baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const configuredMaxOutputTokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS);
    this.maxOutputTokens = Number.isInteger(configuredMaxOutputTokens) && configuredMaxOutputTokens > 0 ? configuredMaxOutputTokens : 4096;
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    const endpoint = `${this.baseUrl}/responses`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        instructions: request.system,
        input: request.prompt,
        temperature: request.temperature,
        max_output_tokens: this.maxOutputTokens,
        store: false,
      }),
    });

    const body = await this.parseBody(response);
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status}) at ${endpoint}: ${this.bodyText(body)}`);
    const extracted = this.extractText(body);
    if (!extracted) {
      console.error("[OpenAIProvider] Response did not contain supported text. Complete response body:", this.bodyText(body));
      throw new Error(`OpenAI response did not contain supported text. Complete response body: ${this.bodyText(body)}`);
    }
    if (process.env.NODE_ENV !== "production") console.info(`[OpenAIProvider] Response format detected: ${extracted.format}`);

    return {
      text: extracted.text,
      model: this.isResponseBody(body) && typeof body.model === "string" ? body.model : this.model,
      requestId: this.isResponseBody(body) && typeof body.id === "string" ? body.id : undefined,
      usage: this.isResponseBody(body) ? this.usage(body.usage) : undefined,
    };
  }

  private isResponseBody(value: unknown): value is OpenAIResponseBody {
    return typeof value === "object" && value !== null;
  }

  private async parseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    try { return JSON.parse(text) as unknown; } catch { return text; }
  }

  private bodyText(value: unknown): string { return typeof value === "string" ? value : JSON.stringify(value); }

  private extractText(value: unknown): { text: string; format: "output_text" | "responses_output" | "chat_completions" } | undefined {
    if (!this.isResponseBody(value)) return undefined;
    if (typeof value.output_text === "string") return { text: value.output_text, format: "output_text" };

    if (Array.isArray(value.output)) {
      for (const outputItem of value.output) {
        if (!this.isResponseBody(outputItem) || !Array.isArray(outputItem.content)) continue;
        for (const contentItem of outputItem.content) {
          if (this.isResponseBody(contentItem) && contentItem.type === "output_text" && typeof contentItem.text === "string") {
            return { text: contentItem.text, format: "responses_output" };
          }
        }
      }
    }

    if (Array.isArray(value.choices)) {
      const firstChoice = value.choices[0];
      if (this.isResponseBody(firstChoice) && this.isResponseBody(firstChoice.message) && typeof firstChoice.message.content === "string") {
        return { text: firstChoice.message.content, format: "chat_completions" };
      }
    }
    return undefined;
  }

  private usage(value: OpenAIResponseBody["usage"]): AIProviderResponse["usage"] {
    if (!value) return undefined;
    return {
      inputTokens: typeof value.input_tokens === "number" ? value.input_tokens : undefined,
      outputTokens: typeof value.output_tokens === "number" ? value.output_tokens : undefined,
    };
  }
}
