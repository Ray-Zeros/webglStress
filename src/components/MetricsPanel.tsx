import React from 'react';
import { MetricsSnapshot, GpuDeviceInfo } from '../types/benchmark';
import { FrameTimeSparkline } from './FrameTimeSparkline';
import { RotateCcw, Play, Square, Cpu, Zap, Activity } from 'lucide-react';

interface MetricsPanelProps {
  metrics: MetricsSnapshot;
  deviceInfo: GpuDeviceInfo;
  isBenchmarking: boolean;
  benchmarkProgress: number;
  benchmarkCountdown: number;
  onResetMetrics: () => void;
  onStartBenchmark: () => void;
  onStopBenchmark: () => void;
  onOpenGpuInfo: () => void;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  deviceInfo,
  isBenchmarking,
  benchmarkProgress,
  benchmarkCountdown,
  onResetMetrics,
  onStartBenchmark,
  onStopBenchmark,
  onOpenGpuInfo,
}) => {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#090d16] p-3.5 sm:p-4 shadow-2xl text-slate-100 max-w-sm sm:max-w-md w-full"
      style={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#f8fafc' }}
    >
      {/* Top Device Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5" style={{ borderColor: '#1e293b' }}>
        <button
          onClick={onOpenGpuInfo}
          className="flex items-center gap-2 group text-left hover:opacity-90 transition max-w-[70%]"
          title="Click to view full GPU hardware specs"
        >
          <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 group-hover:bg-cyan-900 transition" style={{ backgroundColor: '#082f49', borderColor: '#0369a1', color: '#22d3ee' }}>
            <Cpu className="w-4 h-4" size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-white uppercase">
                {deviceInfo.api}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                {metrics.totalBytesPerPixel} B/px
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px]" title={deviceInfo.renderer}>
              {deviceInfo.renderer}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onResetMetrics}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-medium text-slate-300 hover:text-white border border-slate-800 transition"
            style={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#cbd5e1' }}
            title="Reset 10-second rolling metrics"
          >
            <RotateCcw className="w-3.5 h-3.5" size={14} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {isBenchmarking ? (
            <button
              onClick={onStopBenchmark}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white shadow-lg transition animate-pulse"
              style={{ backgroundColor: '#e11d48', color: '#ffffff' }}
            >
              <Square className="w-3.5 h-3.5 fill-current" size={14} />
              <span>{benchmarkCountdown}s</span>
            </button>
          ) : (
            <button
              onClick={onStartBenchmark}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-[11px] font-bold text-white shadow-lg shadow-cyan-900/40 transition"
              style={{ backgroundColor: '#0891b2', color: '#ffffff' }}
              title="Run a standardized 10-second stress benchmark and get report"
            >
              <Play className="w-3.5 h-3.5 fill-current" size={14} />
              <span>10s Test</span>
            </button>
          )}
        </div>
      </div>

      {/* Benchmark Progress Bar */}
      {isBenchmarking && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-cyan-300">
            <span>STRESS BENCHMARK IN PROGRESS...</span>
            <span>{Math.round(benchmarkProgress)}% ({benchmarkCountdown}s left)</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-150"
              style={{ width: `${benchmarkProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Primary KPI Metrics: FPS / 10s Avg / 1% Low */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-2 sm:p-2.5" style={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Real-time
            </span>
            <Activity className="w-3 h-3 text-cyan-400" size={14} style={{ color: '#22d3ee' }} />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5" style={{ color: '#ffffff' }}>
            {metrics.instantFps.toFixed(0)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono" style={{ color: '#94a3b8' }}>
            {metrics.instantFps > 0 ? (1000 / metrics.instantFps).toFixed(1) : 0} ms
          </div>
        </div>

        <div className="rounded-xl border border-cyan-800 bg-[#0c1f38] p-2 sm:p-2.5" style={{ backgroundColor: '#0c1f38', borderColor: '#0369a1' }}>
          <div className="text-[10px] font-medium text-cyan-300 uppercase tracking-wider" style={{ color: '#67e8f9' }}>
            10s Avg FPS
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-400 mt-0.5" style={{ color: '#22d3ee' }}>
            {metrics.windowAvgFps.toFixed(1)}
          </div>
          <div className="text-[10px] text-cyan-300/80 font-mono" style={{ color: '#67e8f9' }}>
            {metrics.windowAvgFrameTime.toFixed(1)} ms avg
          </div>
        </div>

        <div className="rounded-xl border border-amber-800 bg-[#2b1f0c] p-2 sm:p-2.5" style={{ backgroundColor: '#2b1f0c', borderColor: '#78350f' }}>
          <div className="text-[10px] font-medium text-amber-300 uppercase tracking-wider" style={{ color: '#fcd34d' }}>
            1% Low FPS
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-0.5" style={{ color: '#fbbf24' }}>
            {metrics.onePercentLowFps.toFixed(1)}
          </div>
          <div className="text-[10px] text-amber-300/80 font-mono" style={{ color: '#fcd34d' }}>
            P99: {metrics.p99FrameTime.toFixed(1)} ms
          </div>
        </div>
      </div>

      {/* Theoretical Bandwidth & Throughput Card */}
      <div className="rounded-xl border border-emerald-900 bg-[#06241a] p-2.5 sm:p-3 flex items-center justify-between" style={{ backgroundColor: '#06241a', borderColor: '#065f46' }}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider" style={{ color: '#34d399' }}>
            <Zap className="w-3.5 h-3.5" size={14} />
            <span>Theoretical Write Bandwidth</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-300" style={{ color: '#6ee7b7' }}>
              {metrics.theoreticalBandwidthGBps.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-emerald-400/80" style={{ color: '#34d399' }}>GB/s</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono font-bold text-slate-200">
            {metrics.mbPerFrame.toFixed(1)} MB
          </div>
          <div className="text-[10px] text-slate-400">per frame buffer</div>
        </div>
      </div>

      {/* Sparkline Frame Time Stability Chart */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-300">Frame Latency Trend (120f)</span>
          <span className="font-mono text-[10px] text-slate-400">
            Stability: <strong className="text-cyan-300">{metrics.frameTimeStability}%</strong>
          </span>
        </div>
        <div className="w-full flex justify-center">
          <FrameTimeSparkline
            frameTimes={metrics.recentFrameTimes}
            avgMs={metrics.windowAvgFrameTime}
            p99Ms={metrics.p99FrameTime}
            width={340}
            height={52}
          />
        </div>
      </div>
    </div>
  );
};
