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

  // Seed-derived audio step: distinct per persona, representable in Float32.
  const audioRand = createDeterministicPRNG(deriveSeed(config.seed, 'audio'));
  const audioStep = Number((5e-4 + audioRand() * 15e-4).toPrecision(6));

  return `(() => {
  const __dpCanvasTable = new Uint8Array(${tableLiteral(canvasTable)});
  const __dpWebglTable = new Uint8Array(${tableLiteral(webglTable)});
  const __dpAmplitude = ${amplitude};
  const __dpAudioStep = ${audioStep};
  if (window.__devicePassportPixelProtection) return;

  const __dpApply = (data, table, keepAlpha) => {
    if (!data || __dpAmplitude === 0) return data;
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data.buffer || data);
    for (let i = 0; i < bytes.length; i++) {
      // RGBA layout: every fourth byte is alpha. Perturbing it would fabricate
      // transparency and break masks and hit-testing.
      if (keepAlpha && (i & 3) === 3) continue;
      bytes[i] = table[bytes[i]];
    }
    return bytes;
  };

  // ---- 2D canvas read-back -------------------------------------------------
  if (${enable2d ? 'true' : 'false'}) {
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;

    // A WebGL-backed canvas cannot hand out a 2D context, so its pixels must be read
    // through the GL path — otherwise toDataURL() leaks the real framebuffer.
    const __dpReadPixels = (canvas) => {
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return null;
        const w = canvas.width, h = canvas.height;
        if (!w || !h) return null;
        const buf = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        return buf;
      } catch (e) {
        return null;
      }
    };

    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      const out = origToDataURL.apply(this, args);
      try {
        const { width, height } = this;
        if (!width || !height) return out;

        const ctx = this.getContext('2d');
        let img;
        if (ctx) {
          img = ctx.getImageData(0, 0, width, height);
          __dpApply(img.data, __dpCanvasTable, true);
        } else {
          // WebGL canvas: perturb the raw framebuffer instead of giving up.
          const buf = __dpReadPixels(this);
          if (!buf) return out;
          __dpApply(buf, __dpWebglTable, true);
          img = new ImageData(new Uint8ClampedArray(buf.buffer || buf), width, height);
        }

        const tmp = document.createElement('canvas');
        tmp.width = width; tmp.height = height;
        const tmpCtx = tmp.getContext('2d');
        if (!tmpCtx) return out;
        tmpCtx.putImageData(img, 0, 0);
        // MUST use the captured original: tmp shares the patched prototype, so calling
        // tmp.toDataURL() would recurse and serialize canvases until the stack blows.
        return origToDataURL.apply(tmp, args);
      } catch (e) {
        return out;
      }
    };

    const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const img = origGetImageData.apply(this, args);
      try { __dpApply(img.data, __dpCanvasTable, true); } catch (e) {}
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
          if (target) __dpApply(target, __dpWebglTable, true);
        } catch (e) {}
        return out;
      };
    };
    patch(typeof WebGLRenderingContext !== 'undefined' ? WebGLRenderingContext.prototype : null);
    patch(typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext.prototype : null);
  }

  // ---- Audio fingerprint ---------------------------------------------------
  // Same rationale as canvas: the real oscillator profile is machine-identical.
  // The perturbation MUST be seed-derived (a fixed step is identical for every persona
  // and therefore shared across accounts) and large enough to survive Float32 rounding
  // at typical -60..-100 dB values.
  try {
    const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
    if (OrigAudioContext) {
      const origGetFloatFrequencyData = AudioAnalyserNode.prototype.getFloatFrequencyData;
      AudioAnalyserNode.prototype.getFloatFrequencyData = function(...args) {
        const out = origGetFloatFrequencyData.apply(this, args);
        try {
          const arr = args[0];
          if (arr && arr.length) {
            for (let i = 0; i < arr.length; i++) {
              const sign = i % 2 === 0 ? 1 : -1;
              // 1e-3 is representable in Float32 even for values around -100 dB.
              arr[i] = arr[i] + sign * __dpAudioStep * (1 + (i % 7) * 0.1);
            }
          }
        } catch (e) {}
        return out;
      };
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
