"use client";

import { useState } from "react";

import { MissionCreateModal } from "@/components/missions/mission-create-modal";

export function MissionLauncher(): React.ReactElement {
  const [open, setOpen] = useState(false);
  return <><button className="button primary" onClick={() => setOpen(true)}>Assign mission</button><MissionCreateModal open={open} onClose={() => setOpen(false)} /></>;
}
