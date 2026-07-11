const drawShader = `
    uniform sampler2D inputTexture;
    uniform vec4 color;
    uniform vec2 from;
    uniform float scale;
    uniform float dpr;
    uniform vec2 to;
    uniform float radiusSquared;
    uniform vec2 resolution;
    uniform bool drawing;
    uniform bool indicator;
    
    in vec2 vUv;
    out vec4 FragColor;
    
    float sdfLineSquared(vec2 p, vec2 from, vec2 to) {
      vec2 toStart = p - from;
      vec2 line = to - from;
      float lineLengthSquared = dot(line, line);
      float t = clamp(dot(toStart, line) / lineLengthSquared, 0.0, 1.0);
      vec2 closestVector = toStart - line * t;
      return dot(closestVector, closestVector);
    }
    
    void main() {
      // Early return si pas de dessin
      if (!drawing) {
        FragColor = textureLod(inputTexture, vUv, 0.0);
        return;
      }
      
      float coef = scale;
      float dprs = dpr * dpr;
      float rsdp = radiusSquared / dprs;
      float partial = rsdp * coef * coef;
      float maxRadius = 100.0;
      float rs = scale > 1.0
        ? partial + max(dprs, min(dpr * (maxRadius + 1.0), partial * 0.1))
        : rsdp;
    
      vec2 coord = vUv * resolution;
      vec4 current = textureLod(inputTexture, vUv, 0.0);
      
      float distSquared = sdfLineSquared(coord * coef, from * coef, to * coef);
      
      if (distSquared <= rs) {
        if (!indicator || color.a > 0.01) {
          FragColor = vec4(color.rgb * color.a, color.a);
          return;
        }
      } else if (color.a < 0.01 && indicator && distSquared <= rs * 1.5) {
        FragColor = vec4(1.0);
        return;
      } else if (length(current.rgb) < 0.1 && indicator && distSquared <= (rs + 6.0 / dprs)) {
        FragColor = vec4(1.0);
        return;
      }
    
      FragColor = current;
    }
`;

const rcShader = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec2 resolution;
    uniform sampler2D sceneTexture;
    uniform sampler2D distanceTexture;
    uniform sampler2D lastTexture;
    uniform vec2 cascadeExtent;
    uniform float cascadeCount;
    uniform float cascadeIndex;
    uniform float basePixelsBetweenProbes;
    uniform float cascadeInterval;
    uniform float rayInterval;
    uniform float intervalOverlap;
    uniform bool addNoise;
    uniform bool enableSun;
    uniform float sunAngle;
    uniform float srgb;
    uniform float firstCascadeIndex;
    uniform float baseRayCount;
    uniform bool bilinearFixEnabled;
    
    in vec2 vUv;
    out vec3 FragColor;
    
    const float SQRT_2 = 1.41;
    const float PI = 3.14159265;
    const float TAU = 6.28318530;
    const float goldenAngle = 2.39996322;
    const float sunDistance = 1.0;
    
    const vec3 skyColor = vec3(0.8, 0.96, 1.4);
    const vec3 sunColor = vec3(2.85, 2.7, 2.4);
    
    vec3 sunAndSky(float rayAngle) {
      float angleToSun = mod(rayAngle - sunAngle, TAU);
      float sunIntensity = pow(max(0.0, cos(angleToSun)), 4.0 / sunDistance);
      return mix(sunColor * sunIntensity, skyColor, 0.3);
    }
    
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    vec4 raymarch(vec2 rayStart, vec2 rayEnd, float scale, vec2 oneOverSize, float minStepSize) {
      vec2 rayDir = normalize(rayEnd - rayStart);
      float rayLength = length(rayEnd - rayStart);
      vec2 rayUv = rayStart * oneOverSize;
      
      for (float dist = 0.0; dist < rayLength;) {
        // Bounds check optimisÃ©
        if (any(lessThan(rayUv, vec2(0.0))) || any(greaterThan(rayUv, vec2(1.0))))
          break;
    
        float df = textureLod(distanceTexture, rayUv, 0.0).r;
    
        if (df <= minStepSize) {
          vec4 sampleLight = textureLod(sceneTexture, rayUv, 0.0);
          sampleLight.rgb = pow(sampleLight.rgb, vec3(srgb));
          return sampleLight;
        }
    
        float step = df * scale;
        dist += step;
        rayUv += rayDir * (step * oneOverSize);
      }
    
      return vec4(0.0);
    }
    
    vec2 getUpperCascadeTextureUv(float index, vec2 offset, float spacingBase) {
      float upperSpacing = pow(spacingBase, cascadeIndex + 1.0);
      vec2 upperSize = floor(cascadeExtent / upperSpacing);
      vec2 upperPosition = vec2(
        mod(index, upperSpacing),
        floor(index / upperSpacing)
      ) * upperSize;
    
      vec2 clamped = clamp(offset, vec2(0.5), upperSize - 0.5);
      return (upperPosition + clamped) / cascadeExtent;
    }
    
    vec4 merge(vec4 currentRadiance, float index, vec2 position, float spacingBase, vec2 localOffset) {
      if (currentRadiance.a > 0.0 || cascadeIndex >= max(1.0, cascadeCount - 1.0)) {
        return currentRadiance;
      }
    
      vec2 offset = (position + localOffset) / spacingBase;
      vec2 upperProbePosition = getUpperCascadeTextureUv(index, offset, spacingBase);
    
      vec3 upperSample = textureLod(
        lastTexture,
        upperProbePosition,
        basePixelsBetweenProbes == 1.0 ? 0.0 : log(basePixelsBetweenProbes) / log(2.0)
      ).rgb;
    
      return currentRadiance + vec4(upperSample, 1.0);
    }
    
    void main() {
      vec2 coord = floor(vUv * cascadeExtent);
    
      float base = baseRayCount;
      float rayCount = pow(base, cascadeIndex + 1.0);
      float spacingBase = sqrt(baseRayCount);
      float spacing = pow(spacingBase, cascadeIndex);
    
      float modifierHack = base < 16.0 ? basePixelsBetweenProbes : spacingBase;
    
      vec2 size = floor(cascadeExtent / spacing);
      vec2 probeRelativePosition = mod(coord, size);
      vec2 rayPos = floor(coord / size);
    
      float modifiedInterval = modifierHack * rayInterval * cascadeInterval;
    
      float start = (cascadeIndex == 0.0 ? 0.0 : pow(base, cascadeIndex - 1.0)) * modifiedInterval;
      float end = ((1.0 + 3.0 * intervalOverlap) * pow(base, cascadeIndex) - cascadeIndex * cascadeIndex) * modifiedInterval;
    
      vec2 interval = vec2(start, end);
      vec2 probeCenter = (probeRelativePosition + 0.5) * basePixelsBetweenProbes * spacing;
    
      float preAvgAmt = baseRayCount;
      float baseIndex = (rayPos.x + spacing * rayPos.y) * preAvgAmt;
      float angleStep = TAU / rayCount;
    
      float scale = min(resolution.x, resolution.y);
      vec2 oneOverSize = 1.0 / resolution;
      float minStepSize = min(oneOverSize.x, oneOverSize.y) * 0.5;
      float avgRecip = 1.0 / preAvgAmt;
    
      vec4 totalRadiance = vec4(0.0);
      float noise = addNoise ? rand(vUv * (cascadeIndex + 1.0)) : 0.0;
    
      // Loop optimisÃ© - unroll partiel pour rÃ©duire les branches
      for (float i = 0.0; i < preAvgAmt; i += 1.0) {
        float index = baseIndex + i;
        float angle = (index + 0.5 + noise) * angleStep;
        vec2 rayDir = vec2(cos(angle), -sin(angle));
        vec2 rayStart = probeCenter + rayDir * interval.x;
        vec2 rayEnd = rayStart + rayDir * interval.y;
        
        vec4 raymarched = raymarch(rayStart, rayEnd, scale, oneOverSize, minStepSize);
        vec4 mergedRadiance = merge(raymarched, index, probeRelativePosition, spacingBase, vec2(0.5));
    
        if (enableSun && cascadeIndex == cascadeCount - 1.0) {
          mergedRadiance.rgb = max(sunAndSky(angle), mergedRadiance.rgb);
        }
    
        totalRadiance += mergedRadiance * avgRecip;
      }
    
      FragColor = (cascadeIndex > firstCascadeIndex)
        ? totalRadiance.rgb
        : pow(totalRadiance.rgb, vec3(1.0 / srgb));
    }
