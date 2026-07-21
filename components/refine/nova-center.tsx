"use client";

export function NovaCenter({ pulse = false }: { pulse?: boolean }) {
  return (
    <div className={`nova-center${pulse ? " nova-pulse" : ""}`}>
      <div className="nova-ring nova-ring-1" />
      <div className="nova-ring nova-ring-2" />
      <div className="nova-ring nova-ring-3" />
      <div className="nova-core" />
    </div>
  );
}
