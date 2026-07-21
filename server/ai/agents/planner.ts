import type { AIProvider, AgentContext, AgentResult, PlannerTask, PlannerPlan } from "../types";

function extractJson(text: string): string {
  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blockMatch) return blockMatch[1].trim();
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1);
  }
  return text;
}

function buildFeatureTasks(goal: string): PlannerTask[] {
  const isFeature = /build|create|develop|implement|dashboard|page|component|feature|add|notes|search|editor/i.test(goal);
  if (!isFeature) return [];

  return [
    {
      title: "Analyze existing codebase patterns",
      goal: "Read existing files to understand the project structure, design system, component patterns, and routing conventions before making any changes.",
      expectedOutput: "List of files examined and key patterns identified (framework, styling, component structure, navigation).",
      suggestedTools: ["filesystem"],
      dependencies: [],
      completionCriteria: ["Read app/layout.tsx", "Read existing page files", "Read CSS/design system files", "Read existing component files"],
    },
    {
      title: "Identify affected files and create implementation plan",
      goal: "Determine exactly which files need to be created or modified based on the feature requirements and existing patterns.",
      expectedOutput: "List of files to create (new components, pages) and files to modify (layout, navigation, types).",
      suggestedTools: ["filesystem"],
      dependencies: ["Analyze existing codebase patterns"],
      completionCriteria: ["All required new files identified", "All existing files to modify identified", "Dependencies between files documented"],
    },
    {
      title: "Create new routes and pages",
      goal: "Create new Next.js App Router pages (e.g., app/notes/page.tsx) following existing routing patterns.",
      expectedOutput: "New page file(s) with proper imports and initial structure matching existing conventions.",
      suggestedTools: ["filesystem"],
      dependencies: ["Identify affected files and create implementation plan"],
      completionCriteria: ["New route directory created", "Page component exported as default", "Page follows existing layout patterns"],
    },
    {
      title: "Create reusable components",
      goal: "Build reusable UI components (e.g., NoteCard, NotesList) in components/ directory following existing component patterns.",
      expectedOutput: "Component files with props interface, styling using design system CSS tokens, and proper exports.",
      suggestedTools: ["filesystem"],
      dependencies: ["Create new routes and pages"],
      completionCriteria: ["Components accept typed props", "Components use workspace.css design tokens", "Components handle loading/empty states", "Components are exported for reuse"],
    },
    {
      title: "Implement search and input features",
      goal: "Add interactive features like search bars, filters, modals or inline editors using React state management.",
      expectedOutput: "Search/filter logic wired to component state, input handlers, and data flow for creating/editing items.",
      suggestedTools: ["filesystem"],
      dependencies: ["Create reusable components"],
      completionCriteria: ["Search/filter updates on input", "New item creation works", "State management is consistent"],
    },
    {
      title: "Update navigation and global layout",
      goal: "Add navigation links in the root layout so the new page is accessible from anywhere in the app.",
      expectedOutput: "Updated layout file with nav links styled using design system tokens.",
      suggestedTools: ["filesystem"],
      dependencies: ["Create new routes and pages"],
      completionCriteria: ["Nav link added to new page", "Navigation style matches design system", "All existing links still work"],
    },
    {
      title: "Update shared types and data structures",
      goal: "Create or update type definitions and mock data for the new feature in types/ or lib/.",
      expectedOutput: "TypeScript interfaces for the new data model and mock data for development.",
      suggestedTools: ["filesystem"],
      dependencies: ["Create reusable components"],
      completionCriteria: ["Types defined and exported", "Mock data created if applicable", "Types used by components"],
    },
    {
      title: "Run type checking and fix errors",
      goal: "Run npx tsc --noEmit to check for TypeScript errors and fix any that arise.",
      expectedOutput: "Clean type check output with zero errors.",
      suggestedTools: ["terminal"],
      dependencies: ["Update shared types and data structures", "Update navigation and global layout"],
      completionCriteria: ["npx tsc --noEmit passes", "All type errors resolved"],
    },
    {
      title: "Run production build and verify",
      goal: "Run npx next build to verify the project compiles without errors in production mode.",
      expectedOutput: "Successful build output with no errors.",
      suggestedTools: ["terminal"],
      dependencies: ["Run type checking and fix errors"],
      completionCriteria: ["npx next build succeeds", "No build warnings about new code"],
    },
  ];
}