`;

const instantMode = false;

// Pool d'objets pour Ã©viter les allocations
class ObjectPool {
  constructor(factory, initialSize = 10) {
    this.factory = factory;
    this.pool = [];
    this.active = new Set();

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire() {
    let obj = this.pool.pop();
    if (!obj) {
      obj = this.factory();
    }
    this.active.add(obj);
    return obj;
  }

  release(obj) {
    if (this.active.has(obj)) {
      this.active.delete(obj);
      this.pool.push(obj);
    }
  }

  clear() {
    this.pool.length = 0;
    this.active.clear();
  }
}

class GPUTimer {
  constructor(gl, disabled = true) {
    this.gl = gl;
    this.ext = !disabled && this.gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (!this.ext) {
      console.warn('EXT_disjoint_timer_query_webgl2 not available');
    }
    this.queries = new Map();
    this.results = new Map();
    this.lastPrintTime = Date.now();
    this.printInterval = 1000;
  }

  start(id) {
    if (!this.ext) return;
    const query = this.gl.createQuery();
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    if (!this.queries.has(id)) {
      this.queries.set(id, []);
    }
    this.queries.get(id).push(query);
  }

  end(id) {
    if (!this.ext) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
  }

  update() {
    if (!this.ext) return;
    for (const [id, queryList] of this.queries) {
      const completedQueries = [];
      for (let i = queryList.length - 1; i >= 0; i--) {
        const query = queryList[i];
        const available = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE);
        const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);

        if (available && !disjoint) {
          const timeElapsed = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT);
          const timeMs = timeElapsed / 1000000;

          if (!this.results.has(id)) {
            this.results.set(id, []);
          }
          this.results.get(id).push(timeMs);

          completedQueries.push(query);
          queryList.splice(i, 1);
        }
      }

      completedQueries.forEach(query => this.gl.deleteQuery(query));
    }

    const now = Date.now();
    if (now - this.lastPrintTime > this.printInterval) {
      this.printAverages();
      this.lastPrintTime = now;
    }
  }

  printAverages() {
    if (!this.ext) return;
    console.log('--- GPU Timing Averages ---');
    for (const [id, times] of this.results) {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        console.log(`${id}: ${avg.toFixed(2)}ms (${times.length} samples)`);
      }
    }
    console.log('---------------------------');
  }
}

const isMobile = (() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
})();

const vertexShader = `
in vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: result[4] ? parseInt(result[4], 16) : 255,
  } : null;
}

function rgbToHex(r, g, b, a) {
  if (a !== undefined) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1) +
      Math.round(a * 255).toString(16).padStart(2, '0');
  }
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

class PaintableCanvas {
  constructor({ width, height, initialColor = 'transparent', radius = 6, friction = 0.2 }) {
    this.isDrawing = false;
    this.currentMousePosition = { x: 0, y: 0 };
    this.lastPoint = { x: 0, y: 0 };
    this.currentPoint = { x: 0, y: 0 };
    this.fromToRender = undefined;
    this.mouseMoved = false;
    this.currentColor = { r: 255, g: 255, b: 255, a: 255 };
    this.RADIUS = radius;
    this.FRICTION = friction;
    this.width = width;
    this.height = height;
    this.initialColor = initialColor;
    this.onUpdateTextures = () => { };
    this.drawSmoothLine = (from, to) => {
      throw new Error("Missing implementation");
    }
  }

  updateTexture() {
    this.texture.needsUpdate = true;
    this.onUpdateTextures();
  }

  startDrawing(e) {
    this.isDrawing = true;
    this.currentMousePosition = this.lastPoint = this.currentPoint = this.getMousePos(e);
    try {
      this.onMouseMove(e);
    } catch (e) {
      console.error(e);
    }
    this.mouseMoved = false;
  }

  stopDrawing(e, redraw) {
    const wasDrawing = this.isDrawing;
    if (!wasDrawing) {
      return false;
    }
    if (!this.mouseMoved) {
      this.drawSmoothLine(this.currentPoint, this.currentPoint);
    } else if (redraw) {
      this.drawSmoothLine(this.currentPoint, this.getMousePos(e));
    }
    this.isDrawing = false;
    this.mouseMoved = false;
    return true;
  }

  onMouseMove(event) {
    if (!this.isDrawing) {
      this.currentMousePosition = this.lastPoint = this.currentPoint = this.getMousePos(event);
      return false;
    } else {
      this.currentMousePosition = this.getMousePos(event);
    }

    this.mouseMoved = true;
    this.doDraw();
    return true;
  }

  doDraw() {
    const newPoint = this.currentMousePosition;
    let dist = this.distance(this.currentPoint, newPoint);

    if (dist > 0) {
      let dir = {
        x: (newPoint.x - this.currentPoint.x) / dist,
        y: (newPoint.y - this.currentPoint.y) / dist
      };
      let len = Math.max(dist - Math.sqrt(this.RADIUS), 0);
      let ease = 1 - Math.pow(this.FRICTION, 1 / 60 * 10);
      this.currentPoint = {
        x: this.currentPoint.x + dir.x * len * ease,
        y: this.currentPoint.y + dir.y * len * ease
      };
    } else {
      this.currentPoint = newPoint;
    }

    this.drawSmoothLine(this.lastPoint, this.currentPoint);
  }

