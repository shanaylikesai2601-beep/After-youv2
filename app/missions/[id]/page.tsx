import { MissionWorkspace } from "@/components/missions/mission-workspace";

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  return <MissionWorkspace missionId={(await params).id} />;
}
