"use client";

import { useEffect, useState, useRef } from "react";

interface SystemNode {
  id: string;
  label: string;
  status: "active" | "idle" | "completed";
  angle: number;
}

interface SessionVisualizationProps {
  sessionId: string;
}

export function SessionVisualization({ sessionId }: SessionVisualizationProps) {
  const [systems, setSystems] = useState<SystemNode[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const session = useSessionPoll(sessionId);

  useEffect(() => {
    const systemNames = ["Planning", "Coding", "Verification", "Review", "Memory", "Timeline", "Diagnostics", "Research"];
    const configured = systemNames.map((name, i) => ({
      id: name.toLowerCase(),
      label: name,
      status: "idle" as const,
      angle: (i / systemNames.length) * Math.PI * 2 - Math.PI / 2,
    }));
    setSystems(configured);
  }, []);

  useEffect(() => {
    if (!session) return;
    const status = session.status;
    const mission = session.missions?.[session.currentMissionIndex];
    const missionStatus = mission?.status;

    setSystems((prev) =>
      prev.map((s) => {
        if (status === "completed" || status === "failed") {
          return { ...s, status: "completed" as const };
        }
        if (status === "running") {
          if (s.id === "coding" && (missionStatus === "executing" || missionStatus === "running")) return { ...s, status: "active" as const };
          if (s.id === "planning" && missionStatus === "planning") return { ...s, status: "active" as const };
          if (s.id === "review" && missionStatus === "reviewing") return { ...s, status: "active" as const };
          if (s.id === "memory") return { ...s, status: "active" as const };
          if (s.id === "timeline") return { ...s, status: "active" as const };
          if (s.id === "diagnostics") return { ...s, status: "active" as const };
          return { ...s, status: "idle" as const };
        }
        return s;
      })
    );

    setActiveCount(systems.filter((s) => s.status === "active").length);
  }, [session]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId = 0;
    let time = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = W / 2;
      const cy = H * 0.42;
      time += 0.016;

      ctx.clearRect(0, 0, W, H);

      // Background glow
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.4);
      bgGrad.addColorStop(0, "rgba(200, 164, 107, 0.04)");
      bgGrad.addColorStop(0.5, "rgba(200, 164, 107, 0.015)");
      bgGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Expanding rings
      for (let i = 0; i < 3; i++) {
        const phase = (time * 0.3 + i * 2.1) % (Math.PI * 2);
        const size = 30 + phase * 40;
        const alpha = 0.035 - phase * 0.005;
        if (alpha > 0) {
          ctx.beginPath();
          ctx.arc(cx, cy, size, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(200, 164, 107, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Nova core
      const pulse = Math.sin(time * 0.8) * 0.15 + 1;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18 * pulse);
      coreGrad.addColorStop(0, "rgba(200, 164, 107, 0.2)");
      coreGrad.addColorStop(0.4, "rgba(200, 164, 107, 0.08)");
      coreGrad.addColorStop(0.8, "rgba(200, 164, 107, 0.03)");
      coreGrad.addColorStop(1, "rgba(200, 164, 107, 0)");
      ctx.fillStyle = coreGrad;
      ctx.fillRect(cx - 25, cy - 25, 50, 50);
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 164, 107, ${0.15 + Math.sin(time * 1.2) * 0.06})`;
      ctx.fill();

      // Draw system nodes
      const radius = Math.min(W, H) * 0.18;
      for (const node of systems) {
        const x = cx + Math.cos(node.angle) * radius;
        const y = cy + Math.sin(node.angle) * radius;

        // Connection line to center
        const connAlpha = node.status === "active" ? 0.15 + Math.sin(time * 2 + systems.indexOf(node) * 0.5) * 0.05 : 0.04;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.strokeStyle = `rgba(200, 164, 107, ${connAlpha})`;
        ctx.lineWidth = node.status === "active" ? 1.2 : 0.5;
        ctx.stroke();

        // Node glow
        if (node.status === "active") {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, 16);
          glow.addColorStop(0, "rgba(200, 164, 107, 0.12)");
          glow.addColorStop(1, "rgba(200, 164, 107, 0)");
          ctx.fillStyle = glow;
          ctx.fillRect(x - 16, y - 16, 32, 32);
        }

        // Node dot
        const dotSize = node.status === "active" ? 3 + Math.sin(time * 2.5 + systems.findIndex((s) => s.id === node.id)) * 1 : 2;
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        const dotColor = node.status === "active" ? "rgba(200, 164, 107, 0.7)" : node.status === "completed" ? "rgba(110, 217, 164, 0.5)" : "rgba(200, 164, 107, 0.2)";
        ctx.fillStyle = dotColor;
        ctx.fill();

        // Label
        ctx.fillStyle = node.status === "active" ? "rgba(240, 235, 227, 0.7)" : "rgba(240, 235, 227, 0.25)";
        ctx.font = "9px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(node.label, x, y + 14);

        // Data dots flowing on active connections
        if (node.status === "active") {
          const dotProgress = (time * 0.4 + systems.findIndex((s) => s.id === node.id) * 0.3) % 1;
          const dx = cx + (x - cx) * dotProgress;
          const dy = cy + (y - cy) * dotProgress;
          ctx.beginPath();
          ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 164, 107, ${0.3 + Math.sin(time * 3 + systems.findIndex((s) => s.id === node.id)) * 0.1})`;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    }
    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [systems]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
      }}
    />
  );
}

function useSessionPoll(sessionId: string) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const json = await res.json();
        if (mounted) setData(json.data);
      } catch { /* ignore */ }
    }
    poll();
    const interval = setInterval(poll, 2500);
    return () => { mounted = false; clearInterval(interval); };
  }, [sessionId]);
  return data;
}
