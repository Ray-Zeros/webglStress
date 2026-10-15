import { BenchmarkConfig, GpuDeviceInfo } from '../types/benchmark';

export class WebGPUEngine {
  private canvas: HTMLCanvasElement;
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private canvasFormat: GPUTextureFormat = 'bgra8unorm';

  private targetTextures: (GPUTexture | null)[] = [null, null, null, null];
  private targetViews: (GPUTextureView | null)[] = [null, null, null, null];
  private dummyTextures: (GPUTexture | null)[] = [null, null, null, null];
  private dummyViews: (GPUTextureView | null)[] = [null, null, null, null];

  private currentWidth = 0;
  private currentHeight = 0;

  private mrtPipeline: GPURenderPipeline | null = null;
  private blitPipeline: GPURenderPipeline | null = null;

  private mrtUniformBuffer: GPUBuffer | null = null;
  private blitUniformBuffer: GPUBuffer | null = null;
  private mrtBindGroup: GPUBindGroup | null = null;
  private blitBindGroup: GPUBindGroup | null = null;
  private sampler: GPUSampler | null = null;

  private isDeviceLost = false;
  private onDeviceLostCallback?: () => void;
  private cachedDeviceInfo: GpuDeviceInfo | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    onDeviceLost?: () => void
  ) {
    this.canvas = canvas;
    this.onDeviceLostCallback = onDeviceLost;
  }

  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu;
  }

  public static async checkAvailability(): Promise<{ supported: boolean; reason?: string }> {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      return {
        supported: false,
        reason: 'navigator.gpu not found in browser. WebGPU is either unsupported or disabled in browser flags.',
      };
    }

    try {
      let adapter: GPUAdapter | null = null;
      try {
        adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      } catch (e: any) {
        // In iframe or restricted environments, might throw SecurityError
        return {
          supported: false,
          reason: `WebGPU requestAdapter blocked: ${e?.message || 'Access restricted'}`,
        };
      }

      if (!adapter) {
        adapter = await navigator.gpu.requestAdapter();
      }
      if (!adapter) {
        adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
      }

      if (!adapter) {
        return {
          supported: false,
          reason: 'No WebGPU adapter returned by browser (GPU driver may be blacklisted or hardware unsupported).',
        };
      }

      return { supported: true };
    } catch (err: any) {
      return {
        supported: false,
        reason: err?.message || 'WebGPU verification failed.',
      };
    }
  }

  public async init(): Promise<boolean> {
    if (!WebGPUEngine.isSupported()) {
      return false;
    }

    try {
      // 1. Multi-strategy adapter query
      let adapter: GPUAdapter | null = null;
      try {
        adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      } catch (e) {
        console.warn('requestAdapter high-performance failed:', e);
      }

      if (!adapter) {
        try {
          adapter = await navigator.gpu.requestAdapter();
        } catch (e) {
          console.warn('requestAdapter default failed:', e);
        }
      }

      if (!adapter) {
        try {
          adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
        } catch (e) {
          console.warn('requestAdapter low-power failed:', e);
        }
      }

      if (!adapter) {
        console.warn('WebGPU: No suitable GPU adapter found on this system.');
        return false;
      }

      this.adapter = adapter;

      // 2. Request device with permissive default options
      const device = await adapter.requestDevice();

      this.device = device;
      this.isDeviceLost = false;

      device.lost.then((info) => {
        console.warn('WebGPU Device lost:', info.message);
        this.isDeviceLost = true;
        this.destroyResources();
        this.onDeviceLostCallback?.();
      });

      device.addEventListener('uncapturederror', (event: any) => {
        console.error('WebGPU uncaptured error:', event.error);
      });

      const context = this.canvas.getContext('webgpu') as GPUCanvasContext | null;
      if (!context) {
        console.warn('WebGPU: Could not get webgpu canvas context.');
        return false;
      }

      this.context = context;
      this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: this.canvasFormat,
        alphaMode: 'opaque',
      });

      await this.extractDeviceInfo();

      this.sampler = this.device.createSampler({
        magFilter: 'nearest',
        minFilter: 'nearest',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      });

      this.mrtUniformBuffer = this.device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      this.blitUniformBuffer = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      return true;
    } catch (err) {
      console.error('WebGPU Initialization failed:', err);
      return false;
    }
  }

  private async extractDeviceInfo(): Promise<void> {
    if (!this.adapter) return;

    let renderer = 'WebGPU Device';
    let vendor = 'WebGPU Vendor';
    let architecture = '';
    let driver = '';
    let deviceName = '';

    try {
      const info = (this.adapter as any).info || (await (this.adapter as any).requestAdapterInfo?.());
      if (info) {
        if (info.description) renderer = info.description;
        else if (info.device) renderer = info.device;
        if (info.vendor) vendor = info.vendor;
        if (info.architecture) architecture = info.architecture;
        if (info.driver) driver = info.driver;
        if (info.device) deviceName = info.device;
      }
    } catch (e) {
      console.warn('WebGPU Adapter info query error:', e);
    }

    const limits = this.device?.limits;
    const maxDrawBuffers = limits?.maxColorAttachments || 8;
    const maxTextureSize = limits?.maxTextureDimension2D || 8192;

    const featuresList: string[] = [];
    if (this.adapter.features) {
      this.adapter.features.forEach((f) => featuresList.push(f));
    }

    this.cachedDeviceInfo = {
      api: 'webgpu',
      renderer,
      vendor,
      device: deviceName,
      architecture,
      driver,
      maxDrawBuffers,
      maxTextureSize,
      hasFloatColorBuffer: true,
      webgpuSupported: true,
      features: featuresList,
    };
  }

  public getDeviceInfo(): GpuDeviceInfo {
    if (this.cachedDeviceInfo) {
      return this.cachedDeviceInfo;
    }

    return {
      api: 'webgpu',
      renderer: 'WebGPU Context',
      vendor: 'Generic',
      maxDrawBuffers: 8,
      maxTextureSize: 8192,
      hasFloatColorBuffer: true,
      webgpuSupported: true,
      features: [],
    };
  }

  public updateTargets(width: number, height: number, config: BenchmarkConfig): boolean {
    if (!this.device || this.isDeviceLost) return false;

    this.currentWidth = width;
    this.currentHeight = height;

    this.destroyTargetTextures();

    const targetFormats: GPUTextureFormat[] = [];
    for (let i = 0; i < config.mrtCount; i++) {
      const formatOpt = config.formats[i];
      const gpuFormat: GPUTextureFormat = formatOpt === 'RGBA16F' ? 'rgba16float' : 'rgba8unorm';
      targetFormats.push(gpuFormat);

      const texture = this.device.createTexture({
        size: [width, height, 1],
        format: gpuFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });

      this.targetTextures[i] = texture;
      this.targetViews[i] = texture.createView();
    }

    for (let i = config.mrtCount; i < 4; i++) {
      const dummy = this.device.createTexture({
        size: [1, 1, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this.dummyTextures[i] = dummy;
      this.dummyViews[i] = dummy.createView();
    }

    this.buildMrtPipeline(config.mrtCount, targetFormats);
    this.buildBlitPipeline();
    this.updateBindGroups();

    return true;
  }

  private buildMrtPipeline(mrtCount: number, formats: GPUTextureFormat[]): void {
    if (!this.device) return;

    let outputStructMembers = '';
    let outputAssignments = '';

    for (let i = 0; i < mrtCount; i++) {
      outputStructMembers += `  @location(${i}) target${i}: vec4<f32>,\n`;
      outputAssignments += `  out.target${i} = target${i};\n`;
    }

    // Standard cross-compatible WGSL (using vec2<f32>, vec3<f32>, vec4<f32> for universal browser support)
    const wgslShader = `
    struct Uniforms {
      time: f32,
      aluComplexity: u32,
      resX: f32,
      resY: f32,
      mrtCount: u32,
      pad1: f32,
      pad2: f32,
      pad3: f32,
    };

    @group(0) @binding(0) var<uniform> u: Uniforms;

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    };

    @vertex
    fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var pos = array<vec2<f32>, 4>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>( 1.0,  1.0)
      );
      var out: VertexOutput;
      let p = pos[vertexIndex];
      out.position = vec4<f32>(p, 0.0, 1.0);
      out.uv = p * 0.5 + vec2<f32>(0.5, 0.5);
      return out;
    }

    struct GBufferOutput {
${outputStructMembers}
    };

    fn hash2(p: vec2<f32>) -> f32 {
      var p3 = fract(p * vec2<f32>(123.34, 456.21));
      p3 += dot(p3, p3 + 45.32);
      return fract(p3.x * p3.y);
    }

    fn noise2(p: vec2<f32>) -> f32 {
      let i = floor(p);
      let f = fract(p);
      let u_curve = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash2(i + vec2<f32>(0.0, 0.0)), hash2(i + vec2<f32>(1.0, 0.0)), u_curve.x),
        mix(hash2(i + vec2<f32>(0.0, 1.0)), hash2(i + vec2<f32>(1.0, 1.0)), u_curve.x),
        u_curve.y
      );
    }

    @fragment
    fn fs_main(in_val: VertexOutput) -> GBufferOutput {
      let uv = in_val.uv;
      let aspectUv = (uv - 0.5) * vec2<f32>(u.resX / max(u.resY, 1.0), 1.0);
      let t = u.time * 0.8;
      let p = aspectUv * 3.0;

      var aluAccum: f32 = 0.0;
      if (u.aluComplexity == 0u) {
        aluAccum = sin(p.x * 4.0 + t) * cos(p.y * 4.0 - t);
      } else if (u.aluComplexity == 1u) {
        let d = length(aspectUv);
        aluAccum = sin(d * 18.0 - t * 3.0) + cos(aspectUv.x * 12.0 + t) * sin(aspectUv.y * 12.0 - t);
        aluAccum += noise2(uv * 8.0 + vec2<f32>(t * 0.2, t * 0.2));
      } else {
        var q = uv * 6.0;
        var amp: f32 = 1.0;
        let c = cos(0.5);
        let s = sin(0.5);
        for (var i: i32 = 0; i < 7; i = i + 1) {
          aluAccum += amp * noise2(q + vec2<f32>(t * 0.3, -t * 0.2));
          let rx = c * q.x - s * q.y;
          let ry = s * q.x + c * q.y;
          q = vec2<f32>(rx, ry) * 2.02 + vec2<f32>(f32(i) * 1.7, f32(i) * 1.7);
          amp *= 0.5;
        }
        aluAccum += sin(aspectUv.x * 24.0 + aluAccum * 3.0) * cos(aspectUv.y * 24.0 - aluAccum * 3.0);
      }

      // Target 0: Albedo
      let colA = vec3<f32>(0.08, 0.45, 0.95);
      let colB = vec3<f32>(0.98, 0.32, 0.15);
      let colC = vec3<f32>(0.12, 0.85, 0.55);
      let pattern = 0.5 + 0.5 * sin(p.x * 3.0 + aluAccum * 1.5 + t);
      let albedo = mix(colA, mix(colB, colC, sin(t * 0.5) * 0.5 + 0.5), pattern);
      let target0 = vec4<f32>(albedo, 1.0);

      // Target 1: World Normal + Roughness
      let nGrad = vec2<f32>(
        sin(p.x * 5.0 + t + aluAccum),
        cos(p.y * 5.0 - t + aluAccum)
      ) * 0.6;
      let normal = normalize(vec3<f32>(nGrad, 1.0));
      let normalEncoded = normal * 0.5 + vec3<f32>(0.5, 0.5, 0.5);
      let roughness = clamp(0.1 + 0.8 * abs(sin(aluAccum * 2.0 + t * 0.5)), 0.05, 0.95);
      let target1 = vec4<f32>(normalEncoded, roughness);

      // Target 2: Metallic, AO, Specular, Curvature
      let metallic = clamp(sin(p.y * 4.0 - t * 0.7) * 0.5 + 0.5, 0.0, 1.0);
      let ao = clamp(1.0 - length(aspectUv) * 0.4 + aluAccum * 0.15, 0.2, 1.0);
      let target2 = vec4<f32>(metallic, ao, 0.5, abs(normal.x * normal.y));

      // Target 3: Emissive / Velocity Vector
      let fw = max(fwidth(aspectUv * 6.0), vec2<f32>(0.001, 0.001));
      let grid = abs(fract(aspectUv * 6.0 - vec2<f32>(t * 0.2, t * 0.1)) - 0.5) / fw;
      let line = min(grid.x, grid.y);
      let emissiveMask = 1.0 - min(line, 1.0);
      let emissive = vec3<f32>(0.2, 0.9, 1.0) * emissiveMask * 2.5;
      let velocity = vec2<f32>(sin(t), cos(t)) * 0.016;
      let target3 = vec4<f32>(emissive.x + velocity.x, emissive.y + velocity.y, emissive.z, 1.0);

      var out: GBufferOutput;
${outputAssignments}
      return out;
    }
    `;

    const shaderModule = this.device.createShaderModule({ code: wgslShader });

    const colorTargets: GPUColorTargetState[] = formats.map((format) => ({
      format,
    }));

    this.mrtPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: colorTargets,
      },
      primitive: {
        topology: 'triangle-strip',
      },
    });
  }

  private buildBlitPipeline(): void {
    if (!this.device) return;

    const blitWgsl = `
    struct BlitUniforms {
      previewMode: u32,
      pad1: u32,
      pad2: u32,
      pad3: u32,
    };

    @group(0) @binding(0) var<uniform> bu: BlitUniforms;
    @group(0) @binding(1) var s: sampler;
    @group(0) @binding(2) var t0: texture_2d<f32>;
    @group(0) @binding(3) var t1: texture_2d<f32>;
    @group(0) @binding(4) var t2: texture_2d<f32>;
    @group(0) @binding(5) var t3: texture_2d<f32>;

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    };

    @vertex
    fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var pos = array<vec2<f32>, 4>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>( 1.0,  1.0)
      );
      var out: VertexOutput;
      let p = pos[vertexIndex];
      out.position = vec4<f32>(p, 0.0, 1.0);
      out.uv = p * 0.5 + vec2<f32>(0.5, 0.5);
      return out;
    }

    @fragment
    fn fs_main(in_val: VertexOutput) -> @location(0) vec4<f32> {
      let uv = in_val.uv;

      if (bu.previewMode == 0u) {
        return textureSample(t0, s, uv);
      } else if (bu.previewMode == 1u) {
        return textureSample(t1, s, uv);
      } else if (bu.previewMode == 2u) {
        let d = textureSample(t2, s, uv);
        return vec4<f32>(d.rgb, 1.0);
      } else if (bu.previewMode == 3u) {
        let d = textureSample(t3, s, uv);
        return vec4<f32>(d.rgb, 1.0);
      } else {
        let subUv = fract(uv * 2.0);
        var border: f32 = 1.0;
        if (abs(uv.x - 0.5) < 0.003 || abs(uv.y - 0.5) < 0.003) {
          border = 0.0;
        }

        var col: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
        if (uv.x < 0.5 && uv.y < 0.5) {
          col = textureSample(t0, s, subUv);
        } else if (uv.x >= 0.5 && uv.y < 0.5) {
          col = textureSample(t1, s, subUv);
        } else if (uv.x < 0.5 && uv.y >= 0.5) {
          let d = textureSample(t2, s, subUv);
          col = vec4<f32>(d.rgb, 1.0);
        } else {
          let d = textureSample(t3, s, subUv);
          col = vec4<f32>(d.rgb, 1.0);
        }

        return col * border;
      }
    }
    `;

    const shaderModule = this.device.createShaderModule({ code: blitWgsl });

    this.blitPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: this.canvasFormat }],
      },
      primitive: {
        topology: 'triangle-strip',
      },
    });
  }

  private updateBindGroups(): void {
    if (!this.device || !this.mrtPipeline || !this.blitPipeline || !this.mrtUniformBuffer || !this.blitUniformBuffer || !this.sampler) return;

    this.mrtBindGroup = this.device.createBindGroup({
      layout: this.mrtPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.mrtUniformBuffer },
        },
      ],
    });

    const v0 = this.targetViews[0] || this.dummyViews[0]!;
    const v1 = this.targetViews[1] || this.dummyViews[1]!;
    const v2 = this.targetViews[2] || this.dummyViews[2]!;
    const v3 = this.targetViews[3] || this.dummyViews[3]!;

    this.blitBindGroup = this.device.createBindGroup({
      layout: this.blitPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.blitUniformBuffer } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: v0 },
        { binding: 3, resource: v1 },
        { binding: 4, resource: v2 },
        { binding: 5, resource: v3 },
      ],
    });
  }

  public render(time: number, config: BenchmarkConfig): void {
    if (!this.device || this.isDeviceLost || !this.context || !this.mrtPipeline || !this.blitPipeline) return;

    const aluComplexityIndex = config.aluComplexity === 'low' ? 0 : config.aluComplexity === 'medium' ? 1 : 2;
    const passes = Math.max(1, config.passes || 1);

    const mrtUniformData = new ArrayBuffer(32);
    const mrtFloatView = new Float32Array(mrtUniformData);
    const mrtUintView = new Uint32Array(mrtUniformData);

    mrtFloatView[0] = time;
    mrtUintView[1] = aluComplexityIndex;
    mrtFloatView[2] = this.currentWidth;
    mrtFloatView[3] = this.currentHeight;
    mrtUintView[4] = config.mrtCount;

    this.device.queue.writeBuffer(this.mrtUniformBuffer!, 0, mrtUniformData);

    let previewMode = 0;
    if (config.previewTarget === 'target1') previewMode = 1;
    else if (config.previewTarget === 'target2') previewMode = 2;
    else if (config.previewTarget === 'target3') previewMode = 3;
    else if (config.previewTarget === 'split') previewMode = 4;

    if (previewMode < 4 && previewMode >= config.mrtCount) {
      previewMode = 0;
    }

    const blitUniformData = new Uint32Array([previewMode, 0, 0, 0]);
    this.device.queue.writeBuffer(this.blitUniformBuffer!, 0, blitUniformData);

    const commandEncoder = this.device.createCommandEncoder();

    const colorAttachments: GPURenderPassColorAttachment[] = [];
    for (let i = 0; i < config.mrtCount; i++) {
      const view = this.targetViews[i];
      if (view) {
        colorAttachments.push({
          view,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        });
      }
    }

    const mrtPass = commandEncoder.beginRenderPass({
      colorAttachments,
    });
    mrtPass.setPipeline(this.mrtPipeline);
    mrtPass.setBindGroup(0, this.mrtBindGroup!);

    for (let p = 0; p < passes; p++) {
      mrtPass.draw(4, 1, 0, 0);
    }
    mrtPass.end();

    const canvasTextureView = this.context.getCurrentTexture().createView();
    const blitPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: canvasTextureView,
          clearValue: { r: 0.05, g: 0.05, b: 0.08, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    blitPass.setPipeline(this.blitPipeline);
    blitPass.setBindGroup(0, this.blitBindGroup!);
    blitPass.draw(4, 1, 0, 0);
    blitPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  private destroyTargetTextures(): void {
    for (let i = 0; i < this.targetTextures.length; i++) {
      if (this.targetTextures[i]) {
        this.targetTextures[i]!.destroy();
        this.targetTextures[i] = null;
        this.targetViews[i] = null;
      }
      if (this.dummyTextures[i]) {
        this.dummyTextures[i]!.destroy();
        this.dummyTextures[i] = null;
        this.dummyViews[i] = null;
      }
    }
  }

  public destroyResources(): void {
    this.destroyTargetTextures();
    if (this.mrtUniformBuffer) {
      this.mrtUniformBuffer.destroy();
      this.mrtUniformBuffer = null;
    }
    if (this.blitUniformBuffer) {
      this.blitUniformBuffer.destroy();
      this.blitUniformBuffer = null;
    }
    this.mrtPipeline = null;
    this.blitPipeline = null;
    this.mrtBindGroup = null;
    this.blitBindGroup = null;
  }

  public destroy(): void {
    this.destroyResources();
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.adapter = null;
    this.context = null;
  }
}
