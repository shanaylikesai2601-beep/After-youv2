import path from "node:path";

export function resolveSafePath(root: string, candidate: string): string {
  const rootPath = path.resolve(root);
  const target = path.resolve(rootPath, candidate);
  if (target !== rootPath && !target.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error("Tool path escapes its allowed workspace");
  }
  return target;
}

export function relativeArtifactPath(workspaceRoot: string, absolutePath: string): string {
  return path.relative(workspaceRoot, absolutePath);
}
