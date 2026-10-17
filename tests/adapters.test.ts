import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  formatCanonicalHeaders,
  CANONICAL_HEADER_ORDER,
  withPassport,
  toCurl,
  getPlaywrightContext,
  getStealthScript,
  getPuppeteerArgs,
} from '../src/adapters/index.js'
import { generatePassport } from '../src/engine/index.js'
import { DevicePassportInstance, createPassport } from '../src/passport.js'
import { PassportManager } from '../src/manager.js'

describe('Dual-Mode Adapters - Lightweight HTTP Mode', () => {
  const profile = generatePassport({ seed: 'test-http-adapter', os: 'macOS', browser: 'Chrome' })
  const passport = new DevicePassportInstance(profile)

  it('orders headers in strict canonical browser sequence', () => {
    const rawHeaders: Record<string, string> = {
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'Mozilla/5.0 ...',
      'sec-ch-ua': '"Chromium";v="124"',
      'accept': 'text/html',
      'sec-fetch-dest': 'document',
      'sec-fetch-site': 'none',
      'sec-fetch-mode': 'navigate',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-mobile': '?0',
      'upgrade-insecure-requests': '1',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'x-custom-crawler-header': 'custom-val',
    }

    const ordered = formatCanonicalHeaders(rawHeaders)
    const keys = Object.keys(ordered)

    // Verify canonical sequence
    expect(keys.indexOf('sec-ch-ua')).toBeLessThan(keys.indexOf('user-agent'))
    expect(keys.indexOf('user-agent')).toBeLessThan(keys.indexOf('accept'))
    expect(keys.indexOf('accept')).toBeLessThan(keys.indexOf('sec-fetch-site'))
    expect(keys.indexOf('sec-fetch-site')).toBeLessThan(keys.indexOf('accept-encoding'))
    expect(keys.indexOf('accept-encoding')).toBeLessThan(keys.indexOf('accept-language'))
    expect(keys.indexOf('accept-language')).toBeLessThan(keys.indexOf('x-custom-crawler-header'))
  })

  it('merges overrides into canonical headers correctly', () => {
    const headers = passport.getHeaders({
      'x-request-id': 'req-12345',
      'accept-language': 'zh-CN,zh;q=0.9',
    })

    expect(headers['x-request-id']).toBe('req-12345')
    expect(headers['accept-language']).toBe('zh-CN,zh;q=0.9')
    expect(headers['user-agent']).toBe(profile.browser.userAgent)
  })

  it('wraps fetch with canonical headers and user-agent', async () => {
    let capturedInput: any
    let capturedInit: any

    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      capturedInput = input
      capturedInit = init
      return new Response('OK', { status: 200 })
    }

    const pFetch = withPassport(passport, mockFetch as any)
    const res = await pFetch('https://example.com/api', {
      headers: { 'x-correlation-id': 'xyz' },
    })

    expect(await res.text()).toBe('OK')
    expect(capturedInput).toBe('https://example.com/api')
    expect(capturedInit.headers['user-agent']).toBe(profile.browser.userAgent)
    expect(capturedInit.headers['x-correlation-id']).toBe('xyz')
    expect(capturedInit.headers['sec-ch-ua']).toBeDefined()
  })

  it('generates executable cURL command', () => {
    const curl = passport.toCurl('https://httpbin.org/headers', {
      data: { query: 'test' },
    })

    expect(curl).toContain('curl')
    expect(curl).toContain('-sSL')
    expect(curl).toContain("'https://httpbin.org/headers'")
    expect(curl).toContain("-H 'user-agent:")
    expect(curl).toContain("-H 'sec-ch-ua:")
    expect(curl).toContain("--data '{\"query\":\"test\"}'")
  })
})

