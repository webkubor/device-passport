/**
 * Contradiction Detection Engine for Device Passport.
 *
 * Evaluates cross-layer integrity across the 4-tuple formal model:
 * P = ⟨H, S, G, C⟩ (Hardware, System, Geo, Client-Hints).
 *
 * Implements deterministic anomaly and anti-fingerprinting rules based on
 * empirical browser telemetry, W3C Client Hints RFCs, and anti-bot heuristic vectors.
 */

import type { DevicePassport } from '../types/index.js';

export type ContradictionSeverity = 'fatal' | 'high' | 'medium' | 'low';

export type ContradictionCategory =
  | 'hardware_system'
  | 'os_browser'
  | 'geo_chrono'
  | 'client_hints'
  | 'entropy';

export interface Contradiction {
  id: string;
  category: ContradictionCategory;
  severity: ContradictionSeverity;
  description: string;
  fields: string[];
  actual: unknown;
  expected: unknown;
  impactPenalty: number; // Subtracted from 100% coherence score
}

// Country to standard timezones mapping (IANA)
export const COUNTRY_TIMEZONE_MAP: Record<string, string[]> = {
  US: [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Anchorage', 'America/Phoenix', 'America/Detroit', 'America/Indiana/Indianapolis',
    'Pacific/Honolulu',
  ],
  CA: [
    'America/Toronto', 'America/Vancouver', 'America/Montreal', 'America/Edmonton',
    'America/Winnipeg', 'America/Halifax', 'America/St_Johns',
  ],
  GB: ['Europe/London'],
  UK: ['Europe/London'],
  DE: ['Europe/Berlin'],
  FR: ['Europe/Paris'],
  JP: ['Asia/Tokyo'],
  CN: ['Asia/Shanghai', 'Asia/Chongqing', 'Asia/Urumqi', 'Asia/Harbin'],
  AU: [
    'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane',
    'Australia/Perth', 'Australia/Adelaide',
  ],
  SG: ['Asia/Singapore'],
  HK: ['Asia/Hong_Kong'],
  TW: ['Asia/Taipei'],
  KR: ['Asia/Seoul'],
  NL: ['Europe/Amsterdam'],
  SE: ['Europe/Stockholm'],
  CH: ['Europe/Zurich'],
  BR: ['America/Sao_Paulo', 'America/Manaus', 'America/Fortaleza'],
  IN: ['Asia/Kolkata'],
  RU: ['Europe/Moscow', 'Asia/Yekaterinburg', 'Asia/Novosibirsk', 'Asia/Vladivostok'],
};

// Primary language expectations per country code
export const COUNTRY_PRIMARY_LANGUAGES: Record<string, string[]> = {
  US: ['en', 'en-US'],
  CA: ['en', 'en-CA', 'fr', 'fr-CA'],
  GB: ['en', 'en-GB'],
  UK: ['en', 'en-GB'],
  DE: ['de', 'de-DE'],
  FR: ['fr', 'fr-FR'],
  JP: ['ja', 'ja-JP'],
  CN: ['zh', 'zh-CN', 'zh-Hans'],
  TW: ['zh', 'zh-TW', 'zh-Hant'],
  HK: ['zh', 'zh-HK', 'en'],
  KR: ['ko', 'ko-KR'],
  SG: ['en', 'en-SG', 'zh', 'zh-SG'],
  AU: ['en', 'en-AU'],
  NL: ['nl', 'nl-NL', 'en'],
  SE: ['sv', 'sv-SE', 'en'],
  CH: ['de', 'de-CH', 'fr', 'fr-CH', 'it', 'it-CH'],
  BR: ['pt', 'pt-BR'],
  IN: ['en', 'en-IN', 'hi', 'hi-IN'],
  RU: ['ru', 'ru-RU'],
};

/**
 * Detect OS vs Browser compatibility contradictions.
 */
