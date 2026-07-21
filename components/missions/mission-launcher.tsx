import Link from "next/link";

export function MissionLauncher(): React.ReactElement {
  return <Link className="button primary" href="/missions/new">Assign mission</Link>;
}
