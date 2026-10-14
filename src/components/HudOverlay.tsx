import React, { useState } from 'react';
import {
  BenchmarkConfig,
  MetricsSnapshot,
  GpuDeviceInfo,
} from '../types/benchmark';
import { MetricsPanel } from './MetricsPanel';
import { ControlPanel } from './ControlPanel';
import {
  Eye,
  EyeOff,
  Sliders,
  Activity,
  Layers,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface HudOverlayProps {
  config: BenchmarkConfig;
  metrics: MetricsSnapshot;
  deviceInfo: GpuDeviceInfo;
  activeWidth: number;
  activeHeight: number;
  webgpuSupported: boolean;
  webgpuFallbackWarning: string | null;
  isBenchmarking: boolean;
  benchmarkProgress: number;
  benchmarkCountdown: number;
  isFullscreen: boolean;
  isContextLost: boolean;
  onConfigChange: (updater: (prev: BenchmarkConfig) => BenchmarkConfig) => void;
  onResetMetrics: () => void;
  onStartBenchmark: () => void;
  onStopBenchmark: () => void;
  onOpenGpuInfo: () => void;
  onToggleFullscreen: () => void;
  onDismissWarning: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  config,
  metrics,
  deviceInfo,
  activeWidth,
  activeHeight,
  webgpuSupported,
  webgpuFallbackWarning,
  isBenchmarking,
  benchmarkProgress,
  benchmarkCountdown,
  isFullscreen,
  isContextLost,
  onConfigChange,
  onResetMetrics,
  onStartBenchmark,
  onStopBenchmark,
  onOpenGpuInfo,
  onToggleFullscreen,
  onDismissWarning,
}) => {
  const [hudVisible, setHudVisible] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between overflow-hidden p-3 sm:p-5 select-none font-sans">
      {/* Context Lost Alert */}
      {isContextLost && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="max-w-md rounded-2xl border border-rose-500/50 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <span className="font-bold text-xl">!</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">GPU Context Lost</h2>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              The graphics driver or operating system terminated the GPU context (common during extreme
              memory bandwidth stress, VRAM exhaustion, or driver resets). The engine will automatically
              attempt recovery once restored.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition shadow-lg shadow-rose-600/30"
            >
              Reload Benchmark
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Fast Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        {/* App Title & Quick Badges */}
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md shadow-xl text-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
            <span className="font-black tracking-wide text-xs sm:text-sm uppercase bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              GPU MRT Bandwidth Bench
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Pill status */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span
              className={`px-2 py-0.5 rounded-full font-bold uppercase border ${
                config.api === 'webgpu'
                  ? 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60'
                  : 'bg-cyan-950/70 text-cyan-300 border-cyan-700/60'
              }`}
            >
              {config.api}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-850 text-slate-300 border border-slate-700/60 hidden md:inline">
              {config.mrtCount} MRT ({metrics.totalBytesPerPixel}B/px)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-850 text-slate-300 border border-slate-700/60 hidden md:inline">
              {activeWidth}×{activeHeight}
            </span>
          </div>
        </div>

        {/* HUD Visibility & Panels Toggle */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-1.5 backdrop-blur-md shadow-xl text-slate-300">
          <button
            onClick={() => setHudVisible(!hudVisible)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              hudVisible
                ? 'bg-slate-800 text-white'
                : 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
            }`}
            title="Toggle All HUD Panels (Clean View)"
          >
            {hudVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{hudVisible ? 'Hide HUD' : 'Show HUD'}</span>
          </button>

          {hudVisible && (
            <>
              <button
                onClick={() => setShowMetrics(!showMetrics)}
                className={`p-2 rounded-xl text-xs transition ${
                  showMetrics
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Telemetry Gauges"
              >
                <Activity className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowControls(!showControls)}
                className={`p-2 rounded-xl text-xs transition ${
                  showControls
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Configuration Controls"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={onOpenGpuInfo}
            className="p-2 rounded-xl text-xs text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
            title="Hardware Device Info"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Fullscreen Toggle"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Split-Screen 4-way Overlay Labels (when previewTarget is split) */}
      {config.previewTarget === 'split' && (
        <div className="pointer-events-none absolute inset-0 z-0 flex flex-col justify-between p-8 font-mono text-[11px] font-bold">
          <div className="flex justify-between">
            <span className="px-2 py-1 rounded bg-black/75 text-cyan-300 border border-cyan-500/30 backdrop-blur-sm">
              TARGET 0: ALBEDO / BASECOLOR ({config.formats[0]})
            </span>
            <span className="px-2 py-1 rounded bg-black/75 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
              {config.mrtCount >= 2 ? `TARGET 1: NORMALS + ROUGHNESS (${config.formats[1]})` : 'TARGET 1: INACTIVE'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="px-2 py-1 rounded bg-black/75 text-amber-300 border border-amber-500/30 backdrop-blur-sm">
              {config.mrtCount >= 3 ? `TARGET 2: MATERIAL (METALLIC/AO) (${config.formats[2]})` : 'TARGET 2: INACTIVE'}
            </span>
            <span className="px-2 py-1 rounded bg-black/75 text-purple-300 border border-purple-500/30 backdrop-blur-sm">
              {config.mrtCount >= 4 ? `TARGET 3: EMISSIVE + VELOCITY (${config.formats[3]})` : 'TARGET 3: INACTIVE'}
            </span>
          </div>
        </div>
      )}

      {/* Main Panels Body (Metrics on Top-Left/Left, Controls on Right) */}
      {hudVisible && (
        <div className="flex-1 flex flex-col md:flex-row items-end md:items-start justify-between gap-4 mt-3 mb-2 overflow-y-auto pointer-events-none">
          {/* Left Panel: Metrics & Telemetry */}
          {showMetrics ? (
            <div className="pointer-events-auto">
              <MetricsPanel
                metrics={metrics}
                deviceInfo={deviceInfo}
                isBenchmarking={isBenchmarking}
                benchmarkProgress={benchmarkProgress}
                benchmarkCountdown={benchmarkCountdown}
                onResetMetrics={onResetMetrics}
                onStartBenchmark={onStartBenchmark}
                onStopBenchmark={onStopBenchmark}
                onOpenGpuInfo={onOpenGpuInfo}
              />
            </div>
          ) : (
            <div />
          )}

          {/* Right Panel: Benchmark Controls & Formats */}
          {showControls ? (
            <div className="pointer-events-auto">
              <ControlPanel
                config={config}
                deviceInfo={deviceInfo}
                activeWidth={activeWidth}
                activeHeight={activeHeight}
                webgpuSupported={webgpuSupported}
                webgpuFallbackWarning={webgpuFallbackWarning}
                onConfigChange={onConfigChange}
                isFullscreen={isFullscreen}
                onToggleFullscreen={onToggleFullscreen}
                onDismissWarning={onDismissWarning}
              />
            </div>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Bottom Sub-status Bar */}
      <div className="pointer-events-auto flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/70 border border-slate-800/60 rounded-xl px-3 py-1.5 backdrop-blur-sm max-w-xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Status: Rendering</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>ALU: <strong className="text-slate-200 uppercase">{config.aluComplexity}</strong></span>
          <span>Passes: <strong className="text-slate-200">{config.passes}x</strong></span>
          <span>Preview: <strong className="text-slate-200 uppercase">{config.previewTarget}</strong></span>
        </div>
        <div>
          <span>Bandwidth: <strong className="text-emerald-400 font-bold">{metrics.theoreticalBandwidthGBps.toFixed(2)} GB/s</strong></span>
        </div>
      </div>
    </div>
  );
};
