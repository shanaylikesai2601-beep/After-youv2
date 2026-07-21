import type { WorkspaceContextValue } from "@/components/missions/workspace-context";
export function WorkspaceCard({ workspace }: { workspace: WorkspaceContextValue }): React.ReactElement { return <section aria-label="Workspace"><strong>{workspace.workspaceName}</strong><small>{workspace.workspacePath}</small><span>Ready</span></section>; }
