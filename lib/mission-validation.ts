import { z } from "zod";

import { MISSION_STATUSES } from "@/types/mission";

const nonEmptyText = z.string().trim().min(1).max(10_000);

export const createMissionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: nonEmptyText,
  goal: nonEmptyText,
  estimatedDuration: z.number().int().positive().max(43_200).optional(),
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
