import { MissionOutputPage } from "@/components/missions/mission-output-page";

export default async function MissionOutputRoute({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  return <MissionOutputPage missionId={(await params).id} />;
}
