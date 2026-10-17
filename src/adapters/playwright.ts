import type { DevicePassport } from '../types/index.js'
import { formatCanonicalHeaders } from './fetch.js'

export interface PlaywrightContextOptions {
  userAgent: string
  viewport: {
    width: number
    height: number
  }
  deviceScaleFactor: number
  locale: string
  timezoneId: string
  geolocation?: {
    latitude: number
    longitude: number
    accuracy?: number
  }
  permissions?: string[]
  extraHTTPHeaders: Record<string, string>
  hasTouch: boolean
  isMobile: boolean
  colorScheme?: 'light' | 'dark' | 'no-preference'
}

/**
 * Builds Playwright BrowserContext options directly from a DevicePassport.
 * Ready for `browser.newContext(getPlaywrightContext(passport))`.
 */
export function getPlaywrightContext(passport: DevicePassport): PlaywrightContextOptions {
  const headers = passport.context?.extraHTTPHeaders ?? passport.headers ?? {}
  const canonicalHeaders = formatCanonicalHeaders(headers)

  const width = passport.hardware?.screen?.width ?? passport.context?.viewport?.width ?? 1920
  const height = passport.hardware?.screen?.height ?? passport.context?.viewport?.height ?? 1080
  const dpr = passport.hardware?.screen?.dpr ?? passport.context?.deviceScaleFactor ?? 1

  return {
    userAgent: passport.browser?.userAgent ?? passport.context?.userAgent,
    viewport: {
      width,
      height,
    },
    deviceScaleFactor: dpr,
    locale: passport.locale?.language ?? passport.context?.locale ?? 'en-US',
    timezoneId: passport.locale?.timezone ?? passport.context?.timezoneId ?? 'America/New_York',
    geolocation: passport.context?.geolocation,
    permissions: passport.context?.permissions ?? ['geolocation'],
    extraHTTPHeaders: canonicalHeaders,
    hasTouch: passport.context?.hasTouch ?? false,
    isMobile: passport.context?.isMobile ?? false,
    colorScheme: passport.context?.colorScheme ?? 'light',
  }
}

/**
 * Generates an in-page stealth script to patch runtime JavaScript APIs
 * (navigator.webdriver, hardwareConcurrency, deviceMemory, WebGL unmasked vendor/renderer,
 * navigator.userAgentData Client Hints, and Screen dimensions).
 */
