import { jsonError } from "@/lib/http";
import { missionIdSchema } from "@/lib/mission-validation";
import { getMissionService } from "@/server/mission-container";

export const runtime = "nodejs";
export async function GET(_: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const id = missionIdSchema.parse((await context.params).id);
    const mission = await (await getMissionService()).get(id);
    return new Response(JSON.stringify(mission, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${id}-diagnostics.json"` } });
  } catch (error) { return jsonError(error); }
}
