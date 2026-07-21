import { jsonError } from "@/lib/http";
import { missionIdSchema } from "@/lib/mission-validation";
import { getMissionService } from "@/server/mission-container";
import { branchFromCheckpoint, compareCheckpoints, deleteCheckpoint, listTimeline, restoreCheckpoint } from "@/server/workspace/mission-timeline";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
async function mission(context: Context) { return (await getMissionService()).get(missionIdSchema.parse((await context.params).id)); }

export async function GET(_: Request, context: Context): Promise<Response> { try { const item = await mission(context); return Response.json({ data: await listTimeline(item.workspace?.workspacePath) }); } catch (error) { return jsonError(error); } }
export async function POST(request: Request, context: Context): Promise<Response> {
  try {
    const item = await mission(context); const body = await request.json() as { action?: string; checkpointId?: string; firstId?: string; secondId?: string; name?: string };
    const workspacePath = item.workspace?.workspacePath;
    if (body.action === "compare" && body.firstId && body.secondId) return Response.json({ data: await compareCheckpoints(workspacePath, body.firstId, body.secondId) });
    if (body.action === "restore" && body.checkpointId) return Response.json({ data: await restoreCheckpoint(workspacePath, body.checkpointId) });
    if (body.action === "branch" && body.checkpointId) return Response.json({ data: await branchFromCheckpoint(workspacePath, body.checkpointId, body.name ?? "New branch") });
    if (body.action === "delete" && body.checkpointId) { await deleteCheckpoint(workspacePath, body.checkpointId); return Response.json({ data: { deleted: true } }); }
    throw new Error("Unsupported timeline action");
  } catch (error) { return jsonError(error); }
}
