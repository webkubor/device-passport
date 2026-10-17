/**
 * Geo and Chrono Aligner module for Device Passport.
 * Provides geographic-locale mapping database, proxy/IP geo detector,
 * and zero-contradiction geo-chrono alignment.
 */

import { COUNTRY_LOCALES, hasCountryConfig, CountryLocaleConfig } from './locales.js';
import { TIMEZONE_TO_COUNTRY } from './timezone-matrix.js';
import { extractCountryFromProxyUrl, detectCountry } from './detector.js';
import { alignGeoContext, toLocaleProfile, GeoContext, GeoOptions } from './aligner.js';
import type { LocaleProfile } from '../types/geo.js';

export * from './locales.js';
export * from './timezone-matrix.js';
export * from './detector.js';
export * from './aligner.js';

// Backward compatibility & convenience aliases
export const GEO_LOCALES = COUNTRY_LOCALES;
export const TIMEZONE_MATRIX = TIMEZONE_TO_COUNTRY;
export const isValidCountryCode = hasCountryConfig;

/**
 * Detect country code from residential proxy URL.
 */
export function detectGeoFromUrl(url: string): string | null {
  return extractCountryFromProxyUrl(url);
}

/**
 * Get a complete LocaleProfile for a country code and optional timezone.
 */
export function getLocaleProfile(countryCode?: string | null, timezone?: string): LocaleProfile {
  const geo = alignGeoContext({
    country: countryCode || undefined,
    timezone,
  });
  return toLocaleProfile(geo);
}
