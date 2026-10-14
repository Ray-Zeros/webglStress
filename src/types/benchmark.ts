export type GraphicsAPI = 'webgl2' | 'webgpu';

export type TextureFormatOption = 'RGBA8' | 'RGBA16F';

export type ALUComplexity = 'low' | 'medium' | 'heavy';

export type ResolutionPreset = '720p' | '1080p' | '1440p' | '4k' | 'native' | 'custom';

export type PreviewTarget = 'target0' | 'target1' | 'target2' | 'target3' | 'split';

export interface BenchmarkConfig {
  api: GraphicsAPI;
  mrtCount: 1 | 2 | 3 | 4;
  formats: [TextureFormatOption, TextureFormatOption, TextureFormatOption, TextureFormatOption];
  resolutionPreset: ResolutionPreset;
  customWidth: number;
  customHeight: number;
  aluComplexity: ALUComplexity;
  passes: number; // 1 to 16 overdraw stress passes
  previewTarget: PreviewTarget;
  isPaused: boolean;
}

export interface MetricsSnapshot {
  instantFps: number;
  windowAvgFps: number;
  windowAvgFrameTime: number; // ms
  onePercentLowFps: number;
  p99FrameTime: number; // ms
  p999FrameTime: number; // ms
  minFrameTime: number; // ms
  maxFrameTime: number; // ms
  frameTimeStability: number; // 0 - 100%
  theoreticalBandwidthGBps: number;
  mbPerFrame: number;
  totalBytesPerPixel: number;
  frameCount10s: number;
  windowDurationSeconds: number;
  recentFrameTimes: number[]; // last 100 frames for sparkline
}

export interface GpuDeviceInfo {
  api: GraphicsAPI;
  renderer: string;
  vendor: string;
  device?: string;
  architecture?: string;
  driver?: string;
  maxDrawBuffers: number;
  maxTextureSize: number;
  hasFloatColorBuffer: boolean;
  webgpuSupported: boolean;
  features: string[];
}

export interface BenchmarkReport {
  id: string;
  timestamp: string;
  deviceInfo: GpuDeviceInfo;
  config: BenchmarkConfig;
  metrics: MetricsSnapshot;
  resolution: { width: number; height: number };
  durationSeconds: number;
}
