import React from 'react';
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
  Eye,
  Sliders,
  AlertTriangle,
  Flame,
  Grid2X2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
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
    config.api === 'webgpu' || (config.api === 'webgl2' && deviceInfo.hasFloatColorBuffer);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/85 p-4 sm:p-5 backdrop-blur-md shadow-2xl text-slate-100 max-w-sm sm:max-w-md w-full overflow-y-auto max-h-[85vh]">
      {/* Fallback Warning Toast / Banner */}
      {webgpuFallbackWarning && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-amber-200">Hardware / API Notice</div>
            <div className="text-amber-300/80 leading-relaxed">{webgpuFallbackWarning}</div>
            <button
              onClick={onDismissWarning}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-200 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 1. Engine & API Switching */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Graphics Engine API</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {config.api === 'webgpu' ? 'Modern Next-Gen' : 'Legacy / Broad Support'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setApi('webgl2')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
              config.api === 'webgl2'
                ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
            }`}
          >
            <span>WebGL 2.0</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">ES 3.0</span>
          </button>

          <button
            onClick={() => {
              if (webgpuSupported) {
                setApi('webgpu');
              } else {
                setApi('webgl2');
              }
            }}
            disabled={!webgpuSupported}
            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
              config.api === 'webgpu'
                ? 'bg-indigo-500/25 border-indigo-500/60 text-indigo-300 shadow-lg shadow-indigo-500/10'
                : !webgpuSupported
                ? 'bg-slate-900/30 border-slate-800/40 text-slate-600 cursor-not-allowed'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
            }`}
            title={!webgpuSupported ? 'WebGPU is not supported on this browser or platform' : 'Switch to WebGPU'}
          >
            <span>WebGPU</span>
            {!webgpuSupported && (
              <span className="text-[9px] px-1 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40">
                N/A
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. MRT Target Count Selector */}
      <div className="space-y-2 border-t border-slate-800/60 pt-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Render Targets (MRT)</span>
          </span>
          <span className="font-mono text-cyan-400 font-bold">
            {config.mrtCount} {config.mrtCount === 1 ? 'Target' : 'Targets'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {([1, 2, 3, 4] as const).map((count) => (
            <button
              key={count}
              onClick={() => setMrtCount(count)}
              className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition font-mono ${
                config.mrtCount === count
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
            >
              {count} MRT
            </button>
          ))}
        </div>
      </div>

      {/* 3. Per-Target Dynamic Format Selectors */}
      <div className="space-y-2.5 border-t border-slate-800/60 pt-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Formats & Channels</span>
          </span>
          {!isFloatSupported && (
            <span className="text-[10px] text-amber-400 font-mono">
              RGBA16F unavailable (no float buffer)
            </span>
          )}
        </div>

        <div className="space-y-2">
          {Array.from({ length: config.mrtCount }).map((_, index) => {
            const desc = TARGET_DESCRIPTIONS[index];
            const currentFormat = config.formats[index];
            const bytes = currentFormat === 'RGBA16F' ? 8 : 4;

            return (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800/70 bg-slate-900/50 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <span>{desc.name}:</span>
                    <span className="text-cyan-400 font-mono">{desc.short}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{desc.role}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-slate-400 mr-1">{bytes}B/px</span>
                  <div className="inline-flex rounded-lg border border-slate-800 p-0.5 bg-slate-950">
                    <button
                      onClick={() => setFormat(index, 'RGBA8')}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition ${
                        currentFormat === 'RGBA8'
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
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
                      className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition ${
                        currentFormat === 'RGBA16F'
                          ? 'bg-cyan-600 text-white shadow'
                          : !isFloatSupported
                          ? 'text-slate-600 cursor-not-allowed opacity-50'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={!isFloatSupported ? 'RGBA16F requires EXT_color_buffer_float' : '8 bytes per pixel FP16'}
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

      {/* 4. Viewport & Resolution Control */}
      <div className="space-y-2 border-t border-slate-800/60 pt-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            <span>Render Resolution</span>
          </span>
          <span className="font-mono text-cyan-300 font-bold">
            {activeWidth} × {activeHeight}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
          <button
            onClick={() => setResolutionPreset('720p')}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.resolutionPreset === '720p'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            720p (HD)
          </button>
          <button
            onClick={() => setResolutionPreset('1080p')}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.resolutionPreset === '1080p'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            1080p (FHD)
          </button>
          <button
            onClick={() => setResolutionPreset('1440p')}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.resolutionPreset === '1440p'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            1440p (2K)
          </button>
          <button
            onClick={() => setResolutionPreset('4k')}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.resolutionPreset === '4k'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            2160p (4K)
          </button>
          <button
            onClick={() => setResolutionPreset('native')}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.resolutionPreset === 'native'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            Device Native
          </button>
          <button
            onClick={() => setResolutionPreset('custom')}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.resolutionPreset === 'custom'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            Custom
          </button>
        </div>

        {config.resolutionPreset === 'custom' && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-850">
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
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Shader ALU Complexity & Fillrate Passes */}
      <div className="space-y-3 border-t border-slate-800/60 pt-3">
        {/* ALU Complexity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Shader ALU Complexity</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 uppercase">
              {config.aluComplexity === 'low'
                ? 'Memory Bound'
                : config.aluComplexity === 'medium'
                ? 'Balanced'
                : 'Compute Heavy'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
            {(['low', 'medium', 'heavy'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setAluComplexity(lvl)}
                className={`py-1.5 px-2 rounded-lg border capitalize transition ${
                  config.aluComplexity === lvl
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Overdraw Passes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="uppercase tracking-wider">Overdraw Stress Multiplier</span>
            <span className="font-mono text-cyan-400 font-bold">{config.passes}x Passes</span>
          </div>

          <div className="grid grid-cols-5 gap-1 text-xs font-mono">
            {([1, 2, 4, 8, 16] as const).map((pass) => (
              <button
                key={pass}
                onClick={() => setPasses(pass)}
                className={`py-1 rounded-lg border transition ${
                  config.passes === pass
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                {pass}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Visual Target Preview Mode */}
      <div className="space-y-2 border-t border-slate-800/60 pt-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Preview / Blit Mode</span>
          </span>
          <span className="text-[10px] text-slate-400">Main screen display</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
          <button
            onClick={() => setPreviewTarget('target0')}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.previewTarget === 'target0'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            T0 (Albedo)
          </button>
          <button
            onClick={() => setPreviewTarget('target1')}
            disabled={config.mrtCount < 2}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.previewTarget === 'target1'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                : config.mrtCount < 2
                ? 'bg-slate-900/20 border-slate-850 text-slate-600 cursor-not-allowed'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            T1 (Normal)
          </button>
          <button
            onClick={() => setPreviewTarget('target2')}
            disabled={config.mrtCount < 3}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.previewTarget === 'target2'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                : config.mrtCount < 3
                ? 'bg-slate-900/20 border-slate-850 text-slate-600 cursor-not-allowed'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            T2 (Material)
          </button>
          <button
            onClick={() => setPreviewTarget('target3')}
            disabled={config.mrtCount < 4}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.previewTarget === 'target3'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                : config.mrtCount < 4
                ? 'bg-slate-900/20 border-slate-850 text-slate-600 cursor-not-allowed'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            T3 (Emissive)
          </button>
          <button
            onClick={() => setPreviewTarget('split')}
            className={`col-span-2 py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1.5 transition ${
              config.previewTarget === 'split'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            <Grid2X2 className="w-3.5 h-3.5" />
            <span>4-Way Split View</span>
          </button>
        </div>
      </div>

      {/* 7. Bottom Action Controls */}
      <div className="border-t border-slate-800/60 pt-3 flex items-center justify-between gap-2">
        <button
          onClick={togglePause}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
            config.isPaused
              ? 'bg-amber-600 border-amber-500 text-white shadow-lg'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {config.isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
          <span>{config.isPaused ? 'Resume' : 'Pause Loop'}</span>
        </button>

        <button
          onClick={onToggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
          title="Toggle Fullscreen Canvas"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
        </button>
      </div>
    </div>
  );
};
