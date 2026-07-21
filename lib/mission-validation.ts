import { z } from "zod";

import { MISSION_STATUSES } from "@/types/mission";

const nonEmptyText = z.string().trim().min(1).max(10_000);
const workspaceSchema = z.object({ workspaceName: z.string().trim().min(1).max(240), workspacePath: z.string().trim().min(1).max(4096), indexedAt: z.string().datetime(), fileCount: z.number().int().nonnegative().optional(), directoryTree: z.array(z.string().max(1024)).max(2000).optional(), extensions: z.array(z.string().max(100)).max(500).optional() });

export const createMissionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: nonEmptyText,
  goal: nonEmptyText,
  estimatedDuration: z.number().int().positive().max(43_200).optional(),
  workspace: workspaceSchema.optional(),
  nextObjectives: z.array(nonEmptyText).max(3).optional(),
  plan: z.array(z.object({
    id: z.string().regex(/^stage-[1-4]$/),
    title: z.string().trim().min(1).max(160),
    objective: nonEmptyText,
    explanation: nonEmptyText,
    complexity: z.enum(["low", "medium", "high"]),
    estimatedDuration: z.number().int().positive().max(43_200),
    dependencies: z.array(z.string().regex(/^stage-[1-4]$/)).max(4),
  })).max(4).optional(),
  previewOnly: z.boolean().optional(),
}).superRefine((value, context) => {
  if (!value.plan) return;
  const ids = new Set<string>();
  for (const [index, stage] of value.plan.entries()) {
    if (ids.has(stage.id)) context.addIssue({ code: "custom", path: ["plan", index, "id"], message: "Stage IDs must be unique." });
    ids.add(stage.id);
    if (new Set(stage.dependencies).size !== stage.dependencies.length) context.addIssue({ code: "custom", path: ["plan", index, "dependencies"], message: "Dependencies must be unique." });
    for (const dependency of stage.dependencies) {
      if (!ids.has(dependency)) context.addIssue({ code: "custom", path: ["plan", index, "dependencies"], message: "Stages may only depend on an earlier stage." });
    }
  }
  const objectives = value.plan.map((stage) => stage.objective.trim().toLowerCase());
  if (new Set(objectives).size !== objectives.length) context.addIssue({ code: "custom", path: ["plan"], message: "Stages must have distinct objectives." });
});
export const suggestPlanSchema = z.object({ goal: nonEmptyText });

export const refineSchema = z.object({
  goal: nonEmptyText,
  round: z.number().int().min(1).max(3),
  missionId: z.string().optional(),
  previousSelections: z.array(z.string()).max(3).optional(),
  workspacePath: z.string().optional(),
});

export const updateMissionSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: nonEmptyText.optional(),
    goal: nonEmptyText.optional(),
    status: z.enum(MISSION_STATUSES).optional(),
    estimatedDuration: z.number().int().positive().max(43_200).optional(),
    progress: z.number().int().min(0).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export const missionIdSchema = z.string().regex(/^mission_[\w-]+$/, "Invalid mission ID.");
