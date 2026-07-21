import { jsonError } from "@/lib/http";
import { refineSchema } from "@/lib/mission-validation";
import { getMissionService } from "@/server/mission-container";
import { runRefiner } from "@/server/ai/agents/refiner";
import { getAIProvider } from "@/server/ai/provider-factory";
import type { AIProvider } from "@/server/ai/types";
import type { RefineResponse, RefineSuggestion } from "@/server/ai/agents/refiner";

export const runtime = "nodejs";

function createMockSuggestions(goal: string, round: number): RefineResponse {
  const categories: Array<RefineSuggestion["category"]> = ["feature", "quality", "scope", "technical"];
  const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

  const perRound: Record<number, RefineSuggestion[]> = {
    1: [
      { title: "Polish the visual design system", description: "Refine typography scale, spacing rhythm, and component tokens for a cohesive, premium look across every section.", impact: "high", category: "quality" },
      { title: "Strengthen the information architecture", description: "Restructure layout hierarchy so key value props are above the fold and supporting details cascade naturally.", impact: "high", category: "feature" },
      { title: "Set up a cohesive brand voice and messaging", description: "Define tone, key messaging pillars, and copy guidelines so every section communicates the same premium story.", impact: "medium", category: "scope" },
    ],
    2: [
      { title: "Add micro-interactions and scroll-triggered reveals", description: "Smooth hover states, intersection-observer fade-ins, and subtle page transitions that make the UI feel responsive and alive.", impact: "medium", category: "feature" },
      { title: "Write benefit-driven copy for every section", description: "Craft headlines, subtexts, and CTAs that guide the user from curiosity to conversion with clarity.", impact: "high", category: "quality" },
      { title: "Implement lazy-loading and performance budgets", description: "Lazy-load images, defer non-critical scripts, and set performance budgets to keep load times under 2 seconds.", impact: "medium", category: "technical" },
    ],
    3: [
      { title: "Build a multi-step email capture flow", description: "A clean signup form with inline validation, success feedback, error recovery, and proper ARIA labels.", impact: "medium", category: "feature" },
      { title: "Create a testimonial carousel with auto-advance", description: "Social-proof section with auto-rotation, manual dots, and smooth slide transitions.", impact: "low", category: "feature" },
      { title: "Add dark/light theme toggle with CSS transitions", description: "Theme switcher with localStorage persistence, CSS custom properties, and cross-fade transitions on all themed elements.", impact: "medium", category: "quality" },
    ],
  };

  return {
    round,
    suggestions: shuffle(perRound[round] ?? perRound[1]),
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input = refineSchema.parse(await request.json());
    const svc = await getMissionService();

    let projectContext = "";

    // If a missionId was provided, read the mission for context
    if (input.missionId) {
      try {
        const mission = await svc.get(input.missionId);
        projectContext = [
          `Title: ${mission.title}`,
          `Description: ${mission.description}`,
          mission.goal ? `Goal: ${mission.goal}` : "",
        ].filter(Boolean).join("\n");
      } catch {
        // mission may not exist yet
      }
    }

    // Add workspace context if available
    if (input.workspacePath) {
      try {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const entries = await fs.readdir(input.workspacePath, { withFileTypes: true });
        const topLevel = entries
          .filter((e) => !e.name.startsWith(".") && !e.name.startsWith("node_modules"))
          .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
          .sort();
        if (topLevel.length > 0) {
          projectContext += `\nWorkspace files:\n${topLevel.join("\n")}`;
        }
      } catch {
        // ignore — workspace context is optional
      }
    }

    let provider: AIProvider;
    try {
      provider = getAIProvider();
    } catch {
      // No AI provider configured — return mock suggestions
      const mock = createMockSuggestions(input.goal, input.round);
      return Response.json({ data: mock });
    }

    const result = await runRefiner(
      provider,
      input.goal,
      input.round,
      input.previousSelections ?? [],
      projectContext
    );

    return Response.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
