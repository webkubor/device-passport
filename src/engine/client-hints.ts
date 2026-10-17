/**
 * High-Entropy Client Hints Generator compliant with RFC 8942 and W3C User-Agent Client Hints.
 *
 * Implements:
 * - RFC 8941 Structured Headers serialization for dictionaries and lists
 * - Chromium GREASE (Generate Random Extensions And Sustain Extensibility) brand emulation
 * - Low-entropy and high-entropy Client Hints for desktop Chrome and Edge
 */

import type {
  BrandVersion,
  ClientHintsHeaders,
  OperatingSystemProfile,
  SupportedBrowserName,
  UserAgentClientHints,
} from '../types/index.js';

export interface ClientHintsGenerateOptions {
  browserName: SupportedBrowserName;
  fullVersion: string;
  majorVersion: number;
  os: OperatingSystemProfile;
  /** PRNG random float function [0, 1) for deterministic greasing */
  prng?: () => number;
}

/**
 * Chromium GREASE brand candidates.
 * Specification: Chromium randomly selects an unreserved brand pattern with special characters.
 */
const GREASE_BRANDS = [
  'Not/A)Brand',
  'Not_A Brand',
  'Not?A_Brand',
  'Not.A/Brand',
  'Not:A-Brand',
];

/**
 * Generates brand list with GREASE according to Chromium specification.
 */
export function generateBrandVersions(
  browserName: SupportedBrowserName,
  majorVersion: number,
  fullVersion: string,
  prng: () => number = Math.random
): { lowEntropyBrands: BrandVersion[]; fullVersionList: BrandVersion[] } {
  const greaseIdx = Math.floor(prng() * GREASE_BRANDS.length);
  const greaseBrand = GREASE_BRANDS[greaseIdx] ?? 'Not/A)Brand';
  const greaseMajor = '8';
  const greaseFull = '8.0.0.0';

  const lowEntropyBrands: BrandVersion[] = [];
  const fullVersionList: BrandVersion[] = [];

  // Edge includes Chromium, Edge, and GREASE
  if (browserName === 'Edge') {
    const brands = [
      { brand: greaseBrand, major: greaseMajor, full: greaseFull },
      { brand: 'Chromium', major: String(majorVersion), full: fullVersion },
      { brand: 'Microsoft Edge', major: String(majorVersion), full: fullVersion },
    ];
    // Deterministic shuffle of brand order
    shuffleArray(brands, prng);

    for (const b of brands) {
      lowEntropyBrands.push({ brand: b.brand, version: b.major });
      fullVersionList.push({ brand: b.brand, version: b.full });
    }
  } else {
    // Default Chrome
    const brands = [
      { brand: greaseBrand, major: greaseMajor, full: greaseFull },
      { brand: 'Chromium', major: String(majorVersion), full: fullVersion },
      { brand: 'Google Chrome', major: String(majorVersion), full: fullVersion },
    ];
    shuffleArray(brands, prng);

    for (const b of brands) {
      lowEntropyBrands.push({ brand: b.brand, version: b.major });
      fullVersionList.push({ brand: b.brand, version: b.full });
    }
  }

  return { lowEntropyBrands, fullVersionList };
}

/**
 * Format brand list into RFC 8941 Structured Field value.
 * Example: `"Google Chrome";v="124", "Chromium";v="124", "Not-A.Brand";v="8"`
 */
export function formatStructuredBrandList(brands: BrandVersion[]): string {
  return brands
    .map((b) => `"${b.brand}";v="${b.version}"`)
    .join(', ');
}

/**
 * Parse RFC 8941 Structured Brand List string back to BrandVersion array.
 */
export function parseStructuredBrandList(headerValue: string): BrandVersion[] {
  if (!headerValue) return [];
  const brands: BrandVersion[] = [];
  const regex = /"([^"]+)";v="([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(headerValue)) !== null) {
    if (match[1] && match[2]) {
      brands.push({ brand: match[1], version: match[2] });
    }
  }
  return brands;
}

/**
 * Generate UserAgentClientHints compliant with RFC 8942 and W3C User-Agent Client Hints.
 */
export function generateUserAgentClientHints(
  options: ClientHintsGenerateOptions
): UserAgentClientHints {
  const { browserName, fullVersion, majorVersion, os, prng = Math.random } = options;

  const { lowEntropyBrands, fullVersionList } = generateBrandVersions(
    browserName,
    majorVersion,
    fullVersion,
    prng
  );

  const isWindows = os.platform === 'Windows';
  const architecture = os.architecture;
  const bitness = '64';
  const model = ''; // Desktop always reports empty string
  const mobile = false; // Desktop scraper / automation target

  const secChUa = formatStructuredBrandList(lowEntropyBrands);
  const secChUaFullVersionList = formatStructuredBrandList(fullVersionList);
  const secChUaMobile = '?0';
  const secChUaPlatform = `"${os.platform}"`;
  const secChUaPlatformVersion = `"${os.version}"`;
  const secChUaArch = `"${architecture}"`;
  const secChUaBitness = `"${bitness}"`;
  const secChUaModel = `"${model}"`;

  const headers: ClientHintsHeaders = {
    'sec-ch-ua': secChUa,
    'sec-ch-ua-mobile': secChUaMobile,
    'sec-ch-ua-platform': secChUaPlatform,
    'sec-ch-ua-platform-version': secChUaPlatformVersion,
    'sec-ch-ua-arch': secChUaArch,
    'sec-ch-ua-bitness': secChUaBitness,
    'sec-ch-ua-model': secChUaModel,
    'sec-ch-ua-full-version-list': secChUaFullVersionList,
  };

  if (isWindows) {
    headers['sec-ch-ua-wow64'] = '?0';
  }

  return {
    brands: lowEntropyBrands,
    mobile,
    platform: os.platform,
    platformVersion: os.version,
    architecture,
    bitness,
    model,
    fullVersionList,
    wow64: isWindows ? false : undefined,
    headers,
  };
}

/**
 * Simple in-place Fisher-Yates array shuffle using provided PRNG.
 */
function shuffleArray<T>(arr: T[], prng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = temp;
  }
}