export function detectOSBrowserContradictions(passport: DevicePassport): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const { browser, os, headers, clientHints } = passport;

  // 1. Safari only runs on Apple platforms (macOS, iOS)
  if (browser.name === 'Safari' && os.platform !== 'macOS') {
    contradictions.push({
      id: 'ERR_SAFARI_NON_APPLE_PLATFORM',
      category: 'os_browser',
      severity: 'fatal',
      description: `Safari modern releases are exclusive to macOS/iOS; cannot run on ${os.platform}`,
      fields: ['browser.name', 'os.platform'],
      actual: { browser: browser.name, platform: os.platform },
      expected: 'macOS',
      impactPenalty: 35,
    });
  }

  // 2. Chrome / Chromium modern minimum OS requirements
  // Chromium 110+ dropped support for Windows 7, 8, 8.1
  if (browser.name === 'Chrome' || browser.name === 'Edge') {
    if (browser.majorVersion >= 110 && os.release) {
      const isLegacyWin = /Windows (7|8|XP|Vista)/i.test(os.release);
      if (isLegacyWin) {
        contradictions.push({
          id: 'ERR_CHROME_LEGACY_WIN_UNSUPPORTED',
          category: 'os_browser',
          severity: 'fatal',
          description: `Chromium ${browser.majorVersion} requires Windows 10 or later; unsupported on ${os.release}`,
          fields: ['browser.majorVersion', 'os.release'],
          actual: { browserVersion: browser.majorVersion, osRelease: os.release },
          expected: 'Windows 10 or Windows 11',
          impactPenalty: 30,
        });
      }
    }

    // Chromium 117+ dropped support for macOS < 10.15 (Catalina); Chrome 120+ dropped < 11.0
    if (browser.majorVersion >= 120 && os.platform === 'macOS') {
      const match = os.version.match(/^(\d+)/);
      if (match && parseInt(match[1], 10) < 11) {
        contradictions.push({
          id: 'ERR_CHROME_LEGACY_MACOS_UNSUPPORTED',
          category: 'os_browser',
          severity: 'high',
          description: `Chromium ${browser.majorVersion} requires macOS 11.0 (Big Sur) or higher; got macOS ${os.version}`,
          fields: ['browser.majorVersion', 'os.version'],
          actual: os.version,
          expected: '>= 11.0.0',
          impactPenalty: 25,
        });
      }
    }
  }

  // 3. User-Agent vs Declared OS Platform
  const ua = browser.userAgent || headers['user-agent'] || '';
  if (os.platform === 'macOS' && !/Macintosh|Mac OS X/i.test(ua)) {
    contradictions.push({
      id: 'ERR_UA_OS_MACOS_MISMATCH',
      category: 'os_browser',
      severity: 'fatal',
      description: 'Operating system is macOS but User-Agent string does not indicate Macintosh architecture',
      fields: ['os.platform', 'browser.userAgent'],
      actual: ua,
      expected: 'Containing "Macintosh; Intel Mac OS X..."',
      impactPenalty: 35,
    });
  } else if (os.platform === 'Windows' && !/Windows NT/i.test(ua)) {
    contradictions.push({
      id: 'ERR_UA_OS_WINDOWS_MISMATCH',
      category: 'os_browser',
      severity: 'fatal',
      description: 'Operating system is Windows but User-Agent string does not contain Windows NT tag',
      fields: ['os.platform', 'browser.userAgent'],
      actual: ua,
      expected: 'Containing "Windows NT..."',
      impactPenalty: 35,
    });
  }

  // 4. Windows 11 Client Hints platformVersion heuristic
  // In Chromium, Windows 11 returns platformVersion "14.0.0" or "15.0.0"+, whereas Windows 10 returns "1.0.0" to "10.0.0"
  if (clientHints?.platformVersion && os.platform === 'Windows') {
    const pvMajor = parseInt(clientHints.platformVersion.split('.')[0], 10);
    const isWin11 = /Windows 11/i.test(os.release);
    const isWin10 = /Windows 10/i.test(os.release);

    if (isWin11 && pvMajor < 13) {
      contradictions.push({
        id: 'ERR_WIN11_PLATFORM_VERSION_MISMATCH',
        category: 'os_browser',
        severity: 'high',
        description: `Windows 11 reports Client-Hints platformVersion >= 13.0.0 (e.g. 15.0.0), but received "${clientHints.platformVersion}"`,
        fields: ['os.release', 'clientHints.platformVersion'],
        actual: clientHints.platformVersion,
        expected: '>= 13.0.0 (typically 14.0.0 or 15.0.0)',
        impactPenalty: 20,
      });
    } else if (isWin10 && pvMajor >= 13) {
      contradictions.push({
        id: 'ERR_WIN10_PLATFORM_VERSION_MISMATCH',
        category: 'os_browser',
        severity: 'high',
        description: `Windows 10 reports Client-Hints platformVersion <= 10.0.0, but received Windows 11 platformVersion "${clientHints.platformVersion}"`,
        fields: ['os.release', 'clientHints.platformVersion'],
        actual: clientHints.platformVersion,
        expected: '10.0.0 (or 1.0.0 - 10.0.0)',
        impactPenalty: 20,
      });
    }
  }

  return contradictions;
}

