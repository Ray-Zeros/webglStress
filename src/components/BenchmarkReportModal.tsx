import React, { useState } from 'react';
import { BenchmarkReport } from '../types/benchmark';
import { Award, Copy, Check, Download, X, Gauge, Zap } from 'lucide-react';

interface BenchmarkReportModalProps {
  report: BenchmarkReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BenchmarkReportModal: React.FC<BenchmarkReportModalProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const totalGbWritten = (
    (report.metrics.theoreticalBandwidthGBps * report.durationSeconds)
  ).toFixed(2);

  const getStabilityRating = (stability: number) => {
    if (stability >= 90) return { label: 'Elite / Rock Solid', color: 'text-emerald-400' };
    if (stability >= 75) return { label: 'Good / Stable', color: 'text-cyan-400' };
    if (stability >= 55) return { label: 'Moderate Stuttering', color: 'text-amber-400' };
    return { label: 'Severe Thermal / GC Throttling', color: 'text-rose-400' };
  };

  const stabilityInfo = getStabilityRating(report.metrics.frameTimeStability);

  const handleCopyMarkdown = () => {
    const text = `### GPU MRT & Fillrate Benchmark Report
- **API**: ${report.config.api.toUpperCase()}
- **GPU Renderer**: ${report.deviceInfo.renderer}
- **Resolution**: ${report.resolution.width}x${report.resolution.height}
- **Active Targets (MRT)**: ${report.config.mrtCount} (${report.config.formats.slice(0, report.config.mrtCount).join(' + ')})
- **Bytes / Pixel**: ${report.metrics.totalBytesPerPixel} B/px
- **Overdraw Passes**: ${report.config.passes}x
- **ALU Complexity**: ${report.config.aluComplexity.toUpperCase()}
---
- **10s Avg FPS**: ${report.metrics.windowAvgFps} FPS (${report.metrics.windowAvgFrameTime} ms)
- **1% Low FPS (P99)**: ${report.metrics.onePercentLowFps} FPS (${report.metrics.p99FrameTime} ms)
- **Stability Score**: ${report.metrics.frameTimeStability}% (${stabilityInfo.label})
- **Theoretical Bandwidth**: ${report.metrics.theoreticalBandwidthGBps} GB/s (${report.metrics.mbPerFrame} MB/frame)
- **Total VRAM Written**: ${totalGbWritten} GB in ${report.durationSeconds.toFixed(1)}s
- **Timestamp**: ${report.timestamp}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `gpu-benchmark-${report.config.api}-${Date.now()}.json`);
    dlAnchor.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-cyan-800 bg-[#090d16] shadow-2xl text-slate-100 overflow-hidden">
        {/* Header Banner */}
        <div className="relative px-6 py-5 bg-[#0b1329] border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  10-Second Benchmark Results
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {report.resolution.width}×{report.resolution.height} • {report.config.mrtCount} Targets ({report.metrics.totalBytesPerPixel}B/px) • {report.config.api.toUpperCase()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Core Scores */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Main KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-cyan-500/20 bg-slate-950/60 p-3 text-center">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                10s Avg FPS
              </div>
              <div className="text-2xl font-black font-mono text-cyan-400 mt-1">
                {report.metrics.windowAvgFps}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {report.metrics.windowAvgFrameTime} ms
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-slate-950/60 p-3 text-center">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                1% Low FPS
              </div>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                {report.metrics.onePercentLowFps}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                P99: {report.metrics.p99FrameTime} ms
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-slate-950/60 p-3 text-center">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Bandwidth
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                {report.metrics.theoreticalBandwidthGBps}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                GB/s Write
              </div>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-slate-950/60 p-3 text-center">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Stability
              </div>
              <div className="text-2xl font-black font-mono text-purple-400 mt-1">
                {report.metrics.frameTimeStability}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                1% Low / Avg
              </div>
            </div>
          </div>

          {/* Assessment Banner */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">P99 Frame Latency Rating:</span>
              <span className={`text-xs font-bold font-mono ${stabilityInfo.color}`}>
                {stabilityInfo.label}
              </span>
            </div>
            <div className="text-xs text-slate-400 leading-relaxed">
              Total throughput during this 10-second run achieved{' '}
              <strong className="text-white font-mono">{totalGbWritten} Gigabytes</strong> written to GPU
              render targets ({report.metrics.mbPerFrame} MB per frame across {report.metrics.frameCount10s} frames).
            </div>
          </div>

          {/* Hardware & Config Breakdown */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
              <span className="text-slate-400">GPU Device</span>
              <span className="font-mono text-slate-200 text-right max-w-[260px] truncate">
                {report.deviceInfo.renderer}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
              <span className="text-slate-400">MRT Target Formats</span>
              <span className="font-mono text-cyan-300">
                {report.config.formats.slice(0, report.config.mrtCount).join(' + ')}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
              <span className="text-slate-400">Shader ALU Mode</span>
              <span className="font-mono text-slate-200 uppercase">
                {report.config.aluComplexity}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
              <span className="text-slate-400">Full-Screen Passes</span>
              <span className="font-mono text-slate-200">
                {report.config.passes}x Overdraw
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Min / Max Frame Time</span>
              <span className="font-mono text-slate-200">
                {report.metrics.minFrameTime} ms / {report.metrics.maxFrameTime} ms
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 px-6 py-4 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Summary'}</span>
            </button>
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition shadow-lg shadow-cyan-600/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
