import type { AIProvider, AgentContext, AgentResult } from "../types";

export async function runReviewer(context: AgentContext, provider: AIProvider, codingResult: AgentResult): Promise<AgentResult> {
  const system = `You are AfterYou's ReviewerAgent. Evaluate the completed work against the mission requirements.
Rate quality from 0-100. Identify issues and suggest improvements. Be honest but constructive.`;

  const prompt = `Mission goal: ${context.goal}

Work completed:
${codingResult.content}

Artifacts created:
${codingResult.artifacts.map((a) => `- ${a.name} (${a.kind})`).join("\n")}

Evaluate:
1. Does the work fulfill the mission requirements?
2. Are the files complete and functional?
3. What issues exist?
4. Quality score (0-100)?

Return your review as JSON:
{
  "approved": boolean,
  "qualityScore": number (0-100),
  "summary": "review summary",
  "issues": ["issue1", "issue2"],
  "recommendations": ["rec1", "rec2"]
}`;

  const response = await provider.generate({
    system,
    prompt,
    messages: [],
    tools: [],
    temperature: 0.3,
    maxTokens: 1024,
  });

  let review: { approved: boolean; qualityScore: number; summary: string; issues: string[]; recommendations: string[] };
  try {
    review = JSON.parse(response.text);
  } catch {
    review = {
      approved: codingResult.artifacts.length > 0,
      qualityScore: codingResult.artifacts.length > 0 ? 70 : 0,
      summary: response.text,
      issues: [],
      recommendations: [],
    };
  }

  return {
    summary: review.summary,
    content: response.text,
    artifacts: [{ name: "review.json", kind: "file" }],
  };
}
