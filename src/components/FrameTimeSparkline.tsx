import React, { useEffect, useRef } from 'react';

interface FrameTimeSparklineProps {
  frameTimes: number[];
  avgMs: number;
  p99Ms: number;
  width?: number;
  height?: number;
}

export const FrameTimeSparkline: React.FC<FrameTimeSparklineProps> = ({
  frameTimes,
  avgMs,
  p99Ms,
  width = 280,
  height = 56,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(0, 0, width, height);

    // Guide lines: 16.6ms (60fps) and 33.3ms (30fps)
    // Scale: y=0 is max(50ms, max(frameTimes) * 1.1), y=height is 0ms
    const maxVal = Math.max(35, ...frameTimes, p99Ms * 1.2);
    const getY = (val: number) => height - (val / maxVal) * (height - 6) - 3;

    // 16.67ms target line
    const y60 = getY(16.67);
    if (y60 >= 0 && y60 <= height) {
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)'; // green-500
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y60);
      ctx.lineTo(width, y60);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
      ctx.font = '9px monospace';
      ctx.fillText('16.6ms', 4, y60 - 2);
    }

    // 33.33ms target line
    const y30 = getY(33.33);
    if (y30 >= 0 && y30 <= height) {
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)'; // yellow-500
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y30);
      ctx.lineTo(width, y30);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (frameTimes.length > 1) {
      const step = width / (frameTimes.length - 1);

      // Area fill
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < frameTimes.length; i++) {
        const x = i * step;
        const y = getY(frameTimes[i]);
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.25)'); // sky blue
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Line path
      ctx.beginPath();
      for (let i = 0; i < frameTimes.length; i++) {
        const x = i * step;
        const y = getY(frameTimes[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Highlight latest point
      const lastX = width;
      const lastY = getY(frameTimes[frameTimes.length - 1]);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(lastX - 2, lastY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [frameTimes, avgMs, p99Ms, width, height]);

  return (
    <div className="relative inline-block overflow-hidden rounded border border-slate-700/60 bg-slate-900/80">
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="block"
      />
      <div className="pointer-events-none absolute bottom-1 right-2 flex items-center gap-2 font-mono text-[10px] text-slate-400">
        <span>avg: {avgMs.toFixed(1)}ms</span>
        <span className={p99Ms > 33.3 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
          p99: {p99Ms.toFixed(1)}ms
        </span>
      </div>
    </div>
  );
};
