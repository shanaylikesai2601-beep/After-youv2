import type { AIProvider } from "../types";

export interface RefineSuggestion {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: "feature" | "quality" | "scope" | "technical";
}

export interface RefineResponse {
  round: number;
  suggestions: RefineSuggestion[];
}

export async function runRefiner(
  provider: AIProvider,
  goal: string,
  round: number,
  previousSelections: string[],
  projectContext: string
): Promise<RefineResponse> {
  const system = `You are AfterYou's RefinementAgent. Your role is to help users refine their mission by suggesting concrete, specific next steps.

You are NOT a coding agent. You do NOT write code. You only suggest directions.

Rules:
1. Generate exactly 3 suggestions
2. Each suggestion must be specific and actionable — never vague
3. Suggestions must be diverse (different categories)
4. Suggestions should build on each other across rounds
5. Be aware of the project context when applicable
6. Each round should produce MORE focused suggestions than the last
7. Never suggest generic improvements like "Improve performance" or "Add features"
8. Instead suggest concrete things like "Add responsive image optimization with AVIF support" or "Integrate a headless CMS for blog content"`;

  const prompt = `Original mission: ${goal}
Round: ${round}/3
${previousSelections.length > 0 ? `Previously selected directions:\n${previousSelections.map((s, i) => `  Round ${i + 1}: ${s}`).join("\n")}` : ""}
${projectContext ? `Project context:\n${projectContext}` : ""}

${round === 2 ? "The user has already chosen one direction. Suggest refinements that are more specific and build on the previous selection." : ""}
${round === 3 ? "The user has chosen two directions. Suggest highly specific refinements that narrow the mission to exactly what the user wants." : ""}

Generate 3 diverse, specific, actionable suggestions. Return ONLY valid JSON:

{
  "suggestions": [
    {
      "title": "Short actionable title",
      "description": "2-3 sentence explanation of why this matters and what it involves",
      "impact": "high" | "medium" | "low",
      "category": "feature" | "quality" | "scope" | "technical"
    }
  ]
}`;

  try {
    const response = await provider.generate({
      system,
      prompt,
      messages: [],
      tools: [],
      temperature: 0.4 + (round - 1) * 0.1,
      maxTokens: 2048,
    });

    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const suggestions: RefineSuggestion[] = (parsed.suggestions ?? []).slice(0, 3);
      return { round, suggestions };
    }
  } catch {
    // fall through to fallback
  }

  return {
    round,
    suggestions: createFallbackSuggestions(goal, round, previousSelections),
  };
}

function createFallbackSuggestions(goal: string, _round: number, _previousSelections: string[]): RefineSuggestion[] {
  const isBuild = /build|create|develop|implement|website|landing|app|dashboard|page|feature/i.test(goal);

  if (isBuild) {
    return [
      {
        title: "Add comprehensive error handling and loading states",
        description: "Ensure every data-fetching view has skeleton loaders, error boundaries, and meaningful empty states so the feature feels production-ready from the start.",
        impact: "high",
        category: "quality",
      },
      {
        title: "Implement responsive and mobile-first layout",
        description: "Verify the implementation works beautifully across mobile, tablet, and desktop viewports using the existing CSS breakpoints in workspace.css.",
        impact: "high",
        category: "quality",
      },
      {
        title: "Include analytics and usage tracking",
        description: "Add lightweight analytics to understand how users interact with the new feature, enabling data-driven iteration after launch.",
        impact: "medium",
        category: "feature",
      },
    ];
  }

  return [
    {
      title: "Define success criteria and validation approach",
      description: "Establish clear metrics for what constitutes a successful outcome before diving into implementation.",
      impact: "high",
      category: "scope",
    },
    {
      title: "Create a reusable template or framework for similar tasks",
      description: "Abstract the approach into a reusable pattern so future missions of this type can leverage the same structure.",
      impact: "medium",
      category: "technical",
    },
    {
      title: "Document the process and decisions for the team",
      description: "Capture the methodology, trade-offs, and key decisions so the team can review and build on the work.",
      impact: "medium",
      category: "feature",
    },
  ];
}
