import { RefineFlow } from "@/components/refine/refine-flow";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RefinePage({ params }: PageProps) {
  const { id } = await params;
  return <RefineFlow missionId={id} />;
}