export function getStealthScript(passport: DevicePassport): string {
  const { hardware, os, locale, browser, clientHints } = passport

  const concurrency = hardware?.cpu?.concurrency ?? 8
  const memory = hardware?.memory?.deviceMemory ?? 8
  const screenWidth = hardware?.screen?.width ?? 1920
  const screenHeight = hardware?.screen?.height ?? 1080
  const availWidth = hardware?.screen?.availWidth ?? screenWidth
  const availHeight = hardware?.screen?.availHeight ?? (screenHeight - 40)
  const colorDepth = hardware?.screen?.colorDepth ?? 24
  const pixelDepth = hardware?.screen?.pixelDepth ?? 24

  const platform = os?.platform === 'macOS' ? 'MacIntel' : 'Win32'
  const languages = JSON.stringify(locale?.languages ?? ['en-US', 'en'])
  const gpuVendor = hardware?.gpu?.vendor ?? 'Google Inc. (Apple)'
  const gpuRenderer = hardware?.gpu?.renderer ?? 'ANGLE (Apple, Apple M2, OpenGL 4.1)'

  const uachData = JSON.stringify({
    brands: clientHints?.brands ?? [
      { brand: 'Chromium', version: String(browser?.majorVersion ?? 124) },
      { brand: 'Google Chrome', version: String(browser?.majorVersion ?? 124) },
      { brand: 'Not-A.Brand', version: '99' },
    ],
    mobile: clientHints?.mobile ?? false,
    platform: clientHints?.platform ?? (os?.platform ?? 'macOS'),
    architecture: clientHints?.architecture ?? (os?.architecture ?? 'arm'),
    bitness: clientHints?.bitness ?? '64',
    model: clientHints?.model ?? '',
    platformVersion: clientHints?.platformVersion ?? (os?.version ?? '14.6.1'),
    fullVersionList: clientHints?.fullVersionList ?? [
      { brand: 'Chromium', version: browser?.version ?? '124.0.6367.208' },
      { brand: 'Google Chrome', version: browser?.version ?? '124.0.6367.208' },
      { brand: 'Not-A.Brand', version: '99.0.0.0' },
    ],
  })

  return `
(() => {
  // 1. Remove automation flags
  try {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true
    });
    delete (navigator as any).__proto__.webdriver;
  } catch (e) {}

  // 2. Hardware profile (CPU, Memory)
  try {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => ${concurrency},
      configurable: true
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => ${memory},
      configurable: true
    });
  } catch (e) {}

  // 3. Platform & Languages
  try {
    Object.defineProperty(navigator, 'platform', {
      get: () => '${platform}',
      configurable: true
    });
    const langs = ${languages};
    Object.defineProperty(navigator, 'languages', {
      get: () => langs,
      configurable: true
    });
    Object.defineProperty(navigator, 'language', {
      get: () => langs[0],
      configurable: true
    });
  } catch (e) {}

  // 4. Screen properties
  try {
    Object.defineProperty(window.screen, 'width', { get: () => ${screenWidth}, configurable: true });
    Object.defineProperty(window.screen, 'height', { get: () => ${screenHeight}, configurable: true });
    Object.defineProperty(window.screen, 'availWidth', { get: () => ${availWidth}, configurable: true });
    Object.defineProperty(window.screen, 'availHeight', { get: () => ${availHeight}, configurable: true });
    Object.defineProperty(window.screen, 'colorDepth', { get: () => ${colorDepth}, configurable: true });
    Object.defineProperty(window.screen, 'pixelDepth', { get: () => ${pixelDepth}, configurable: true });
  } catch (e) {}

  // 5. Client Hints (navigator.userAgentData)
  try {
    const hintData = ${uachData};
    if (typeof (navigator as any).userAgentData !== 'undefined' || true) {
      const uach = {
        brands: hintData.brands,
        mobile: hintData.mobile,
        platform: hintData.platform,
        getHighEntropyValues: async (hints) => {
          const res = {
            brands: hintData.brands,
            mobile: hintData.mobile,
            platform: hintData.platform,
          };
          if (hints.includes('architecture')) res.architecture = hintData.architecture;
          if (hints.includes('bitness')) res.bitness = hintData.bitness;
          if (hints.includes('model')) res.model = hintData.model;
          if (hints.includes('platformVersion')) res.platformVersion = hintData.platformVersion;
          if (hints.includes('fullVersionList')) res.fullVersionList = hintData.fullVersionList;
          return res;
        },
        toJSON: () => ({
          brands: hintData.brands,
          mobile: hintData.mobile,
          platform: hintData.platform,
        })
      };
      Object.defineProperty(navigator, 'userAgentData', {
        get: () => uach,
        configurable: true
      });
    }
  } catch (e) {}

  // 6. WebGL Vendor & Renderer spoofing
  try {
    const getParameterProto = WebGLRenderingContext.prototype.getParameter;
    const vendorParam = 0x9245; // UNMASKED_VENDOR_WEBGL
    const rendererParam = 0x9246; // UNMASKED_RENDERER_WEBGL

    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === vendorParam) return '${gpuVendor}';
      if (parameter === rendererParam) return '${gpuRenderer}';
      return getParameterProto.apply(this, arguments);
    };

    if (typeof WebGL2RenderingContext !== 'undefined') {
      const getParameter2Proto = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === vendorParam) return '${gpuVendor}';
        if (parameter === rendererParam) return '${gpuRenderer}';
        return getParameter2Proto.apply(this, arguments);
      };
    }
  } catch (e) {}

  // 7. Chrome runtime mock for Chromium personas
  try {
    if (!window.chrome) {
      (window as any).chrome = {
        app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' } },
        runtime: { OnInstalledReason: {}, OnRestartRequiredReason: {} },
        loadTimes: () => ({}),
        csi: () => ({}),
      };
    }
  } catch (e) {}
})();
`
}

/**
 * Applies stealth injections and extra headers to a Playwright BrowserContext.
 *
 * @param context Playwright BrowserContext instance
 * @param passport DevicePassport instance
 */
export async function applyToPlaywrightContext(context: any, passport: DevicePassport): Promise<void> {
  if (!context || typeof context.addInitScript !== 'function') {
    throw new Error('[device-passport] Invalid Playwright context provided to applyToPlaywrightContext.')
  }

  const stealthScript = getStealthScript(passport)
  await context.addInitScript(stealthScript)

  const headers = passport.context?.extraHTTPHeaders ?? passport.headers ?? {}
  if (typeof context.setExtraHTTPHeaders === 'function') {
    await context.setExtraHTTPHeaders(formatCanonicalHeaders(headers))
  }
}