/**
 * Detect Hardware vs System cross-layer contradictions.
 */
export function detectHardwareContradictions(passport: DevicePassport): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const { hardware, os, clientHints } = passport;

  // 1. CPU Architecture vs Platform
  if (os.platform === 'macOS') {
    // Apple Silicon GPUs (M1/M2/M3/M4) must correlate with ARM architecture or Rosetta emulation
    const isAppleSiliconGpu = /Apple M\d/i.test(hardware.gpu.renderer);
    if (isAppleSiliconGpu && hardware.cpu.architecture === 'x86' && clientHints?.architecture === 'x86') {
      contradictions.push({
        id: 'ERR_APPLE_SILICON_X86_CONTRADICTION',
        category: 'hardware_system',
        severity: 'high',
        description: `Apple Silicon GPU detected (${hardware.gpu.renderer}) but native CPU architecture and Client Hint reported as x86`,
        fields: ['hardware.gpu.renderer', 'hardware.cpu.architecture', 'clientHints.architecture'],
        actual: { gpu: hardware.gpu.renderer, arch: hardware.cpu.architecture },
        expected: 'arm',
        impactPenalty: 20,
      });
    }
  }

  // 2. GPU vs Operating System Impossible Driver Pairings
  const gpuRenderer = hardware.gpu.renderer || '';
  if (os.platform === 'macOS') {
    // NVIDIA has no macOS drivers for modern RTX series
    if (/GeForce RTX|GTX 16|RTX 30|RTX 40/i.test(gpuRenderer)) {
      contradictions.push({
        id: 'ERR_NVIDIA_MODERN_ON_MACOS',
        category: 'hardware_system',
        severity: 'fatal',
        description: `NVIDIA modern GPUs (${gpuRenderer}) have no driver support on modern macOS`,
        fields: ['hardware.gpu.renderer', 'os.platform'],
        actual: gpuRenderer,
        expected: 'Apple M-Series GPU or AMD Radeon Pro (legacy Intel Mac)',
        impactPenalty: 35,
      });
    }
    // Direct3D or DirectX on macOS is impossible in standard WebGL
    if (/Direct3D|D3D11|D3D12/i.test(gpuRenderer)) {
      contradictions.push({
        id: 'ERR_DIRECT3D_ON_MACOS',
        category: 'hardware_system',
        severity: 'fatal',
        description: `Direct3D/DirectX renderer (${gpuRenderer}) cannot exist on macOS WebGL pipeline`,
        fields: ['hardware.gpu.renderer', 'os.platform'],
        actual: gpuRenderer,
        expected: 'Metal or OpenGL ANGLE backend',
        impactPenalty: 30,
      });
    }
  } else if (os.platform === 'Windows') {
    // Apple M-series GPU on Windows
    if (/Apple M\d/i.test(gpuRenderer)) {
      contradictions.push({
        id: 'ERR_APPLE_GPU_ON_WINDOWS',
        category: 'hardware_system',
        severity: 'fatal',
        description: `Apple Silicon integrated graphics (${gpuRenderer}) cannot run under Microsoft Windows`,
        fields: ['hardware.gpu.renderer', 'os.platform'],
        actual: gpuRenderer,
        expected: 'Intel UHD/Iris, NVIDIA GeForce, or AMD Radeon',
        impactPenalty: 35,
      });
    }
  }

  // 3. Client Hints Architecture vs Hardware CPU Architecture
  if (clientHints?.architecture && hardware.cpu.architecture) {
    if (clientHints.architecture !== hardware.cpu.architecture) {
      contradictions.push({
        id: 'ERR_CH_ARCH_HARDWARE_MISMATCH',
        category: 'hardware_system',
        severity: 'fatal',
        description: `sec-ch-ua-arch ("${clientHints.architecture}") does not match CPU hardware concurrency profile ("${hardware.cpu.architecture}")`,
        fields: ['clientHints.architecture', 'hardware.cpu.architecture'],
        actual: clientHints.architecture,
        expected: hardware.cpu.architecture,
        impactPenalty: 30,
      });
    }
  }

  // 4. Memory Plausibility Check (W3C Device Memory Specification)
  // navigator.deviceMemory returns values in [0.25, 0.5, 1, 2, 4, 8] capped at 8 GiB
  const dm = hardware.memory.deviceMemory;
  if (dm !== undefined) {
    const validDeviceMemoryValues = [0.25, 0.5, 1, 2, 4, 8];
    if (dm <= 0 || !validDeviceMemoryValues.includes(dm)) {
      // In real browsers, deviceMemory is capped at 8 for anti-fingerprinting
      if (dm > 8) {
        contradictions.push({
          id: 'WARN_DEVICE_MEMORY_UNCAPPED',
          category: 'hardware_system',
          severity: 'medium',
          description: `navigator.deviceMemory reported as ${dm} GiB; standard Chromium caps deviceMemory at 8 GiB`,
          fields: ['hardware.memory.deviceMemory'],
          actual: dm,
          expected: 'Capped at 8 (one of [0.25, 0.5, 1, 2, 4, 8])',
          impactPenalty: 10,
        });
      }
    }
  }

  // 5. Screen Viewport Geometry Plausibility
  const { screen } = hardware;
  if (screen.width > 0 && screen.height > 0) {
    if (screen.availWidth > screen.width || screen.availHeight > screen.height) {
      contradictions.push({
        id: 'ERR_SCREEN_AVAILABLE_EXCEEDS_TOTAL',
        category: 'hardware_system',
        severity: 'high',
        description: `Screen available dimensions (${screen.availWidth}x${screen.availHeight}) exceed screen total bounds (${screen.width}x${screen.height})`,
        fields: ['hardware.screen.availWidth', 'hardware.screen.width'],
        actual: { avail: `${screen.availWidth}x${screen.availHeight}`, total: `${screen.width}x${screen.height}` },
        expected: 'availWidth <= width && availHeight <= height',
        impactPenalty: 20,
      });
    }

    if (passport.context?.viewport) {
      const vp = passport.context.viewport;
      if (vp.width > screen.width || vp.height > screen.height) {
        contradictions.push({
          id: 'ERR_VIEWPORT_EXCEEDS_SCREEN',
          category: 'hardware_system',
          severity: 'fatal',
          description: `Browser viewport (${vp.width}x${vp.height}) exceeds physical display screen (${screen.width}x${screen.height})`,
          fields: ['context.viewport', 'hardware.screen'],
          actual: `${vp.width}x${vp.height}`,
          expected: `<= ${screen.width}x${screen.height}`,
          impactPenalty: 30,
        });
      }
    }
  }

  return contradictions;
}