  getMousePos(e) {
    e.preventDefault();

    const { width, height } = e.target.style;
    const dx = width ? this.width / parseInt(width) : 1.0;
    const dy = height ? this.height / parseInt(height) : 1.0;

    if (e.touches) {
      return {
        x: (e.touches[0].clientX - (e.touches[0].target.offsetLeft - window.scrollX)) * dx,
        y: (e.touches[0].clientY - (e.touches[0].target.offsetTop - window.scrollY)) * dy
      };
    }

    return {
      x: (e.clientX - (e.target.offsetLeft - window.scrollX)) * dx,
      y: (e.clientY - (e.target.offsetTop - window.scrollY)) * dy
    };
  }

  distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  setColor(r, g, b, a) {
    this.currentColor = { r, g, b, a };
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.currentImageData = new ImageData(this.canvas.width, this.canvas.height);
    this.updateTexture();
  }
}

const prefix = `#version 300 es
precision highp float;
precision highp int;
`;

const vertexShaderDefault = `${prefix}
in vec2 position;
out vec2 vUv;
void main() {
    vUv = 0.5 * (position + 1.0);
    gl_Position = vec4(position, 0.0, 1.0);
}`;

class Pass {
  constructor(w, quad, materialProperties) {
    const { fragmentShader, vertexShader, uniforms, name } = materialProperties;
    this.vertexShader = vertexShader ?? vertexShaderDefault;
    this.fragmentShader = fragmentShader;
    this.program = w.createProgram(
      this.vertexShader,
      `${prefix}${this.fragmentShader}`
    );
    this.uniforms = uniforms;
    this.quad = quad;
    this.name = name;
    w.programs.set(name, this.program);
    this.w = w;

    // Cache uniform locations
    this.uniformLocations = new Map();
    this.cacheUniformLocations();
  }

  cacheUniformLocations() {
    const gl = this.w.gl;
    const numUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);

    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(this.program, i);
      const location = gl.getUniformLocation(this.program, info.name);
      this.uniformLocations.set(info.name, { location, info });
    }
  }

  updateFragmentShader(fragmentShader) {
    this.fragmentShader = fragmentShader;
    this.program = this.w.createProgram(
      this.vertexShader,
      `${prefix}${this.fragmentShader}`
    );
    this.w.programs.set(this.name, this.program);
    this.cacheUniformLocations();
  }

  set(updates) {
    Object.assign(this.uniforms, updates);
  }

  render(overrides = {}) {
    this.w.render(
      this.name,
      {
        ...this.uniforms,
        ...overrides
      },
      { position: this.quad },
      this.uniformLocations
    );
  }
}

class Pipeline {
  constructor(w, quad) {
    this.w = w;
    this.quad = quad;
    this.passes = {};
  }

  createPass(materialProperties) {
    const { name } = materialProperties;
    const passName = `pass-${Object.keys(this.passes).length}:-${name ?? ""}`;
    const pass = new Pass(
      this.w,
      this.quad,
      {
        ...materialProperties,
        name: passName,
      },
    );
    this.passes[passName] = pass;
    return pass;
  }
}

class RenderTarget {
  constructor(gl, name, texture, framebuffer) {
    this.gl = gl;
    this.name = name;
    this.texture = texture;
    this.framebuffer = framebuffer;
  }

  updateFilters({ minFilter, magFilter }) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, magFilter);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}

class WebGL2MicroLayer {
  constructor(canvas) {
    this.gl = canvas.getContext('webgl2', {
      antialiasing: false,
      alpha: false,
      powerPreference: 'high-performance',
      desynchronized: true
    });
    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }

    const extF = this.gl.getExtension("EXT_color_buffer_float");
    const extHF = this.gl.getExtension("EXT_color_buffer_half_float");
    const extFL = this.gl.getExtension("OES_texture_float_linear");

    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.disable(this.gl.BLEND);
    this.gl.disable(this.gl.SCISSOR_TEST);
    this.gl.clearDepth(1.0);
    this.gl.colorMask(true, true, true, true);

    this.programs = new Map();
    this.framebuffers = new Map();

    this.defaultRenderTargetProps = {
      minFilter: this.gl.NEAREST,
      magFilter: this.gl.NEAREST,
      internalFormat: this.gl.RGBA16F,
      format: this.gl.RGBA,
      type: this.gl.HALF_FLOAT
    }
    this.renderTargets = {};

