import { describe, test, expect } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { unlinkSync, existsSync } from 'node:fs'
import { createPassport, PassportManager, VERSION } from '../src/index.js'

describe('Architectural Ergonomics & Developer Experience', () => {
  test('exports library version 1.0.0', () => {
    expect(VERSION).toBe('1.0.0')
  })

  test('one-liner string seed: createPassport("alice")', () => {
    const p1 = createPassport('alice')
    const p2 = createPassport('alice')

    // Deterministic stickiness
    expect(p1.seed).toBe('alice')
    expect(p1.userAgent).toBe(p2.userAgent)
    expect(p1.timezone).toBe(p2.timezone)
    expect(p1.headers['user-agent']).toBe(p2.headers['user-agent'])
    expect(p1.headers['sec-ch-ua']).toBeDefined()
    expect(p1.headers['sec-ch-ua-platform']).toBeDefined()
  })

  test('string seed with geo options: createPassport("bob", { geo: "JP" })', () => {
    const p = createPassport('bob', { geo: 'JP' })
    expect(p.locale.country).toBe('JP')
    expect(p.timezone).toBe('Asia/Tokyo')
    expect(p.headers['accept-language']).toContain('ja')
    expect(p.playwrightContext.locale).toContain('ja')
    expect(p.playwrightContext.timezoneId).toBe('Asia/Tokyo')
  })

  test('options object with auto-persistence: createPassport({ seed, store })', () => {
    const tmpStore = join(tmpdir(), `passport-test-${Date.now()}.json`)
    try {
      const p1 = createPassport({ seed: 'persistent_bot', geo: 'DE', store: tmpStore })
      expect(existsSync(tmpStore)).toBe(true)

      // Re-load from storage file
      const p2 = createPassport({ seed: 'persistent_bot', store: tmpStore })
      expect(p2.id).toBe(p1.id)
      expect(p2.userAgent).toBe(p1.userAgent)
      expect(p2.locale.country).toBe('DE')
    } finally {
      if (existsSync(tmpStore)) unlinkSync(tmpStore)
    }
  })

  test('zero-config ephemeral persona: createPassport()', () => {
    const p = createPassport()
    expect(p.id).toBeDefined()
    expect(p.headers['user-agent']).toBeDefined()
    expect(p.headers['sec-ch-ua']).toBeDefined()
  })

  test('self-evaluation returns high coherence grade A+', () => {
    const p = createPassport('eval_test_user')
    const evalResult = p.evaluate()
    expect(evalResult.grade).toBe('A+')
    expect(evalResult.overallScore).toBeGreaterThanOrEqual(95)
    expect(evalResult.status).toBe('PASS')
  })

  test('dual-mode Playwright context and fetch headers integration', () => {
    const p = createPassport('dual_mode_user', { geo: 'GB' })
    
    // HTTP Mode
    const headers = p.getHeaders({ 'X-Custom-Token': 'secret123' })
    expect(headers['x-custom-token']).toBe('secret123')
    expect(headers['accept-language']).toContain('en-GB')

    // Automation Mode
    const pw = p.playwrightContext
    expect(pw.locale).toContain('en')
    expect(pw.timezoneId).toBe('Europe/London')
    expect(pw.userAgent).toBe(p.userAgent)
    expect(pw.viewport.width).toBeGreaterThan(0)
  })
})
