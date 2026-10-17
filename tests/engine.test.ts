import { describe, expect, test } from 'bun:test';
import {
  ALL_PRESETS,
  CHROME_VERSIONS,
  EDGE_VERSIONS,
  MACOS_PRESETS,
  WINDOWS_PRESETS,
  createDeterministicPRNG,
  fnv1a,
  generateBrandVersions,
  generatePassport,
  generateUserAgentClientHints,
  getHardwarePresets,
  murmur3,
  parseStructuredBrandList,
  validateHardwareContradictions,
} from '../src/engine/index.js';

describe('Deterministic Hashing & PRNG', () => {
  test('murmur3 produces deterministic 32-bit uint hash', () => {
    const hash1 = murmur3('user_alpha_99');
    const hash2 = murmur3('user_alpha_99');
    const hash3 = murmur3('user_beta_100');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toBeGreaterThan(0);
  });

  test('fnv1a produces deterministic hash', () => {
    const hash1 = fnv1a('persona-bot-007');
    const hash2 = fnv1a('persona-bot-007');
    const hash3 = fnv1a('persona-bot-008');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  test('createDeterministicPRNG generates reproducible sequence', () => {
    const prng1 = createDeterministicPRNG('account-42');
    const prng2 = createDeterministicPRNG('account-42');

    const seq1 = [prng1(), prng1(), prng1(), prng1()];
    const seq2 = [prng2(), prng2(), prng2(), prng2()];

    expect(seq1).toEqual(seq2);
    for (const val of seq1) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});

describe('Zero-Contradiction Hardware Matrix', () => {
  test('all static presets pass strict contradiction checks', () => {
    for (const preset of ALL_PRESETS) {
      const errors = validateHardwareContradictions(preset.os, preset.hardware);
      expect(errors).toEqual([]);
    }
  });

  test('macOS presets adhere to Apple hardware rules', () => {
    for (const preset of MACOS_PRESETS) {
      expect(preset.os.platform).toBe('macOS');
      expect(['14.6.1', '15.0.0']).toContain(preset.os.version);
      expect(preset.hardware.screen.dpr).toBe(2); // Retina
      expect(preset.hardware.gpu.renderer).not.toContain('Direct3D');

      if (preset.os.architecture === 'arm') {
        expect(preset.hardware.gpu.renderer).toContain('Apple M');
        expect(preset.hardware.gpu.vendor).toBe('Google Inc. (Apple)');
      } else {
        expect(preset.hardware.gpu.renderer).not.toContain('Apple M');
      }
    }
  });

  test('Windows presets adhere to PC hardware rules', () => {
    for (const preset of WINDOWS_PRESETS) {
      expect(preset.os.platform).toBe('Windows');
      expect(['10.0.0', '15.0.0']).toContain(preset.os.version);
      expect(preset.os.architecture).toBe('x86');
      expect(preset.hardware.gpu.renderer).toContain('Direct3D11');
      expect(preset.hardware.gpu.renderer).not.toContain('Apple M');
      expect([1, 1.25, 1.5]).toContain(preset.hardware.screen.dpr);
    }
  });

  test('contradiction detector catches illegal cross-platform mixups', () => {
    const invalidMac = {
      name: 'macOS' as const,
      platform: 'macOS' as const,
      version: '14.6.1',
      release: 'Sonoma',
      architecture: 'arm' as const,
    };
    const invalidHardware = {
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        dpr: 1, // Non-retina on macOS!
        colorDepth: 24,
        pixelDepth: 24,
      },
      cpu: {
        architecture: 'arm' as const,
        concurrency: 8,
      },
      memory: { deviceMemory: 8 },
      gpu: {
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)', // Direct3D & NVIDIA on ARM Mac!
      },
    };

    const errors = validateHardwareContradictions(invalidMac, invalidHardware);
    expect(errors.length).toBeGreaterThanOrEqual(2);
    expect(errors.some((e) => e.includes('Direct3D'))).toBe(true);
    expect(errors.some((e) => e.includes('Retina'))).toBe(true);
  });
});

describe('RFC 8942 and W3C User-Agent Client Hints', () => {
  test('generates compliant low and high entropy client hints for Chrome', () => {
    const os = MACOS_PRESETS[0]!.os;
    const hints = generateUserAgentClientHints({
      browserName: 'Chrome',
      fullVersion: '131.0.6778.86',
      majorVersion: 131,
      os,
    });

    expect(hints.mobile).toBe(false);
    expect(hints.platform).toBe('macOS');
    expect(hints.platformVersion).toBe(os.version);
    expect(hints.architecture).toBe('arm');
    expect(hints.bitness).toBe('64');
    expect(hints.model).toBe('');

    // Check headers
    const headers = hints.headers;
    expect(headers['sec-ch-ua-mobile']).toBe('?0');
    expect(headers['sec-ch-ua-platform']).toBe('"macOS"');
    expect(headers['sec-ch-ua-platform-version']).toBe(`"${os.version}"`);
    expect(headers['sec-ch-ua-arch']).toBe('"arm"');
    expect(headers['sec-ch-ua-bitness']).toBe('"64"');
    expect(headers['sec-ch-ua-model']).toBe('""');
    expect(headers['sec-ch-ua']).toContain('Chromium');
    expect(headers['sec-ch-ua']).toContain('Google Chrome');
    expect(headers['sec-ch-ua-full-version-list']).toContain('131.0.6778.86');

    // Parse structured brand list
    const parsed = parseStructuredBrandList(headers['sec-ch-ua']);
    expect(parsed.length).toBe(3); // GREASE, Chromium, Google Chrome
  });

  test('Edge client hints include Microsoft Edge brand', () => {
    const os = WINDOWS_PRESETS[0]!.os;
    const hints = generateUserAgentClientHints({
      browserName: 'Edge',
      fullVersion: '131.0.2903.70',
      majorVersion: 131,
      os,
    });

    expect(hints.headers['sec-ch-ua']).toContain('Microsoft Edge');
    expect(hints.headers['sec-ch-ua-platform']).toBe('"Windows"');
    expect(hints.headers['sec-ch-ua-wow64']).toBe('?0');
  });
});

describe('Deterministic DevicePassport Generator', () => {
  test('same seed generates 100% identical device passport across multiple calls', () => {
    const seed = 'persona_crawler_seed_#8892';

    const passportA = generatePassport({ seed });
    const passportB = generatePassport({ seed });

    expect(passportA.id).toBe(passportB.id);
    expect(passportA.seed).toBe(passportB.seed);
    expect(passportA.browser).toEqual(passportB.browser);
    expect(passportA.os).toEqual(passportB.os);
    expect(passportA.hardware).toEqual(passportB.hardware);
    expect(passportA.clientHints.headers).toEqual(passportB.clientHints.headers);
    expect(passportA.headers).toEqual(passportB.headers);
    expect(passportA.context.viewport).toEqual(passportB.context.viewport);
  });

  test('different seeds produce diverse hardware profiles', () => {
    const seeds = Array.from({ length: 20 }, (_, i) => `account_user_${i * 13 + 7}`);
    const passports = seeds.map((s) => generatePassport({ seed: s }));

    const uniqueIds = new Set(passports.map((p) => p.id));
    expect(uniqueIds.size).toBe(20);

    const platforms = new Set(passports.map((p) => p.os.platform));
    expect(platforms.size).toBe(2); // Has both macOS and Windows
  });

  test('explicit options (os, locale, browser) are respected with zero contradiction', () => {
    const passport = generatePassport({
      seed: 'pinned-macos-edge',
      os: 'macOS',
      browser: 'Edge',
      locale: 'ja-JP',
      country: 'JP',
    });

    expect(passport.os.platform).toBe('macOS');
    expect(passport.browser.name).toBe('Edge');
    expect(passport.locale.language).toBe('ja-JP');
    expect(passport.locale.country).toBe('JP');
    expect(passport.headers['accept-language']).toContain('ja-JP');
    expect(passport.headers['user-agent']).toContain('Edg/');
    expect(passport.headers['user-agent']).toContain('Macintosh');

    // Contradiction verification
    const errors = validateHardwareContradictions(passport.os, passport.hardware);
    expect(errors).toEqual([]);
    expect(passport.evaluation?.status).toBe('PASS');
    expect(passport.evaluation?.overallScore).toBe(100);
  });

  test('getHeaders method merges explicit request headers properly', () => {
    const passport = generatePassport({ seed: 'header-test' });
    expect(passport.getHeaders).toBeDefined();

    const headers = passport.getHeaders!({
      'x-custom-bot-bypass': 'active',
      authorization: 'Bearer token-123',
    });

    expect(headers['x-custom-bot-bypass']).toBe('active');
    expect(headers['authorization']).toBe('Bearer token-123');
    expect(headers['user-agent']).toBe(passport.browser.userAgent);
    expect(headers['sec-ch-ua']).toBe(passport.clientHints.headers['sec-ch-ua']);
  });
});