    // State tracking pour minimiser les changements
    this.currentProgram = null;
    this.currentFramebuffer = null;
    this.textureUnitCounter = 0;
  }

  createProgram(vertexShaderSource, fragmentShaderSource) {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(program));
    }

    return program;
  }

  addLineNumbers(source) {
    return source.split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n');
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader) + `\n${this.addLineNumbers(source)}`);
    }

    return shader;
  }

  createRenderTarget(width, height, overrides = {}, name = undefined) {
    const props = {
      ...(this.defaultRenderTargetProps),
      ...overrides
    };
    const {
      generateMipmaps,
      minFilter,
      magFilter,
      internalFormat,
      format,
      type
    } = props;
    const gl = this.gl;

    const renderTargetName = name ?? `rt-${Object.keys(this.renderTargets).length}`;

    const framebuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, magFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);

    const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Framebuffer is not complete: ' + status);
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    this.framebuffers.set(renderTargetName, { framebuffer, texture, width, height });
    this.renderTargets[renderTargetName] = new RenderTarget(
      this.gl, renderTargetName, texture, framebuffer
    );
    this.renderTargets[renderTargetName].renderTargetProps = props;
    return this.renderTargets[renderTargetName];
  }

  resizeRenderTarget(renderTarget, width, height) {
    if (!renderTarget || !renderTarget.texture) return;

    const gl = this.gl;
    const targetInfo = this.framebuffers.get(renderTarget.name);

    if (targetInfo) {
      targetInfo.width = width;
      targetInfo.height = height;
    }

    const rtProps = renderTarget.renderTargetProps || this.defaultRenderTargetProps;

    gl.bindTexture(gl.TEXTURE_2D, renderTarget.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, rtProps.internalFormat, width, height, 0, rtProps.format, rtProps.type, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  setRenderTargetInternal(name, autoClear = true) {
    if (name === null) {
      if (this.currentFramebuffer !== null) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.currentFramebuffer = null;
      }
    } else {
      const target = this.framebuffers.get(name);
      if (!target) {
        throw new Error(`Render target "${name}" not found`);
      }
      if (this.currentFramebuffer !== target.framebuffer) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.framebuffer);
        this.gl.viewport(0, 0, target.width, target.height);
        this.currentFramebuffer = target.framebuffer;
      }
    }
  }

  setRenderTarget(renderTarget, autoClear = true) {
    return this.setRenderTargetInternal(renderTarget?.name ?? null, autoClear);
  }

  clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);
  }

  getRenderTargetTexture(name) {
    const target = this.framebuffers.get(name);
    if (!target) {
      throw new Error(`Render target "${name}" not found`);
    }
    return target.texture;
  }

  setUniform(gl, textureUnits, uniforms, program, name, value, cachedLocations) {
    let location, uniformInfo;

    if (cachedLocations && cachedLocations.has(name)) {
      const cached = cachedLocations.get(name);
      location = cached.location;
      uniformInfo = cached.info;
    } else {
      location = gl.getUniformLocation(program, name);
      if (location === null) {
        return;
      }
    }

    if (!uniformInfo) {
      return;
    }

    const { type } = uniformInfo;

    function ensureTypedArray(arr, Type) {
      return arr instanceof Type ? arr : new Type(arr);
    }

    switch (type) {
      case gl.FLOAT:
        gl.uniform1f(location, value);
        break;
      case gl.INT:
      case gl.BOOL:
        gl.uniform1i(location, value);
        break;
      case gl.FLOAT_VEC2:
        gl.uniform2fv(location, ensureTypedArray(value, Float32Array));
        break;
      case gl.FLOAT_VEC3:
        gl.uniform3fv(location, ensureTypedArray(value, Float32Array));
        break;
      case gl.FLOAT_VEC4:
        gl.uniform4fv(location, ensureTypedArray(value, Float32Array));
        break;
      case gl.INT_VEC2:
      case gl.BOOL_VEC2:
        gl.uniform2iv(location, ensureTypedArray(value, Int32Array));
        break;
      case gl.INT_VEC3:
      case gl.BOOL_VEC3:
        gl.uniform3iv(location, ensureTypedArray(value, Int32Array));
        break;
      case gl.INT_VEC4:
      case gl.BOOL_VEC4:
        gl.uniform4iv(location, ensureTypedArray(value, Int32Array));
        break;
      case gl.FLOAT_MAT2:
        gl.uniformMatrix2fv(location, false, ensureTypedArray(value, Float32Array));
        break;
      case gl.FLOAT_MAT3:
        gl.uniformMatrix3fv(location, false, ensureTypedArray(value, Float32Array));
        break;
      case gl.FLOAT_MAT4:
        gl.uniformMatrix4fv(location, false, ensureTypedArray(value, Float32Array));
        break;
      case gl.SAMPLER_2D:
      case gl.SAMPLER_CUBE:
        const textureUnit = textureUnits.length;
        this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
        textureUnits.push(textureUnit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, value);
        this.gl.uniform1i(location, textureUnit);
        if (value != null) {
          this.gl.generateMipmap(this.gl.TEXTURE_2D);
        }
        break;
      default:
        if (type === gl.FLOAT && uniformInfo.size > 1) {
          gl.uniform1fv(location, ensureTypedArray(value, Float32Array));
        } else if ((type === gl.INT || type === gl.BOOL) && uniformInfo.size > 1) {
          gl.uniform1iv(location, ensureTypedArray(value, Int32Array));
        }
        break;
    }
  }

  render(programName, uniforms = {}, attributes = {}, cachedLocations = null) {
    const program = this.programs.get(programName);
    if (!program) {
      throw new Error(`Program "${programName}" not found`);
    }

    if (this.currentProgram !== program) {
      this.gl.useProgram(program);
      this.currentProgram = program;
    }

    const textureUnits = [];

    for (const [name, value] of Object.entries(uniforms)) {
      this.setUniform(this.gl, textureUnits, uniforms, program, name, value, cachedLocations);
    }

    for (const [name, value] of Object.entries(attributes)) {
      const location = this.gl.getAttribLocation(program, name);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, value.buffer);
      this.gl.enableVertexAttribArray(location);
      this.gl.vertexAttribPointer(location, value.size, this.gl.FLOAT, false, 0, 0);
    }

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  createFullscreenQuad() {
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      this.gl.STATIC_DRAW
    );
    return { buffer, size: 2 };
  }

  createPipeline() {
    const fullscreenQuad = this.createFullscreenQuad();
    return new Pipeline(this, fullscreenQuad);
  }
}

function webGlContext() {
  const canvas = document.createElement('canvas');
  const w = new WebGL2MicroLayer(canvas);
  const pipeline = w.createPipeline();
  return { w, canvas, pipeline };
}

function webGlInit(
  context,
  width,
  height,
  materialProperties,
  renderTargetOverrides = {},
  extra = {}
) {
  const { w, pipeline, canvas } = context;
  const dpr = extra.dpr || window.devicePixelRatio || 1;
  const scaling = dpr;
  const scale = extra.scale ? scaling : 1.0;
  const canvasScale = extra.canvasScale ?? 1.0;

  canvas.width = width * scaling;
  canvas.height = height * scaling;
  canvas.style.width = `${width * canvasScale}px`;
  canvas.style.height = `${height * canvasScale}px`;

  const renderTargetProps = {
    minFilter: w.gl.NEAREST,
    magFilter: w.gl.NEAREST,
    internalFormat: w.gl.RGBA16F,
    format: w.gl.RGBA,
    type: w.gl.HALF_FLOAT,
    ...renderTargetOverrides
  };

  const renderTargetCount = extra?.renderTargetCount ?? 2;
  const renderTargets = [];

  for (let i = 0; i < renderTargetCount; i++) {
    renderTargets.push(
      w.createRenderTarget(width * scale, height * scale, renderTargetProps)
    );
  }

  const pass = pipeline.createPass(materialProperties, renderTargetProps.generateMipmaps);

  return {
    canvas,
    render: (uniforms = {}) => {
      pass.render(uniforms);
    },
    renderTargets,
    renderer: w,
    scaling,
    uniforms: pass.uniforms,
    gl: pipeline.w.gl,
    stage: pass,
  };
}

class BaseSurface {
  constructor({ id, width, height, radius = 5, dpr, canvasScale }) {
    this.context = webGlContext();
    const { w, canvas } = this.context;
    this.w = w;
    this.gl = w.gl;
    this.renderer = w;
    this.canvas = canvas;

    this.alpha = 1.0;
    this.dpr = dpr || 1;
    this.canvasScale = canvasScale;
    this.width = width;
    this.height = height;
    this.createSurface(this.width, this.height, radius);
    this.id = id;
    this.initialized = false;
    this.initialize();
  }

  createSurface(width, height, radius) {
    this.surface = new PaintableCanvas({ width, height, radius });
  }

  initialize() { }
  load() { }
  clear() { }
  renderPass() { }

