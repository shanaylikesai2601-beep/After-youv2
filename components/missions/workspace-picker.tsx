"use client";
import type { WorkspaceContextValue } from "@/components/missions/workspace-context";
export function WorkspacePicker({ onChoose }: { onChoose: (path: string) => void }): React.ReactElement { return <button type="button" onClick={() => { const path = window.prompt("Enter the absolute path to your local project folder"); if (path) onChoose(path); }}>Choose Folder</button>; }
