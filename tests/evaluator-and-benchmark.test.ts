import { describe, expect, it } from 'bun:test';
import {
  evaluatePassport,
  evaluateCoherence,
  evaluateGeoAlignment,
  calculateShannonEntropy,
  analyzeHeaderEntropy,
  detectAllContradictions,
  detectOSBrowserContradictions,
  detectHardwareContradictions,
  detectGeoChronoContradictions,
  detectClientHintsContradictions,
} from '../src/evaluator/index.js';
import {
  runComparativeBenchmark,
  formatComparativeMatrixMarkdown,
  formatComparativeMatrixLaTeX,
  formatComparativeMatrixJSON,
  COMPARATIVE_DATASET,
} from '../src/benchmark/index.js';
import type { DevicePassport } from '../src/types/index.js';

// Factory helper to build a baseline valid Device Passport
function createValidMacPassport(): DevicePassport {
  return {
    id: 'test-pass-001',
    seed: 'seed-alpha-99',
    createdAt: new Date().toISOString(),
    browser: {
      name: 'Chrome',
      version: '129.0.6668.71',
      majorVersion: 129,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    },
    os: {
      name: 'macOS',
      platform: 'macOS',
      version: '14.6.1',
      release: 'Sonoma',
      architecture: 'arm',
    },
    hardware: {
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1055,
        dpr: 2.0,
        colorDepth: 24,
        pixelDepth: 24,
      },
      cpu: {
        architecture: 'arm',
        concurrency: 8,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 16,
      },
      gpu: {
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)',
      },
    },
    locale: {
      country: 'US',
      language: 'en-US',
      languages: ['en-US', 'en'],
      timezone: 'America/New_York',
      timezoneOffset: -240,
    },
    headers: {
      'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-platform-version': '"14.6.1"',
      'sec-ch-ua-arch': '"arm"',
      'sec-ch-ua-bitness': '"64"',
      'sec-ch-ua-model': '""',
      'sec-ch-ua-full-version-list':
        '"Google Chrome";v="129.0.6668.71", "Not=A?Brand";v="8.0.0.0", "Chromium";v="129.0.6668.71"',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9',
      'upgrade-insecure-requests': '1',
      'sec-fetch-site': 'none',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-user': '?1',
      'sec-fetch-dest': 'document',
      'priority': 'u=0, i',
    },
    clientHints: {
      brands: [
        { brand: 'Google Chrome', version: '129' },
        { brand: 'Not=A?Brand', version: '8' },
        { brand: 'Chromium', version: '129' },
      ],
      mobile: false,
      platform: 'macOS',
      platformVersion: '14.6.1',
      architecture: 'arm',
      bitness: '64',
      model: '',
      fullVersionList: [
        { brand: 'Google Chrome', version: '129.0.6668.71' },
        { brand: 'Not=A?Brand', version: '8.0.0.0' },
        { brand: 'Chromium', version: '129.0.6668.71' },
      ],
      headers: {
        'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-ch-ua-platform-version': '"14.6.1"',
        'sec-ch-ua-arch': '"arm"',
        'sec-ch-ua-bitness': '"64"',
        'sec-ch-ua-model': '""',
        'sec-ch-ua-full-version-list':
          '"Google Chrome";v="129.0.6668.71", "Not=A?Brand";v="8.0.0.0", "Chromium";v="129.0.6668.71"',
      },
    },
    context: {
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      deviceScaleFactor: 2.0,
      hasTouch: false,
      isMobile: false,
      extraHTTPHeaders: {},
    },
  };
}

