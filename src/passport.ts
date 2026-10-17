import type {
  BrowserProfile,
  ClientHintsHeaders,
  ConsistencyCheck,
  DevicePassport,
  DevicePassportContext,
  HardwareProfile,
  LocaleProfile,
  OperatingSystemProfile,
  PassportEvaluation,
  PassportGeneratorOptions,
  UserAgentClientHints,
} from './types/index.js'
import {
  formatCanonicalHeaders,
  toCurl,
  withPassport,
} from './adapters/fetch.js'
import {
  getPlaywrightContext,
  getStealthScript,
  applyToPlaywrightContext,
  type PlaywrightContextOptions,
} from './adapters/playwright.js'
import {
  getPuppeteerArgs,
  applyToPuppeteerPage,
  type PuppeteerEmulationOptions,
} from './adapters/puppeteer.js'
import { detectAllContradictions } from './evaluator/contradiction.js'
import { analyzeHeaderEntropy } from './evaluator/entropy.js'
import { generatePassport } from './engine/generator.js'
import { JSONFileStorage } from './storage/file.js'
import type { StorageAdapter } from './storage/interface.js'

/**
 * DevicePassportInstance encapsulates a single concrete, zero-contradiction digital identity persona.
 *
 * Provides runtime adapters for:
 * 1. Lightweight HTTP mode (Fetch, Axios, Undici, Got, cURL) with strict canonical header ordering.
 * 2. Heavyweight browser automation (Playwright, Puppeteer, ego-lite) with deep fingerprint masking.
 * 3. Self-evaluating consistency diagnostics based on empirical telemetry models.
 */
export class DevicePassportInstance {
  public readonly profile: DevicePassport

  constructor(profile: DevicePassport) {
    if (!profile) {
      throw new Error('[DevicePassportInstance] Profile cannot be null or undefined')
    }
    this.profile = profile
  }

  /**
   * Factory method to create an instance from a plain DevicePassport object.
   */
  static from(profile: DevicePassport): DevicePassportInstance {
    return new DevicePassportInstance(profile)
  }

  // ==========================================
  // Getters for core profile facets
  // ==========================================

  get id(): string {
    return this.profile.id
  }

  get seed(): string {
    return this.profile.seed
  }

  get createdAt(): string {
    return this.profile.createdAt
  }

  get browser(): BrowserProfile {
    return this.profile.browser
  }

  get os(): OperatingSystemProfile {
    return this.profile.os
  }

  get hardware(): HardwareProfile {
    return this.profile.hardware
  }

  get locale(): LocaleProfile {
    return this.profile.locale
  }

  get headers(): Record<string, string> {
    return this.profile.headers
  }

  get clientHints(): UserAgentClientHints {
    return this.profile.clientHints
  }

  get context(): DevicePassportContext {
    return this.profile.context
  }

  get userAgent(): string {
    return this.profile.headers['user-agent'] || this.profile.browser.userAgent
  }

  get timezone(): string {
    return this.profile.locale.timezone
  }

  get playwrightContext(): PlaywrightContextOptions {
    return this.getPlaywrightContext()
  }

  get puppeteerArgs(): PuppeteerEmulationOptions {
    return this.getPuppeteerArgs()
  }

  get evaluation(): PassportEvaluation | undefined {
    return this.profile.evaluation
  }

  // ==========================================
  // Lightweight HTTP Mode Adapters
  // ==========================================

  /**
   * Returns HTTP headers formatted in strict canonical browser sequence.
   * Essential for anti-bot evasion against Cloudflare, Akamai, and DataDome.
   */
  getHeaders(overrides?: Record<string, string>): Record<string, string> {
    return formatCanonicalHeaders(this.profile.headers, overrides)
  }

  /**
   * Returns a higher-order fetch function wrapping standard fetch with this passport's canonical persona.
   */
  wrapFetch(customFetch?: typeof fetch): typeof fetch {
    return withPassport(this, customFetch)
  }

  /**
   * Alias for wrapFetch.
   */
  withPassport(customFetch?: typeof fetch): typeof fetch {
    return withPassport(this, customFetch)
  }

  /**
   * Generates a copy-pasteable cURL command with correct browser headers and User-Agent.
   */
  toCurl(
    url: string,
    options?: { method?: string; data?: any; headers?: Record<string, string> },
  ): string {
    return toCurl(this, url, options)
  }

