import React from 'react';
import { GpuDeviceInfo } from '../types/benchmark';
import { Cpu, X, ShieldCheck, AlertCircle } from 'lucide-react';

interface GpuInfoModalProps {
  info: GpuDeviceInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const GpuInfoModal: React.FC<GpuInfoModalProps> = ({ info, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-xl border border-slate-800 bg-[#090d16] shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-[#060a12]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">GPU Device & Hardware Diagnostics</h3>
              <p className="text-xs text-slate-400">Low-level driver and rasterizer capabilities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-sans text-sm">
          {/* Renderer Card */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Active Graphics API
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-bold text-white">
                {info.api === 'webgpu' ? 'WebGPU Pipeline' : 'WebGL 2.0 (OpenGL ES 3.0)'}
              </span>
              <span className="px-2.5 py-1 text-xs rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                {info.api.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Hardware Specs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <span className="text-xs text-slate-400 block mb-1">Unmasked Renderer / GPU</span>
              <span className="font-mono text-xs text-slate-200 font-semibold break-words">
                {info.renderer || 'Standard GPU'}
              </span>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <span className="text-xs text-slate-400 block mb-1">Hardware Vendor</span>
              <span className="font-mono text-xs text-slate-200 font-semibold break-words">
                {info.vendor || 'Generic'}
              </span>
            </div>
            {info.architecture && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                <span className="text-xs text-slate-400 block mb-1">Architecture</span>
                <span className="font-mono text-xs text-slate-200 font-semibold">
                  {info.architecture}
                </span>
              </div>
            )}
            {info.driver && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                <span className="text-xs text-slate-400 block mb-1">Driver</span>
                <span className="font-mono text-xs text-slate-200 font-semibold break-words">
                  {info.driver}
                </span>
              </div>
            )}
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <span className="text-xs text-slate-400 block mb-1">Max Color Attachments (MRT)</span>
              <span className="font-mono text-sm text-cyan-300 font-bold">
                {info.maxDrawBuffers} Targets
              </span>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <span className="text-xs text-slate-400 block mb-1">Max 2D Texture Dimension</span>
              <span className="font-mono text-sm text-cyan-300 font-bold">
                {info.maxTextureSize} × {info.maxTextureSize} px
              </span>
            </div>
          </div>

          {/* Float Color Buffer status */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3 flex items-start gap-3">
            {info.hasFloatColorBuffer ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-medium text-xs text-slate-200">
                Half-Float Render Target Capability (RGBA16F)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {info.hasFloatColorBuffer
                  ? 'Supported: GPU can bind and write 8 bytes/pixel floating-point MRTs directly.'
                  : 'Unsupported: EXT_color_buffer_float is missing on this driver. RGBA8 (4 bytes/px) only.'}
              </div>
            </div>
          </div>

          {/* Enabled Features & Extensions */}
          {info.features.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Active GPU Features & Extensions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {info.features.map((feat, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-[11px] rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
