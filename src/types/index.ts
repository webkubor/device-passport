/**
 * Core type definitions for Device Passport.
 * Compliant with RFC 8942, W3C User-Agent Client Hints, and WebGL specs.
 */

import type { LocaleProfile, GeoLocation } from './geo.js';
import type { PassportEvaluation } from './metrics.js';

export * from './geo.js';
export * from './metrics.js';

// ==========================================
// Browser & OS Profiles
// ==========================================

export type SupportedBrowserName = 'Chrome' | 'Edge' | 'Safari' | 'Firefox';
export type SupportedPlatform = 'macOS' | 'Windows';
export type SupportedArchitecture = 'arm' | 'x86';

export interface BrowserProfile {
  name: SupportedBrowserName;
  version: string;
  majorVersion: number;
  userAgent: string;
}

export interface OperatingSystemProfile {
  name: SupportedPlatform;
  platform: SupportedPlatform;
  version: string; // e.g. '14.6.1' or '15.0.0' or '10.0.0'
  release: string; // e.g. 'Sonoma', 'Sequoia', 'Windows 11', 'Windows 10'
  architecture: SupportedArchitecture;
}

// ==========================================
// Hardware Profiles (Zero Contradictions)
// ==========================================

export interface ScreenProfile {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  dpr: number;
  colorDepth: number;
  pixelDepth: number;
}

export interface CpuProfile {
  architecture: SupportedArchitecture;
  concurrency: number; // navigator.hardwareConcurrency
}

export interface MemoryProfile {
  deviceMemory: number; // navigator.deviceMemory in GB (e.g. 8)
  physicalMemoryGB?: number; // actual RAM in GB (e.g. 16, 32, 64)
}

export interface GpuProfile {
  vendor: string; // WebGL unmasked vendor, e.g. 'Google Inc. (Apple)'
  renderer: string; // WebGL unmasked renderer, e.g. 'ANGLE (Apple, Apple M2, OpenGL 4.1)'
  webglVendor?: string; // Standard WebGL vendor, e.g. 'WebKit'
  webglRenderer?: string; // Standard WebGL renderer, e.g. 'WebKit WebGL'
}

export interface HardwareProfile {
  screen: ScreenProfile;
  cpu: CpuProfile;
  memory: MemoryProfile;
  gpu: GpuProfile;
}

// ==========================================
// Client Hints (RFC 8942 / W3C User-Agent Client Hints)
// ==========================================

export interface BrandVersion {
  brand: string;
  version: string;
}

/**
 * Raw RFC 8942 / RFC 8941 structured client hints headers.
 */
export interface ClientHintsHeaders {
  /** Low-entropy brand and major version, e.g. `"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"` */
  'sec-ch-ua': string;
  /** Low-entropy mobile indicator, `"?0"` or `"?1"` */
  'sec-ch-ua-mobile': string;
  /** Low-entropy platform, e.g. `"macOS"` or `"Windows"` */
  'sec-ch-ua-platform': string;
  /** High-entropy OS version, e.g. `"14.6.1"` or `"15.0.0"` */
  'sec-ch-ua-platform-version': string;
  /** High-entropy architecture, e.g. `"arm"` or `"x86"` */
  'sec-ch-ua-arch': string;
  /** High-entropy bitness, e.g. `"64"` */
  'sec-ch-ua-bitness': string;
  /** High-entropy device model, `""` for desktop */
  'sec-ch-ua-model': string;
  /** High-entropy full version list, e.g. `"Chromium";v="124.0.6367.208", "Google Chrome";v="124.0.6367.208"` */
  'sec-ch-ua-full-version-list': string;
  /** High-entropy 32-bit on 64-bit Windows flag, `"?0"` */
  'sec-ch-ua-wow64'?: string;
}

/**
 * Structured User-Agent Client Hints object representing navigator.userAgentData.
 */
export interface UserAgentClientHints {
  brands: BrandVersion[];
  mobile: boolean;
  platform: string;
  platformVersion: string;
  architecture: string;
  bitness: string;
  model: string;
  fullVersionList: BrandVersion[];
  wow64?: boolean;
  /** Serialized RFC 8942 compliant headers */
  headers: ClientHintsHeaders;
}

// ==========================================
// Device Passport & Context
// ==========================================

export interface DevicePassportContext {
  viewport: {
    width: number;
    height: number;
  };
  userAgent: string;
  locale: string;
  timezoneId: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  permissions?: string[];
  extraHTTPHeaders: Record<string, string>;
  deviceScaleFactor: number;
  hasTouch: boolean;
  isMobile: boolean;
  colorScheme?: 'light' | 'dark' | 'no-preference';
}

export interface DevicePassport {
  /** Unique deterministic or UUID identifier */
  id: string;
  /** Seed used to generate this passport */
  seed: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** Browser profile */
  browser: BrowserProfile;
  /** Operating system profile */
  os: OperatingSystemProfile;
  /** Hardware profile (screen, cpu, memory, gpu) */
  hardware: HardwareProfile;
  /** Locale, language, timezone */
  locale: LocaleProfile;
  /** All HTTP headers (User-Agent, Sec-CH-UA*, Accept*, etc.) */
  headers: Record<string, string>;
  /** High-entropy and low-entropy Client Hints */
  clientHints: UserAgentClientHints;
  /** Ready-to-use context options for Playwright / Puppeteer / Browser */
  context: DevicePassportContext;
  /** Consistency and anti-detection score evaluation */
  evaluation?: PassportEvaluation;
  /** Optional helper method to get merged headers */
  getHeaders?: (overrides?: Record<string, string>) => Record<string, string>;
}

/** Alias for backward compatibility */
export type DeviceProfile = DevicePassport;

// ==========================================
// Generator Options
// ==========================================

export interface PassportGeneratorOptions {
  /** Deterministic seed (username, account ID, proxy IP, etc.) */
  seed?: string | number;
  /** Geographic country code ('US', 'JP', etc.) or residential proxy URL */
  geo?: string;
  /** Residential proxy URL to detect geographical location from */
  proxy?: string;
  proxyUrl?: string;
  /** Preferred Operating System */
  os?: SupportedPlatform;
  /** Preferred Browser */
  browser?: SupportedBrowserName;
  /** Preferred primary locale (e.g. 'en-US', 'zh-CN') */
  locale?: string;
  /** Preferred country code (e.g. 'US', 'GB', 'DE', 'JP') */
  country?: string;
  /** Preferred timezone (e.g. 'America/New_York') */
  timezone?: string;
  /** Whether to integrate with header-generator when available */
  useHeaderGenerator?: boolean;
  /** Hardware tier preference */
  hardwareTier?: 'standard' | 'high-performance';
}
