/**
 * GridCraftHtmlEffects.js
 * Unified HTML effects wrapper for GridCraft widgets.
 *
 * Dependencies, depending on selected mode:
 * - radiance: Radiance_Cascade_Engine.js, exposing window.RC
 * - rtx: Raytracer_Engine.js, exposing window.Raytracer2D
 */
(function () {
  'use strict';

  const DEFAULTS = {
    mode: 'radiance',
    targets: ['.widget', '.widget-item'],
    autoStart: true,
    overlay: {
      zIndex: 100,
      opacity: 0.75,
      blendMode: 'screen'
    },
    performance: {
      maxFPS: 30,
      qualityScale: 0.5,
      maxElements: 180,
      skipSmallElements: true,
      minElementSize: 10,
      observeDom: true
    },
    radiance: {
      srgb: true,
      enableSun: false,
      sunAngle: 0,
      forceRender: true,
      lineStep: 2,
      maxAlpha: 0.6
    },
    rtx: {
      opacity: 0.7,
      maxBounces: 3,
      backgroundColor: [0.95, 0.96, 0.98],
      srgb: true,
      nee: true
    }
  };

  function mergeOptions(base, override) {
    const output = Array.isArray(base) ? base.slice() : { ...base };
    Object.keys(override || {}).forEach((key) => {
      const value = override[key];
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        base &&
        typeof base[key] === 'object' &&
        !Array.isArray(base[key])
      ) {
        output[key] = mergeOptions(base[key], value);
      } else {
        output[key] = value;
      }
    });
    return output;
  }

  function parseCssColor(value) {
    if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return null;
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return null;
    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
      a: match[4] === undefined ? 1 : Number(match[4])
    };
  }

  function firstGradientColor(value) {
    if (!value || value.indexOf('gradient') === -1) return null;
    const match = value.match(/rgba?\([\d\s,.]+\)/);
    return match ? parseCssColor(match[0]) : null;
  }

  function visibleRect(rect) {
    return rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <= window.innerHeight &&
      rect.left <= window.innerWidth;
  }

  class RadianceWidgetEffect {
    constructor(config) {
      this.config = config;
      this.enabled = false;
      this.rc = null;
      this.canvas = null;
      this.targets = new Set(config.targets || []);
      this.observed = new Set();
      this.colorCache = new WeakMap();
      this.resizeObserver = new ResizeObserver(() => this.scheduleDraw('element-resize'));
      this.mutationObserver = null;
      this.pending = false;
      this.lastFrame = 0;
      this.stats = {
        mode: 'radiance',
        reason: 'init',
        elements: 0,
        scanMs: 0,
        drawMs: 0,
        frameMs: 0
      };

      this.init();
    }

    init() {
      if (!window.RC) {
        throw new Error('GridCraftHtmlEffects: window.RC is missing. Load Radiance_Cascade_Engine.js first.');
      }

      const scale = this.config.performance.qualityScale || 1;
      this.rc = new window.RC({
        id: `gridcraft-radiance-${Date.now()}`,
        width: Math.max(1, Math.floor(window.innerWidth * scale)),
        height: Math.max(1, Math.floor(window.innerHeight * scale)),
        dpr: 1,
        canvasScale: 1
      });

      this.canvas = this.rc.canvas;
      this.canvas.id = 'gridcraft-radiance-overlay';
      this.applyOverlayStyle();

      if (!this.canvas.parentElement) document.body.appendChild(this.canvas);

      this.rc.rcUniforms.srgb = this.config.radiance.srgb ? 2.2 : 1.0;
      this.rc.rcUniforms.enableSun = !!this.config.radiance.enableSun;
      this.rc.rcUniforms.sunAngle = this.config.radiance.sunAngle || 0;

      window.addEventListener('resize', () => this.resize());

      // Scroll : les widgets bougent mais leur taille ne change pas, donc ni
      // ResizeObserver ni MutationObserver ne se declenchent -> l'overlay
      // restait fige (delai "2s"). On ecoute le scroll en capture (tous les
      // conteneurs scrollables, pas seulement window) et on redessine.
      this._onScroll = () => this.scheduleDraw('scroll');
      window.addEventListener('scroll', this._onScroll, { passive: true, capture: true });

      // Maximize/restore natif (WebView2) ne declenche pas toujours un event
      // 'resize' DOM fiable. On observe la taille du viewport (documentElement)
      // et on relance un resize complet (canvas + refreshTargets) a tout
      // changement -> l'overlay suit le maximize et le redimensionnement.
      try {
        this._viewportObserver = new ResizeObserver(() => this.resize());
        this._viewportObserver.observe(document.documentElement);
      } catch (e) {}

      this.refreshTargets();

      if (this.config.performance.observeDom) {
        this.mutationObserver = new MutationObserver(() => this.scheduleDraw('dom-mutation'));
        this.mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'hidden']
        });
      }
    }

    applyOverlayStyle() {
      Object.assign(this.canvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: String(this.config.overlay.zIndex),
        opacity: String(this.config.overlay.opacity),
        mixBlendMode: this.config.overlay.blendMode,
        display: this.enabled ? 'block' : 'none'
      });
    }

    start() {
      this.enabled = true;
      this.applyOverlayStyle();
      this.scheduleDraw('start', true);
    }

    stop() {
      this.enabled = false;
      if (this.canvas) this.canvas.style.display = 'none';
      if (this.rc) {
        this.rc.clear();
        this.rc.renderPass();
      }
    }

    destroy() {
      this.stop();
      this.resizeObserver.disconnect();
      if (this._onScroll) window.removeEventListener('scroll', this._onScroll, { capture: true });
      if (this.mutationObserver) this.mutationObserver.disconnect();
      if (this.canvas && this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
      this.observed.clear();
      this.targets.clear();
      this.rc = null;
      this.canvas = null;
    }

    setOptions(options) {
      const previousScale = this.config.performance.qualityScale;
      this.config = mergeOptions(this.config, options || {});
      this.targets = new Set(this.config.targets || []);
      if (this.canvas) this.applyOverlayStyle();
      if (this.rc) {
        this.rc.rcUniforms.srgb = this.config.radiance.srgb ? 2.2 : 1.0;
        this.rc.rcUniforms.enableSun = !!this.config.radiance.enableSun;
        this.rc.rcUniforms.sunAngle = this.config.radiance.sunAngle || 0;
      }
      this.refreshTargets();
      if (previousScale !== this.config.performance.qualityScale) this.resize();
      this.scheduleDraw('options', true);
    }

    addTarget(selector) {
      this.targets.add(selector);
      this.config.targets = Array.from(this.targets);
      this.refreshTargets();
      this.scheduleDraw('add-target', true);
    }

    removeTarget(selector) {
      this.targets.delete(selector);
      this.config.targets = Array.from(this.targets);
      this.refreshTargets();
      this.scheduleDraw('remove-target', true);
    }

    resize() {
      if (!this.rc) return;
      const scale = this.config.performance.qualityScale || 1;
      const width = Math.max(1, Math.floor(window.innerWidth * scale));
      const height = Math.max(1, Math.floor(window.innerHeight * scale));
      if (typeof this.rc.resize === 'function') {
        this.rc.resize(width, height);
      } else {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      this.applyOverlayStyle();
      // Apres un resize/maximize, les positions des cibles ont change : on les
      // re-scanne pour que l'overlay se recale sur les nouvelles positions.
      if (typeof this.refreshTargets === 'function') this.refreshTargets();
      this.scheduleDraw('window-resize', true);
    }

    refreshTargets() {
      this.observed.forEach((element) => this.resizeObserver.unobserve(element));
      this.observed.clear();

      this.targets.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
          this.resizeObserver.observe(element);
          this.observed.add(element);
        });
      });
    }

    scheduleDraw(reason, immediate) {
      if (!this.enabled || this.pending) return;
      this.pending = true;

      requestAnimationFrame((time) => {
        const minFrame = 1000 / Math.max(1, this.config.performance.maxFPS || 60);
        if (!immediate && time - this.lastFrame < minFrame) {
          this.pending = false;
          this.scheduleDraw(reason, true);
          return;
        }

        this.pending = false;
        this.lastFrame = time;
        this.draw(reason);
      });
    }

    collectElements() {
      const started = performance.now();
      const out = [];
      const maxElements = this.config.performance.maxElements;
      const minSize = this.config.performance.minElementSize;
      const skipSmall = this.config.performance.skipSmallElements;

      for (const selector of this.targets) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (out.length >= maxElements) break;
          if (element === this.canvas || element.closest('#gridcraft-effect-controls')) continue;

          const rect = element.getBoundingClientRect();
          if (!visibleRect(rect)) continue;
          if (skipSmall && (rect.width <= minSize || rect.height <= minSize)) continue;

          const styles = window.getComputedStyle(element);
          if (styles.display === 'none' || styles.visibility === 'hidden' || Number(styles.opacity) === 0) continue;

          const color = this.elementColor(element, styles);
          if (!color || color.a <= 0) continue;

          out.push({ element, rect, styles, color });
        }
        if (out.length >= maxElements) break;
      }

      this.stats.scanMs = performance.now() - started;
      return out;
    }

    elementColor(element, styles) {
      const signature = [
        styles.backgroundColor,
        styles.backgroundImage,
        styles.color,
        element.tagName,
        element.className,
        element.currentSrc || ''
      ].join('|');

      const cached = this.colorCache.get(element);
      if (cached && cached.signature === signature) return cached.color;

      // Priorite : fond plein, puis 1re couleur d'un gradient (boutons accent).
      let color = parseCssColor(styles.backgroundColor) ||
        firstGradientColor(styles.backgroundImage);

      // Bouton/lien sans fond (ghost) : on prend sa couleur de TEXTE mais avec
      // un alpha doux -> halo teinte au theme au lieu d'un bleu "pate".
      if (!color) {
        const textColor = parseCssColor(styles.color);
        if (textColor) {
          color = { r: textColor.r, g: textColor.g, b: textColor.b, a: 0.3 };
        }
      }

      if (!color && this.config.radiance.forceRender) {
        color = this.defaultColor(element);
      }

      this.colorCache.set(element, { signature, color });
      return color;
    }

    defaultColor(element) {
      // Alphas volontairement DOUX : un widget est dessine rempli, donc un
      // alpha trop fort transforme un bouton sans fond en "pate" de lumiere.
      // On prefere une diffusion legere ; les vraies couleurs de fond (boutons
      // accent, cartes colorees) passent avant via elementColor.
      const tag = element.tagName.toLowerCase();
      if (tag === 'button') return { r: 90, g: 150, b: 255, a: 0.22 };
      if (tag === 'img') return { r: 147, g: 51, b: 234, a: 0.5 };
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return { r: 235, g: 240, b: 255, a: 0.3 };
      if (element.classList.contains('widget-item') || element.classList.contains('widget')) return { r: 125, g: 175, b: 255, a: 0.28 };
      return { r: 200, g: 200, b: 200, a: 0.18 };
    }

    draw(reason) {
      if (!this.rc) return;
      const started = performance.now();
      const scale = this.config.performance.qualityScale || 1;
      const elements = this.collectElements();

      this.rc.clear();
      const originalRadius = this.rc.surface.RADIUS;
      this.rc.surface.RADIUS = 1.0;
      this.rc.drawUniforms.radiusSquared = 1.0;

      // Collecte TOUTES les lignes de TOUS les widgets, puis un seul batch
      // (un seul renderPass / une seule cascade au lieu d'un par ligne).
      const lines = [];
      for (let i = 0; i < elements.length; i++) {
        this.collectElementLines(elements[i], scale, lines);
      }

      const canBatch = typeof this.rc.surface.drawSmoothLineBatch === 'function';
      if (canBatch) {
        this.rc.surface.drawSmoothLineBatch(lines);
      } else {
        // Fallback moteur non patche : ancien chemin.
        for (let i = 0; i < lines.length; i++) {
          const ln = lines[i];
          this.rc.drawUniforms.color = ln.color;
          this.rc.surface.drawSmoothLine(ln.from, ln.to);
        }
        this.rc.renderPass();
      }

      this.rc.surface.RADIUS = originalRadius;
      this.rc.drawUniforms.radiusSquared = Math.pow(originalRadius, 2);

      this.stats.reason = reason;
      this.stats.elements = elements.length;
      this.stats.lines = lines.length;
      this.stats.drawMs = performance.now() - started;
      this.stats.frameMs = this.stats.scanMs + this.stats.drawMs;
    }

    // Ajoute les segments horizontaux d'un widget dans le tableau `out`.
    collectElementLines(item, scale, out) {
      const rect = item.rect;
      const color = item.color;
      const step = Math.max(1, this.config.radiance.lineStep || 1);
      const radius = Math.min(parseFloat(item.styles.borderRadius) || 0, rect.width / 2, rect.height / 2);

      // Plafond d'alpha : un widget rempli avec alpha ~1 fait un "pate" de
      // lumiere. On limite pour obtenir une diffusion douce et lisible.
      const maxA = this.config.radiance.maxAlpha != null ? this.config.radiance.maxAlpha : 0.6;
      const a = Math.min(color.a, maxA);
      const rgba = [color.r / 255, color.g / 255, color.b / 255, a];

      const top = Math.floor(rect.top * scale);
      const bottom = Math.ceil(rect.bottom * scale);
      const left = rect.left * scale;
      const right = rect.right * scale;
      const scaledRadius = radius * scale;

      for (let y = top; y < bottom; y += step) {
        let x1 = left;
        let x2 = right;

        if (scaledRadius > 1) {
          if (y < top + scaledRadius) {
            const dy = top + scaledRadius - y;
            const dx = Math.sqrt(Math.max(0, scaledRadius * scaledRadius - dy * dy));
            x1 = left + scaledRadius - dx;
            x2 = right - scaledRadius + dx;
          } else if (y > bottom - scaledRadius) {
            const dy = y - (bottom - scaledRadius);
            const dx = Math.sqrt(Math.max(0, scaledRadius * scaledRadius - dy * dy));
            x1 = left + scaledRadius - dx;
            x2 = right - scaledRadius + dx;
          }
        }

        out.push({ from: { x: x1, y }, to: { x: x2, y }, color: rgba });
      }
    }

    getStats() {
      return { ...this.stats };
    }
  }

  class RtxWidgetEffect {
    constructor(config) {
      this.config = config;
      this.enabled = false;
      this.rtx = null;
      this.canvas = null;
      this.targets = new Set(config.targets || []);
      this.stats = { mode: 'rtx', elements: 0 };
      this.init();
    }

    init() {
      if (!window.Raytracer2D) {
        throw new Error('GridCraftHtmlEffects: window.Raytracer2D is missing. Load Raytracer_Engine.js first.');
      }

      const selector = this.selector();
      this.rtx = new window.Raytracer2D('gridcraft-rtx-overlay', { domSelector: selector });
      this.canvas = this.rtx.canvas;
      this.applyOverlayStyle();
      this.applyRenderOptions();
    }

    selector() {
      return Array.from(this.targets).join(', ');
    }

    applyOverlayStyle() {
      if (!this.canvas) return;
      Object.assign(this.canvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: String(this.config.overlay.zIndex),
        opacity: String(this.config.rtx.opacity),
        mixBlendMode: this.config.overlay.blendMode === 'screen' ? 'multiply' : this.config.overlay.blendMode,
        display: this.enabled ? 'block' : 'none'
      });
    }

    applyRenderOptions() {
      if (!this.rtx) return;
      this.rtx.setMaxBounces(this.config.rtx.maxBounces);
      this.rtx.setBackgroundColor(this.config.rtx.backgroundColor);
      this.rtx.srgbEnabled = !!this.config.rtx.srgb;
      this.rtx.neeEnabled = !!this.config.rtx.nee;
      this.rtx.resetAccumulation();
    }

    start() {
      this.enabled = true;
      this.applyOverlayStyle();
      if (this.rtx) this.rtx.updateSceneFromDOM();
    }

    stop() {
      this.enabled = false;
      if (this.canvas) this.canvas.style.display = 'none';
      if (this.rtx) this.rtx.resetAccumulation();
    }

    destroy() {
      this.stop();
      // INDISPENSABLE : couper la boucle RAF du raytracer (sinon zombie qui
      // continue de dessiner -> carre mal place / couleurs decalees au resize).
      if (this.rtx && this.rtx.destroy) this.rtx.destroy();
      if (this.canvas && this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
      this.rtx = null;
      this.canvas = null;
      this.targets.clear();
    }

    setOptions(options) {
      this.config = mergeOptions(this.config, options || {});
      this.targets = new Set(this.config.targets || []);
      if (this.rtx) this.rtx.setSelectorFilter(this.selector());
      this.applyRenderOptions();
      this.applyOverlayStyle();
    }

    addTarget(selector) {
      this.targets.add(selector);
      this.config.targets = Array.from(this.targets);
      if (this.rtx) this.rtx.setSelectorFilter(this.selector());
    }

    removeTarget(selector) {
      this.targets.delete(selector);
      this.config.targets = Array.from(this.targets);
      if (this.rtx) this.rtx.setSelectorFilter(this.selector());
    }

    refresh() {
      if (this.rtx) this.rtx.updateSceneFromDOM();
    }

    getStats() {
      const scene = this.rtx && this.rtx.scene ? this.rtx.scene.length : 0;
      return { ...this.stats, elements: scene };
    }
  }

  class GridCraftHtmlEffects {
    constructor(options) {
      this.config = mergeOptions(DEFAULTS, options || {});
      this.effect = null;
      this.mode = null;
      this.setMode(this.config.mode);
      if (this.config.autoStart) this.start();
    }

    setMode(mode) {
      const nextMode = mode || 'radiance';
      const wasEnabled = this.effect ? this.effect.enabled : !!this.config.autoStart;

      if (this.effect) this.effect.destroy();
      this.mode = nextMode;
      this.config.mode = nextMode;

      if (nextMode === 'rtx') {
        this.effect = new RtxWidgetEffect(this.config);
      } else {
        this.effect = new RadianceWidgetEffect(this.config);
      }

      if (wasEnabled) this.effect.start();
      return this;
    }

    start() {
      if (this.effect) this.effect.start();
      return this;
    }

    stop() {
      if (this.effect) this.effect.stop();
      return this;
    }

    refresh() {
      if (!this.effect) return this;
      if (typeof this.effect.refresh === 'function') this.effect.refresh();
      if (typeof this.effect.scheduleDraw === 'function') this.effect.scheduleDraw('manual-refresh', true);
      return this;
    }

    destroy() {
      if (this.effect) this.effect.destroy();
      this.effect = null;
      return this;
    }

    setOptions(options) {
      this.config = mergeOptions(this.config, options || {});
      if (this.effect) this.effect.setOptions(this.config);
      return this;
    }

    addTarget(selector) {
      if (this.effect) this.effect.addTarget(selector);
      return this;
    }

    removeTarget(selector) {
      if (this.effect) this.effect.removeTarget(selector);
      return this;
    }

    getStats() {
      return this.effect ? this.effect.getStats() : {};
    }

    // Regle le materiau (et options) d'UN element precis, en mode RTX. Delegue
    // a raytracer.updateObjectProperty (methode fiable, ecrit dans le cache du
    // moteur -> effet immediat, contrairement aux attributs data-rtx-* qui ne
    // sont lus qu'une fois). el = Element DOM, mat = 'diffuse'|'mirror'|'glass'|
    // 'glossy'|'emissive', opts = {roughness,ior,opacity} (optionnel).
    setObjectMaterial(el, mat, opts) {
      const rtx = this.effect && this.effect.rtx;
      if (!rtx || !el) return this;
      const map = { diffuse: 0, mirror: 1, glass: 2, glossy: 3, emissive: 4 };
      const t = map[String(mat).toLowerCase().trim()];
      if (t !== undefined) rtx.updateObjectProperty(el, 'materialType', t);
      if (opts) {
        if (opts.roughness !== undefined) rtx.updateObjectProperty(el, 'roughness', parseFloat(opts.roughness));
        if (opts.ior !== undefined) rtx.updateObjectProperty(el, 'ior', parseFloat(opts.ior));
        if (opts.opacity !== undefined) rtx.updateObjectProperty(el, 'opacity', parseFloat(opts.opacity));
      }
      return this;
    }
  }

  window.GridCraftHtmlEffects = GridCraftHtmlEffects;
})();
