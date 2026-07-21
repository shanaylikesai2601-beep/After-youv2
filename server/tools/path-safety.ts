import path from "node:path";

export function resolveSafePath(root: string, requestedPath: string): string {
  const resolved = path.resolve(root, requestedPath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path traversal denied: ${requestedPath} resolves outside workspace`);
  }
  if (relative.split(path.sep).some((segment) => segment === "node_modules" || segment.startsWith(".git"))) {
    throw new Error(`Access denied: path contains restricted directory`);
  }
  return resolved;
}