  reset() {
    this.clear();
    let last = undefined;
    return new Promise((resolve) => {
      this.setHex("#f9a875");
      requestAnimationFrame(() => this.draw(last, 0, false, resolve));
    }).then(() => new Promise((resolve) => {
      last = undefined;
      requestAnimationFrame(() => {
        this.setHex("#000000");
        requestAnimationFrame(() => this.draw(last, 0, true, resolve));
      });
    }))
      .then(() => {
        this.isDrawing = false;
        this.renderPass();
        requestAnimationFrame(() => this.setHex("#fff6d3"));
      });
  }

  draw(last, t, isShadow, resolve) {
    if (t >= 10.0) {
      resolve();
      return;
    }

    const angle = (t * 0.05) * Math.PI * 2;

    let { x, y } = isShadow
      ? {
        x: 90 + 16 * t,
        y: 300 + 0 * t,
      }
      : {
        x: 100 + 100 * Math.sin(angle + 1.0) * Math.cos(angle * 0.25),
        y: 50 + 100 * Math.sin(angle * 0.7)
      };

    if (this.canvasScale != null) {
      x /= this.canvasScale;
      y /= this.canvasScale;
    }

    last ??= { x, y };

    this.surface.drawSmoothLine(last, { x, y });
    last = { x, y };

    const step = instantMode ? 5.0 : (isShadow ? 0.7 : 0.3);
    requestAnimationFrame(() => this.draw(last, t + step, isShadow, resolve));
  }

  initWebGL2({ uniforms, fragmentShader, vertexShader, renderTargetOverrides, ...rest }) {
    return webGlInit(
      this.context,
      this.width,
      this.height,
      {
        uniforms,
        fragmentShader,
        vertexShader,
      },
      renderTargetOverrides ?? {}, {
      dpr: this.dpr, canvasScale: this.canvasScale || 1, ...rest,
    })
  }
}

class Drawing extends BaseSurface {
  initializeSmoothSurface() {
    const props = this.initWebGL2({
      uniforms: {
        inputTexture: null,
        color: [1, 1, 1, 1],
        from: [0, 0],
        to: [0, 0],
        scale: 1.0,
        dpr: this.dpr,
        radiusSquared: Math.pow(this.surface.RADIUS, 2.0),
        resolution: [this.width, this.height],
        drawing: false,
        indicator: false,
      },
      renderTargetOverrides: {
        minFilter: this.gl.NEAREST,
        magFilter: this.gl.NEAREST,
        internalFormat: this.gl.RGBA,
        format: this.gl.RGBA,
        type: this.gl.UNSIGNED_BYTE
      },
      fragmentShader: drawShader,
      extra: { renderTargetCount: 2 }
    });

    this.gl = props.gl;
    this.drawStage = props.stage;
    this.drawUniforms = props.uniforms;

    this.surface.drawSmoothLine = (from, to) => {
      this.drawUniforms.drawing = true;
      this.surface.fromToRender ??= [from.x, this.height - from.y];
      this.drawUniforms.from = this.surface.fromToRender;
      this.drawUniforms.from = [from.x, this.height - from.y];
      this.drawUniforms.to = [to.x, this.height - to.y];
      this.triggerDraw();
      this.drawUniforms.drawing = false;
    }

    // Batch: injecte N segments dans le buffer via drawPass() (leger, 1 quad
    // chacun). La cascade radiance (doRenderPass) tourne dans sa propre boucle
    // rAF ; on ne la relance qu'UNE fois a la fin (drawPassTexture = dernier
    // drawPass). Evite N renderPass complets (le gros gain).
    // lines: [{from:{x,y}, to:{x,y}, color?:[r,g,b,a]}]
    this.surface.drawSmoothLineBatch = (lines) => {
      if (!lines || lines.length === 0) return;
      this.drawUniforms.drawing = true;
      let lastTex = null;
      for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];
        if (ln.color) this.drawUniforms.color = ln.color;
        this.drawUniforms.from = [ln.from.x, this.height - ln.from.y];
        this.drawUniforms.to = [ln.to.x, this.height - ln.to.y];
        lastTex = this.drawPass();
      }
      this.drawUniforms.drawing = false;
      // Declenche la cascade une seule fois, sans re-drawPass superflu.
      this.drawPassTexture = lastTex;
      this.lastRequest = Date.now();
      if (!this.animating) {
        this.animating = true;
        requestAnimationFrame(() => this.animate());
      }
    }

    return props;
  }

  triggerDraw() {
    this.renderPass();
  }

  clear() {
    if (this.initialized) {
      this.renderTargets.forEach((target) => {
        this.renderer.setRenderTarget(target);
        this.renderer.clear();
      });
      this.renderTargetsHigh.forEach((target) => {
        this.renderer.setRenderTarget(target);
        this.renderer.clear();
      });
    }
    this.renderer.setRenderTarget(null);
    this.renderPass();
  }

  initialize() {
    const {
      canvas, render, renderTargets, scaling
    } = this.initializeSmoothSurface();
    this.scaling = scaling;
    this.canvas = canvas;
    this.render = render;
    this.renderTargets = renderTargets;
    this.renderIndex = 0;

    this.innerInitialize();

    this.indicatorRenderTarget = this.renderer.createRenderTarget(this.width * this.scaling, this.height * this.scaling, {
      minFilter: this.gl.NEAREST,
      magFilter: this.gl.NEAREST,
      internalFormat: this.gl.RGBA,
      format: this.gl.RGBA,
      type: this.gl.UNSIGNED_BYTE
    });
    this.drawRenderTargetHighA = this.renderer.createRenderTarget(this.width * this.scaling, this.height * this.scaling, {
      minFilter: this.gl.NEAREST,
      magFilter: this.gl.NEAREST,
      internalFormat: this.gl.RGBA,
      format: this.gl.RGBA,
      type: this.gl.UNSIGNED_BYTE
    });
    this.drawRenderTargetHighB = this.renderer.createRenderTarget(this.width * this.scaling, this.height * this.scaling, {
      minFilter: this.gl.NEAREST,
      magFilter: this.gl.NEAREST,
      internalFormat: this.gl.RGBA,
      format: this.gl.RGBA,
      type: this.gl.UNSIGNED_BYTE
    });
    this.renderTargetsHigh = [this.drawRenderTargetHighA, this.drawRenderTargetHighB];
    this.renderIndexHigh = 0;

    this.load();
  }

  innerInitialize() { }

  load() {
    this.initialized = true;
  }

  drawPass() {
    this.surface.fromToRender = undefined;
    this.drawUniforms.inputTexture = this.renderTargets[this.renderIndex].texture;

    this.renderIndex = 1 - this.renderIndex;
    this.renderer.setRenderTarget(this.renderTargets[this.renderIndex]);
    this.render();

    let toReturn = this.renderTargets[this.renderIndex].texture;

    this.surface.lastPoint = this.surface.currentPoint;

    if (this.scaling > 1.0) {
      this.drawUniforms.inputTexture = this.renderTargetsHigh[this.renderIndexHigh].texture;
      this.renderIndexHigh = 1 - this.renderIndexHigh;
      this.drawUniforms.scale = this.scaling;
      this.renderer.setRenderTarget(this.renderTargetsHigh[this.renderIndexHigh]);
      this.render();
      this.drawUniforms.scale = 1.0;
      this.drawPassTextureHigh = this.renderTargetsHigh[this.renderIndexHigh].texture;
    } else {
      this.drawPassTextureHigh = this.renderTargets[this.renderIndex].texture;
    }

    return toReturn;
  }

  renderPass() {
    this.drawPass();
    this.renderer.setRenderTarget(null);
    this.render();
  }
}

