export const dynamic = "force-dynamic";

import { SessionPage } from "@/components/session/session-page";

export default async function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
  return <SessionPage sessionId={(await params).id} />;
}
