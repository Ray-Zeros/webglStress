import { BenchmarkConfig, MetricsSnapshot } from '../types/benchmark';

export class RollingMetricsEngine {
  private windowDurationMs = 10000; // 10 seconds
  private timestamps: number[] = [];
  private frameDurations: number[] = [];
  private recentHistory: number[] = []; // for sparkline (last 120 frames)
  private maxRecentHistory = 120;
  private lastFrameTime = 0;
  private totalFramesCount = 0;
  private startTime = 0;

  constructor(windowDurationMs = 10000) {
    this.windowDurationMs = windowDurationMs;
    this.reset();
  }

  public reset(): void {
    this.timestamps = [];
    this.frameDurations = [];
    this.recentHistory = [];
    this.lastFrameTime = performance.now();
    this.totalFramesCount = 0;
    this.startTime = performance.now();
  }

  public recordFrame(now: number): void {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = now;
      this.startTime = now;
      return;
    }

    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Filter out aberrant negative or initial jump deltas
    if (delta <= 0 || delta > 1000) {
      return;
    }

    this.totalFramesCount++;
    this.timestamps.push(now);
    this.frameDurations.push(delta);

    // Keep sparkline buffer
    this.recentHistory.push(delta);
    if (this.recentHistory.length > this.maxRecentHistory) {
      this.recentHistory.shift();
    }

    // Prune entries outside the 10-second rolling window
    const cutoff = now - this.windowDurationMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
      this.frameDurations.shift();
    }
  }

  public getSnapshot(config: BenchmarkConfig, width: number, height: number): MetricsSnapshot {
    const count = this.frameDurations.length;
    
    // Calculate bytes per pixel across active targets
    let bytesPerPixel = 0;
    for (let i = 0; i < config.mrtCount; i++) {
      const format = config.formats[i];
      bytesPerPixel += format === 'RGBA16F' ? 8 : 4;
    }

    const passes = Math.max(1, config.passes || 1);
    const mbPerFrame = (width * height * bytesPerPixel * passes) / 1_000_000;

    if (count < 2) {
      return {
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
        mbPerFrame,
        totalBytesPerPixel: bytesPerPixel,
        frameCount10s: count,
        windowDurationSeconds: 0,
        recentFrameTimes: [...this.recentHistory],
      };
    }

    const lastDelta = this.frameDurations[count - 1];
    const instantFps = lastDelta > 0 ? 1000 / lastDelta : 0;

    const windowDurationMs = this.timestamps[count - 1] - this.timestamps[0];
    const windowDurationSeconds = Math.max(0.1, windowDurationMs / 1000);
    const windowAvgFps = (count - 1) / windowDurationSeconds;
    const windowAvgFrameTime = windowAvgFps > 0 ? 1000 / windowAvgFps : 0;

    // Percentiles (P99, P99.9, Min, Max)
    // Clone frame durations and sort
    const sorted = [...this.frameDurations].sort((a, b) => a - b);
    const minFrameTime = sorted[0];
    const maxFrameTime = sorted[sorted.length - 1];

    // P99 index is 99th percentile (highest frame duration)
    const p99Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));
    const p99FrameTime = sorted[p99Index];
    const onePercentLowFps = p99FrameTime > 0 ? 1000 / p99FrameTime : 0;

    const p999Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.999));
    const p999FrameTime = sorted[p999Index];

    // Stability score: ratio of 1% low to average FPS, capped at 100%
    const frameTimeStability = windowAvgFps > 0
      ? Math.min(100, Math.max(0, (onePercentLowFps / windowAvgFps) * 100))
      : 100;

    // Bandwidth calculation in GB/s (10^9 bytes)
    // Uses instant/avg FPS
    const theoreticalBandwidthGBps = (width * height * bytesPerPixel * passes * windowAvgFps) / 1_000_000_000;

    return {
      instantFps: Math.round(instantFps * 10) / 10,
      windowAvgFps: Math.round(windowAvgFps * 10) / 10,
      windowAvgFrameTime: Math.round(windowAvgFrameTime * 100) / 100,
      onePercentLowFps: Math.round(onePercentLowFps * 10) / 10,
      p99FrameTime: Math.round(p99FrameTime * 100) / 100,
      p999FrameTime: Math.round(p999FrameTime * 100) / 100,
      minFrameTime: Math.round(minFrameTime * 100) / 100,
      maxFrameTime: Math.round(maxFrameTime * 100) / 100,
      frameTimeStability: Math.round(frameTimeStability * 10) / 10,
      theoreticalBandwidthGBps: Math.round(theoreticalBandwidthGBps * 100) / 100,
      mbPerFrame: Math.round(mbPerFrame * 100) / 100,
      totalBytesPerPixel: bytesPerPixel,
      frameCount10s: count,
      windowDurationSeconds: Math.round(windowDurationSeconds * 10) / 10,
      recentFrameTimes: [...this.recentHistory],
    };
  }
}
