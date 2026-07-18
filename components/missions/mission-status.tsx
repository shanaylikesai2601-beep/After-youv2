import type { MissionStatus } from "@/types/mission";

export interface MissionStatusProps {
  status: MissionStatus;
}

/** A deliberately unstyled semantic primitive for the future mission workspace. */
export function MissionStatus({ status }: MissionStatusProps): React.ReactElement {
  return <span aria-label={`Mission status: ${status}`}>{status}</span>;
}
