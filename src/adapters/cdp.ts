import type { DevicePassport } from '../types/index.js'
import { formatCanonicalHeaders } from './fetch.js'
import { getStealthScript } from './playwright.js'

/**
 * Raw Chrome DevTools Protocol adapter.
 *
 * 🔴 Why this exists (2026-11-04):
 *   Tools that drive Chrome over a bare CDP socket — `lite-browser`'s `cdp <method> [json]`
 *   channel, for example — cannot use the Playwright/Puppeteer adapters, because those
 *   hand back framework-shaped options. This adapter speaks plain CDP so any CDP client
 *   can apply a passport.
 *
 * The returned plan is deliberately **declarative**: a `send(method, params)` function
 * applies every command in order. The caller owns the transport, so this module has no
 * dependency and works over WebSocket, stdio, or an in-process socket.
 */

export interface CdpCommand {
  method: string
  params?: Record<string, unknown>
  /** `sessionId` is required for page-scoped domains when using flattened sessions. */
  sessionId?: string
}

export interface CdpPassportPlan {
  /** Ordered commands to apply the passport to a target. */
  commands: CdpCommand[]
  /** Init scripts to install on every new document. */
  initScripts: { source: string }[]
  /** Extra HTTP headers to set on the session. */
  headers: Record<string, string>
  /** The raw stealth + pixel-protection script, for callers that prefer their own path. */
  stealthScript: string
}

/**
 * Builds the ordered CDP command plan for a passport.
 *
 * Order matters: the UA override must precede navigation, and the init script has to be
 * installed before the first document is created.
 */
export function getCdpPlan(passport: DevicePassport, sessionId?: string): CdpPassportPlan {
  const headers = passport.context?.extraHTTPHeaders ?? passport.headers ?? {}
  const canonicalHeaders = formatCanonicalHeaders(headers)
  const userAgent = passport.browser?.userAgent ?? passport.context?.userAgent
  const timezone = passport.locale?.timezone ?? passport.context?.timezoneId ?? 'America/New_York'
  const locale = passport.locale?.language ?? passport.context?.locale ?? 'en-US'

  const commands: CdpCommand[] = []

  // 0. `Page.enable` is REQUIRED before `Page.addScriptToEvaluateOnNewDocument`.
  //    Without it the script is accepted and reports an identifier, but it never runs —
  //    the persona then looks exactly like a plain automation session. Verified against
  //    Chromium: without this call `navigator.webdriver` stays true and the pixel
  //    protection flag is never set.
  commands.push({
    method: 'Page.enable',
    ...(sessionId ? { sessionId } : {}),
  })

  // 1. Network-level identity: extra headers (Client-Hints, Accept-Language, ...).
  commands.push({
    method: 'Network.enable',
    ...(sessionId ? { sessionId } : {}),
  })
  commands.push({
    method: 'Network.setExtraHTTPHeaders',
    params: { headers: canonicalHeaders },
    ...(sessionId ? { sessionId } : {}),
  })

  // 2. User-Agent override, including the Client-Hints metadata so the advertised
  //    brands stay consistent with the rest of the passport.
  commands.push({
    method: 'Emulation.setUserAgentOverride',
    params: {
      userAgent,
      acceptLanguage: locale,
      platform: passport.clientHints?.platform ?? (passport.os?.platform === 'Windows' ? 'Windows' : 'macOS'),
      userAgentMetadata: {
        brands: passport.clientHints?.brands,
        fullVersionList: passport.clientHints?.fullVersionList,
        fullVersion: passport.browser?.version,
        platform: passport.clientHints?.platform,
        platformVersion: passport.clientHints?.platformVersion,
        architecture: passport.clientHints?.architecture,
        model: passport.clientHints?.model,
        mobile: passport.clientHints?.mobile ?? false,
        bitness: passport.clientHints?.bitness,
        wow64: false,
      },
    },
    ...(sessionId ? { sessionId } : {}),
  })

  // 3. Timezone and locale must match the geo alignment of the passport.
  commands.push({
    method: 'Emulation.setTimezoneOverride',
    params: { timezoneId: timezone },
    ...(sessionId ? { sessionId } : {}),
  })
  commands.push({
    method: 'Emulation.setLocaleOverride',
    params: { locale },
    ...(sessionId ? { sessionId } : {}),
  })

  // 4. Viewport, so the reported screen matches the emulated one.
  const width = passport.hardware?.screen?.width ?? passport.context?.viewport?.width ?? 1920
  const height = passport.hardware?.screen?.height ?? passport.context?.viewport?.height ?? 1080
  commands.push({
    method: 'Emulation.setDeviceMetricsOverride',
    params: {
      width,
      height,
      deviceScaleFactor: passport.hardware?.screen?.dpr ?? passport.context?.deviceScaleFactor ?? 1,
      mobile: passport.context?.isMobile ?? false,
    },
    ...(sessionId ? { sessionId } : {}),
  })

  // 5. Hardware-level touch and automation flags.
  commands.push({
    method: 'Emulation.setTouchEmulationEnabled',
    params: { enabled: passport.context?.hasTouch ?? false, maxTouchPoints: 1 },
    ...(sessionId ? { sessionId } : {}),
  })

  const stealthScript = getStealthScript(passport)

  return {
    commands,
    initScripts: [{ source: stealthScript }],
    headers: canonicalHeaders,
    stealthScript,
  }
}

/**
 * Applies a passport through a raw CDP transport.
 *
 * @param send Function that sends one CDP command and resolves with its result.
 */
export async function applyCdpPassport(
  passport: DevicePassport,
  send: (command: CdpCommand) => Promise<unknown>,
  sessionId?: string
): Promise<void> {
  const plan = getCdpPlan(passport, sessionId)
  for (const command of plan.commands) {
    await send(command)
  }
  // Init scripts must exist before the first navigation of every document.
  for (const script of plan.initScripts) {
    await send({
      method: 'Page.addScriptToEvaluateOnNewDocument',
      params: { source: script.source },
      ...(sessionId ? { sessionId } : {}),
    })
  }
}
