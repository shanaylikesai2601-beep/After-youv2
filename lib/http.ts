import { ZodError } from "zod";

export function jsonError(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json({ error: "Validation failed", issues: error.flatten() }, { status: 400 });
  }

  if (error instanceof Error && error.message === "Mission not found") {
    return Response.json({ error: error.message }, { status: 404 });
  }

  return Response.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
}
