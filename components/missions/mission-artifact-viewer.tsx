"use client";

import { useEffect, useState } from "react";

import type { MissionArtifact } from "@/types/mission";

interface MissionArtifactViewerProps { missionId: string; artifact: MissionArtifact; }

export function MissionArtifactViewer({ missionId, artifact }: MissionArtifactViewerProps): React.ReactElement {
  const href = artifact.url ?? `/api/artifacts/${missionId}/${artifact.id}`;
  const mimeType = artifact.mimeType ?? "";
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const isText = /text\/|json|markdown/.test(mimeType) || /\.(md|txt|json|csv)$/i.test(artifact.name);
  const [content, setContent] = useState<string>();
  useEffect(() => { if (!isText || artifact.url) return; void fetch(href).then((response) => response.ok ? response.text() : Promise.reject(new Error("Unable to preview artifact"))).then(setContent).catch(() => setContent("Preview unavailable.")); }, [href, isText, artifact.url]);
  return <><div className="file-actions"><a href={href} target={artifact.url ? "_blank" : undefined} rel="noreferrer">Preview</a><a href={`${href}${artifact.url ? "" : "?download=1"}`} download={!artifact.url}>Download</a></div>{isPdf && <div className="preview"><iframe src={href} title={artifact.name} /></div>}{isImage && <div className="preview"><img src={href} alt={artifact.name} /></div>}{isText && content && <div className="preview"><pre>{content}</pre></div>}</>;
}
