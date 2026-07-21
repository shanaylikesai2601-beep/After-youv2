import type { AIProvider, AIProviderConfig, ProviderRequest, ProviderResponse, ToolCall } from "./types";

export function createOpenAICompatibleProvider(config: AIProviderConfig): AIProvider {
  return {
    async generate(request: ProviderRequest): Promise<ProviderResponse> {
      const body = {
        model: config.model,
        messages: buildMessages(request),
        tools: request.tools.length > 0 ? request.tools.map(formatTool) : undefined,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Provider error ${response.status}: ${text}`);
        }

        const data = (await response.json()) as {
          choices: Array<{
            message: {
              content?: string | null;
              tool_calls?: Array<{
                id: string;
                type: "function";
                function: { name: string; arguments: string };
              }>;
            };
            finish_reason: "stop" | "tool_calls" | "length";
          }>;
          usage: { prompt_tokens: number; completion_tokens: number };
        };

        const choice = data.choices[0];
        const toolCalls: ToolCall[] = (choice.message.tool_calls ?? []).map((tc) => ({
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments),
          id: tc.id,
        }));

        return {
          text: choice.message.content ?? "",
          toolCalls,
          usage: {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
          },
          finishReason: choice.finish_reason === "tool_calls" ? "tool_calls" : choice.finish_reason === "length" ? "length" : "stop",
        };
      } catch (err) {
        clearTimeout(timeout);
        if (err instanceof DOMException && err.name === "AbortError") {
          throw new Error("Provider request timed out after 60 seconds");
        }
        throw err;
      }
    },
  };
}

function buildMessages(request: ProviderRequest) {
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: request.system },
  ];

  for (const msg of request.messages) {
    if (msg.role === "tool") {
      messages.push({ role: "tool", content: msg.content, tool_call_id: msg.toolCallId });
    } else if (msg.role === "assistant" && msg.toolCalls?.length) {
      messages.push({
        role: "assistant",
        content: msg.content || null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.input) },
        })),
      });
    } else {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  if (request.prompt) {
    messages.push({ role: "user", content: request.prompt });
  }

  return messages;
}

function formatTool(tool: { name: string; description: string; parameters: Record<string, unknown> }) {
  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}
