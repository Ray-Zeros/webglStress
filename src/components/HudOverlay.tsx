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
  Columns,
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
  // 4 clear view modes: 'controls' (default so user can immediately change resolution/API), 'metrics', 'dual', 'clean'
  const [activeView, setActiveView] = useState<'controls' | 'metrics' | 'dual' | 'clean'>('controls');

  return (
    <div
      className="absolute inset-0 z-10 select-none font-sans pointer-events-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {/* Context Lost Alert */}
      {isContextLost && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="max-w-md rounded-2xl border border-rose-500 bg-[#090d16] p-6 text-center shadow-2xl"
            style={{ backgroundColor: '#090d16', borderColor: '#f43f5e', color: '#f8fafc' }}
          >
            <div
              className="mx-auto w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mb-4"
              style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#4c0519', color: '#fb7185' }}
            >
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
              style={{ backgroundColor: '#e11d48', color: '#ffffff' }}
            >
              Reload Benchmark
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Navigation Bar */}
      <div
        className="pointer-events-auto flex items-center justify-between gap-1.5 p-2 sm:p-3"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '52px',
          pointerEvents: 'auto',
          zIndex: 20,
        }}
      >
        {/* Left Branding & Quick Specs */}
        <div
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#090d16] px-2.5 sm:px-3 py-1.5 shadow-xl text-slate-100"
          style={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#f8fafc' }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"
            style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22d3ee' }}
          />
          <span
            className="font-bold text-xs uppercase"
            style={{ color: '#67e8f9', fontWeight: 'bold' }}
          >
            GPU Bench
          </span>

          {/* API badge */}
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border"
            style={{
              backgroundColor: config.api === 'webgpu' ? '#1e1b4b' : config.api === 'webgl2' ? '#082f49' : '#2e1065',
              color: config.api === 'webgpu' ? '#a5b4fc' : config.api === 'webgl2' ? '#7dd3fc' : '#d8b4fe',
              borderColor: config.api === 'webgpu' ? '#4338ca' : config.api === 'webgl2' ? '#0369a1' : '#7e22ce',
              fontSize: '10px',
            }}
          >
            {config.api}
          </span>

          <button
            onClick={() => setActiveView('controls')}
            className="text-[10px] font-mono text-cyan-300 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 transition cursor-pointer"
            style={{ color: '#67e8f9', fontSize: '10px' }}
            title="点击修改分辨率 (Click to change resolution)"
          >
            {activeWidth}×{activeHeight}
          </button>
        </div>

        {/* Center / Right Mode Switcher Tabs */}
        <div
          className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#090d16] p-1 shadow-xl text-slate-300"
          style={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#cbd5e1' }}
        >
          {/* Controls Tab */}
          <button
            onClick={() => setActiveView(activeView === 'controls' ? 'clean' : 'controls')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeView === 'controls'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={{
              backgroundColor: activeView === 'controls' ? '#0891b2' : 'transparent',
              color: activeView === 'controls' ? '#ffffff' : '#94a3b8',
              fontSize: '11px',
              fontWeight: activeView === 'controls' ? 'bold' : 'normal',
            }}
            title="Open Resolution, MRT & Rendering Settings"
          >
            <Sliders className="w-3.5 h-3.5" size={14} />
            <span>设置 Config</span>
          </button>

          {/* Metrics Tab */}
          <button
            onClick={() => setActiveView(activeView === 'metrics' ? 'clean' : 'metrics')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeView === 'metrics'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={{
              backgroundColor: activeView === 'metrics' ? '#0891b2' : 'transparent',
              color: activeView === 'metrics' ? '#ffffff' : '#94a3b8',
              fontSize: '11px',
              fontWeight: activeView === 'metrics' ? 'bold' : 'normal',
            }}
            title="Open FPS, P99 & Bandwidth Telemetry"
          >
            <Activity className="w-3.5 h-3.5" size={14} />
            <span>监控 Stats</span>
          </button>

          {/* Dual Column Tab (for wider screens) */}
          <button
            onClick={() => setActiveView(activeView === 'dual' ? 'clean' : 'dual')}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeView === 'dual'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={{
              backgroundColor: activeView === 'dual' ? '#0891b2' : 'transparent',
              color: activeView === 'dual' ? '#ffffff' : '#94a3b8',
              fontSize: '11px',
            }}
            title="Show both Metrics and Controls side-by-side"
          >
            <Columns className="w-3.5 h-3.5" size={14} />
            <span>双栏 Dual</span>
          </button>

          {/* Clean / Hide Toggle */}
          <button
            onClick={() => setActiveView(activeView === 'clean' ? 'controls' : 'clean')}
            className={`p-1.5 rounded-lg text-xs transition ${
              activeView === 'clean'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={{
              backgroundColor: activeView === 'clean' ? '#d97706' : 'transparent',
              color: activeView === 'clean' ? '#ffffff' : '#94a3b8',
            }}
            title="Hide Panels (View Fullscreen Canvas Only)"
          >
            {activeView === 'clean' ? <EyeOff className="w-3.5 h-3.5" size={14} /> : <Eye className="w-3.5 h-3.5" size={14} />}
          </button>

          {/* Hardware Info */}
          <button
            onClick={onOpenGpuInfo}
            className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
            style={{ color: '#94a3b8' }}
            title="GPU Device Diagnostics"
          >
            <Info className="w-4 h-4" size={16} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
            style={{ color: '#94a3b8' }}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" size={16} /> : <Maximize2 className="w-4 h-4" size={16} />}
          </button>
        </div>
      </div>

      {/* Split-Screen 4-way Overlay Labels (when previewTarget is split) */}
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

      {/* Primary Scrollable Content Viewport:
          Positioned precisely between top bar (54px) and bottom bar (46px).
          Has pointerEvents: 'auto', overflowY: 'auto', -webkit-overflow-scrolling: 'touch'.
          This ensures 100% native smooth scrolling on ANY touch device! */}
      {activeView !== 'clean' && (
        <div
          className="hud-scroll-viewport touch-scroll"
          style={{
            position: 'absolute',
            top: '54px',
            bottom: '46px',
            left: 0,
            right: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            pointerEvents: 'auto',
            touchAction: 'pan-y',
            padding: '6px 8px 32px 8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            zIndex: 15,
          }}
        >
          {activeView === 'controls' && (
            <div className="w-full max-w-sm sm:max-w-md flex justify-center">
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
          )}

          {activeView === 'metrics' && (
            <div className="w-full max-w-sm sm:max-w-md flex justify-center">
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
          )}

          {activeView === 'dual' && (
            <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-4 w-full max-w-4xl">
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
          )}
        </div>
      )}

      {/* Bottom Sub-status Bar (Fixed at bottom) */}
      <div
        className="pointer-events-auto flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-400 bg-[#090d16] border border-slate-800 rounded-xl px-3 py-1.5 shadow-lg"
        style={{
          position: 'absolute',
          bottom: '6px',
          left: '8px',
          right: '8px',
          maxWidth: '560px',
          margin: '0 auto',
          backgroundColor: '#090d16',
          borderColor: '#1e293b',
          color: '#94a3b8',
          pointerEvents: 'auto',
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setActiveView(activeView === 'controls' ? 'metrics' : 'controls')}
          className="flex items-center gap-1.5 hover:text-white transition"
          title="Click to toggle between Controls and Metrics"
        >
          <span
            className="w-2 h-2 rounded-full bg-emerald-400"
            style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399' }}
          />
          <span className="underline decoration-dotted font-bold text-slate-300" style={{ color: '#cbd5e1' }}>
            {activeView === 'controls' ? '切换监控 ➔' : '切换设置 ➔'}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span>ALU: <strong className="text-slate-200 uppercase" style={{ color: '#e2e8f0' }}>{config.aluComplexity}</strong></span>
          <span>{config.passes}x</span>
        </div>

        <div>
          <span><strong className="text-emerald-400 font-bold" style={{ color: '#34d399' }}>{metrics.theoreticalBandwidthGBps.toFixed(2)} GB/s</strong></span>
        </div>
      </div>
    </div>
  );
};
