import { BenchmarkConfig, GpuDeviceInfo, GraphicsAPI } from '../types/benchmark';

export class WebGL2Engine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  private isWebGL2 = false;
  private extDrawBuffers: any = null; // WEBGL_draw_buffers for WebGL 1.0
  private extColorBufferFloat: any = null;
  private maxDrawBuffers = 1;
  private maxTextureSize = 2048;

  private fbo: WebGLFramebuffer | null = null;
  private textures: (WebGLTexture | null)[] = [null, null, null, null];
  private currentWidth = 0;
  private currentHeight = 0;
  private mtrProgram: WebGLProgram | null = null;
  private blitProgram: WebGLProgram | null = null;
  private vbo: WebGLBuffer | null = null;
  private vao: any = null; // WebGLVertexArrayObject or OES_vertex_array_object
  private hasFloatColorBuffer = false;
  private isContextLost = false;
  private onContextLostCallback?: () => void;
  private onContextRestoredCallback?: () => void;

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
    previewMode: null as WebGLUniformLocation | null,
  };

  constructor(
    canvas: HTMLCanvasElement,
    preferredApi: GraphicsAPI = 'webgl2',
    onContextLost?: () => void,
    onContextRestored?: () => void
  ) {
    this.canvas = canvas;
    this.onContextLostCallback = onContextLost;
    this.onContextRestoredCallback = onContextRestored;

    this.initContext(preferredApi);
  }

  private initContext(preferredApi: GraphicsAPI): boolean {
    const contextAttributes: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    };

    let gl: any = null;

    // 1. Try WebGL 2.0 first if requested
    if (preferredApi === 'webgl2') {
      try {
        gl = this.canvas.getContext('webgl2', contextAttributes);
        if (gl) {
          this.isWebGL2 = true;
        }
      } catch (e) {
        console.warn('WebGL 2.0 context acquisition error:', e);
      }
    }

    // 2. Fallback to WebGL 1.0 (vital for ARM Mali-T628, older Android WebViews, etc.)
    if (!gl) {
      try {
        gl =
          this.canvas.getContext('webgl', contextAttributes) ||
          this.canvas.getContext('experimental-webgl', contextAttributes);
        if (gl) {
          this.isWebGL2 = false;
        }
      } catch (e) {
        console.warn('WebGL 1.0 context acquisition error:', e);
      }
    }

    if (!gl) {
      console.error('Neither WebGL 2.0 nor WebGL 1.0 is available on this browser/hardware.');
      return false;
    }

    this.gl = gl;
    this.isContextLost = false;

    // Query extensions and capabilities
    if (this.isWebGL2) {
      this.extColorBufferFloat = gl.getExtension('EXT_color_buffer_float');
      this.hasFloatColorBuffer = !!this.extColorBufferFloat;
      this.maxDrawBuffers = gl.getParameter(gl.MAX_DRAW_BUFFERS) || 4;
    } else {
      // WebGL 1.0
      this.extDrawBuffers = gl.getExtension('WEBGL_draw_buffers');
      if (this.extDrawBuffers) {
        this.maxDrawBuffers = gl.getParameter(this.extDrawBuffers.MAX_DRAW_BUFFERS_WEBGL) || 4;
      } else {
        this.maxDrawBuffers = 1;
      }

      const halfFloatExt = gl.getExtension('OES_texture_half_float');
      const halfFloatColorExt = gl.getExtension('EXT_color_buffer_half_float');
      this.hasFloatColorBuffer = !!(halfFloatExt && halfFloatColorExt);
    }

    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;

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
      this.initContext(this.isWebGL2 ? 'webgl2' : 'webgl1');
      this.onContextRestoredCallback?.();
    };

    this.canvas.addEventListener('webglcontextlost', handleLost as EventListener, false);
    this.canvas.addEventListener('webglcontextrestored', handleRestored as EventListener, false);
  }

  public getActiveApi(): GraphicsAPI {
    return this.isWebGL2 ? 'webgl2' : 'webgl1';
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
    let renderer = this.isWebGL2 ? 'WebGL 2.0 Hardware' : 'WebGL 1.0 Hardware (Mali/Adreno Legacy)';
    let vendor = 'Generic';

    if (debugInfo) {
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gl.getParameter(gl.RENDERER);
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || gl.getParameter(gl.VENDOR);
    } else {
      renderer = gl.getParameter(gl.RENDERER) || renderer;
      vendor = gl.getParameter(gl.VENDOR) || vendor;
    }

    const features: string[] = [];
    if (this.isWebGL2) {
      features.push('Core WebGL 2.0 (GLES 3.0)');
      if (this.hasFloatColorBuffer) features.push('EXT_color_buffer_float (RGBA16F)');
    } else {
      features.push('Legacy WebGL 1.0 (GLES 2.0)');
      if (this.extDrawBuffers) features.push('WEBGL_draw_buffers (MRT)');
      else features.push('Single Target Only (No MRT)');
    }

    return {
      api: this.isWebGL2 ? 'webgl2' : 'webgl1',
      renderer,
      vendor,
      maxDrawBuffers: this.maxDrawBuffers,
      maxTextureSize: this.maxTextureSize,
      hasFloatColorBuffer: this.hasFloatColorBuffer,
      webgpuSupported: typeof navigator !== 'undefined' && 'gpu' in navigator,
      features,
    };
  }

  private initShaders(): void {
    if (!this.gl) return;
    const gl = this.gl;

    let vsSource = '';
    let fsSource = '';
    let blitFsSource = '';

    if (this.isWebGL2) {
      // --- WebGL 2.0 Shaders (GLSL 3.00 ES) ---
      vsSource = `#version 300 es
      precision highp float;
      layout(location = 0) in vec2 a_position;
      out vec2 v_uv;

      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
      `;

      fsSource = `#version 300 es
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif

      in vec2 v_uv;

      layout(location = 0) out vec4 outTarget0;
      layout(location = 1) out vec4 outTarget1;
      layout(location = 2) out vec4 outTarget2;
      layout(location = 3) out vec4 outTarget3;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform int u_alu_complexity;
      uniform int u_mrt_count;

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
        // Pre-initialize ALL outputs to satisfy Mali compiler (never leave uninitialized outputs)
        outTarget0 = vec4(0.0, 0.0, 0.0, 1.0);
        outTarget1 = vec4(0.0, 0.0, 0.0, 1.0);
        outTarget2 = vec4(0.0, 0.0, 0.0, 1.0);
        outTarget3 = vec4(0.0, 0.0, 0.0, 1.0);

        vec2 uv = v_uv;
        vec2 aspectUv = (uv - 0.5) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
        float t = u_time * 0.8;
        vec2 p = aspectUv * 3.0;

        float aluAccum = 0.0;
        if (u_alu_complexity == 0) {
          aluAccum = sin(p.x * 4.0 + t) * cos(p.y * 4.0 - t);
        } else if (u_alu_complexity == 1) {
          float d = length(aspectUv);
          aluAccum = sin(d * 18.0 - t * 3.0) + cos(aspectUv.x * 12.0 + t) * sin(aspectUv.y * 12.0 - t);
          aluAccum += noise(uv * 8.0 + vec2(t * 0.2));
        } else {
          vec2 q = uv * 6.0;
          float amp = 1.0;
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
          for (int i = 0; i < 7; i++) {
            aluAccum += amp * noise(q + vec2(t * 0.3, -t * 0.2));
            q = rot * q * 2.02 + vec2(float(i) * 1.7);
            amp *= 0.5;
          }
          aluAccum += sin(aspectUv.x * 24.0 + aluAccum * 3.0) * cos(aspectUv.y * 24.0 - aluAccum * 3.0);
        }

        // Target 0: Albedo
        vec3 colA = vec3(0.08, 0.45, 0.95);
        vec3 colB = vec3(0.98, 0.32, 0.15);
        vec3 colC = vec3(0.12, 0.85, 0.55);
        float pattern = 0.5 + 0.5 * sin(p.x * 3.0 + aluAccum * 1.5 + t);
        vec3 albedo = mix(colA, mix(colB, colC, sin(t * 0.5) * 0.5 + 0.5), pattern);
        outTarget0 = vec4(albedo, 1.0);

        if (u_mrt_count > 1) {
          vec2 nGrad = vec2(sin(p.x * 5.0 + t + aluAccum), cos(p.y * 5.0 - t + aluAccum)) * 0.6;
          vec3 normal = normalize(vec3(nGrad, 1.0));
          float roughness = clamp(0.1 + 0.8 * abs(sin(aluAccum * 2.0 + t * 0.5)), 0.05, 0.95);
          outTarget1 = vec4(normal * 0.5 + 0.5, roughness);

          if (u_mrt_count > 2) {
            float metallic = clamp(sin(p.y * 4.0 - t * 0.7) * 0.5 + 0.5, 0.0, 1.0);
            float ao = clamp(1.0 - length(aspectUv) * 0.4 + aluAccum * 0.15, 0.2, 1.0);
            outTarget2 = vec4(metallic, ao, 0.5, abs(normal.x * normal.y));

            if (u_mrt_count > 3) {
              vec2 fw = max(fwidth(aspectUv * 6.0), vec2(0.001));
              vec2 grid = abs(fract(aspectUv * 6.0 - vec2(t * 0.2, t * 0.1)) - 0.5) / fw;
              float line = min(grid.x, grid.y);
              float emissiveMask = 1.0 - min(line, 1.0);
              vec3 emissive = vec3(0.2, 0.9, 1.0) * emissiveMask * 2.5;
              vec2 velocity = vec2(sin(t), cos(t)) * 0.016;
              outTarget3 = vec4(emissive.xy + velocity, emissive.z, 1.0);
            }
          }
        }
      }
      `;

      blitFsSource = `#version 300 es
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif

      in vec2 v_uv;
      out vec4 fragColor;

      uniform sampler2D u_tex0;
      uniform sampler2D u_tex1;
      uniform sampler2D u_tex2;
      uniform sampler2D u_tex3;
      uniform int u_preview_mode;

      void main() {
        vec2 uv = v_uv;
        if (u_preview_mode == 0) {
          fragColor = texture(u_tex0, uv);
        } else if (u_preview_mode == 1) {
          fragColor = texture(u_tex1, uv);
        } else if (u_preview_mode == 2) {
          fragColor = vec4(texture(u_tex2, uv).rgb, 1.0);
        } else if (u_preview_mode == 3) {
          fragColor = vec4(texture(u_tex3, uv).rgb, 1.0);
        } else {
          vec2 subUv = fract(uv * 2.0);
          float border = 1.0;
          if (abs(uv.x - 0.5) < 0.003 || abs(uv.y - 0.5) < 0.003) {
            border = 0.0;
          }
          vec4 col = vec4(0.0);
          if (uv.x < 0.5 && uv.y >= 0.5) {
            col = texture(u_tex0, subUv);
          } else if (uv.x >= 0.5 && uv.y >= 0.5) {
            col = texture(u_tex1, subUv);
          } else if (uv.x < 0.5 && uv.y < 0.5) {
            col = vec4(texture(u_tex2, subUv).rgb, 1.0);
          } else {
            col = vec4(texture(u_tex3, subUv).rgb, 1.0);
          }
          fragColor = col * border;
        }
      }
      `;
    } else {
      // --- WebGL 1.0 Shaders (GLSL 1.00 ES for Mali-T628 / Legacy WebViews) ---
      vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
      `;

      const hasDrawBuffers = !!this.extDrawBuffers;
      const extHeader = hasDrawBuffers ? '#extension GL_EXT_draw_buffers : require\n' : '';

      fsSource = `
      ${extHeader}
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif

      varying vec2 v_uv;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform int u_alu_complexity;
      uniform int u_mrt_count;

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
        vec2 aspectUv = (uv - 0.5) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
        float t = u_time * 0.8;
        vec2 p = aspectUv * 3.0;

        float aluAccum = sin(p.x * 4.0 + t) * cos(p.y * 4.0 - t);
        if (u_alu_complexity >= 1) {
          float d = length(aspectUv);
          aluAccum += sin(d * 18.0 - t * 3.0);
          aluAccum += noise(uv * 8.0 + vec2(t * 0.2));
        }

        vec3 colA = vec3(0.08, 0.45, 0.95);
        vec3 colB = vec3(0.98, 0.32, 0.15);
        float pattern = 0.5 + 0.5 * sin(p.x * 3.0 + aluAccum * 1.5 + t);
        vec3 albedo = mix(colA, colB, pattern);
        vec4 t0 = vec4(albedo, 1.0);

        vec2 nGrad = vec2(sin(p.x * 5.0 + t), cos(p.y * 5.0 - t)) * 0.6;
        vec3 normal = normalize(vec3(nGrad, 1.0));
        vec4 t1 = vec4(normal * 0.5 + 0.5, 0.5);

        vec4 t2 = vec4(0.8, 0.9, 0.5, 1.0);
        vec4 t3 = vec4(albedo * 1.5, 1.0);

        #if defined(GL_EXT_draw_buffers)
          gl_FragData[0] = t0;
          if (u_mrt_count > 1) gl_FragData[1] = t1;
          if (u_mrt_count > 2) gl_FragData[2] = t2;
          if (u_mrt_count > 3) gl_FragData[3] = t3;
        #else
          gl_FragColor = t0;
        #endif
      }
      `;

      blitFsSource = `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif

      varying vec2 v_uv;
      uniform sampler2D u_tex0;
      uniform sampler2D u_tex1;
      uniform sampler2D u_tex2;
      uniform sampler2D u_tex3;
      uniform int u_preview_mode;

      void main() {
        vec2 uv = v_uv;
        if (u_preview_mode == 0) {
          gl_FragColor = texture2D(u_tex0, uv);
        } else if (u_preview_mode == 1) {
          gl_FragColor = texture2D(u_tex1, uv);
        } else if (u_preview_mode == 2) {
          gl_FragColor = texture2D(u_tex2, uv);
        } else if (u_preview_mode == 3) {
          gl_FragColor = texture2D(u_tex3, uv);
        } else {
          vec2 subUv = fract(uv * 2.0);
          float border = 1.0;
          if (abs(uv.x - 0.5) < 0.003 || abs(uv.y - 0.5) < 0.003) border = 0.0;
          vec4 col = vec4(0.0);
          if (uv.x < 0.5 && uv.y >= 0.5) col = texture2D(u_tex0, subUv);
          else if (uv.x >= 0.5 && uv.y >= 0.5) col = texture2D(u_tex1, subUv);
          else if (uv.x < 0.5 && uv.y < 0.5) col = texture2D(u_tex2, subUv);
          else col = texture2D(u_tex3, subUv);
          gl_FragColor = col * border;
        }
      }
      `;
    }

    this.mtrProgram = this.createProgram(vsSource, fsSource);
    if (this.mtrProgram) {
      this.mrtUniforms.time = gl.getUniformLocation(this.mtrProgram, 'u_time');
      this.mrtUniforms.resolution = gl.getUniformLocation(this.mtrProgram, 'u_resolution');
      this.mrtUniforms.aluComplexity = gl.getUniformLocation(this.mtrProgram, 'u_alu_complexity');
      this.mrtUniforms.mrtCount = gl.getUniformLocation(this.mtrProgram, 'u_mrt_count');
    }

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

    // Use standard 4-vertex TRIANGLE_STRIP quad (-1 to 1) for universal mobile GPU compatibility
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0,
    ]);

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    if (this.isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      this.vao = gl2.createVertexArray();
      gl2.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl2.bindVertexArray(null);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  public updateTargets(width: number, height: number, config: BenchmarkConfig): boolean {
    if (!this.gl || this.isContextLost) return false;
    const gl = this.gl;

    this.destroyTextures();

    this.currentWidth = width;
    this.currentHeight = height;

    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

    // Limit active targets to device hardware maxDrawBuffers
    const effectiveMrtCount = Math.min(config.mrtCount, this.maxDrawBuffers);
    const drawBuffers: number[] = [];

    for (let i = 0; i < effectiveMrtCount; i++) {
      const formatOption = config.formats[i];
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      let internalFormat: number = gl.RGBA;
      let format: number = gl.RGBA;
      let type: number = gl.UNSIGNED_BYTE;

      if (this.isWebGL2) {
        const gl2 = gl as WebGL2RenderingContext;
        internalFormat = gl2.RGBA8;
        if (formatOption === 'RGBA16F' && this.hasFloatColorBuffer) {
          internalFormat = gl2.RGBA16F;
          type = gl2.HALF_FLOAT;
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

      let attachment = gl.COLOR_ATTACHMENT0;
      if (this.isWebGL2) {
        attachment = (gl as WebGL2RenderingContext).COLOR_ATTACHMENT0 + i;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, tex, 0);
        drawBuffers.push(attachment);
      } else if (this.extDrawBuffers) {
        attachment = this.extDrawBuffers.COLOR_ATTACHMENT0_WEBGL + i;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, tex, 0);
        drawBuffers.push(attachment);
      } else {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        drawBuffers.push(gl.COLOR_ATTACHMENT0);
      }

      this.textures[i] = tex;
    }

    // Allocate 1x1 dummy black textures with EXPLICIT NEAREST filters for unused slots
    // This prevents incomplete texture errors on Mali and PowerVR!
    for (let i = effectiveMrtCount; i < 4; i++) {
      const dummy = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, dummy);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255])
      );
      this.textures[i] = dummy;
    }

    if (this.isWebGL2) {
      (gl as WebGL2RenderingContext).drawBuffers(drawBuffers);
    } else if (this.extDrawBuffers && drawBuffers.length > 0) {
      this.extDrawBuffers.drawBuffersWEBGL(drawBuffers);
    }

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.warn('Framebuffer status not complete:', status);
      return false;
    }

    return true;
  }

  public render(time: number, config: BenchmarkConfig): void {
    if (!this.gl || this.isContextLost || !this.fbo || !this.mtrProgram || !this.blitProgram) return;
    const gl = this.gl;

    const aluComplexityIndex = config.aluComplexity === 'low' ? 0 : config.aluComplexity === 'medium' ? 1 : 2;
    const passes = Math.max(1, config.passes || 1);
    const effectiveMrtCount = Math.min(config.mrtCount, this.maxDrawBuffers);

    // 1. Render to MRT Framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.currentWidth, this.currentHeight);

    gl.useProgram(this.mtrProgram);
    gl.uniform1f(this.mrtUniforms.time, time);
    gl.uniform2f(this.mrtUniforms.resolution, this.currentWidth, this.currentHeight);
    gl.uniform1i(this.mrtUniforms.aluComplexity, aluComplexityIndex);
    gl.uniform1i(this.mrtUniforms.mrtCount, effectiveMrtCount);

    if (this.isWebGL2 && this.vao) {
      (gl as WebGL2RenderingContext).bindVertexArray(this.vao);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    }

    // Overdraw passes
    for (let p = 0; p < passes; p++) {
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // 2. Blit / Present Target to Default Framebuffer (Screen Canvas)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.useProgram(this.blitProgram);

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

    if (previewMode < 4 && previewMode >= effectiveMrtCount) {
      previewMode = 0;
    }

    gl.uniform1i(this.blitUniforms.previewMode, previewMode);

    if (this.isWebGL2 && this.vao) {
      (gl as WebGL2RenderingContext).bindVertexArray(this.vao);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (this.isWebGL2 && this.vao) {
      (gl as WebGL2RenderingContext).bindVertexArray(null);
    }
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    if (!this.gl) return null;
    const gl = this.gl;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) return null;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('Vertex Shader Error:', gl.getShaderInfoLog(vs));
      gl.deleteShader(vs);
      return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) {
      gl.deleteShader(vs);
      return null;
    }
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment Shader Error:', gl.getShaderInfoLog(fs));
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    const prog = gl.createProgram();
    if (!prog) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }
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
      if (this.isWebGL2 && this.vao) {
        (this.gl as WebGL2RenderingContext).deleteVertexArray(this.vao);
        this.vao = null;
      }
    }
  }

  public destroy(): void {
    this.destroyResources();
    this.gl = null;
  }
}
