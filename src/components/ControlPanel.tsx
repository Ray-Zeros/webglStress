import React, { useState } from 'react';
import {
  BenchmarkConfig,
  GraphicsAPI,
  TextureFormatOption,
  ALUComplexity,
  ResolutionPreset,
  PreviewTarget,
  GpuDeviceInfo,
} from '../types/benchmark';
import {
  Layers,
  Monitor,
  Cpu,
  Sliders,
  AlertTriangle,
  Flame,
  Grid2X2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Settings2,
} from 'lucide-react';

interface ControlPanelProps {
  config: BenchmarkConfig;
  deviceInfo: GpuDeviceInfo;
  activeWidth: number;
  activeHeight: number;
  webgpuSupported: boolean;
  webgpuFallbackWarning: string | null;
  onConfigChange: (updater: (prev: BenchmarkConfig) => BenchmarkConfig) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onDismissWarning: () => void;
}

const TARGET_DESCRIPTIONS = [
  { name: 'Target 0', role: 'Albedo & BaseColor', short: 'Albedo' },
  { name: 'Target 1', role: 'World Normal & Roughness', short: 'Normals' },
  { name: 'Target 2', role: 'Metallic, AO & Specular', short: 'Material' },
  { name: 'Target 3', role: 'Emissive & Velocity', short: 'Emissive' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  deviceInfo,
  activeWidth,
  activeHeight,
  webgpuSupported,
  webgpuFallbackWarning,
  onConfigChange,
  isFullscreen,
  onToggleFullscreen,
  onDismissWarning,
}) => {
  // Category tabs for ultra-convenient navigation on small mobile screens
  const [filterTab, setFilterTab] = useState<'all' | 'core' | 'mrt' | 'shader'>('all');

  const setApi = (api: GraphicsAPI) => {
    onConfigChange((prev) => ({ ...prev, api }));
  };

  const setMrtCount = (mrtCount: 1 | 2 | 3 | 4) => {
    onConfigChange((prev) => ({ ...prev, mrtCount }));
  };

  const setFormat = (targetIndex: number, format: TextureFormatOption) => {
    onConfigChange((prev) => {
      const nextFormats = [...prev.formats] as [
        TextureFormatOption,
        TextureFormatOption,
        TextureFormatOption,
        TextureFormatOption
      ];
      nextFormats[targetIndex] = format;
      return { ...prev, formats: nextFormats };
    });
  };

  const setResolutionPreset = (preset: ResolutionPreset) => {
    onConfigChange((prev) => ({ ...prev, resolutionPreset: preset }));
  };

  const setCustomResolution = (width: number, height: number) => {
    onConfigChange((prev) => ({
      ...prev,
      resolutionPreset: 'custom',
      customWidth: Math.max(64, Math.min(7680, width)),
      customHeight: Math.max(64, Math.min(4320, height)),
    }));
  };

  const setAluComplexity = (aluComplexity: ALUComplexity) => {
    onConfigChange((prev) => ({ ...prev, aluComplexity }));
  };

  const setPasses = (passes: number) => {
    onConfigChange((prev) => ({ ...prev, passes }));
  };

  const setPreviewTarget = (previewTarget: PreviewTarget) => {
    onConfigChange((prev) => ({ ...prev, previewTarget }));
  };

  const togglePause = () => {
    onConfigChange((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const isFloatSupported =
    config.api === 'webgpu' ||
    ((config.api === 'webgl2' || config.api === 'webgl1') && deviceInfo.hasFloatColorBuffer);

  const maxAllowedTargets = Math.max(1, deviceInfo.maxDrawBuffers || 4);

  const showCore = filterTab === 'all' || filterTab === 'core';
  const showMrt = filterTab === 'all' || filterTab === 'mrt';
  const showShader = filterTab === 'all' || filterTab === 'shader';

  return (
    <div
      className="flex flex-col gap-3.5 rounded-2xl border border-slate-800 bg-[#090d16] p-3.5 sm:p-4 shadow-2xl text-slate-100 max-w-sm sm:max-w-md w-full"
      style={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#f8fafc' }}
    >
      {/* Fallback Warning Toast / Banner */}
      {webgpuFallbackWarning && (
        <div
          className="rounded-xl border border-amber-800 bg-[#2b1f0c] p-3 flex items-start gap-2.5"
          style={{ backgroundColor: '#2b1f0c', borderColor: '#78350f' }}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" size={16} style={{ color: '#fbbf24' }} />
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-amber-200" style={{ color: '#fde68a' }}>Hardware / API Notice</div>
            <div className="text-amber-300/90 leading-relaxed text-[11px]" style={{ color: '#fcd34d' }}>{webgpuFallbackWarning}</div>
            <button
              onClick={onDismissWarning}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-200 underline mt-0.5 cursor-pointer"
              style={{ color: '#fbbf24' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Category Filter Selector (Critical for mobile screens to jump straight to Resolution or MRT) */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold"
        style={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
      >
        <button
          onClick={() => setFilterTab('all')}
          className={`flex-1 py-1 px-1.5 rounded-lg text-center transition cursor-pointer select-none ${
            filterTab === 'all'
              ? 'bg-cyan-600 text-white font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{
            backgroundColor: filterTab === 'all' ? '#0891b2' : 'transparent',
            color: filterTab === 'all' ? '#ffffff' : '#94a3b8',
          }}
        >
          全部 All
        </button>
        <button
          onClick={() => setFilterTab('core')}
          className={`flex-1 py-1 px-1.5 rounded-lg text-center transition cursor-pointer select-none ${
            filterTab === 'core'
              ? 'bg-cyan-600 text-white font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{
            backgroundColor: filterTab === 'core' ? '#0891b2' : 'transparent',
            color: filterTab === 'core' ? '#ffffff' : '#94a3b8',
          }}
          title="API & Resolution Settings"
        >
          分辨率&API
        </button>
        <button
          onClick={() => setFilterTab('mrt')}
          className={`flex-1 py-1 px-1.5 rounded-lg text-center transition cursor-pointer select-none ${
            filterTab === 'mrt'
              ? 'bg-cyan-600 text-white font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{
            backgroundColor: filterTab === 'mrt' ? '#0891b2' : 'transparent',
            color: filterTab === 'mrt' ? '#ffffff' : '#94a3b8',
          }}
          title="MRT Target Count & Formats"
        >
          MRT 多目标
        </button>
        <button
          onClick={() => setFilterTab('shader')}
          className={`flex-1 py-1 px-1.5 rounded-lg text-center transition cursor-pointer select-none ${
            filterTab === 'shader'
              ? 'bg-cyan-600 text-white font-bold shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{
            backgroundColor: filterTab === 'shader' ? '#0891b2' : 'transparent',
            color: filterTab === 'shader' ? '#ffffff' : '#94a3b8',
          }}
          title="Shader ALU & Preview"
        >
          着色器
        </button>
      </div>

      {/* 1. Engine & API Switching */}
      {showCore && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" size={14} style={{ color: '#22d3ee' }} />
              <span>Graphics Engine API</span>
            </span>
            <span className="text-[11px] font-mono text-cyan-400 uppercase font-bold" style={{ color: '#22d3ee' }}>
              {config.api}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setApi('webgpu')}
              disabled={!webgpuSupported}
              className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 select-none ${
                config.api === 'webgpu'
                  ? 'bg-[#1e1b4b] border-indigo-500 text-indigo-300 shadow-md'
                  : !webgpuSupported
                  ? 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed opacity-60'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer'
              }`}
              style={{
                backgroundColor: config.api === 'webgpu' ? '#1e1b4b' : '#0f172a',
                borderColor: config.api === 'webgpu' ? '#6366f1' : '#1e293b',
                color: config.api === 'webgpu' ? '#c7d2fe' : !webgpuSupported ? '#475569' : '#94a3b8',
              }}
              title={!webgpuSupported ? 'WebGPU unavailable on this browser/platform' : 'Next-Gen WebGPU Engine'}
            >
              <span>WebGPU</span>
              <span className="text-[9px] font-normal opacity-80">{webgpuSupported ? 'Modern' : 'Unsupported'}</span>
            </button>

            <button
              onClick={() => setApi('webgl2')}
              className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 select-none ${
                config.api === 'webgl2'
                  ? 'bg-[#082f49] border-cyan-500 text-cyan-300 shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer'
              }`}
              style={{
                backgroundColor: config.api === 'webgl2' ? '#082f49' : '#0f172a',
                borderColor: config.api === 'webgl2' ? '#0284c7' : '#1e293b',
                color: config.api === 'webgl2' ? '#7dd3fc' : '#94a3b8',
              }}
              title="WebGL 2.0 (OpenGL ES 3.0)"
            >
              <span>WebGL 2.0</span>
              <span className="text-[9px] font-normal opacity-80">GLES 3.0</span>
            </button>

            <button
              onClick={() => setApi('webgl1')}
              className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 select-none ${
                config.api === 'webgl1'
                  ? 'bg-[#2e1065] border-purple-500 text-purple-300 shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer'
              }`}
              style={{
                backgroundColor: config.api === 'webgl1' ? '#2e1065' : '#0f172a',
                borderColor: config.api === 'webgl1' ? '#9333ea' : '#1e293b',
                color: config.api === 'webgl1' ? '#e9d5ff' : '#94a3b8',
              }}
              title="Legacy WebGL 1.0 (for older devices like Mali-T628 / Android 4.4 - 7.0 WebViews)"
            >
              <span>WebGL 1.0</span>
              <span className="text-[9px] font-normal opacity-80">Legacy Mali</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Viewport & Resolution Control (Moved up right below Engine API for immediate access!) */}
      {showCore && (
        <div className="space-y-2 border-t border-slate-800 pt-3" style={{ borderColor: '#1e293b' }}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" size={14} style={{ color: '#22d3ee' }} />
              <span>渲染分辨率 Resolution</span>
            </span>
            <span className="font-mono text-cyan-300 font-bold" style={{ color: '#67e8f9' }}>
              {activeWidth} × {activeHeight}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-xs font-mono">
            <button
              onClick={() => setResolutionPreset('480p')}
              className={`py-1.5 px-1.5 rounded-lg border transition select-none cursor-pointer ${
                config.resolutionPreset === '480p'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              style={{
                backgroundColor: config.resolutionPreset === '480p' ? '#082f49' : '#0f172a',
                borderColor: config.resolutionPreset === '480p' ? '#0284c7' : '#1e293b',
                color: config.resolutionPreset === '480p' ? '#7dd3fc' : '#94a3b8',
              }}
            >
              480p (SD)
            </button>
            <button
              onClick={() => setResolutionPreset('720p')}
              className={`py-1.5 px-1.5 rounded-lg border transition select-none cursor-pointer ${
                config.resolutionPreset === '720p'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              style={{
                backgroundColor: config.resolutionPreset === '720p' ? '#082f49' : '#0f172a',
                borderColor: config.resolutionPreset === '720p' ? '#0284c7' : '#1e293b',
                color: config.resolutionPreset === '720p' ? '#7dd3fc' : '#94a3b8',
              }}
            >
              720p (HD)
            </button>
            <button
              onClick={() => setResolutionPreset('1080p')}
              className={`py-1.5 px-1.5 rounded-lg border transition select-none cursor-pointer ${
                config.resolutionPreset === '1080p'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              style={{
                backgroundColor: config.resolutionPreset === '1080p' ? '#082f49' : '#0f172a',
                borderColor: config.resolutionPreset === '1080p' ? '#0284c7' : '#1e293b',
                color: config.resolutionPreset === '1080p' ? '#7dd3fc' : '#94a3b8',
              }}
            >
              1080p (FHD)
            </button>
            <button
              onClick={() => setResolutionPreset('1440p')}
              className={`py-1.5 px-1.5 rounded-lg border transition select-none cursor-pointer ${
                config.resolutionPreset === '1440p'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              style={{
                backgroundColor: config.resolutionPreset === '1440p' ? '#082f49' : '#0f172a',
                borderColor: config.resolutionPreset === '1440p' ? '#0284c7' : '#1e293b',
                color: config.resolutionPreset === '1440p' ? '#7dd3fc' : '#94a3b8',
              }}
            >
              1440p (2K)
            </button>
            <button
              onClick={() => setResolutionPreset('4k')}
              className={`py-1.5 px-1.5 rounded-lg border transition select-none cursor-pointer ${
                config.resolutionPreset === '4k'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              style={{
                backgroundColor: config.resolutionPreset === '4k' ? '#082f49' : '#0f172a',
                borderColor: config.resolutionPreset === '4k' ? '#0284c7' : '#1e293b',
                color: config.resolutionPreset === '4k' ? '#7dd3fc' : '#94a3b8',
              }}
            >
              2160p (4K)
            </button>
            <button
              onClick={() => setResolutionPreset('native')}
              className={`py-1.5 px-1.5 rounded-lg border transition select-none cursor-pointer ${
                config.resolutionPreset === 'native'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              style={{
                backgroundColor: config.resolutionPreset === 'native' ? '#082f49' : '#0f172a',
                borderColor: config.resolutionPreset === 'native' ? '#0284c7' : '#1e293b',
                color: config.resolutionPreset === 'native' ? '#7dd3fc' : '#94a3b8',
              }}
            >
              Native
            </button>
            <button
              onClick={() => setResolutionPreset('custom')}
              className={`py-1.5 px-1.5 rounded-lg border transition select-none cursor-pointer col-span-2 sm:col-span-1 ${
                config.resolutionPreset === 'custom'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              style={{
                backgroundColor: config.resolutionPreset === 'custom' ? '#082f49' : '#0f172a',
                borderColor: config.resolutionPreset === 'custom' ? '#0284c7' : '#1e293b',
                color: config.resolutionPreset === 'custom' ? '#7dd3fc' : '#94a3b8',
              }}
            >
              Custom 自定义
            </button>
          </div>

          {config.resolutionPreset === 'custom' && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800" style={{ borderColor: '#1e293b' }}>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-0.5">Width (px)</label>
                <input
                  type="number"
                  min={64}
                  max={7680}
                  step={32}
                  value={config.customWidth}
                  onChange={(e) => setCustomResolution(Number(e.target.value), config.customHeight)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-xs font-mono text-white"
                  style={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#ffffff' }}
                />
              </div>
              <span className="text-slate-500 mt-3 font-bold">×</span>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-0.5">Height (px)</label>
                <input
                  type="number"
                  min={64}
                  max={4320}
                  step={32}
                  value={config.customHeight}
                  onChange={(e) => setCustomResolution(config.customWidth, Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-xs font-mono text-white"
                  style={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#ffffff' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. MRT Target Count Selector */}
      {showMrt && (
        <div className="space-y-2 border-t border-slate-800 pt-3" style={{ borderColor: '#1e293b' }}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-cyan-400" size={14} style={{ color: '#22d3ee' }} />
              <span>MRT 目标数量</span>
            </span>
            <span className="font-mono text-cyan-400 font-bold" style={{ color: '#22d3ee' }}>
              {config.mrtCount} Targets (Max: {maxAllowedTargets})
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {([1, 2, 3, 4] as const).map((count) => {
              const isExceedingHardware = count > maxAllowedTargets;
              return (
                <button
                  key={count}
                  onClick={() => setMrtCount(count)}
                  className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition font-mono select-none cursor-pointer ${
                    config.mrtCount === count
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  style={{
                    backgroundColor: config.mrtCount === count ? '#082f49' : '#0f172a',
                    borderColor: config.mrtCount === count ? '#0284c7' : '#1e293b',
                    color: config.mrtCount === count ? '#7dd3fc' : '#94a3b8',
                  }}
                  title={isExceedingHardware ? `Hardware limit is ${maxAllowedTargets} MRT; will render up to limit` : undefined}
                >
                  {count} MRT
                  {isExceedingHardware && <span className="block text-[8px] text-amber-400" style={{ color: '#fbbf24' }}>*Clamped</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Per-Target Dynamic Format Selectors */}
      {showMrt && (
        <div className="space-y-2 border-t border-slate-800 pt-3" style={{ borderColor: '#1e293b' }}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" size={14} style={{ color: '#22d3ee' }} />
              <span>目标格式与通道 (Formats)</span>
            </span>
            {!isFloatSupported && (
              <span className="text-[10px] text-amber-400 font-mono" style={{ color: '#fbbf24' }}>
                RGBA16F unavailable
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {Array.from({ length: config.mrtCount }).map((_, index) => {
              const desc = TARGET_DESCRIPTIONS[index] || { name: `Target ${index}`, role: 'Color', short: `T${index}` };
              const currentFormat = config.formats[index];
              const bytes = currentFormat === 'RGBA16F' ? 8 : 4;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-xl border border-slate-800 bg-[#0f172a] text-xs"
                  style={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                >
                  <div>
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span>{desc.name}:</span>
                      <span className="text-cyan-400 font-mono" style={{ color: '#22d3ee' }}>{desc.short}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{desc.role}</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-slate-400 mr-1">{bytes}B/px</span>
                    <div className="inline-flex rounded-lg border border-slate-800 p-0.5 bg-black" style={{ borderColor: '#1e293b' }}>
                      <button
                        onClick={() => setFormat(index, 'RGBA8')}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition select-none cursor-pointer ${
                          currentFormat === 'RGBA8'
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        style={{
                          backgroundColor: currentFormat === 'RGBA8' ? '#334155' : 'transparent',
                          color: currentFormat === 'RGBA8' ? '#ffffff' : '#94a3b8',
                        }}
                      >
                        RGBA8
                      </button>
                      <button
                        onClick={() => {
                          if (isFloatSupported) {
                            setFormat(index, 'RGBA16F');
                          }
                        }}
                        disabled={!isFloatSupported}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition select-none cursor-pointer ${
                          currentFormat === 'RGBA16F'
                            ? 'bg-cyan-600 text-white'
                            : !isFloatSupported
                            ? 'text-slate-600 cursor-not-allowed opacity-40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        style={{
                          backgroundColor: currentFormat === 'RGBA16F' ? '#0891b2' : 'transparent',
                          color: currentFormat === 'RGBA16F' ? '#ffffff' : !isFloatSupported ? '#475569' : '#94a3b8',
                        }}
                        title={!isFloatSupported ? 'Requires floating-point color buffer support' : '8 bytes per pixel FP16'}
                      >
                        RGBA16F
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. ALU Math Complexity & Overdraw Stress Passes */}
      {showShader && (
        <div className="space-y-3 border-t border-slate-800 pt-3" style={{ borderColor: '#1e293b' }}>
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-cyan-400" size={14} style={{ color: '#22d3ee' }} />
                <span>ALU 计算复杂度</span>
              </span>
              <span className="text-cyan-400 font-mono uppercase font-bold" style={{ color: '#22d3ee' }}>
                {config.aluComplexity}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
              {(['low', 'medium', 'heavy'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setAluComplexity(level)}
                  className={`py-1.5 px-2 rounded-xl border capitalize transition select-none cursor-pointer ${
                    config.aluComplexity === level
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  style={{
                    backgroundColor: config.aluComplexity === level ? '#082f49' : '#0f172a',
                    borderColor: config.aluComplexity === level ? '#0284c7' : '#1e293b',
                    color: config.aluComplexity === level ? '#7dd3fc' : '#94a3b8',
                  }}
                >
                  {level === 'low' ? 'Low (带宽)' : level === 'medium' ? 'Medium (混合)' : 'Heavy (高算力)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>Overdraw 重复写入倍率</span>
              <span className="text-cyan-400 font-mono font-bold" style={{ color: '#22d3ee' }}>{config.passes}x Passes</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
              {[1, 2, 4, 8].map((pass) => (
                <button
                  key={pass}
                  onClick={() => setPasses(pass)}
                  className={`py-1 px-1.5 rounded-lg border transition select-none cursor-pointer ${
                    config.passes === pass
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                  style={{
                    backgroundColor: config.passes === pass ? '#082f49' : '#0f172a',
                    borderColor: config.passes === pass ? '#0284c7' : '#1e293b',
                    color: config.passes === pass ? '#7dd3fc' : '#94a3b8',
                  }}
                >
                  {pass}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Preview Target Blit Selector */}
      {showShader && (
        <div className="space-y-2 border-t border-slate-800 pt-3" style={{ borderColor: '#1e293b' }}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span>画面预览通道 Preview</span>
            </span>
            <span className="text-cyan-400 font-mono text-[11px] uppercase font-bold" style={{ color: '#22d3ee' }}>
              {config.previewTarget}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-xs">
            <button
              onClick={() => setPreviewTarget('target0')}
              className={`py-1.5 px-2 rounded-lg border transition select-none cursor-pointer ${
                config.previewTarget === 'target0'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              style={{
                backgroundColor: config.previewTarget === 'target0' ? '#082f49' : '#0f172a',
                borderColor: config.previewTarget === 'target0' ? '#0284c7' : '#1e293b',
                color: config.previewTarget === 'target0' ? '#7dd3fc' : '#94a3b8',
              }}
            >
              T0 (Albedo)
            </button>
            <button
              onClick={() => setPreviewTarget('target1')}
              disabled={config.mrtCount < 2}
              className={`py-1.5 px-2 rounded-lg border transition select-none ${
                config.previewTarget === 'target1'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold cursor-pointer'
                  : config.mrtCount < 2
                  ? 'bg-slate-900/30 border-slate-900 text-slate-700 cursor-not-allowed'
                  : 'bg-slate-900 border-slate-800 text-slate-400 cursor-pointer'
              }`}
              style={{
                backgroundColor: config.previewTarget === 'target1' ? '#082f49' : '#0f172a',
                borderColor: config.previewTarget === 'target1' ? '#0284c7' : '#1e293b',
                color: config.previewTarget === 'target1' ? '#7dd3fc' : config.mrtCount < 2 ? '#334155' : '#94a3b8',
              }}
            >
              T1 (Normal)
            </button>
            <button
              onClick={() => setPreviewTarget('target2')}
              disabled={config.mrtCount < 3}
              className={`py-1.5 px-2 rounded-lg border transition select-none ${
                config.previewTarget === 'target2'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold cursor-pointer'
                  : config.mrtCount < 3
                  ? 'bg-slate-900/30 border-slate-900 text-slate-700 cursor-not-allowed'
                  : 'bg-slate-900 border-slate-800 text-slate-400 cursor-pointer'
              }`}
              style={{
                backgroundColor: config.previewTarget === 'target2' ? '#082f49' : '#0f172a',
                borderColor: config.previewTarget === 'target2' ? '#0284c7' : '#1e293b',
                color: config.previewTarget === 'target2' ? '#7dd3fc' : config.mrtCount < 3 ? '#334155' : '#94a3b8',
              }}
            >
              T2 (Material)
            </button>
            <button
              onClick={() => setPreviewTarget('target3')}
              disabled={config.mrtCount < 4}
              className={`py-1.5 px-2 rounded-lg border transition select-none ${
                config.previewTarget === 'target3'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold cursor-pointer'
                  : config.mrtCount < 4
                  ? 'bg-slate-900/30 border-slate-900 text-slate-700 cursor-not-allowed'
                  : 'bg-slate-900 border-slate-800 text-slate-400 cursor-pointer'
              }`}
              style={{
                backgroundColor: config.previewTarget === 'target3' ? '#082f49' : '#0f172a',
                borderColor: config.previewTarget === 'target3' ? '#0284c7' : '#1e293b',
                color: config.previewTarget === 'target3' ? '#7dd3fc' : config.mrtCount < 4 ? '#334155' : '#94a3b8',
              }}
            >
              T3 (Emissive)
            </button>
            <button
              onClick={() => setPreviewTarget('split')}
              className={`col-span-4 py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1.5 transition select-none cursor-pointer ${
                config.previewTarget === 'split'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              style={{
                backgroundColor: config.previewTarget === 'split' ? '#082f49' : '#0f172a',
                borderColor: config.previewTarget === 'split' ? '#0284c7' : '#1e293b',
                color: config.previewTarget === 'split' ? '#7dd3fc' : '#94a3b8',
              }}
            >
              <Grid2X2 className="w-3.5 h-3.5" size={14} />
              <span>4-Way 四分屏画中画实时预览</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. Bottom Action Controls */}
      <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-2" style={{ borderColor: '#1e293b' }}>
        <button
          onClick={togglePause}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition select-none cursor-pointer ${
            config.isPaused
              ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-950/50'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
          style={{
            backgroundColor: config.isPaused ? '#d97706' : '#0f172a',
            borderColor: config.isPaused ? '#f59e0b' : '#1e293b',
            color: '#f8fafc',
          }}
        >
          {config.isPaused ? <Play className="w-4 h-4 fill-current" size={16} /> : <Pause className="w-4 h-4" size={16} />}
          <span>{config.isPaused ? '▶ 恢复渲染 Resume' : '⏸ 暂停循环 Pause'}</span>
        </button>

        <button
          onClick={onToggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition select-none cursor-pointer"
          style={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
          title="Toggle Fullscreen Canvas"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" size={14} /> : <Maximize2 className="w-3.5 h-3.5" size={14} />}
          <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
        </button>
      </div>

      {/* Subtle Scroll Cue */}
      {filterTab === 'all' && (
        <div className="text-[10px] text-center text-slate-500 pt-1 font-mono select-none" style={{ color: '#64748b' }}>
          ↕ 可上下滑动查看更多参数 (Scroll for more) ↕
        </div>
      )}
    </div>
  );
};
