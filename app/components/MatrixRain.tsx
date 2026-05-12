"use client";

import { useEffect, useRef } from "react";

const CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const FONT_SIZE = 13;
const INTERVAL_MS = 45;

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drops: number[] = [];

    function init() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      const cols = Math.floor(canvas!.width / FONT_SIZE);
      drops = Array.from({ length: cols }, () =>
        Math.floor(Math.random() * -(canvas!.height / FONT_SIZE))
      );
    }

    function draw() {
      // Semi-transparent overlay creates the fade trail effect
      ctx!.fillStyle = "rgba(9, 9, 11, 0.05)";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx!.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * FONT_SIZE;
        if (y < 0) {
          drops[i]++;
          continue;
        }

        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        // Head of each stream is bright, body is dim green
        ctx!.fillStyle = "#6ee7b7";
        ctx!.fillText(char, i * FONT_SIZE, y);

        if (y > canvas!.height && Math.random() > 0.975) {
          drops[i] = Math.floor(Math.random() * -40);
        } else {
          drops[i]++;
        }
      }
    }

    init();
    window.addEventListener("resize", init);
    const timerId = setInterval(draw, INTERVAL_MS);

    return () => {
      clearInterval(timerId);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.18 }}
    />
  );
}
