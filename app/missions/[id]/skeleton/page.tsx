import { MissionSkeleton } from "@/components/missions/mission-skeleton";

export const dynamic = "force-dynamic";

export default async function SkeletonPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  return <MissionSkeleton missionId={(await params).id} />;
}
