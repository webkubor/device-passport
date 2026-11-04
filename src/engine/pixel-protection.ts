/**
 * Pixel-Level Protection — canvas / WebGL noise that survives read-back.
 *
 * 🔴 Why this module exists (real gap found 2026-11-04):
 *   `getStealthScript()` only rewrites **API return values**. `canvas.toDataURL()` and
 *   `gl.readPixels()` still hand back the **real** framebuffer, so a headless Chromium
 *   exposes `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device ...))` while its UA claims
 *   a discrete NVIDIA card. Worse, every persona rendered on the same machine produces a
 *   **byte-identical** canvas hash — a fleet of accounts with different identities but one
 *   identical pixel fingerprint is trivially clustered.
 *
 * ⚠️ Determinism is the whole point:
 *   The noise MUST be derived from the passport seed, never from `Math.random()`.
 *   The same account has to read back identical pixels on every visit, otherwise a
 *   changing canvas hash is itself an automation signal (and breaks "sticky hardware").
 *
 * The noise is a **seeded permutation of a few discrete levels**, not random dithering:
 *   real devices quantize canvas output; a smooth ±1 RGB jitter on every pixel is its own
 *   fingerprint because no GPU produces it.
 */

import { createDeterministicPRNG } from './generator.js';

/** Canvas read-back surface exposed to the page. */
export interface CanvasNoiseConfig {
  /** Deterministic seed; identical seeds must produce identical pixels. */
  seed: string;
  /** Maximum per-channel deviation applied to read-back pixels. */
  amplitude?: number;
  /** Noise applied to 2D canvas read-back. */
  enabled2d?: boolean;
  /** Noise applied to WebGL read-back. */
  enabledWebgl?: boolean;
}

/** Number of discrete quantization levels used to emulate GPU rounding. */
const QUANTIZATION_LEVELS = 8;

/**
 * Builds the deterministic noise table for one surface.
 *
 * The table maps a byte value to one of `levels` neighbours, derived from the seed, so
 * the transformation is stable per seed but different across personas.
 */
function buildNoiseTable(seed: string, amplitude: number): Uint8Array {
  const table = new Uint8Array(256);
  const rand = createDeterministicPRNG(seed);
  for (let i = 0; i < 256; i++) {
    if (amplitude <= 0) {
      table[i] = i;
      continue;
    }
    // Discrete offsets emulate GPU rounding; a continuous range would look synthetic.
    const level = Math.floor(rand() * QUANTIZATION_LEVELS);
    const span = amplitude;
    const base = level / (QUANTIZATION_LEVELS - 1);
    const offset = Math.round((base - 0.5) * 2 * span);
    table[i] = Math.max(0, Math.min(255, i + offset));
  }
  return table;
}

/** Seed derivation keeps canvas and WebGL surfaces independent but both deterministic. */
function deriveSeed(seed: string, surface: string): string {
  return `${seed}::${surface}`;
}

/**
 * Produces the JavaScript source that patches canvas and WebGL read-back.
 *
 * The patch is intentionally dependency-free and IIFE-scoped so it can be injected through
 * Playwright `addInitScript`, Puppeteer `evaluateOnNewDocument`, or a raw CDP
 * `Page.addScriptToEvaluateOnNewDocument` call.
 */
export function getPixelProtectionScript(config: CanvasNoiseConfig): string {
  const amplitude = Math.max(0, Math.min(4, config.amplitude ?? 1));
  const canvasTable = buildNoiseTable(deriveSeed(config.seed, 'canvas'), amplitude);
  const webglTable = buildNoiseTable(deriveSeed(config.seed, 'webgl'), amplitude);
  const enable2d = config.enabled2d !== false;
  const enableWebgl = config.enabledWebgl !== false;

  const tableLiteral = (table: Uint8Array) =>
    `[${Array.from(table).join(',')}]`;

  return `(() => {
  const __dpCanvasTable = new Uint8Array(${tableLiteral(canvasTable)});
  const __dpWebglTable = new Uint8Array(${tableLiteral(webglTable)});
  const __dpAmplitude = ${amplitude};
  if (window.__devicePassportPixelProtection) return;

  const __dpApply = (data, table) => {
    if (!data || __dpAmplitude === 0) return data;
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data.buffer || data);
    for (let i = 0; i < bytes.length; i++) bytes[i] = table[bytes[i]];
    return bytes;
  };

  // ---- 2D canvas read-back -------------------------------------------------
  if (${enable2d ? 'true' : 'false'}) {
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      const out = origToDataURL.apply(this, args);
      try {
        const ctx = this.getContext('2d');
        if (!ctx) return out;
        const { width, height } = this;
        if (!width || !height) return out;
        const img = ctx.getImageData(0, 0, width, height);
        __dpApply(img.data, __dpCanvasTable);
        const tmp = document.createElement('canvas');
        tmp.width = width; tmp.height = height;
        tmp.getContext('2d').putImageData(img, 0, 0);
        return tmp.toDataURL.apply(tmp, args);
      } catch (e) {
        return out;
      }
    };

    const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const img = origGetImageData.apply(this, args);
      try { __dpApply(img.data, __dpCanvasTable); } catch (e) {}
      return img;
    };
  }

  // ---- WebGL read-back -----------------------------------------------------
  if (${enableWebgl ? 'true' : 'false'}) {
    const patch = (proto) => {
      if (!proto) return;
      const origReadPixels = proto.readPixels;
      proto.readPixels = function(...args) {
        const out = origReadPixels.apply(this, args);
        try {
          const target = args[6];
          if (target) __dpApply(target, __dpWebglTable);
        } catch (e) {}
        return out;
      };
    };
    patch(typeof WebGLRenderingContext !== 'undefined' ? WebGLRenderingContext.prototype : null);
    patch(typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext.prototype : null);
  }

  // ---- Audio fingerprint ---------------------------------------------------
  // Same rationale as canvas: the real oscillator profile is machine-identical.
  try {
    const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
    if (OrigAudioContext) {
      const origCreateOscillator = OrigAudioContext.prototype.createOscillator;
      const origGetFloatFrequencyData = AudioAnalyserNode.prototype.getFloatFrequencyData;
      AudioAnalyserNode.prototype.getFloatFrequencyData = function(...args) {
        const out = origGetFloatFrequencyData.apply(this, args);
        try {
          const arr = args[0];
          if (arr && arr.length) {
            const step = 1e-7;
            for (let i = 0; i < arr.length; i++) arr[i] += (i % 2 === 0 ? step : -step);
          }
        } catch (e) {}
        return out;
      };
      void origCreateOscillator;
    }
  } catch (e) {}

  window.__devicePassportPixelProtection = true;
})();`;
}

/**
 * Builds the noise configuration for a passport.
 *
 * The seed is the passport seed, so a persona keeps identical pixels across sessions.
 */
export function getPixelProtectionConfig(
  seed: string,
  overrides: Partial<Omit<CanvasNoiseConfig, 'seed'>> = {}
): CanvasNoiseConfig {
  return {
    seed,
    amplitude: overrides.amplitude ?? 1,
    enabled2d: overrides.enabled2d ?? true,
    enabledWebgl: overrides.enabledWebgl ?? true,
  };
}
