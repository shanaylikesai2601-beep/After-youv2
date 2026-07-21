import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const runtime = "nodejs";
const execFileAsync = promisify(execFile);

/** Opens the OS folder dialog only for the local desktop host. */
export async function POST(): Promise<Response> {
  if (process.platform !== "darwin") return Response.json({ error: "Native folder selection is unavailable in this environment." }, { status: 501 });
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", "POSIX path of (choose folder with prompt \"Choose a project workspace\")"]);
    const workspacePath = stdout.trim();
    if (!workspacePath) return Response.json({ error: "No folder was selected." }, { status: 400 });
    return Response.json({ data: { workspacePath } });
  } catch {
    return Response.json({ error: "Folder selection was cancelled." }, { status: 400 });
  }
}
