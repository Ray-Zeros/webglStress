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
  const [mobileTab, setMobileTab] = useState<'metrics' | 'controls'>('metrics');
  const [showControlsDesktop, setShowControlsDesktop] = useState(true);
  const [showMetricsDesktop, setShowMetricsDesktop] = useState(true);

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between overflow-hidden p-2 sm:p-4 select-none font-sans pointer-events-none">
      {/* Context Lost Alert */}
      {isContextLost && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="max-w-md rounded-2xl border border-rose-500 bg-[#090d16] p-6 text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mb-4">
              <span className="font-bold text-xl">!</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">GPU Context Lost</h2>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              The graphics driver or operating system terminated the GPU context (common during extreme
              memory bandwidth stress, VRAM exhaustion, or driver resets).
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition shadow-lg"
            >
              Reload Benchmark
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Quick Status Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-auto" style={{ pointerEvents: 'auto' }}>
        {/* Title & Badges */}
        <div
          className="flex items-center justify-between sm:justify-start gap-2.5 rounded-2xl border border-slate-800 bg-[#090d16] px-3 sm:px-4 py-2 shadow-xl text-slate-100"
          style={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#f8fafc' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22d3ee' }} />
            <span className="font-black tracking-wide text-xs sm:text-sm uppercase text-cyan-300" style={{ color: '#67e8f9', fontWeight: 'bold' }}>
              GPU Bandwidth Bench
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" style={{ height: '16px', width: '1px', backgroundColor: '#334155' }} />

          {/* Pill status */}
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <span
              className="px-2 py-0.5 rounded-full font-bold uppercase border"
              style={{
                backgroundColor: config.api === 'webgpu' ? '#1e1b4b' : config.api === 'webgl2' ? '#082f49' : '#2e1065',
                color: config.api === 'webgpu' ? '#a5b4fc' : config.api === 'webgl2' ? '#7dd3fc' : '#d8b4fe',
                borderColor: config.api === 'webgpu' ? '#4338ca' : config.api === 'webgl2' ? '#0369a1' : '#7e22ce',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '10px',
              }}
            >
              {config.api}
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 hidden md:inline" style={{ backgroundColor: '#1e293b', color: '#cbd5e1', padding: '2px 6px', borderRadius: '9999px', fontSize: '10px' }}>
              {config.mrtCount} MRT ({metrics.totalBytesPerPixel}B/px)
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300" style={{ backgroundColor: '#1e293b', color: '#cbd5e1', padding: '2px 6px', borderRadius: '9999px', fontSize: '10px' }}>
              {activeWidth}×{activeHeight}
            </span>
          </div>
        </div>

        {/* HUD Controls & Mobile Tabs */}
        <div
          className="flex items-center justify-between sm:justify-end gap-1.5 rounded-2xl border border-slate-800 bg-[#090d16] p-1.5 shadow-xl text-slate-300"
          style={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#cbd5e1' }}
        >
          {/* Mobile Tab Switcher */}
          <div className="flex sm:hidden items-center rounded-xl bg-black border border-slate-800 p-0.5" style={{ backgroundColor: '#000000', borderColor: '#1e293b' }}>
            <button
              onClick={() => setMobileTab('metrics')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                mobileTab === 'metrics'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={{ backgroundColor: mobileTab === 'metrics' ? '#0891b2' : 'transparent', color: mobileTab === 'metrics' ? '#ffffff' : '#94a3b8' }}
            >
              <Activity className="w-3.5 h-3.5" size={14} />
              <span>Stats</span>
            </button>
            <button
              onClick={() => setMobileTab('controls')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                mobileTab === 'controls'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={{ backgroundColor: mobileTab === 'controls' ? '#0891b2' : 'transparent', color: mobileTab === 'controls' ? '#ffffff' : '#94a3b8' }}
            >
              <Sliders className="w-3.5 h-3.5" size={14} />
              <span>Config</span>
            </button>
          </div>

          {/* Toggle HUD visibility */}
          <button
            onClick={() => setHudVisible(!hudVisible)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              hudVisible
                ? 'bg-slate-800 text-white'
                : 'bg-cyan-600 text-white shadow-lg'
            }`}
            style={{ backgroundColor: hudVisible ? '#1e293b' : '#0891b2', color: '#ffffff' }}
            title="Toggle All HUD Panels (Clean View)"
          >
            {hudVisible ? <EyeOff className="w-3.5 h-3.5" size={14} /> : <Eye className="w-3.5 h-3.5" size={14} />}
            <span className="hidden sm:inline">{hudVisible ? 'Hide HUD' : 'Show HUD'}</span>
          </button>

          {/* Desktop panel toggles */}
          {hudVisible && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => setShowMetricsDesktop(!showMetricsDesktop)}
                className={`p-2 rounded-xl text-xs transition ${
                  showMetricsDesktop
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={{ backgroundColor: showMetricsDesktop ? '#082f49' : 'transparent', color: showMetricsDesktop ? '#7dd3fc' : '#94a3b8' }}
                title="Toggle Telemetry Gauges"
              >
                <Activity className="w-4 h-4" size={16} />
              </button>

              <button
                onClick={() => setShowControlsDesktop(!showControlsDesktop)}
                className={`p-2 rounded-xl text-xs transition ${
                  showControlsDesktop
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={{ backgroundColor: showControlsDesktop ? '#082f49' : 'transparent', color: showControlsDesktop ? '#7dd3fc' : '#94a3b8' }}
                title="Toggle Configuration Controls"
              >
                <Sliders className="w-4 h-4" size={16} />
              </button>
            </div>
          )}

          <button
            onClick={onOpenGpuInfo}
            className="p-1.5 sm:p-2 rounded-xl text-xs text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
            style={{ color: '#94a3b8' }}
            title="Hardware Device Info"
          >
            <Info className="w-4 h-4" size={16} />
          </button>

          <button
            onClick={onToggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
            style={{ color: '#94a3b8' }}
            title="Fullscreen Toggle"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" size={16} /> : <Maximize2 className="w-4 h-4" size={16} />}
          </button>
        </div>
      </div>

      {/* Split-Screen 4-way Overlay Labels */}
      {config.previewTarget === 'split' && (
        <div className="pointer-events-none absolute inset-0 z-0 flex flex-col justify-between p-4 sm:p-8 font-mono text-[10px] sm:text-[11px] font-bold">
          <div className="flex justify-between">
            <span className="px-2 py-1 rounded bg-black/85 text-cyan-300 border border-cyan-800">
              T0: ALBEDO ({config.formats[0]})
            </span>
            <span className="px-2 py-1 rounded bg-black/85 text-emerald-300 border border-emerald-800">
              {config.mrtCount >= 2 ? `T1: NORMALS (${config.formats[1]})` : 'T1: OFF'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="px-2 py-1 rounded bg-black/85 text-amber-300 border border-amber-800">
              {config.mrtCount >= 3 ? `T2: MATERIAL (${config.formats[2]})` : 'T2: OFF'}
            </span>
            <span className="px-2 py-1 rounded bg-black/85 text-purple-300 border border-purple-800">
              {config.mrtCount >= 4 ? `T3: EMISSIVE (${config.formats[3]})` : 'T3: OFF'}
            </span>
          </div>
        </div>
      )}

      {/* Main Panels Body */}
      {hudVisible && (
        <div className="flex-1 flex flex-col md:flex-row items-center md:items-start justify-between gap-3 mt-2 mb-2 overflow-y-auto touch-scroll pointer-events-auto">
          {/* Mobile View: Switches between Metrics and Controls */}
          <div className="md:hidden w-full flex justify-center">
            {mobileTab === 'metrics' ? (
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
            ) : (
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
            )}
          </div>

          {/* Desktop View: Shows both side-by-side */}
          <div className="hidden md:flex w-full justify-between items-start gap-4">
            {showMetricsDesktop ? (
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
            ) : (
              <div />
            )}

            {showControlsDesktop ? (
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
            ) : (
              <div />
            )}
          </div>
        </div>
      )}

      {/* Bottom Sub-status Bar */}
      <div
        className="pointer-events-auto flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-400 bg-[#090d16] border border-slate-800 rounded-xl px-3 py-1.5 max-w-xl mx-auto w-full"
        style={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#94a3b8', pointerEvents: 'auto' }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399' }} />
          <span>Rendering</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span>ALU: <strong className="text-slate-200 uppercase" style={{ color: '#e2e8f0' }}>{config.aluComplexity}</strong></span>
          <span>Passes: <strong className="text-slate-200" style={{ color: '#e2e8f0' }}>{config.passes}x</strong></span>
          <span className="hidden sm:inline">Preview: <strong className="text-slate-200 uppercase" style={{ color: '#e2e8f0' }}>{config.previewTarget}</strong></span>
        </div>
        <div>
          <span><strong className="text-emerald-400 font-bold" style={{ color: '#34d399' }}>{metrics.theoreticalBandwidthGBps.toFixed(2)} GB/s</strong></span>
        </div>
      </div>
    </div>
  );
};