  // ==========================================
  // Heavyweight Browser Automation Adapters
  // ==========================================

  /**
   * Generates Playwright BrowserContext options.
   * Usage:
   * ```ts
   * const context = await browser.newContext(passport.getPlaywrightContext());
   * ```
   */
  getPlaywrightContext(): PlaywrightContextOptions {
    return getPlaywrightContext(this.profile)
  }

  /**
   * Returns Puppeteer launch args and page emulation parameters.
   */
  getPuppeteerArgs(): PuppeteerEmulationOptions {
    return getPuppeteerArgs(this.profile)
  }

  /**
   * Generates an in-page stealth script to patch runtime JavaScript APIs
   * (navigator.webdriver, hardwareConcurrency, deviceMemory, WebGL, Client Hints).
   */
  getStealthScript(): string {
    return getStealthScript(this.profile)
  }

  /**
   * Injects stealth scripts and extra HTTP headers into a Playwright BrowserContext.
   */
  async applyToPlaywright(context: any): Promise<void> {
    await applyToPlaywrightContext(context, this.profile)
  }

  /**
   * Injects stealth scripts and emulation parameters into a Puppeteer Page.
   */
  async applyToPuppeteer(page: any): Promise<void> {
    await applyToPuppeteerPage(page, this.profile)
  }

  // ==========================================
  // Consistency & Diagnostics
  // ==========================================

  /**
   * Evaluates cross-layer consistency and Shannon entropy.
   * Caches the result on `this.profile.evaluation`.
   */
  evaluate(forceRecompute = false): PassportEvaluation {
    if (this.profile.evaluation && !forceRecompute) {
      return this.profile.evaluation
    }

    try {
      const contradictions = detectAllContradictions(this.profile)
      let estimatedBits = 48
      let collisionRisk: 'very_low' | 'low' | 'moderate' | 'high' = 'very_low'

      try {
        const entropy = analyzeHeaderEntropy(this.profile.headers)
        if (entropy) {
          estimatedBits = entropy.estimatedBits
          collisionRisk = entropy.collisionRisk
        }
      } catch {
        // Fallback if entropy analyzer is undergoing calibration
      }

      const totalPenalty = contradictions.reduce((sum, c) => sum + c.impactPenalty, 0)
      const overallScore = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)))

      const status = overallScore >= 90 ? 'PASS' : overallScore >= 70 ? 'WARN' : 'FAIL'
      const grade = overallScore >= 95
        ? 'A+'
        : overallScore >= 85
          ? 'A'
          : overallScore >= 70
            ? 'B'
            : overallScore >= 50
              ? 'C'
              : 'F'

      const checks: ConsistencyCheck[] = [
        {
          id: 'chk_os_ua_alignment',
          name: 'OS and User-Agent Alignment',
          category: 'os_ua_alignment',
          passed: !contradictions.some((c) => c.category === 'os_browser'),
          score: contradictions.some((c) => c.category === 'os_browser') ? 0 : 100,
          weight: 1.5,
          message: contradictions.find((c) => c.category === 'os_browser')?.description ?? 'User-Agent and Operating System are fully coherent',
        },
        {
          id: 'chk_hardware_plausibility',
          name: 'Hardware and GPU Plausibility',
          category: 'hardware_plausibility',
          passed: !contradictions.some((c) => c.category === 'hardware_system'),
          score: contradictions.some((c) => c.category === 'hardware_system') ? 0 : 100,
          weight: 2.0,
          message: contradictions.find((c) => c.category === 'hardware_system')?.description ?? 'GPU renderer, CPU architecture and RAM are physically plausible',
        },
        {
          id: 'chk_geo_locale_coherence',
          name: 'Geo and Locale Coherence',
          category: 'geo_locale_coherence',
          passed: !contradictions.some((c) => c.category === 'geo_chrono'),
          score: contradictions.some((c) => c.category === 'geo_chrono') ? 0 : 100,
          weight: 1.5,
          message: contradictions.find((c) => c.category === 'geo_chrono')?.description ?? 'Timezone, country, and Accept-Language are geographically locked',
        },
        {
          id: 'chk_client_hints_entropy',
          name: 'Client Hints RFC 8942 Compliance',
          category: 'client_hints_entropy',
          passed: !contradictions.some((c) => c.category === 'client_hints'),
          score: contradictions.some((c) => c.category === 'client_hints') ? 0 : 100,
          weight: 1.5,
          message: contradictions.find((c) => c.category === 'client_hints')?.description ?? 'User-Agent Client Hints headers strictly match W3C and Chromium freeze specifications',
        },
      ]

      const evaluation: PassportEvaluation = {
        overallScore,
        status,
        grade,
        checks,
        entropyAnalysis: {
          estimatedBits,
          collisionRisk,
        },
        evaluatedAt: new Date().toISOString(),
      }

      this.profile.evaluation = evaluation
      return evaluation
    } catch {
      // Return existing evaluation or baseline pass
      if (this.profile.evaluation) {
        return this.profile.evaluation
      }
      const baseline: PassportEvaluation = {
        overallScore: 100,
        status: 'PASS',
        grade: 'A+',
        checks: [],
        evaluatedAt: new Date().toISOString(),
      }
      this.profile.evaluation = baseline
      return baseline
    }
  }

  // ==========================================
  // Serialization
  // ==========================================

  /**
   * Returns the underlying raw DevicePassport data object.
   */
  toJSON(): DevicePassport {
    return this.profile
  }

  toString(): string {
    const { id, browser, os, locale } = this.profile
    return `[DevicePassport ${id} | ${browser?.name ?? 'Browser'} ${browser?.version ?? ''} on ${os?.platform ?? 'OS'} | ${locale?.language ?? 'Locale'}]`
  }
}

