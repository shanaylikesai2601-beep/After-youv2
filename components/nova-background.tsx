"use client";

import { useEffect, useRef } from "react";

export function NovaBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    let animId = 0;
    let time = 0;

    function resize() {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    resize();
    window.addEventListener("resize", resize);

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; pulseSpeed: number; pulsePhase: number;
    }> = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: 0.5 + Math.random() * 2,
        alpha: 0.05 + Math.random() * 0.12,
        pulseSpeed: 0.5 + Math.random() * 1,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    function draw() {
      const W = window.innerWidth;
      const H = window.innerHeight;

      ctx.clearRect(0, 0, W, H);
      time += 0.016;

      // ---- Radial gradient background ----
      const bgGrad = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, W * 0.5);
      bgGrad.addColorStop(0, "rgba(200, 164, 107, 0.03)");
      bgGrad.addColorStop(0.4, "rgba(200, 164, 107, 0.01)");
      bgGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ---- Expanding rings ----
      for (let i = 0; i < 3; i++) {
        const ringPhase = (time * 0.3 + i * 2.1) % (Math.PI * 2);
        const ringSize = 30 + ringPhase * 50;
        const ringAlpha = 0.04 - ringPhase * 0.006;
        if (ringAlpha > 0) {
          ctx.beginPath();
          ctx.arc(W / 2, H * 0.35, ringSize, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(200, 164, 107, ${ringAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // ---- Inner glow circle ----
      const pulse = Math.sin(time * 0.8) * 0.15 + 1;
      const coreGrad = ctx.createRadialGradient(
        W / 2, H * 0.35, 0,
        W / 2, H * 0.35, 20 * pulse
      );
      coreGrad.addColorStop(0, "rgba(200, 164, 107, 0.15)");
      coreGrad.addColorStop(0.3, "rgba(200, 164, 107, 0.08)");
      coreGrad.addColorStop(0.7, "rgba(200, 164, 107, 0.03)");
      coreGrad.addColorStop(1, "rgba(200, 164, 107, 0)");
      ctx.fillStyle = coreGrad;
      ctx.fillRect(W / 2 - 40, H * 0.35 - 40, 80, 80);

      // ---- Bright core dot ----
      const coreAlpha = 0.2 + Math.sin(time * 1.2) * 0.08;
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.35, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 164, 107, ${coreAlpha})`;
      ctx.fill();

      // ---- Glow halo ----
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.35, 4 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 164, 107, ${0.08 * pulse})`;
      ctx.fill();

      // ---- Particles ----
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        const pulseAlpha = Math.sin(time * p.pulseSpeed + p.pulsePhase) * 0.3 + 0.7;
        const currentAlpha = p.alpha * pulseAlpha;

        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 164, 107, ${currentAlpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

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
