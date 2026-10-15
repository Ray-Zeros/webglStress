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
    config.api === 'webgpu' ||
    ((config.api === 'webgl2' || config.api === 'webgl1') && deviceInfo.hasFloatColorBuffer);

  const maxAllowedTargets = Math.max(1, deviceInfo.maxDrawBuffers || 4);

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-slate-800 bg-[#090d16] p-3.5 sm:p-4 shadow-2xl text-slate-100 max-w-sm sm:max-w-md w-full touch-scroll overflow-y-auto max-h-[75vh] sm:max-h-[82vh]">
      {/* Fallback Warning Toast / Banner */}
      {webgpuFallbackWarning && (
        <div className="rounded-xl border border-amber-800 bg-[#2b1f0c] p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-amber-200">Hardware / API Notice</div>
            <div className="text-amber-300/90 leading-relaxed text-[11px]">{webgpuFallbackWarning}</div>
            <button
              onClick={onDismissWarning}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-200 underline mt-0.5"
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
          <span className="text-[11px] font-mono text-cyan-400 uppercase font-bold">
            {config.api}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => setApi('webgpu')}
            disabled={!webgpuSupported}
            className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
              config.api === 'webgpu'
                ? 'bg-[#1e1b4b] border-indigo-500 text-indigo-300 shadow-md'
                : !webgpuSupported
                ? 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed opacity-60'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={!webgpuSupported ? 'WebGPU unavailable on this browser/platform' : 'Next-Gen WebGPU Engine'}
          >
            <span>WebGPU</span>
            <span className="text-[9px] font-normal opacity-80">{webgpuSupported ? 'Modern' : 'Unsupported'}</span>
          </button>

          <button
            onClick={() => setApi('webgl2')}
            className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
              config.api === 'webgl2'
                ? 'bg-[#082f49] border-cyan-500 text-cyan-300 shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="WebGL 2.0 (OpenGL ES 3.0)"
          >
            <span>WebGL 2.0</span>
            <span className="text-[9px] font-normal opacity-80">GLES 3.0</span>
          </button>

          <button
            onClick={() => setApi('webgl1')}
            className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
              config.api === 'webgl1'
                ? 'bg-[#2e1065] border-purple-500 text-purple-300 shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Legacy WebGL 1.0 (for older devices like Mali-T628 / Android 4.4 - 7.0 WebViews)"
          >
            <span>WebGL 1.0</span>
            <span className="text-[9px] font-normal opacity-80">Legacy Mali</span>
          </button>
        </div>
      </div>

      {/* 2. MRT Target Count Selector */}
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Render Targets (MRT)</span>
          </span>
          <span className="font-mono text-cyan-400 font-bold">
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
                className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition font-mono ${
                  config.mrtCount === count
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={isExceedingHardware ? `Hardware limit is ${maxAllowedTargets} MRT; will render up to limit` : undefined}
              >
                {count} MRT
                {isExceedingHardware && <span className="block text-[8px] text-amber-400">*Clamped</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Per-Target Dynamic Format Selectors */}
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Formats & Channels</span>
          </span>
          {!isFloatSupported && (
            <span className="text-[10px] text-amber-400 font-mono">
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
              >
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>{desc.name}:</span>
                    <span className="text-cyan-400 font-mono">{desc.short}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{desc.role}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-slate-400 mr-1">{bytes}B/px</span>
                  <div className="inline-flex rounded-lg border border-slate-800 p-0.5 bg-black">
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
                          ? 'bg-cyan-600 text-white'
                          : !isFloatSupported
                          ? 'text-slate-600 cursor-not-allowed opacity-40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
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

      {/* 4. Viewport & Resolution Control */}
      <div className="space-y-2 border-t border-slate-800 pt-3">
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
            className={`py-1.5 px-1.5 rounded-lg border transition ${
              config.resolutionPreset === '720p'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            720p (HD)
          </button>
          <button
            onClick={() => setResolutionPreset('1080p')}
            className={`py-1.5 px-1.5 rounded-lg border transition ${
              config.resolutionPreset === '1080p'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            1080p (FHD)
          </button>
          <button
            onClick={() => setResolutionPreset('1440p')}
            className={`py-1.5 px-1.5 rounded-lg border transition ${
              config.resolutionPreset === '1440p'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            1440p (2K)
          </button>
          <button
            onClick={() => setResolutionPreset('4k')}
            className={`py-1.5 px-1.5 rounded-lg border transition ${
              config.resolutionPreset === '4k'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            2160p (4K)
          </button>
          <button
            onClick={() => setResolutionPreset('native')}
            className={`py-1.5 px-1.5 rounded-lg border transition ${
              config.resolutionPreset === 'native'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            Native
          </button>
          <button
            onClick={() => setResolutionPreset('custom')}
            className={`py-1.5 px-1.5 rounded-lg border transition ${
              config.resolutionPreset === 'custom'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            Custom
          </button>
        </div>

        {config.resolutionPreset === 'custom' && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800">
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
      <div className="space-y-2.5 border-t border-slate-800 pt-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Shader ALU Complexity</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 uppercase">
              {config.aluComplexity === 'low'
                ? 'Bandwidth Bound'
                : config.aluComplexity === 'medium'
                ? 'Balanced'
                : 'ALU Heavy'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
            {(['low', 'medium', 'heavy'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setAluComplexity(lvl)}
                className={`py-1.5 px-2 rounded-lg border capitalize transition ${
                  config.aluComplexity === lvl
                    ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
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
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {pass}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Visual Target Preview Mode */}
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Preview / Blit Mode</span>
          </span>
          <span className="text-[10px] text-slate-400">Screen Output</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
          <button
            onClick={() => setPreviewTarget('target0')}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.previewTarget === 'target0'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            T0 (Albedo)
          </button>
          <button
            onClick={() => setPreviewTarget('target1')}
            disabled={config.mrtCount < 2}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.previewTarget === 'target1'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : config.mrtCount < 2
                ? 'bg-slate-900/30 border-slate-900 text-slate-700 cursor-not-allowed'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            T1 (Normal)
          </button>
          <button
            onClick={() => setPreviewTarget('target2')}
            disabled={config.mrtCount < 3}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.previewTarget === 'target2'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : config.mrtCount < 3
                ? 'bg-slate-900/30 border-slate-900 text-slate-700 cursor-not-allowed'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            T2 (Material)
          </button>
          <button
            onClick={() => setPreviewTarget('target3')}
            disabled={config.mrtCount < 4}
            className={`py-1.5 px-2 rounded-lg border transition ${
              config.previewTarget === 'target3'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : config.mrtCount < 4
                ? 'bg-slate-900/30 border-slate-900 text-slate-700 cursor-not-allowed'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            T3 (Emissive)
          </button>
          <button
            onClick={() => setPreviewTarget('split')}
            className={`col-span-2 py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1.5 transition ${
              config.previewTarget === 'split'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Grid2X2 className="w-3.5 h-3.5" />
            <span>4-Way Split View</span>
          </button>
        </div>
      </div>

      {/* 7. Bottom Action Controls */}
      <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-2">
        <button
          onClick={togglePause}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
            config.isPaused
              ? 'bg-amber-600 border-amber-500 text-white'
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
