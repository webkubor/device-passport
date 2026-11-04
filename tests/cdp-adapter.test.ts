import { describe, expect, test } from 'bun:test'
import { applyCdpPassport, getCdpPlan } from '../src/adapters/cdp.js'
import { createPassport } from '../src/passport.js'

describe('CDP adapter', () => {
  test('emits UA, timezone, locale and viewport overrides', () => {
    const plan = getCdpPlan(createPassport('alice'))
    const methods = plan.commands.map(c => c.method)
    expect(methods).toContain('Emulation.setUserAgentOverride')
    expect(methods).toContain('Emulation.setTimezoneOverride')
    expect(methods).toContain('Emulation.setLocaleOverride')
    expect(methods).toContain('Emulation.setDeviceMetricsOverride')
    expect(methods).toContain('Network.setExtraHTTPHeaders')
  })

  test('user agent override carries the passport user agent and metadata', () => {
    const passport = createPassport('alice')
    const plan = getCdpPlan(passport)
    const ua = plan.commands.find(c => c.method === 'Emulation.setUserAgentOverride')!
    expect(ua.params?.userAgent).toBe(passport.browser?.userAgent)
    expect((ua.params?.userAgentMetadata as any)?.brands).toBeDefined()
  })

  test('timezone override matches the passport geo alignment', () => {
    const passport = createPassport('alice')
    const plan = getCdpPlan(passport)
    const tz = plan.commands.find(c => c.method === 'Emulation.setTimezoneOverride')!
    expect(tz.params?.timezoneId).toBe(passport.locale?.timezone)
  })

  test('init script carries the stealth and pixel protection', () => {
    const plan = getCdpPlan(createPassport('alice'))
    expect(plan.initScripts.length).toBe(1)
    expect(plan.initScripts[0].source).toContain('__devicePassportPixelProtection')
    expect(plan.initScripts[0].source).toContain('HTMLCanvasElement.prototype.toDataURL')
  })

  test('session id is attached to every command when provided', () => {
    const plan = getCdpPlan(createPassport('alice'), 'S-1')
    expect(plan.commands.every(c => c.sessionId === 'S-1')).toBe(true)
  })

  test('applyCdpPassport sends commands then installs init scripts', async () => {
    const order: string[] = []
    await applyCdpPassport(createPassport('alice'), async (cmd) => {
      order.push(cmd.method)
    })
    expect(order[order.length - 1]).toBe('Page.addScriptToEvaluateOnNewDocument')
    expect(order.indexOf('Page.addScriptToEvaluateOnNewDocument')).toBeGreaterThan(
      order.indexOf('Emulation.setUserAgentOverride')
    )
  })

  test('Page.enable is emitted before the init script is installed', () => {
    // Without Page.enable, Chrome accepts the init script but never runs it —
    // the persona silently stays a plain automation session.
    const plan = getCdpPlan(createPassport('alice'))
    const enableIndex = plan.commands.findIndex(c => c.method === 'Page.enable')
    expect(enableIndex).toBeGreaterThanOrEqual(0)
    expect(enableIndex).toBeLessThan(plan.commands.findIndex(c => c.method === 'Emulation.setUserAgentOverride'))
  })

  test('two passports produce different UA overrides', () => {
    const a = getCdpPlan(createPassport('alice')).commands.find(c => c.method === 'Emulation.setUserAgentOverride')!
    const b = getCdpPlan(createPassport('bob')).commands.find(c => c.method === 'Emulation.setUserAgentOverride')!
    expect(a.params?.userAgent).not.toBe(b.params?.userAgent)
  })
})