describe('Dual-Mode Adapters - Browser Automation Mode', () => {
  const profile = generatePassport({ seed: 'test-browser-adapter', os: 'macOS', browser: 'Chrome' })
  const passport = new DevicePassportInstance(profile)

  it('produces valid Playwright BrowserContext options', () => {
    const pwOpts = passport.getPlaywrightContext()

    expect(pwOpts.userAgent).toBe(profile.browser.userAgent)
    expect(pwOpts.viewport.width).toBe(profile.hardware.screen.width)
    expect(pwOpts.viewport.height).toBe(profile.hardware.screen.height)
    expect(pwOpts.deviceScaleFactor).toBe(profile.hardware.screen.dpr)
    expect(pwOpts.locale).toBe(profile.locale.language)
    expect(pwOpts.timezoneId).toBe(profile.locale.timezone)
    expect(pwOpts.extraHTTPHeaders['user-agent']).toBe(profile.browser.userAgent)
  })

  it('generates stealth script with zero automation flags and patched hardware', () => {
    const script = passport.getStealthScript()

    expect(script).toContain("navigator, 'webdriver'")
    expect(script).toContain("navigator, 'hardwareConcurrency'")
    expect(script).toContain(`() => ${profile.hardware.cpu.concurrency}`)
    expect(script).toContain("navigator, 'deviceMemory'")
    expect(script).toContain("navigator, 'userAgentData'")
    expect(script).toContain(profile.hardware.gpu.vendor)
    expect(script).toContain(profile.hardware.gpu.renderer)
  })

  it('produces valid Puppeteer emulation options and launch args', () => {
    const puppeteerOpts = passport.getPuppeteerArgs()

    expect(puppeteerOpts.userAgent).toBe(profile.browser.userAgent)
    expect(puppeteerOpts.launchArgs.some((arg) => arg.startsWith('--user-agent='))).toBe(true)
    expect(puppeteerOpts.launchArgs).toContain('--disable-blink-features=AutomationControlled')
    expect(puppeteerOpts.defaultViewport.width).toBe(profile.hardware.screen.width)
    expect(puppeteerOpts.defaultViewport.deviceScaleFactor).toBe(profile.hardware.screen.dpr)
  })
})

describe('DevicePassportInstance & PassportManager', () => {
  it('DevicePassportInstance evaluates consistency and generates diagnostic grade', () => {
    const profile = generatePassport({ seed: 'consistent-seed-42', os: 'macOS', browser: 'Chrome' })
    const passport = createPassport(profile)

    const evaluation = passport.evaluate()
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(90)
    expect(evaluation.status).toBe('PASS')
    expect(['A+', 'A']).toContain(evaluation.grade)
    expect(evaluation.checks.length).toBeGreaterThan(0)
  })

  it('PassportManager provides true sticky identity across runs in memory', async () => {
    const manager = new PassportManager()

    const p1 = await manager.getPassport('account-bob')
    const p2 = await manager.getPassport('account-bob')

    expect(p1.id).toBe(p2.id)
    expect(p1.browser.userAgent).toBe(p2.browser.userAgent)
    expect(p1.hardware.gpu.renderer).toBe(p2.hardware.gpu.renderer)
    expect(p1.locale.timezone).toBe(p2.locale.timezone)

    expect(await manager.count()).toBe(1)
    expect(await manager.hasPassport('account-bob')).toBe(true)
  })

  it('PassportManager provides file-backed sticky persistence across manager instances', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'passport-mgr-test-'))
    const storePath = path.join(tmpDir, 'passports.json')

    try {
      const manager1 = new PassportManager({ store: storePath, defaultGeo: 'JP' })
      const p1 = await manager1.getPassport('crawler-worker-1')

      expect(p1.locale.country).toBe('JP')

      // Second manager instance loading the exact same store
      const manager2 = new PassportManager({ store: storePath })
      const p2 = await manager2.getPassport('crawler-worker-1')

      expect(p2.id).toBe(p1.id)
      expect(p2.browser.userAgent).toBe(p1.browser.userAgent)
      expect(p2.hardware.screen.width).toBe(p1.hardware.screen.width)
      expect(p2.locale.country).toBe('JP')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
