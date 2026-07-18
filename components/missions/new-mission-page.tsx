"use client";

import { useRouter } from "next/navigation";

import { MissionCreateModal } from "@/components/missions/mission-create-modal";

export function NewMissionPage(): React.ReactElement {
  const router = useRouter();
  return <main className="content"><MissionCreateModal open onClose={() => router.push("/missions")} /></main>;
}
