import { describe, expect, test } from 'bun:test'
import {
  getPixelProtectionConfig,
  getPixelProtectionScript,
} from '../src/engine/pixel-protection.js'
import { createPassport } from '../src/passport.js'
import { getStealthScript } from '../src/adapters/playwright.js'

/**
 * Pixel protection must be:
 *  1. deterministic per seed  — same account, same pixels, forever
 *  2. distinct per seed       — different accounts must not share a canvas hash
 *  3. actually mutating       — a no-op patch would pass a naive "is it stable" test
 */

function runScript(seed: string): string {
  return getPixelProtectionScript(getPixelProtectionConfig(seed))
}

describe('Pixel Protection', () => {
  test('identical seeds produce identical scripts', () => {
    expect(runScript('alice')).toBe(runScript('alice'))
  })

  test('different seeds produce different noise tables', () => {
    expect(runScript('alice')).not.toBe(runScript('bob'))
  })

  test('canvas and webgl surfaces use independent tables', () => {
    const script = runScript('alice')
    const tables = [...script.matchAll(/new Uint8Array\(\[([\d,]+)\]\)/g)].map(m => m[1])
    expect(tables.length).toBeGreaterThanOrEqual(2)
    expect(tables[0]).not.toBe(tables[1])
  })

  test('amplitude zero disables the noise table', () => {
    const script = getPixelProtectionScript({ seed: 'alice', amplitude: 0 })
    const table = script.match(/new Uint8Array\(\[([\d,]+)\]\)/)
    expect(table).not.toBeNull()
    const values = table![1].split(',').map(Number)
    // A disabled table must be the identity mapping.
    expect(values.every((v, i) => v === i)).toBe(true)
  })

  test('amplitude is clamped to a plausible range', () => {
    const huge = getPixelProtectionScript({ seed: 'alice', amplitude: 999 })
    expect(huge).toContain('const __dpAmplitude = 4;')
    const negative = getPixelProtectionScript({ seed: 'alice', amplitude: -5 })
    expect(negative).toContain('const __dpAmplitude = 0;')
  })

  test('patches canvas and webgl read-back paths', () => {
    const script = runScript('alice')
    expect(script).toContain('HTMLCanvasElement.prototype.toDataURL')
    expect(script).toContain('CanvasRenderingContext2D.prototype.getImageData')
    expect(script).toContain('proto.readPixels')
  })

  test('re-injection is idempotent', () => {
    const script = runScript('alice')
    expect(script).toContain('window.__devicePassportPixelProtection')
    expect(script).toContain('if (window.__devicePassportPixelProtection) return;')
  })
})

describe('Review findings regression', () => {
  test('serialization uses the captured original to avoid recursion', () => {
    const script = runScript('alice')
    // A temporary canvas shares the patched prototype; calling its toDataURL would recurse.
    expect(script).toContain('origToDataURL.apply(tmp, args)')
    // Strip comments before asserting: the warning itself mentions the pattern.
    const code = script.replace(/\/\/[^\n]*/g, '')
    expect(code).not.toMatch(/tmp\.toDataURL/)
  })

  test('alpha bytes are preserved', () => {
    const script = runScript('alice')
    expect(script).toContain('keepAlpha')
    expect(script).toContain('(i & 3) === 3')
  })

  test('WebGL-backed canvases are serialized through the GL path', () => {
    const script = runScript('alice')
    expect(script).toContain("getContext('webgl2')")
    expect(script).toContain('gl.readPixels')
  })

  test('audio perturbation is seed-derived and representable', () => {
    const a = runScript('alice')
    const b = runScript('bob')
    const stepOf = (s: string) => Number(s.match(/__dpAudioStep = ([\d.e-]+)/)![1])
    expect(stepOf(a)).toBeGreaterThan(0)
    // Float32 must represent the step at typical -100 dB magnitudes.
    expect(Math.fround(stepOf(a))).toBeGreaterThan(0)
    expect(stepOf(a)).not.toBe(stepOf(b))
  })
})

describe('Injected script must be valid browser JavaScript', () => {
  test('contains no TypeScript-only syntax', () => {
    const script = getStealthScript(createPassport('alice'))
    // `navigator as any` inside a template literal shipped as a runtime SyntaxError,
    // which silently disabled the ENTIRE stealth script — webdriver stayed true.
    expect(script).not.toMatch(/\bas any\b/)
    expect(script).not.toMatch(/\bas [A-Z][A-Za-z]*\b/)
    expect(script).not.toMatch(/\binterface [A-Z]/)
    expect(script).not.toMatch(/:\s*string\b/)
  })

  test('declares no TypeScript-only type annotations in the patch body', () => {
    const script = getStealthScript(createPassport('alice'))
    expect(script).not.toMatch(/\)\s*:\s*void\b/)
    expect(script).not.toMatch(/\bconst \w+\s*:\s*(number|string|boolean)\b/)
  })

  test('the script parses as a function body', () => {
    const script = getStealthScript(createPassport('alice'))
    // Parsing via Function constructor surfaces SyntaxError that a string check misses.
    expect(() => new Function(script)).not.toThrow()
  })

  test('pixel protection portion alone is parseable', () => {
    expect(() => new Function(runScript('alice'))).not.toThrow()
  })
})

describe('Stealth script integration', () => {
  test('getStealthScript includes pixel protection seeded by the passport', () => {
    const passport = createPassport('alice')
    const script = getStealthScript(passport)
    expect(script).toContain('__devicePassportPixelProtection')
    expect(script).toContain('HTMLCanvasElement.prototype.toDataURL')
  })

  test('two passports produce different pixel tables', () => {
    const a = getStealthScript(createPassport('alice'))
    const b = getStealthScript(createPassport('bob'))
    const tableOf = (s: string) => s.match(/new Uint8Array\(\[([\d,]+)\]\)/)![1]
    expect(tableOf(a)).not.toBe(tableOf(b))
  })

  test('the same passport is stable across recreations', () => {
    const a = getStealthScript(createPassport('alice'))
    const b = getStealthScript(createPassport('alice'))
    expect(a).toBe(b)
  })
})
