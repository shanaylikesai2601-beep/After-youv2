export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json({
    status: "ok",
    env: {
      VERCEL: !!process.env.VERCEL,
      CWD: process.cwd(),
      NODE_ENV: process.env.NODE_ENV,
    },
  });
}
