import { MissionOutputPage } from "@/components/missions/mission-output-page";

export const dynamic = "force-dynamic";

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const id = (await params).id;
  return <MissionOutputPage missionId={id} />;
}