describe('Device Passport Formal Mathematical Model & Evaluation Engine', () => {
  it('evaluates a coherent modern macOS passport with 100% score and A+ grade', () => {
    const passport = createValidMacPassport();
    const result = evaluatePassport(passport);

    expect(result.coherenceScore).toBeGreaterThanOrEqual(95);
    expect(result.geoAlignmentScore).toBe(100);
    expect(result.entropyScore).toBeGreaterThanOrEqual(80);
    expect(result.contradictions).toHaveLength(0);
    expect(result.summary.passed).toBe(true);
    expect(result.summary.grade).toBe('A+');
    expect(result.mathematicalModel.formalism).toBe('P = ⟨H, S, G, C⟩');
    expect(result.mathematicalModel.subspaces.H.valid).toBe(true);
    expect(result.mathematicalModel.subspaces.S.valid).toBe(true);
    expect(result.mathematicalModel.subspaces.G.valid).toBe(true);
    expect(result.mathematicalModel.subspaces.C.valid).toBe(true);
  });

  describe('Cross-Subspace Contradiction Detection', () => {
    it('detects Safari running on Windows as fatal contradiction', () => {
      const passport = createValidMacPassport();
      passport.browser.name = 'Safari';
      passport.os.platform = 'Windows';

      const contradictions = detectOSBrowserContradictions(passport);
      expect(contradictions.some((c) => c.id === 'ERR_SAFARI_NON_APPLE_PLATFORM')).toBe(true);

      const evaluation = evaluatePassport(passport);
      expect(evaluation.summary.passed).toBe(false);
      expect(evaluation.summary.grade).toBe('F');
    });

    it('detects Chrome 129 on legacy Windows 7 as fatal contradiction', () => {
      const passport = createValidMacPassport();
      passport.os.platform = 'Windows';
      passport.os.release = 'Windows 7';
      passport.browser.majorVersion = 129;

      const contradictions = detectOSBrowserContradictions(passport);
      expect(contradictions.some((c) => c.id === 'ERR_CHROME_LEGACY_WIN_UNSUPPORTED')).toBe(true);
    });

    it('detects Windows 11 with Windows 10 platformVersion (< 13.0.0)', () => {
      const passport = createValidMacPassport();
      passport.os.platform = 'Windows';
      passport.os.release = 'Windows 11 Pro';
      passport.clientHints.platformVersion = '10.0.0';

      const contradictions = detectOSBrowserContradictions(passport);
      expect(contradictions.some((c) => c.id === 'ERR_WIN11_PLATFORM_VERSION_MISMATCH')).toBe(true);
    });

    it('detects modern NVIDIA RTX GPU on macOS as fatal contradiction', () => {
      const passport = createValidMacPassport();
      passport.hardware.gpu.renderer = 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090, OpenGL 4.5)';

      const contradictions = detectHardwareContradictions(passport);
      expect(contradictions.some((c) => c.id === 'ERR_NVIDIA_MODERN_ON_MACOS')).toBe(true);
    });

    it('detects Apple M-series GPU on Windows as fatal contradiction', () => {
      const passport = createValidMacPassport();
      passport.os.platform = 'Windows';
      passport.hardware.gpu.renderer = 'ANGLE (Apple, Apple M2 Max, Direct3D11)';

      const contradictions = detectHardwareContradictions(passport);
      expect(contradictions.some((c) => c.id === 'ERR_APPLE_GPU_ON_WINDOWS')).toBe(true);
    });

    it('detects viewport exceeding display screen boundaries', () => {
      const passport = createValidMacPassport();
      passport.context.viewport = { width: 3840, height: 2160 };
      passport.hardware.screen.width = 1920;
      passport.hardware.screen.height = 1080;

      const contradictions = detectHardwareContradictions(passport);
      expect(contradictions.some((c) => c.id === 'ERR_VIEWPORT_EXCEEDS_SCREEN')).toBe(true);
    });

    it('detects Geo-Chrono territory mismatch (US country with Asia/Tokyo timezone)', () => {
      const passport = createValidMacPassport();
      passport.locale.country = 'US';
      passport.locale.timezone = 'Asia/Tokyo';

      const contradictions = detectGeoChronoContradictions(passport);
      expect(contradictions.some((c) => c.id === 'ERR_GEO_TIMEZONE_COUNTRY_MISMATCH')).toBe(true);

      const geoScore = evaluateGeoAlignment(passport);
      expect(geoScore).toBeLessThan(70);
    });

    it('detects Mobile Client Hint (?1) on Desktop macOS', () => {
      const passport = createValidMacPassport();
      passport.clientHints.mobile = true;

      const contradictions = detectClientHintsContradictions(passport);
      expect(contradictions.some((c) => c.id === 'ERR_CH_MOBILE_ON_DESKTOP')).toBe(true);
    });

    it('detects non-empty desktop model in Client Hints', () => {
      const passport = createValidMacPassport();
      passport.clientHints.model = 'MacBookPro18,1';

      const contradictions = detectClientHintsContradictions(passport);
      expect(contradictions.some((c) => c.id === 'ERR_CH_NON_EMPTY_DESKTOP_MODEL')).toBe(true);
    });
  });

  describe('Shannon Entropy Analyzer', () => {
    it('calculates Shannon entropy of string accurately in bits', () => {
      // Uniform string: all characters identical -> 0 entropy
      expect(calculateShannonEntropy('aaaaa')).toBe(0);

      // Two characters equal frequency: p=0.5 -> -2 * (0.5 * log2(0.5)) = 1.0 bit
      expect(calculateShannonEntropy('abababab')).toBe(1.0);

      // Random text should have realistic non-zero entropy
      const sample = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const entropy = calculateShannonEntropy(sample);
      expect(entropy).toBeGreaterThan(3.5);
      expect(entropy).toBeLessThan(5.5);
    });

    it('analyzes header entropy of authentic browser headers within optimal band', () => {
      const passport = createValidMacPassport();
      const analysis = analyzeHeaderEntropy(passport.headers);

      expect(analysis.anomaly).toBe('optimal');
      expect(analysis.entropyScore).toBeGreaterThanOrEqual(80);
      expect(analysis.estimatedBits).toBeGreaterThanOrEqual(4.6);
      expect(analysis.estimatedBits).toBeLessThanOrEqual(5.6);
    });

    it('flags under-parameterized minimal headers as too_low anomaly', () => {
      const minimalHeaders = {
        'user-agent': 'python-requests/2.31.0',
      };
      const analysis = analyzeHeaderEntropy(minimalHeaders);

      expect(analysis.anomaly).toBe('too_low');
      expect(analysis.collisionRisk).toBe('high');
      expect(analysis.entropyScore).toBeLessThan(60);
    });
  });

  describe('Academic Comparative Benchmark Matrix', () => {
    it('contains all 4 benchmark subjects with 6 evaluation metrics', () => {
      expect(COMPARATIVE_DATASET).toHaveLength(4);

      const ids = COMPARATIVE_DATASET.map((p) => p.id);
      expect(ids).toContain('device-passport');
      expect(ids).toContain('header-generator');
      expect(ids).toContain('user-agents');
      expect(ids).toContain('fake-useragent');

      for (const subject of COMPARATIVE_DATASET) {
        expect(subject.metrics.clientHintsSupport).toBeDefined();
        expect(subject.metrics.statefulPersistence).toBeDefined();
        expect(subject.metrics.geoChronoFusion).toBeDefined();
        expect(subject.metrics.contradictionRate).toBeDefined();
        expect(subject.metrics.detectionBypassRate).toBeDefined();
        expect(subject.metrics.memoryOverhead).toBeDefined();
      }
    });

    it('executes runComparativeBenchmark and verifies device-passport dominance', () => {
      const report = runComparativeBenchmark();
      expect(report.winner).toBe('Device Passport');
      expect(report.evaluatedLibrariesCount).toBe(4);
      expect(report.superiorityRatios.bypassRateVsLegacy).toContain('higher detection bypass rate');
      expect(report.superiorityRatios.contradictionReduction).toContain('0.0% vs 58.2%');
    });

    it('renders comparative matrix in Markdown format with all rows', () => {
      const md = formatComparativeMatrixMarkdown();
      expect(md).toContain('| Dimension / Metric |');
      expect(md).toContain('device-passport');
      expect(md).toContain('header-generator (Apify)');
      expect(md).toContain('Client-Hints Support');
      expect(md).toContain('Detection Bypass Rate');
      expect(md).toContain('🏆 **A+ (99.1/100)**');
    });

    it('renders comparative matrix in publication-ready LaTeX format', () => {
      const latex = formatComparativeMatrixLaTeX();
      expect(latex).toContain('\\begin{table*}');
      expect(latex).toContain('\\caption{Academic Comparative Evaluation of Browser Persona Generators}');
      expect(latex).toContain('\\toprule');
      expect(latex).toContain('Device Passport (Ours)');
      expect(latex).toContain('\\bottomrule');
      expect(latex).toContain('\\end{table*}');
    });

    it('renders comparative matrix in JSON format with valid schema', () => {
      const jsonStr = formatComparativeMatrixJSON();
      const parsed = JSON.parse(jsonStr);
      expect(parsed.winner).toBe('Device Passport');
      expect(parsed.matrix).toHaveLength(4);
    });
  });
});