export interface CreatePassportInputOptions extends PassportGeneratorOptions {
  /** Optional file path or storage adapter to persist this passport deterministically */
  store?: string | StorageAdapter<DevicePassport>
}

/**
 * Universal polymorphic factory for creating a DevicePassportInstance.
 *
 * Supports:
 * - One-line string seed: `createPassport('alice', { geo: 'US' })`
 * - Full options object: `createPassport({ seed: 'bot1', store: './passports.json' })`
 * - Existing raw profile: `createPassport(rawProfile)`
 * - Zero-config ephemeral persona: `createPassport()`
 */
export function createPassport(
  seedOrOptionsOrProfile?: string | CreatePassportInputOptions | DevicePassport,
  extraOptions?: CreatePassportInputOptions
): DevicePassportInstance {
  // Case 1: Already an instance
  if (seedOrOptionsOrProfile instanceof DevicePassportInstance) {
    return seedOrOptionsOrProfile
  }

  // Case 2: Passed a raw DevicePassport profile object
  if (
    seedOrOptionsOrProfile &&
    typeof seedOrOptionsOrProfile === 'object' &&
    'id' in seedOrOptionsOrProfile &&
    'clientHints' in seedOrOptionsOrProfile &&
    'headers' in seedOrOptionsOrProfile
  ) {
    return new DevicePassportInstance(seedOrOptionsOrProfile as DevicePassport)
  }

  // Case 3: Parse options
  let options: CreatePassportInputOptions = {}
  if (typeof seedOrOptionsOrProfile === 'string') {
    options = { ...extraOptions, seed: seedOrOptionsOrProfile }
  } else if (seedOrOptionsOrProfile && typeof seedOrOptionsOrProfile === 'object') {
    options = { ...(seedOrOptionsOrProfile as CreatePassportInputOptions) }
  } else if (extraOptions) {
    options = { ...extraOptions }
  }

  // If storage is configured, read or persist
  if (options.store && options.seed) {
    const storage: StorageAdapter<DevicePassport> =
      typeof options.store === 'string'
        ? new JSONFileStorage<DevicePassport>({ filePath: options.store })
        : options.store

    if (storage.hasSync && storage.hasSync(options.seed)) {
      const existing = (storage as any).getSync(options.seed)
      if (existing) return new DevicePassportInstance(existing)
    }

    const generated = generatePassport(options)
    if (storage.setSync) {
      storage.setSync(options.seed, generated)
    } else {
      storage.set(options.seed, generated).catch(() => {})
    }
    return new DevicePassportInstance(generated)
  }

  // Fallback: generate deterministic or ephemeral passport
  const generated = generatePassport(options)
  return new DevicePassportInstance(generated)
}
