import type { AIProvider, AgentContext, AgentResult } from "../types";
import { getToolSchemas, executeTool } from "@/server/tools/registry";

export async function runCodingAgent(
  context: AgentContext,
  provider: AIProvider,
  taskDescription: string
): Promise<AgentResult> {
  const toolSchemas = getToolSchemas();
  const maxSteps = parseInt(process.env.AFTERYOU_MAX_REASONING_STEPS ?? "12", 10);
  const maxToolCalls = parseInt(process.env.AFTERYOU_MAX_TOOL_CALLS ?? "16", 10);
  let toolCallCount = 0;
  const artifacts: AgentResult["artifacts"] = [];
  const messages: Array<{ role: string; content: string; toolCallId?: string; toolCalls?: Array<{ name: string; input: Record<string, unknown>; id: string }> }> = [];

  const system = `You are AfterYou's CodingAgent. You build and modify code.

CORE RULES:
1. You MUST use the filesystem tool to create or modify files — that is your primary job
2. The filesystem tool requires: operation ("create"|"read"|"write"|"move"|"delete"), path, and optionally content
3. Always use operation: "create" for new files, operation: "write" for existing files
4. Use the terminal tool to run commands (npm, npx, git, etc.) when needed
5. Make design decisions yourself — don't ask for approval
6. Create complete, working files — not partial stubs
7. Verify your work by reading files back or running build commands
8. When done, call complete with a summary of what was created`;

  const prompt = `Mission: ${context.goal}
Task: ${taskDescription}

${context.memory.map((m) => `${m.key}: ${m.value}`).join("\n")}

Use the available tools to implement this task. Create all necessary files with complete content.`;

  let stepCount = 0;
  let finished = false;
  let allOutput = "";

  while (stepCount < maxSteps && toolCallCount < maxToolCalls && !finished) {
    stepCount++;
    const memEntries = context.memory.map((m) => `${m.key}: ${m.value}`);

    const response = await provider.generate({
      system,
      prompt: stepCount === 1 ? prompt : "Continue the implementation. Use tools as needed. If the task is complete, respond with a summary.",
      messages: messages as Array<{ role: "system" | "user" | "assistant" | "tool"; content: string; toolCallId?: string; toolCalls?: Array<{ name: string; input: Record<string, unknown>; id: string }> }>,
      tools: toolSchemas,
      temperature: 0.2,
      maxTokens: 2048,
    });

    allOutput += response.text + "\n";

    if (response.finishReason === "stop" || response.toolCalls.length === 0) {
      finished = true;
      break;
    }

    for (const toolCall of response.toolCalls) {
      if (toolCallCount >= maxToolCalls) break;
      toolCallCount++;

      const result = await executeTool(toolCall.name, toolCall.input, context.workspacePath);
      const resultStr = result.error ? `Error: ${result.error}` : result.output;

      if (!result.error && (toolCall.name === "filesystem" && (toolCall.input.operation === "create" || toolCall.input.operation === "write"))) {
        artifacts.push({
          name: String(toolCall.input.path ?? "unknown"),
          kind: "file",
          path: String(toolCall.input.path ?? ""),
        });
      }

      messages.push({ role: "assistant", content: "", toolCalls: [{ name: toolCall.name, input: toolCall.input, id: toolCall.id }] });
      messages.push({ role: "tool", content: resultStr, toolCallId: toolCall.id });
    }
  }

  return {
    summary: `Coding agent completed after ${stepCount} steps, ${toolCallCount} tool calls`,
    content: allOutput || "Implementation completed.",
    artifacts,
  };
}