export async function runPlanner(context: AgentContext, provider: AIProvider): Promise<AgentResult> {
  const system = `You are AfterYou's PlannerAgent. You decompose missions into concrete, ordered subtasks.

CRITICAL RULES:
1. NEVER produce a plan with a single "Implementation" task — that is forbidden
2. Break work into the smallest logical units — each task should do ONE thing
3. Every task must be independently executable by a coding agent
4. Tasks must be ordered by dependencies (prerequisites first)
5. Include analysis/planning tasks before coding tasks
6. Include verification tasks after coding tasks
7. Be specific about files, components, and features to create
8. Minimum 6 tasks for any feature request, minimum 3 for simple tasks`;

  const prompt = `Mission goal: ${context.goal}
${context.description ? `Context: ${context.description}` : ""}

Decompose this mission into concrete subtasks. Each subtask must produce a specific, verifiable output.

Return your plan as structured JSON in this exact format (no markdown, no explanation outside JSON):

{
  "summary": "one-line summary of the plan",
  "tasks": [
    {
      "title": "Short task name (e.g., Create NoteCard component)",
      "goal": "What this task accomplishes and why it matters",
      "expectedOutput": "Verifiable output this task produces",
      "suggestedTools": ["filesystem"],
      "dependencies": ["Exact title of prerequisite task"],
      "completionCriteria": ["Criterion 1", "Criterion 2"]
    }
  ]
}

For a feature like "add a notes page to an existing app", a good decomposition would be:
1. Analyze existing codebase structure and patterns
2. Identify files that need to be created or modified
3. Create the new route/page file
4. Build reusable UI components
5. Wire up search/filter and create/edit interactions
6. Update navigation to link to the new page
7. Add or update TypeScript types for the feature
8. Run type checking
9. Run production build
10. Report what was built and suggest next steps

IMPORTANT: Return ONLY valid JSON. No markdown formatting, no explanation, no preamble.`;

  const response = await provider.generate({
    system,
    prompt,
    messages: [],
    tools: [],
    temperature: 0.2,
    maxTokens: 4096,
  });

  let tasks: PlannerTask[] = [];
  try {
    const clean = extractJson(response.text);
    const parsed = JSON.parse(clean) as PlannerPlan;
    tasks = parsed.tasks ?? [];
  } catch {
    // parsing failed, use fallback
  }

  if (tasks.length < 2) {
    const featureTasks = buildFeatureTasks(context.goal);
    if (featureTasks.length >= 2) {
      tasks = featureTasks;
    } else {
      tasks = [
        {
          title: "Analyze requirements and existing code",
          goal: context.goal,
          expectedOutput: "Understanding of what needs to be built",
          suggestedTools: ["filesystem"],
          dependencies: [],
          completionCriteria: ["Requirements analyzed"],
        },
        {
          title: "Implement the solution",
          goal: `Implement: ${context.goal}`,
          expectedOutput: "Working implementation",
          suggestedTools: ["filesystem", "terminal"],
          dependencies: ["Analyze requirements and existing code"],
          completionCriteria: ["Implementation complete", "Build passes"],
        },
        {
          title: "Verify and finalize",
          goal: `Verify the implementation of: ${context.goal}`,
          expectedOutput: "Verified working solution",
          suggestedTools: ["terminal"],
          dependencies: ["Implement the solution"],
          completionCriteria: ["Verification passed"],
        },
      ];
    }
  }

  return {
    summary: `Plan created with ${tasks.length} tasks`,
    content: JSON.stringify({ tasks }, null, 2),
    artifacts: [{ name: "plan.json", kind: "file" }],
  };
}

export function createFallbackPlan(goal: string): AgentResult {
  const tasks = buildFeatureTasks(goal);
  if (tasks.length >= 2) {
    return {
      summary: `Plan with ${tasks.length} tasks`,
      content: JSON.stringify({ tasks }, null, 2),
      artifacts: [{ name: "plan.json", kind: "file" }],
    };
  }

  const fallbackTasks: PlannerTask[] = [
    {
      title: "Analyze requirements",
      goal,
      expectedOutput: "Clear understanding of deliverables",
      suggestedTools: ["filesystem"],
      dependencies: [],
      completionCriteria: ["Requirements understood"],
    },
    {
      title: "Set up project structure",
      goal: `Create file structure for: ${goal}`,
      expectedOutput: "Project files organized",
      suggestedTools: ["filesystem"],
      dependencies: ["Analyze requirements"],
      completionCriteria: ["Structure created"],
    },
    {
      title: "Implement core logic",
      goal: `Implement core functionality for: ${goal}`,
      expectedOutput: "Working implementation",
      suggestedTools: ["filesystem", "terminal"],
      dependencies: ["Set up project structure"],
      completionCriteria: ["Core implementation done"],
    },
    {
      title: "Run build verification",
      goal: `Verify build succeeds for: ${goal}`,
      expectedOutput: "Successful build output",
      suggestedTools: ["terminal"],
      dependencies: ["Implement core logic"],
      completionCriteria: ["Build succeeds"],
    },
  ];

  return {
    summary: `Fallback plan with ${fallbackTasks.length} tasks`,
    content: JSON.stringify({ tasks: fallbackTasks }, null, 2),
    artifacts: [{ name: "plan.json", kind: "file" }],
  };
}