class JFA extends Drawing {
  innerInitialize() {
    this.passes = Math.ceil(Math.log2(Math.max(this.width, this.height))) + 1;

    const useHighPrecision = (this.width > 1024 || this.height > 1024) && !isMobile;
    const jfaFormat = useHighPrecision ? {
      internalFormat: this.gl.RG32F,
      format: this.gl.RG,
      type: this.gl.FLOAT,
    } : {
      internalFormat: this.gl.RG16F,
      type: this.gl.HALF_FLOAT,
      format: this.gl.RG,
    };

    const { stage: seedStage, uniforms: seedUniforms, render: seedRender, renderTargets: seedRenderTargets } = this.initWebGL2({
      renderTargetOverrides: jfaFormat,
      uniforms: {
        resolution: [this.width, this.height],
        surfaceTexture: null,
      },
      fragmentShader: `
        precision highp float;
        uniform sampler2D surfaceTexture;
        uniform vec2 resolution;
        out vec2 FragColor;

        in vec2 vUv;

        void main() {
          float alpha = texelFetch(surfaceTexture, ivec2(gl_FragCoord.xy), 0).a;
          FragColor = vUv * ceil(alpha);
        }`,
    });

    const { stage: jfaStage, uniforms: jfaUniforms, render: jfaRender, renderTargets: jfaRenderTargets } = this.initWebGL2({
      renderTargetOverrides: jfaFormat,
      uniforms: {
        inputTexture: null,
        resolution: [this.width, this.height],
        oneOverSize: [1.0 / this.width, 1.0 / this.height],
        uOffset: Math.pow(2, this.passes - 1),
        direction: 0,
        index: false,
        passes: this.passes,
        skip: true,
      },
      fragmentShader: `
precision highp float;
uniform vec2 oneOverSize;
uniform vec2 resolution;
uniform sampler2D inputTexture;
uniform float uOffset;
uniform int direction;
uniform bool skip;
uniform int index;
uniform int passes;

in vec2 vUv;
out vec2 FragColor;

void main() {
  if (skip) {
    FragColor = vUv;
    return;
  }
  
  vec2 nearestSeed = vec2(-1.0);
  float nearestDist = 999999.9;
  vec2 pre = uOffset * oneOverSize;

  // Centre d'abord
  vec2 sampleValue = texelFetch(inputTexture, ivec2(vUv * resolution), 0).xy;
  
  if (sampleValue.x > 0.0 || sampleValue.y > 0.0) {
    vec2 diff = sampleValue - vUv;
    nearestDist = dot(diff, diff);
    nearestSeed = sampleValue;
  }

  // Parcours optimisÃ© des voisins
  for (float y = -1.0; y <= 1.0; y += 1.0) {
    for (float x = -1.0; x <= 1.0; x += 1.0) {
      if (x == 0.0 && y == 0.0) continue;
      
      vec2 sampleUV = vUv + vec2(x, y) * pre;
      if (any(lessThan(sampleUV, vec2(0.0))) || any(greaterThan(sampleUV, vec2(1.0)))) continue;

      vec2 sampleValue = texelFetch(inputTexture, ivec2(sampleUV * resolution), 0).xy;

      if (sampleValue.x > 0.0 || sampleValue.y > 0.0) {
        vec2 diff = sampleValue - vUv;
        float dist = dot(diff, diff);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestSeed = sampleValue;
        }
      }
    }
  }

  FragColor = nearestSeed;
}
`
    });

    this.seedStage = seedStage;
    this.seedUniforms = seedUniforms;
    this.seedRender = seedRender;
    this.seedRenderTargets = seedRenderTargets;

    this.jfaStage = jfaStage;
    this.jfaUniforms = jfaUniforms;
    this.jfaRender = jfaRender;
    this.jfaRenderTargets = jfaRenderTargets;
  }

  seedPass(inputTexture) {
    this.seedUniforms.surfaceTexture = inputTexture;
    this.renderer.setRenderTarget(this.seedRenderTargets[0]);
    this.seedRender();
    return this.seedRenderTargets[0].texture;
  }

  jfaPass(inputTexture) {
    let currentInput = inputTexture;

    let [renderA, renderB] = this.jfaRenderTargets;
    let currentOutput = renderA;
    this.jfaUniforms.skip = true;
    let passes = this.passes;

    for (let i = 0; i < passes || (passes === 0 && i === 0); i++) {
      const offset = Math.pow(2, this.passes - i - 1);
      this.jfaUniforms.skip = passes === 0;
      this.jfaUniforms.inputTexture = currentInput;
      this.jfaUniforms.uOffset = offset;
      this.jfaUniforms.direction = 0;
      this.jfaUniforms.index = i;

      this.renderer.setRenderTarget(currentOutput);
      this.jfaRender();

      currentInput = currentOutput.texture;
      currentOutput = (currentOutput === renderA) ? renderB : renderA;
    }

    return currentInput;
  }

  clear() {
    if (this.initialized) {
      this.seedRenderTargets.concat(this.jfaRenderTargets).forEach((target) => {
        this.renderer.setRenderTarget(target);
        this.renderer.clear();
      });
    }
    super.clear();
  }

  renderPass() {
    let out = this.drawPass();
    out = this.seedPass(out);
    out = this.jfaPass(out);
    this.renderer.setRenderTarget(null);
    this.jfaRender();
  }
}

class DistanceField extends JFA {
  innerInitialize() {
    super.innerInitialize();

    const { stage: dfStage, uniforms: dfUniforms, render: dfRender, renderTargets: dfRenderTargets } = this.initWebGL2({
      uniforms: {
        resolution: [this.width, this.height],
        jfaTexture: null,
      },
      renderTargetOverrides: {
        minFilter: this.gl.NEAREST,
        magFilter: this.gl.NEAREST,
        internalFormat: this.gl.R16F,
        format: this.gl.RED,
        type: this.gl.HALF_FLOAT,
      },
      fragmentShader: `
        uniform sampler2D jfaTexture;
        uniform vec2 resolution;

        in vec2 vUv;
        out float FragColor;

        void main() {
          vec2 nearestSeed = texelFetch(jfaTexture, ivec2(vUv * resolution), 0).xy;
          FragColor = clamp(distance(vUv, nearestSeed), 0.0, 1.0);
        }`,
    });

    this.dfStage = dfStage;
    this.dfUniforms = dfUniforms;
    this.dfRender = dfRender;
    this.dfRenderTargets = dfRenderTargets;
    this.prev = 0;
    this.hasRendered = false;
  }

