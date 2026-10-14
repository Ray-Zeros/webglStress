import { BenchmarkConfig, GpuDeviceInfo } from '../types/benchmark';

export class WebGL2Engine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private fbo: WebGLFramebuffer | null = null;
  private textures: (WebGLTexture | null)[] = [null, null, null, null];
  private currentWidth = 0;
  private currentHeight = 0;
  private mtrProgram: WebGLProgram | null = null;
  private blitProgram: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;
  private hasFloatColorBuffer = false;
  private isContextLost = false;
  private extColorBufferFloat: any = null;
  private onContextLostCallback?: () => void;
  private onContextRestoredCallback?: () => void;

  // Uniform locations cache
  private mrtUniforms = {
    time: null as WebGLUniformLocation | null,
    resolution: null as WebGLUniformLocation | null,
    aluComplexity: null as WebGLUniformLocation | null,
    mrtCount: null as WebGLUniformLocation | null,
  };

  private blitUniforms = {
    tex0: null as WebGLUniformLocation | null,
    tex1: null as WebGLUniformLocation | null,
    tex2: null as WebGLUniformLocation | null,
    tex3: null as WebGLUniformLocation | null,
    previewMode: null as WebGLUniformLocation | null, // 0..3 for target 0..3, 4 for split
  };

  constructor(
    canvas: HTMLCanvasElement,
    onContextLost?: () => void,
    onContextRestored?: () => void
  ) {
    this.canvas = canvas;
    this.onContextLostCallback = onContextLost;
    this.onContextRestoredCallback = onContextRestored;

    this.initContext();
  }

  private initContext(): boolean {
    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      return false;
    }

    this.gl = gl;
    this.isContextLost = false;

    // Check extensions
    this.extColorBufferFloat = gl.getExtension('EXT_color_buffer_float');
    this.hasFloatColorBuffer = !!this.extColorBufferFloat;

    this.setupContextLostListeners();
    this.initShaders();
    this.initGeometry();
    return true;
  }

  private setupContextLostListeners(): void {
    const handleLost = (e: Event) => {
      e.preventDefault();
      this.isContextLost = true;
      this.destroyResources();
      this.onContextLostCallback?.();
    };

    const handleRestored = () => {
      this.isContextLost = false;
      this.initContext();
      this.onContextRestoredCallback?.();
    };

    this.canvas.addEventListener('webglcontextlost', handleLost as EventListener, false);
    this.canvas.addEventListener('webglcontextrestored', handleRestored as EventListener, false);
  }

  public getDeviceInfo(): GpuDeviceInfo {
    if (!this.gl) {
      return {
        api: 'webgl2',
        renderer: 'Unknown / Not Initialized',
        vendor: 'Unknown',
        maxDrawBuffers: 0,
        maxTextureSize: 0,
        hasFloatColorBuffer: false,
        webgpuSupported: typeof navigator !== 'undefined' && 'gpu' in navigator,
        features: [],
      };
    }

    const gl = this.gl;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let renderer = 'WebGL 2.0 Hardware';
    let vendor = 'Generic';

    if (debugInfo) {
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gl.getParameter(gl.RENDERER);
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || gl.getParameter(gl.VENDOR);
    } else {
      renderer = gl.getParameter(gl.RENDERER) || 'Generic WebGL 2.0';
      vendor = gl.getParameter(gl.VENDOR) || 'Generic';
    }

    const maxDrawBuffers = gl.getParameter(gl.MAX_DRAW_BUFFERS) || 4;
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

    const features: string[] = [];
    if (this.hasFloatColorBuffer) features.push('EXT_color_buffer_float (RGBA16F Renderable)');
    if (gl.getExtension('OES_texture_float_linear')) features.push('OES_texture_float_linear');
    if (gl.getExtension('EXT_texture_filter_anisotropic')) features.push('Anisotropic Filtering');

    return {
      api: 'webgl2',
      renderer,
      vendor,
      maxDrawBuffers,
      maxTextureSize,
      hasFloatColorBuffer: this.hasFloatColorBuffer,
      webgpuSupported: typeof navigator !== 'undefined' && 'gpu' in navigator,
      features,
    };
  }

  private initShaders(): void {
    if (!this.gl) return;
    const gl = this.gl;

    // 1. MRT Vertex Shader (Single full-screen triangle)
    const vsSource = `#version 300 es
    precision highp float;
    layout(location = 0) in vec2 a_position;
    out vec2 v_uv;

    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
    `;

    // 2. MRT Fragment Shader (Synthetic PBR G-Buffer Generator)
    const fsSource = `#version 300 es
    precision highp float;

    in vec2 v_uv;

    layout(location = 0) out vec4 outTarget0; // Albedo / BaseColor + Opacity
    layout(location = 1) out vec4 outTarget1; // World Normal + Roughness
    layout(location = 2) out vec4 outTarget2; // Metallic, AO, Specular, Curvature
    layout(location = 3) out vec4 outTarget3; // Emissive / Velocity Vector

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform int u_alu_complexity; // 0 = Low, 1 = Medium, 2 = Heavy
    uniform int u_mrt_count;

    // Fast pseudo hash/noise for ALU synthesis
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    void main() {
      vec2 uv = v_uv;
      vec2 aspectUv = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
      float t = u_time * 0.8;

      // Base coordinate dynamics
      vec2 p = aspectUv * 3.0;

      // ALU complexity variations
      float aluAccum = 0.0;
      if (u_alu_complexity == 0) {
        // Low: Minimal math, purely testing memory write bus
        aluAccum = sin(p.x * 4.0 + t) * cos(p.y * 4.0 - t);
      } else if (u_alu_complexity == 1) {
        // Medium: Procedural ripple waves + voronoi-like interference
        float d = length(aspectUv);
        aluAccum = sin(d * 18.0 - t * 3.0) + cos(aspectUv.x * 12.0 + t) * sin(aspectUv.y * 12.0 - t);
        aluAccum += noise(uv * 8.0 + vec2(t * 0.2));
      } else {
        // Heavy: Multi-octave fBm loop to saturate shader ALU cores
        vec2 q = uv * 6.0;
        float amp = 1.0;
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 7; i++) {
          aluAccum += amp * noise(q + vec2(t * 0.3, -t * 0.2));
          q = rot * q * 2.02 + vec2(float(i) * 1.7);
          amp *= 0.5;
        }
        // Additional trigonometric saturation
        aluAccum += sin(aspectUv.x * 24.0 + aluAccum * 3.0) * cos(aspectUv.y * 24.0 - aluAccum * 3.0);
      }

      // --- Target 0: Albedo / BaseColor + Opacity ---
      vec3 colA = vec3(0.08, 0.45, 0.95); // Deep electric cobalt
      vec3 colB = vec3(0.98, 0.32, 0.15); // Neon amber
      vec3 colC = vec3(0.12, 0.85, 0.55); // Emerald cyan
      float pattern = 0.5 + 0.5 * sin(p.x * 3.0 + aluAccum * 1.5 + t);
      vec3 albedo = mix(colA, mix(colB, colC, sin(t * 0.5) * 0.5 + 0.5), pattern);
      float opacity = 1.0;
      outTarget0 = vec4(albedo, opacity);

      if (u_mrt_count <= 1) return;

      // --- Target 1: World Normal + Roughness ---
      // Generate dynamic spherical / wave normal vectors
      vec2 nGrad = vec2(
        sin(p.x * 5.0 + t + aluAccum),
        cos(p.y * 5.0 - t + aluAccum)
      ) * 0.6;
      vec3 normal = normalize(vec3(nGrad, 1.0));
      // Map [-1, 1] to [0, 1] for previewing
      vec3 normalEncoded = normal * 0.5 + 0.5;
      float roughness = clamp(0.1 + 0.8 * abs(sin(aluAccum * 2.0 + t * 0.5)), 0.05, 0.95);
      outTarget1 = vec4(normalEncoded, roughness);

      if (u_mrt_count <= 2) return;

      // --- Target 2: Metallic, AO, Specular, Curvature ---
      float metallic = clamp(sin(p.y * 4.0 - t * 0.7) * 0.5 + 0.5, 0.0, 1.0);
      float ao = clamp(1.0 - length(aspectUv) * 0.4 + aluAccum * 0.15, 0.2, 1.0);
      float specular = 0.5;
      float curvature = abs(normal.x * normal.y);
      outTarget2 = vec4(metallic, ao, specular, curvature);

      if (u_mrt_count <= 3) return;

      // --- Target 3: Emissive / Velocity Vector ---
      // High-energy glowing wireframe grid + motion vector
      vec2 grid = abs(fract(aspectUv * 6.0 - vec2(t * 0.2, t * 0.1)) - 0.5) / fwidth(aspectUv * 6.0);
      float line = min(grid.x, grid.y);
      float emissiveMask = 1.0 - min(line, 1.0);
      vec3 emissive = vec3(0.2, 0.9, 1.0) * emissiveMask * 2.5;
      vec2 velocity = vec2(sin(t), cos(t)) * 0.016; // Simulated screen velocity
      outTarget3 = vec4(emissive.xy + velocity, emissive.z, 1.0);
    }
    `;

    this.mtrProgram = this.createProgram(vsSource, fsSource);
    if (this.mtrProgram) {
      this.mrtUniforms.time = gl.getUniformLocation(this.mtrProgram, 'u_time');
      this.mrtUniforms.resolution = gl.getUniformLocation(this.mtrProgram, 'u_resolution');
      this.mrtUniforms.aluComplexity = gl.getUniformLocation(this.mtrProgram, 'u_alu_complexity');
      this.mrtUniforms.mrtCount = gl.getUniformLocation(this.mtrProgram, 'u_mrt_count');
    }

    // 3. Blit / Presentation Program (Draw to screen with Split-Screen or Single Target preview)
    const blitFsSource = `#version 300 es
    precision highp float;

    in vec2 v_uv;
    out vec4 fragColor;

    uniform sampler2D u_tex0;
    uniform sampler2D u_tex1;
    uniform sampler2D u_tex2;
    uniform sampler2D u_tex3;
    uniform int u_preview_mode; // 0=Target0, 1=Target1, 2=Target2, 3=Target3, 4=Split 4-way

    void main() {
      vec2 uv = v_uv;

      if (u_preview_mode == 0) {
        fragColor = texture(u_tex0, uv);
      } else if (u_preview_mode == 1) {
        fragColor = texture(u_tex1, uv);
      } else if (u_preview_mode == 2) {
        // Target 2 is Metallic, AO, Specular, Curvature -> show Metallic/AO combo
        vec4 data = texture(u_tex2, uv);
        fragColor = vec4(data.rgb, 1.0);
      } else if (u_preview_mode == 3) {
        vec4 data = texture(u_tex3, uv);
        // Boost emissive presentation
        fragColor = vec4(data.rgb, 1.0);
      } else {
        // Split 4-way view
        // Top-Left: Target 0, Top-Right: Target 1
        // Bottom-Left: Target 2, Bottom-Right: Target 3
        vec2 subUv = fract(uv * 2.0);
        
        // Dark grid border separator
        float borderX = step(0.003, abs(uv.x - 0.5));
        float borderY = step(0.003, abs(uv.y - 0.5));
        float border = borderX * borderY;

        vec4 col = vec4(0.0);
        if (uv.x < 0.5 && uv.y >= 0.5) {
          col = texture(u_tex0, subUv); // Top-left: Albedo
        } else if (uv.x >= 0.5 && uv.y >= 0.5) {
          col = texture(u_tex1, subUv); // Top-right: Normal
        } else if (uv.x < 0.5 && uv.y < 0.5) {
          col = vec4(texture(u_tex2, subUv).rgb, 1.0); // Bottom-left: Material
        } else {
          col = vec4(texture(u_tex3, subUv).rgb, 1.0); // Bottom-right: Emissive
        }

        fragColor = col * border;
      }
    }
    `;

    this.blitProgram = this.createProgram(vsSource, blitFsSource);
    if (this.blitProgram) {
      this.blitUniforms.tex0 = gl.getUniformLocation(this.blitProgram, 'u_tex0');
      this.blitUniforms.tex1 = gl.getUniformLocation(this.blitProgram, 'u_tex1');
      this.blitUniforms.tex2 = gl.getUniformLocation(this.blitProgram, 'u_tex2');
      this.blitUniforms.tex3 = gl.getUniformLocation(this.blitProgram, 'u_tex3');
      this.blitUniforms.previewMode = gl.getUniformLocation(this.blitProgram, 'u_preview_mode');
    }
  }

  private initGeometry(): void {
    if (!this.gl) return;
    const gl = this.gl;

    // Full screen quad / triangle (-1..1)
    const vertices = new Float32Array([
      -1.0, -1.0,
       3.0, -1.0,
      -1.0,  3.0,
    ]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  public updateTargets(width: number, height: number, config: BenchmarkConfig): boolean {
    if (!this.gl || this.isContextLost) return false;
    const gl = this.gl;

    // Destroy existing FBO and textures
    this.destroyTextures();

    this.currentWidth = width;
    this.currentHeight = height;

    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

    const drawBuffers: number[] = [];

    for (let i = 0; i < config.mrtCount; i++) {
      const formatOption = config.formats[i];
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      let internalFormat: GLenum = gl.RGBA8;
      let format: GLenum = gl.RGBA;
      let type: GLenum = gl.UNSIGNED_BYTE;

      if (formatOption === 'RGBA16F') {
        if (this.hasFloatColorBuffer) {
          internalFormat = gl.RGBA16F;
          type = gl.HALF_FLOAT;
        } else {
          console.warn('EXT_color_buffer_float not supported, fallback to RGBA8 for target', i);
        }
      }

      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        internalFormat,
        width,
        height,
        0,
        format,
        type,
        null
      );

      const attachment = gl.COLOR_ATTACHMENT0 + i;
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        attachment,
        gl.TEXTURE_2D,
        tex,
        0
      );

      drawBuffers.push(attachment);
      this.textures[i] = tex;
    }

    // Unbound unused textures
    for (let i = config.mrtCount; i < 4; i++) {
      // Allocate 1x1 dummy black texture so blit shader has a valid sampler
      const dummy = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, dummy);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255])
      );
      this.textures[i] = dummy;
    }

    gl.drawBuffers(drawBuffers);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error('WebGL 2.0 Framebuffer incomplete status:', status);
      return false;
    }

    return true;
  }

  public render(time: number, config: BenchmarkConfig): void {
    if (!this.gl || this.isContextLost || !this.fbo || !this.mtrProgram || !this.blitProgram) return;
    const gl = this.gl;

    const aluComplexityIndex = config.aluComplexity === 'low' ? 0 : config.aluComplexity === 'medium' ? 1 : 2;
    const passes = Math.max(1, config.passes || 1);

    // 1. Render to MRT Framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.currentWidth, this.currentHeight);

    gl.useProgram(this.mtrProgram);
    gl.uniform1f(this.mrtUniforms.time, time);
    gl.uniform2f(this.mrtUniforms.resolution, this.currentWidth, this.currentHeight);
    gl.uniform1i(this.mrtUniforms.aluComplexity, aluComplexityIndex);
    gl.uniform1i(this.mrtUniforms.mrtCount, config.mrtCount);

    gl.bindVertexArray(this.vao);

    // Overdraw stress loop
    for (let p = 0; p < passes; p++) {
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // 2. Blit / Present Target to Default Framebuffer (Screen Canvas)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.useProgram(this.blitProgram);

    // Bind texture attachments to texture units 0..3
    for (let i = 0; i < 4; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
    }

    gl.uniform1i(this.blitUniforms.tex0, 0);
    gl.uniform1i(this.blitUniforms.tex1, 1);
    gl.uniform1i(this.blitUniforms.tex2, 2);
    gl.uniform1i(this.blitUniforms.tex3, 3);

    let previewMode = 0;
    if (config.previewTarget === 'target1') previewMode = 1;
    else if (config.previewTarget === 'target2') previewMode = 2;
    else if (config.previewTarget === 'target3') previewMode = 3;
    else if (config.previewTarget === 'split') previewMode = 4;

    // If previewing a target beyond current MRT count and not split, clamp to 0
    if (previewMode < 4 && previewMode >= config.mrtCount) {
      previewMode = 0;
    }

    gl.uniform1i(this.blitUniforms.previewMode, previewMode);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    if (!this.gl) return null;
    const gl = this.gl;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('Vertex Shader Error:', gl.getShaderInfoLog(vs));
      gl.deleteShader(vs);
      return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment Shader Error:', gl.getShaderInfoLog(fs));
      gl.deleteShader(fs);
      return null;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program Link Error:', gl.getProgramInfoLog(prog));
      gl.deleteProgram(prog);
      return null;
    }

    return prog;
  }

  private destroyTextures(): void {
    if (!this.gl) return;
    const gl = this.gl;

    for (let i = 0; i < this.textures.length; i++) {
      if (this.textures[i]) {
        gl.deleteTexture(this.textures[i]);
        this.textures[i] = null;
      }
    }

    if (this.fbo) {
      gl.deleteFramebuffer(this.fbo);
      this.fbo = null;
    }
  }

  public destroyResources(): void {
    this.destroyTextures();
    if (this.gl) {
      if (this.mtrProgram) {
        this.gl.deleteProgram(this.mtrProgram);
        this.mtrProgram = null;
      }
      if (this.blitProgram) {
        this.gl.deleteProgram(this.blitProgram);
        this.blitProgram = null;
      }
      if (this.vbo) {
        this.gl.deleteBuffer(this.vbo);
        this.vbo = null;
      }
      if (this.vao) {
        this.gl.deleteVertexArray(this.vao);
        this.vao = null;
      }
    }
  }

  public destroy(): void {
    this.destroyResources();
    this.gl = null;
  }
}
