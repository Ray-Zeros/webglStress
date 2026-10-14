/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BenchmarkConfig,
  MetricsSnapshot,
  GpuDeviceInfo,
  BenchmarkReport,
  GraphicsAPI,
} from './types/benchmark';
import { RollingMetricsEngine } from './engine/metrics';
import { WebGL2Engine } from './engine/webgl2-engine';
import { WebGPUEngine } from './engine/webgpu-engine';
import { HudOverlay } from './components/HudOverlay';
import { GpuInfoModal } from './components/GpuInfoModal';
import { BenchmarkReportModal } from './components/BenchmarkReportModal';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Engines
  const webgl2EngineRef = useRef<WebGL2Engine | null>(null);
  const webgpuEngineRef = useRef<WebGPUEngine | null>(null);
  const metricsEngineRef = useRef<RollingMetricsEngine>(new RollingMetricsEngine(10000));
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const lastUiUpdateRef = useRef<number>(0);

  // Benchmark Config State
  const [config, setConfig] = useState<BenchmarkConfig>({
    api: 'webgl2',
    mrtCount: 4,
    formats: ['RGBA8', 'RGBA8', 'RGBA8', 'RGBA8'],
    resolutionPreset: '1080p',
    customWidth: 1920,
    customHeight: 1080,
    aluComplexity: 'low', // default low for pure bandwidth saturation
    passes: 1,
    previewTarget: 'target0',
    isPaused: false,
  });

  const [activeRes, setActiveRes] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });

  const [webgpuSupported, setWebgpuSupported] = useState<boolean>(false);
  const [webgpuFallbackWarning, setWebgpuFallbackWarning] = useState<string | null>(null);
  const [isContextLost, setIsContextLost] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Device Info State
  const [deviceInfo, setDeviceInfo] = useState<GpuDeviceInfo>({
    api: 'webgl2',
    renderer: 'Detecting GPU Hardware...',
    vendor: 'Detecting...',
    maxDrawBuffers: 4,
    maxTextureSize: 4096,
    hasFloatColorBuffer: false,
    webgpuSupported: false,
    features: [],
  });

  // Metrics State
  const [metrics, setMetrics] = useState<MetricsSnapshot>({
    instantFps: 0,
    windowAvgFps: 0,
    windowAvgFrameTime: 0,
    onePercentLowFps: 0,
    p99FrameTime: 0,
    p999FrameTime: 0,
    minFrameTime: 0,
    maxFrameTime: 0,
    frameTimeStability: 100,
    theoreticalBandwidthGBps: 0,
    mbPerFrame: 0,
    totalBytesPerPixel: 16,
    frameCount10s: 0,
    windowDurationSeconds: 0,
    recentFrameTimes: [],
  });

  // Benchmark Run State
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState<number>(0);
  const [benchmarkCountdown, setBenchmarkCountdown] = useState<number>(10);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showGpuInfoModal, setShowGpuInfoModal] = useState<boolean>(false);

  // Calculate resolution
  const computeResolution = useCallback(() => {
    switch (config.resolutionPreset) {
      case '720p':
        return { width: 1280, height: 720 };
      case '1080p':
        return { width: 1920, height: 1080 };
      case '1440p':
        return { width: 2560, height: 1440 };
      case '4k':
        return { width: 3840, height: 2160 };
      case 'native': {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.round(window.innerWidth * dpr);
        const h = Math.round(window.innerHeight * dpr);
        return { width: Math.max(640, w), height: Math.max(360, h) };
      }
      case 'custom':
        return {
          width: Math.max(64, Math.min(7680, config.customWidth)),
          height: Math.max(64, Math.min(4320, config.customHeight)),
        };
      default:
        return { width: 1920, height: 1080 };
    }
  }, [config.resolutionPreset, config.customWidth, config.customHeight]);

  // Check WebGPU support on mount
  useEffect(() => {
    const supported = WebGPUEngine.isSupported();
    setWebgpuSupported(supported);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Cleanup helper
  const teardownEngines = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (webgl2EngineRef.current) {
      webgl2EngineRef.current.destroy();
      webgl2EngineRef.current = null;
    }
    if (webgpuEngineRef.current) {
      webgpuEngineRef.current.destroy();
      webgpuEngineRef.current = null;
    }
  }, []);

  // Initialize or Switch Graphics Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let active = true;

    const initEngine = async () => {
      teardownEngines();
      metricsEngineRef.current.reset();
      setIsContextLost(false);

      const targetRes = computeResolution();
      setActiveRes(targetRes);
      canvas.width = targetRes.width;
      canvas.height = targetRes.height;

      if (config.api === 'webgpu') {
        if (!WebGPUEngine.isSupported()) {
          setWebgpuFallbackWarning('WebGPU is unsupported in this browser environment. Gracefully falling back to WebGL 2.0.');
          setConfig((prev) => ({ ...prev, api: 'webgl2' }));
          return;
        }

        const engine = new WebGPUEngine(canvas, () => {
          if (active) setIsContextLost(true);
        });

        const success = await engine.init();
        if (!active) {
          engine.destroy();
          return;
        }

        if (!success) {
          setWebgpuFallbackWarning('WebGPU device initialization failed on this GPU. Falling back to WebGL 2.0.');
          setConfig((prev) => ({ ...prev, api: 'webgl2' }));
          return;
        }

        webgpuEngineRef.current = engine;
        engine.updateTargets(targetRes.width, targetRes.height, config);
        setDeviceInfo(engine.getDeviceInfo());
      } else {
        // WebGL 2.0
        const engine = new WebGL2Engine(
          canvas,
          () => {
            if (active) setIsContextLost(true);
          },
          () => {
            if (active) {
              setIsContextLost(false);
              engine.updateTargets(targetRes.width, targetRes.height, config);
            }
          }
        );

        webgl2EngineRef.current = engine;
        const success = engine.updateTargets(targetRes.width, targetRes.height, config);
        if (!success) {
          console.warn('WebGL2 MRT setup incomplete.');
        }

        const devInfo = engine.getDeviceInfo();
        setDeviceInfo(devInfo);

        // Check if RGBA16F was selected without extension
        if (!devInfo.hasFloatColorBuffer) {
          const hasFloatTargets = config.formats.slice(0, config.mrtCount).some((f) => f === 'RGBA16F');
          if (hasFloatTargets) {
            setWebgpuFallbackWarning(
              'EXT_color_buffer_float is unsupported on this WebGL 2.0 driver. Floating-point RGBA16F MRTs will fall back to RGBA8.'
            );
          }
        }
      }

      startTimeRef.current = performance.now();

      // Render Loop
      const renderLoop = (timestamp: number) => {
        if (!active) return;

        if (!config.isPaused) {
          metricsEngineRef.current.recordFrame(timestamp);

          const timeSec = (timestamp - startTimeRef.current) / 1000;
          if (config.api === 'webgpu' && webgpuEngineRef.current) {
            webgpuEngineRef.current.render(timeSec, config);
          } else if (config.api === 'webgl2' && webgl2EngineRef.current) {
            webgl2EngineRef.current.render(timeSec, config);
          }
        }

        // Throttle UI telemetry updates to ~12 Hz to eliminate React reconciliation latency
        if (timestamp - lastUiUpdateRef.current > 80) {
          lastUiUpdateRef.current = timestamp;
          const snap = metricsEngineRef.current.getSnapshot(config, targetRes.width, targetRes.height);
          setMetrics(snap);
        }

        rafIdRef.current = requestAnimationFrame(renderLoop);
      };

      rafIdRef.current = requestAnimationFrame(renderLoop);
    };

    initEngine();

    return () => {
      active = false;
      teardownEngines();
    };
  }, [config.api, config.resolutionPreset, config.customWidth, config.customHeight, config.mrtCount, config.formats]);

  // Handle updates to non-pipeline parameters (ALU, passes, previewTarget, isPaused)
  useEffect(() => {
    // If resolution or target count changes, the previous useEffect handles it.
  }, [config.aluComplexity, config.passes, config.previewTarget, config.isPaused]);

  // 10-Second Benchmark Run Timer
  useEffect(() => {
    if (!isBenchmarking) return;

    metricsEngineRef.current.reset();
    const benchmarkStart = performance.now();
    const duration = 10000; // 10 seconds

    const timer = setInterval(() => {
      const elapsed = performance.now() - benchmarkStart;
      const progress = Math.min(100, (elapsed / duration) * 100);
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));

      setBenchmarkProgress(progress);
      setBenchmarkCountdown(remaining);

      if (elapsed >= duration) {
        clearInterval(timer);
        setIsBenchmarking(false);

        // Capture snapshot
        const res = computeResolution();
        const finalSnap = metricsEngineRef.current.getSnapshot(config, res.width, res.height);

        const report: BenchmarkReport = {
          id: `bm-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          deviceInfo,
          config,
          metrics: finalSnap,
          resolution: res,
          durationSeconds: 10,
        };

        setBenchmarkReport(report);
        setShowReportModal(true);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isBenchmarking, config, deviceInfo, computeResolution]);

  const handleStartBenchmark = () => {
    setIsBenchmarking(true);
    setBenchmarkProgress(0);
    setBenchmarkCountdown(10);
  };

  const handleStopBenchmark = () => {
    setIsBenchmarking(false);
  };

  const handleResetMetrics = () => {
    metricsEngineRef.current.reset();
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn('Error enabling fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Error exiting fullscreen:', err);
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none"
    >
      {/* Background Main Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover block bg-slate-950"
      />

      {/* HUD Telemetry, Controls & Modals */}
      <HudOverlay
        config={config}
        metrics={metrics}
        deviceInfo={deviceInfo}
        activeWidth={activeRes.width}
        activeHeight={activeRes.height}
        webgpuSupported={webgpuSupported}
        webgpuFallbackWarning={webgpuFallbackWarning}
        isBenchmarking={isBenchmarking}
        benchmarkProgress={benchmarkProgress}
        benchmarkCountdown={benchmarkCountdown}
        isFullscreen={isFullscreen}
        isContextLost={isContextLost}
        onConfigChange={setConfig}
        onResetMetrics={handleResetMetrics}
        onStartBenchmark={handleStartBenchmark}
        onStopBenchmark={handleStopBenchmark}
        onOpenGpuInfo={() => setShowGpuInfoModal(true)}
        onToggleFullscreen={handleToggleFullscreen}
        onDismissWarning={() => setWebgpuFallbackWarning(null)}
      />

      {/* GPU Hardware Diagnostics Modal */}
      <GpuInfoModal
        info={deviceInfo}
        isOpen={showGpuInfoModal}
        onClose={() => setShowGpuInfoModal(false)}
      />

      {/* 10-Second Benchmark Run Report Modal */}
      <BenchmarkReportModal
        report={benchmarkReport}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
}