  clear() {
    if (this.initialized) {
      this.dfRenderTargets.forEach((target) => {
        this.renderer.setRenderTarget(target);
        this.renderer.clear();
      });
    }
    super.clear();
  }

  dfPass(inputTexture) {
    this.dfUniforms.jfaTexture = inputTexture;
    this.renderer.setRenderTarget(this.dfRenderTargets[0]);
    this.dfRender();
    return this.dfRenderTargets[0].texture;
  }

  renderPass() {
    let out = this.drawPass();
    out = this.seedPass(out);
    out = this.jfaPass(out);
    out = this.dfPass(out);
    this.renderer.setRenderTarget(null);
    this.dfRender();
  }
}

class RC extends DistanceField {
  innerInitialize() {
    this.lastRequest = Date.now();
    this.frame = 0;
    this.baseRayCount = 4.0;
    this.reduceDemandCheckbox = document.createElement("input");
    this.reduceDemandCheckbox.type = "checkbox";
    this.reduceDemandCheckbox.checked = false;
    this.forceFullPass = !this.reduceDemandCheckbox.checked;
    super.innerInitialize();
    this.gpuTimer = new GPUTimer(this.gl, true);
    this.activelyDrawing = false;
    this.rawBasePixelsBetweenProbesExponent = 0.0;
    this.rawBasePixelsBetweenProbes = Math.pow(2, this.rawBasePixelsBetweenProbesExponent);

    this.animating = false;

    this.enableSrgb = document.createElement("input");
    this.enableSrgb.type = "checkbox";
    this.enableSrgb.checked = true;
    this.addNoise = document.createElement("input");
    this.addNoise.type = "checkbox";
    this.bilinearFix = document.createElement("input");
    this.bilinearFix.type = "checkbox";
    this.sunAngleSlider = document.createElement("input");
    this.sunAngleSlider.type = "range";
    this.sunAngleSlider.disabled = true;

    this.initializeParameters();

    const fragmentShader = rcShader;

    const { stage: rcStage, uniforms: rcUniforms, render: rcRender, renderTargets: rcRenderTargets } = this.initWebGL2({
      renderTargetOverrides: {
        minFilter: this.gl.LINEAR_MIPMAP_LINEAR,
        magFilter: this.gl.LINEAR,
        internalFormat: this.gl.R11F_G11F_B10F,
        format: this.gl.RGB,
        type: this.gl.HALF_FLOAT
      },
      uniforms: {
        resolution: [this.width, this.height],
        sceneTexture: null,
        distanceTexture: null,
        gradientTexture: null,
        lastTexture: null,
        cascadeExtent: [this.radianceWidth, this.radianceHeight],
        cascadeCount: this.radianceCascades,
        cascadeIndex: 0.0,
        basePixelsBetweenProbes: this.basePixelsBetweenProbes,
        cascadeInterval: this.radianceInterval,
        rayInterval: 1.0,
        intervalOverlap: 0.1,
        baseRayCount: 4.0,
        sunAngle: 0,
        time: 0.1,
        srgb: this.enableSrgb.checked ? 2.2 : 1.0,
        enableSun: false,
        addNoise: this.addNoise.checked,
        firstCascadeIndex: 0,
        bilinearFix: this.bilinearFix.checked,
      },
      fragmentShader,
    });

    this.firstLayer = this.radianceCascades - 1;
    this.lastLayer = 0;

    this.stage = 3;

    const { stage: overlayStage, uniforms: overlayUniforms, render: overlayRender, renderTargets: overlayRenderTargets } = this.initWebGL2({
      renderTargetOverrides: {
        minFilter: this.gl.NEAREST,
        magFilter: this.gl.NEAREST,
      },
      scale: true,
      uniforms: {
        inputTexture: null,
        drawPassTexture: null,
        resolution: [this.width, this.height],
        showSurface: true,
      },
      fragmentShader: `
        uniform sampler2D inputTexture;
        uniform sampler2D drawPassTexture;
        uniform vec2 resolution;
        uniform bool showSurface;

        in vec2 vUv;
        out vec4 FragColor;

        void main() {
          vec4 rc = texture(inputTexture, vUv);
          vec4 d = texture(drawPassTexture, vUv);

          FragColor = vec4(d.a > 0.0 && showSurface ? d.rgb : rc.rgb, 1.0);
        }`
    });

    this.rcStage = rcStage;
    this.rcUniforms = rcUniforms;
    this.rcRender = rcRender;
    this.rcRenderTargets = rcRenderTargets;
    this.prev = 0;

    this.overlayStage = overlayStage;
    this.overlayUniforms = overlayUniforms;
    this.overlayRender = overlayRender;
    this.overlayRenderTargets = overlayRenderTargets;
  }

  resize(newWidth, newHeight) {
    console.log(`ðŸš€ Resizing RC Engine to ${newWidth}x${newHeight}`);

    // 1. Mettre Ã  jour les dimensions internes
    this.width = newWidth;
    this.height = newHeight;
    this.surface.width = newWidth;
    this.surface.height = newHeight;

    const newCanvasWidth = Math.floor(newWidth * this.scaling);
    const newCanvasHeight = Math.floor(newHeight * this.scaling);

    // 2. Redimensionner le canvas principal de WebGL
    this.canvas.width = newCanvasWidth;
    this.canvas.height = newCanvasHeight;
    this.canvas.style.width = `${newWidth * (this.canvasScale || 1)}px`;
    this.canvas.style.height = `${newHeight * (this.canvasScale || 1)}px`;
    this.gl.viewport(0, 0, newCanvasWidth, newCanvasHeight);

    // 3. Recalculer les paramÃ¨tres dÃ©pendants de la taille
    this.initializeParameters(true);

    // 4. âœ… OPTIMISATION: Redimensionner seulement les render targets nÃ©cessaires
    const allRenderTargets = [
      ...this.renderTargets,
      ...this.renderTargetsHigh,
      ...this.seedRenderTargets,
      ...this.jfaRenderTargets,
      ...this.dfRenderTargets,
      ...this.rcRenderTargets,
      ...this.overlayRenderTargets,
      this.indicatorRenderTarget
    ].filter(Boolean); // âœ… Enlever les null/undefined

    // âœ… Redimensionner et nettoyer en une seule passe
    allRenderTargets.forEach(rt => {
      this.renderer.resizeRenderTarget(rt, newCanvasWidth, newCanvasHeight);
    });

    // âœ… Nettoyer tous les render targets en une fois
    allRenderTargets.forEach(rt => {
      this.renderer.setRenderTarget(rt, false); // false = pas d'auto-clear
      this.renderer.clear();
    });

    this.renderer.setRenderTarget(null);

    // 5. Mettre Ã  jour les uniformes
    const resolution = [newWidth, newHeight];
    this.drawUniforms.resolution = resolution;
    this.seedUniforms.resolution = resolution;
    this.jfaUniforms.resolution = resolution;
    this.jfaUniforms.oneOverSize = [1.0 / newWidth, 1.0 / newHeight];
    this.passes = Math.ceil(Math.log2(Math.max(newWidth, newHeight))) + 1;
    this.dfUniforms.resolution = resolution;
    this.rcUniforms.resolution = resolution;
    this.overlayUniforms.resolution = resolution;

    // âœ… RÃ©initialiser les Ã©tats
    this.frame = 0;
    this.prev = 0;

    console.log("âœ… RC Engine resize complete.");
  }


