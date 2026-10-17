import type { DevicePassport } from '../types/index.js'
import { formatCanonicalHeaders } from './fetch.js'
import { getStealthScript } from './playwright.js'

export interface PuppeteerEmulationOptions {
  launchArgs: string[]
  defaultViewport: {
    width: number
    height: number
    deviceScaleFactor: number
    isMobile: boolean
    hasTouch: boolean
  }
  userAgent: string
  locale: string
  timezoneId: string
  extraHTTPHeaders: Record<string, string>
}

/**
 * Returns Puppeteer launch args and page emulation parameters matching the DevicePassport.
 */
export function getPuppeteerArgs(passport: DevicePassport): PuppeteerEmulationOptions {
  const width = passport.hardware?.screen?.width ?? 1920
  const height = passport.hardware?.screen?.height ?? 1080
  const dpr = passport.hardware?.screen?.dpr ?? 1
  const locale = passport.locale?.language ?? 'en-US'
  const timezone = passport.locale?.timezone ?? 'America/New_York'
  const userAgent = passport.browser?.userAgent ?? passport.context?.userAgent

  const headers = passport.context?.extraHTTPHeaders ?? passport.headers ?? {}
  const canonicalHeaders = formatCanonicalHeaders(headers)

  const launchArgs = [
    `--user-agent=${userAgent}`,
    `--window-size=${width},${height}`,
    `--lang=${locale}`,
    '--disable-blink-features=AutomationControlled',
    '--no-default-browser-check',
  ]

  return {
    launchArgs,
    defaultViewport: {
      width,
      height,
      deviceScaleFactor: dpr,
      isMobile: passport.context?.isMobile ?? false,
      hasTouch: passport.context?.hasTouch ?? false,
    },
    userAgent,
    locale,
    timezoneId: timezone,
    extraHTTPHeaders: canonicalHeaders,
  }
}

/**
 * Applies stealth injections, headers, viewport, and timezone emulation to a Puppeteer Page.
 *
 * @param page Puppeteer Page instance
 * @param passport DevicePassport instance
 */
export async function applyToPuppeteerPage(page: any, passport: DevicePassport): Promise<void> {
  if (!page || typeof page.evaluateOnNewDocument !== 'function') {
    throw new Error('[device-passport] Invalid Puppeteer page provided to applyToPuppeteerPage.')
  }

  const { defaultViewport, userAgent, extraHTTPHeaders, timezoneId } = getPuppeteerArgs(passport)

  if (typeof page.setUserAgent === 'function') {
    await page.setUserAgent(userAgent)
  }

  if (typeof page.setViewport === 'function') {
    await page.setViewport(defaultViewport)
  }

  if (typeof page.setExtraHTTPHeaders === 'function') {
    await page.setExtraHTTPHeaders(extraHTTPHeaders)
  }

  if (typeof page.emulateTimezone === 'function') {
    try {
      await page.emulateTimezone(timezoneId)
    } catch {
      // Ignore if browser does not support emulateTimezone
    }
  }

  const stealthScript = getStealthScript(passport)
  await page.evaluateOnNewDocument(stealthScript)
}