/**
 * Detect Geographic, Locale, and Chronological (Geo-Chrono) Contradictions.
 */
export function detectGeoChronoContradictions(passport: DevicePassport): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const { locale, headers } = passport;

  const country = (locale.country || '').toUpperCase();
  const timezone = locale.timezone || '';

  // 1. Timezone vs Country Alignment
  if (country && timezone && COUNTRY_TIMEZONE_MAP[country]) {
    const validTimezones = COUNTRY_TIMEZONE_MAP[country];
    if (!validTimezones.includes(timezone)) {
      contradictions.push({
        id: 'ERR_GEO_TIMEZONE_COUNTRY_MISMATCH',
        category: 'geo_chrono',
        severity: 'fatal',
        description: `Timezone "${timezone}" does not belong to geographic territory "${country}"`,
        fields: ['locale.timezone', 'locale.country'],
        actual: { country, timezone },
        expected: validTimezones.join(', '),
        impactPenalty: 40,
      });
    }
  }

  // 2. Accept-Language vs Country Locale Alignment
  const acceptLangHeader = headers['accept-language'] || '';
  if (country && COUNTRY_PRIMARY_LANGUAGES[country]) {
    const expectedLanguages = COUNTRY_PRIMARY_LANGUAGES[country];
    const primaryLocaleLang = (locale.language || '').toLowerCase().split('-')[0];
    const countryExpectsMatch = expectedLanguages.some((el) =>
      primaryLocaleLang === el.toLowerCase().split('-')[0]
    );

    if (!countryExpectsMatch && primaryLocaleLang) {
      contradictions.push({
        id: 'WARN_GEO_PRIMARY_LANGUAGE_MISMATCH',
        category: 'geo_chrono',
        severity: 'high',
        description: `Primary locale language "${locale.language}" is anomalous for country code "${country}"`,
        fields: ['locale.language', 'locale.country'],
        actual: locale.language,
        expected: expectedLanguages.join(', '),
        impactPenalty: 15,
      });
    }

    if (acceptLangHeader) {
      // Check if accept-language completely omits the expected primary language of the country
      const hasAnyExpectedInHeader = expectedLanguages.some((lang) =>
        acceptLangHeader.toLowerCase().includes(lang.toLowerCase())
      );
      if (!hasAnyExpectedInHeader && !acceptLangHeader.toLowerCase().includes('en')) {
        contradictions.push({
          id: 'WARN_ACCEPT_LANGUAGE_GEO_DETACHED',
          category: 'geo_chrono',
          severity: 'medium',
          description: `Accept-Language header "${acceptLangHeader}" contains neither local language for "${country}" nor global fallback (en)`,
          fields: ['headers.accept-language', 'locale.country'],
          actual: acceptLangHeader,
          expected: `Includes one of: ${expectedLanguages.join(', ')} or en`,
          impactPenalty: 12,
        });
      }
    }
  }

  return contradictions;
}