  initializeParameters(setUniforms) {
    this.renderWidth = this.width;
    this.renderHeight = this.height;

    const angularSize = Math.sqrt(
      this.renderWidth * this.renderWidth + this.renderHeight * this.renderHeight
    );
    this.radianceCascades = Math.ceil(
      Math.log(angularSize) / Math.log(this.baseRayCount)
    ) + 1.0;

    this.basePixelsBetweenProbes = this.rawBasePixelsBetweenProbes;
    this.radianceInterval = 1.0;

    this.radianceWidth = Math.floor(this.renderWidth / this.basePixelsBetweenProbes);
    this.radianceHeight = Math.floor(this.renderHeight / this.basePixelsBetweenProbes);

    if (setUniforms) {
      this.rcUniforms.basePixelsBetweenProbes = this.basePixelsBetweenProbes;
      this.rcUniforms.cascadeCount = this.radianceCascades;
      this.rcUniforms.cascadeInterval = this.radianceInterval;
      this.rcUniforms.cascadeExtent = [this.radianceWidth, this.radianceHeight];
    }
  }

  overlayPass(inputTexture, preRc) {
    this.overlayUniforms.drawPassTexture = this.drawPassTextureHigh;

    if (this.forceFullPass) {
      this.frame = 0;
    }
    const frame = this.forceFullPass ? 0 : 1 - this.frame;

    if (this.frame == 0 && !this.forceFullPass) {
      const input = this.overlayRenderTargets[0].texture ?? this.drawPassTexture;
      this.overlayUniforms.inputTexture = input;
      this.renderer.setRenderTarget(this.overlayRenderTargets[1]);
      this.overlayRender();
    } else {
      this.overlayUniforms.inputTexture = inputTexture;
      this.renderer.setRenderTarget(this.overlayRenderTargets[0]);
      this.overlayRender();
    }

    if (!this.isDrawing && !isMobile) {
      this.overlay = true;
      this.drawUniforms.inputTexture = this.overlayRenderTargets[frame].texture;
      this.surface.drawSmoothLine(this.surface.currentMousePosition, this.surface.currentMousePosition);
      this.overlay = false;
    } else if (isMobile) {
      this.renderer.setRenderTarget(null);
      this.overlayRender();
    }
  }

  triggerDraw() {
    if (this.overlay) {
      this.renderer.setRenderTarget(null);
      this.render();
      return;
    }
    super.triggerDraw();
  }

  rcPass(distanceFieldTexture, drawPassTexture) {
    this.rcUniforms.distanceTexture = distanceFieldTexture;
    this.rcUniforms.sceneTexture = drawPassTexture;
    this.rcUniforms.cascadeIndex = 0;

    if (this.frame == 0) {
      this.rcUniforms.lastTexture = null;
    }

    const halfway = Math.floor((this.firstLayer - this.lastLayer) / 2);
    const last = this.frame == 0 && !this.forceFullPass ? halfway + 1 : this.lastLayer;
    this.rcPassCount = this.frame == 0 ? this.firstLayer : halfway;

    for (let i = this.firstLayer; i >= last; i--) {
      this.gpuTimer.start(`rcPass-${i}`);
      this.rcUniforms.cascadeIndex = i;

      this.renderer.setRenderTarget(this.rcRenderTargets[this.prev]);
      this.rcRender();
      this.rcUniforms.lastTexture = this.rcRenderTargets[this.prev].texture;
      this.prev = 1 - this.prev;
      this.gpuTimer.end(`rcPass-${i}`);
    }

    return this.rcRenderTargets[1 - this.prev].texture;
  }

  doRenderPass() {
    if (this.frame == 0) {
      if (this.stage == 0) {
        this.renderer.setRenderTarget(null);
        this.render();
        this.finishRenderPass();
        return;
      }

      this.gpuTimer.start('seedPass');
      let out = this.seedPass(this.drawPassTexture);
      this.gpuTimer.end('seedPass');

      this.gpuTimer.start('jfaPass');
      out = this.jfaPass(out);
      this.gpuTimer.end('jfaPass');

      if (this.stage == 1) {
        this.renderer.setRenderTarget(null);
        this.jfaRender();
        this.finishRenderPass();
        return;
      }

      this.gpuTimer.start('dfPass');
      this.distanceFieldTexture = this.dfPass(out);
      this.gpuTimer.end('dfPass');

      if (this.stage == 2) {
        this.renderer.setRenderTarget(null);
        this.dfRender();
        this.finishRenderPass();
        return;
      }
    }

    let rcTexture = this.rcPass(this.distanceFieldTexture, this.drawPassTexture);

    this.overlayPass(rcTexture, false);

    this.finishRenderPass();
  }

  finishRenderPass() {
    this.gpuTimer.update();

    if (!this.forceFullPass) {
      this.frame = 1 - this.frame;
    }
  }

  renderPass() {
    this.drawPassTexture = this.drawPass();
    this.lastRequest = Date.now();

    if (!this.animating) {
      this.animating = true;
      requestAnimationFrame(() => {
        this.animate();
      });
    }
  }

  animate() {
    this.animating = true;

    this.doRenderPass();
    this.desiredRenderPass = false;

    requestAnimationFrame(() => {
      if (Date.now() - this.lastRequest > 1000) {
        this.animating = false;
        return;
      }
      this.animate();
    });
  }

  clear() {
    this.lastFrame = null;
    if (this.initialized) {
      this.rcRenderTargets.forEach((target) => {
        this.renderer.setRenderTarget(target);
        this.renderer.clear();
      });
    }
    super.clear();
  }

  load() {
    super.load();
  }
}

window.RC = RC;

