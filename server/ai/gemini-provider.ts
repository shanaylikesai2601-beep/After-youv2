import type { AIProvider, AIProviderRequest, AIProviderResponse } from "@/server/ai/types";

interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface GeminiResponseBody {
  candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown };
}

/** Google Gemini generateContent adapter implementing the shared provider contract. */
export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly maxOutputTokens: number;

  constructor(private readonly options: GeminiProviderOptions) {
    this.model = options.model ?? "gemini-2.5-flash";
    this.baseUrl = (options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
    const configured = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS);
    this.maxOutputTokens = Number.isInteger(configured) && configured > 0 ? configured : 4096;
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    const endpoint = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.options.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: this.maxOutputTokens,
          responseMimeType: "application/json",
        },
      }),
    });
    const body = await this.parseBody(response);
    if (!response.ok) throw new Error(`Gemini request failed (${response.status}) at ${endpoint}: ${this.bodyText(body)}`);
    const text = this.extractText(body);
    if (!text) throw new Error(`Gemini response did not contain text. Complete response body: ${this.bodyText(body)}`);
    const typedBody = this.isBody(body) ? body : {};
    return {
      text,
      model: this.model,
      usage: {
        inputTokens: typeof typedBody.usageMetadata?.promptTokenCount === "number" ? typedBody.usageMetadata.promptTokenCount : undefined,
        outputTokens: typeof typedBody.usageMetadata?.candidatesTokenCount === "number" ? typedBody.usageMetadata.candidatesTokenCount : undefined,
      },
    };
  }

  private async parseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    try { return JSON.parse(text) as unknown; } catch { return text; }
  }

  private isBody(value: unknown): value is GeminiResponseBody { return typeof value === "object" && value !== null; }
  private bodyText(value: unknown): string { return typeof value === "string" ? value : JSON.stringify(value); }

  private extractText(value: unknown): string | undefined {
    if (!this.isBody(value) || !Array.isArray(value.candidates)) return undefined;
    const parts = value.candidates[0]?.content?.parts;
    if (!Array.isArray(parts)) return undefined;
    const text = parts.map((part) => typeof part.text === "string" ? part.text : "").join("").trim();
    return text || undefined;
  }
}