/**
 * Detect W3C Client Hints Internal Consistency Contradictions.
 */
export function detectClientHintsContradictions(passport: DevicePassport): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const { clientHints, os } = passport;

  if (!clientHints) return contradictions;

  // 1. Mobile Client Hint on Desktop Platform
  if (clientHints.mobile === true && (os.platform === 'macOS' || os.platform === 'Windows')) {
    contradictions.push({
      id: 'ERR_CH_MOBILE_ON_DESKTOP',
      category: 'client_hints',
      severity: 'fatal',
      description: `Client-Hints indicates mobile=true (?1) on desktop operating system ${os.platform}`,
      fields: ['clientHints.mobile', 'os.platform'],
      actual: { mobile: clientHints.mobile, platform: os.platform },
      expected: 'mobile: false (?0)',
      impactPenalty: 35,
    });
  }

  // 2. Platform String Alignment (Sec-CH-UA-Platform)
  if (clientHints.platform) {
    const chPlat = clientHints.platform.toLowerCase();
    const osPlat = os.platform.toLowerCase();
    if (chPlat !== osPlat) {
      contradictions.push({
        id: 'ERR_CH_PLATFORM_OS_MISMATCH',
        category: 'client_hints',
        severity: 'fatal',
        description: `sec-ch-ua-platform "${clientHints.platform}" contradicts OS platform "${os.platform}"`,
        fields: ['clientHints.platform', 'os.platform'],
        actual: clientHints.platform,
        expected: os.platform,
        impactPenalty: 35,
      });
    }
  }

  // 3. Desktop Model String Requirement
  // Chromium desktop specifications mandate that sec-ch-ua-model must be empty string `""`
  if ((os.platform === 'macOS' || os.platform === 'Windows') && clientHints.model && clientHints.model.trim() !== '') {
    contradictions.push({
      id: 'ERR_CH_NON_EMPTY_DESKTOP_MODEL',
      category: 'client_hints',
      severity: 'high',
      description: `Desktop Chromium mandates empty sec-ch-ua-model (""), received "${clientHints.model}"`,
      fields: ['clientHints.model', 'os.platform'],
      actual: clientHints.model,
      expected: '"" (empty string for desktop)',
      impactPenalty: 25,
    });
  }

  // 4. Bitness check on 64-bit platforms
  if (clientHints.bitness && clientHints.bitness !== '64') {
    if (os.platform === 'macOS') {
      contradictions.push({
        id: 'ERR_CH_32BIT_ON_MODERN_MACOS',
        category: 'client_hints',
        severity: 'fatal',
        description: `macOS has discontinued 32-bit binaries since macOS 10.15; bitness reported as "${clientHints.bitness}"`,
        fields: ['clientHints.bitness', 'os.platform'],
        actual: clientHints.bitness,
        expected: '"64"',
        impactPenalty: 30,
      });
    }
  }

  return contradictions;
}

/**
 * Master contradiction detection runner across all 4 sub-spaces:
 * P = ⟨H, S, G, C⟩.
 */
export function detectAllContradictions(passport: DevicePassport): Contradiction[] {
  return [
    ...detectOSBrowserContradictions(passport),
    ...detectHardwareContradictions(passport),
    ...detectGeoChronoContradictions(passport),
    ...detectClientHintsContradictions(passport),
  ];
}
