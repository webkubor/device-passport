/**
 * Geo-Chrono Aligner.
 * Aligns browser persona parameters (country, timezone, locale, accept-language header)
 * with zero contradictions for stealth crawlers and automation.
 * Pure TypeScript, zero external dependencies.
 */

import {
  CountryLocaleConfig,
  DEFAULT_COUNTRY,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  DEFAULT_ACCEPT_LANGUAGE,
  formatAcceptLanguage,
  getCountryConfig,
} from './locales.js';
import type { GeoOptions, GeoContext, GeoCoordinates } from '../types/index.js';
import {
  getDefaultTimezoneForCountry,
  getTimezoneOffsetMinutes,
  isTimezoneAlignedWithCountry,
  isValidTimezone,
} from './timezone-matrix.js';
import { detectCountry } from './detector.js';

export type { GeoOptions, GeoContext };

/**
 * Align geographic and chronological parameters into a cohesive, contradiction-free GeoContext.
 *
 * @param geoInput Proxy URL, ISO country code, IANA timezone string, or GeoOptions object
 * @returns Fully correlated GeoContext
 */
export function alignGeoContext(geoInput?: string | GeoOptions): GeoContext {
  let countryInput: string | undefined;
  let proxyUrlInput: string | undefined;
  let explicitTimezone: string | undefined;
  let explicitLocale: string | undefined;
  let explicitLanguages: string[] | undefined;
  let explicitAcceptLanguage: string | undefined;
  let fallbackCountry = DEFAULT_COUNTRY;
  let explicitCoordinates: GeoCoordinates | undefined;

  if (typeof geoInput === 'string') {
    const trimmed = geoInput.trim();
    // Check if the input is a valid IANA timezone string directly
    if (isValidTimezone(trimmed) && trimmed.includes('/')) {
      explicitTimezone = trimmed;
      countryInput = trimmed;
    } else if (trimmed.includes('://') || trimmed.includes('@') || trimmed.includes('?')) {
      proxyUrlInput = trimmed;
    } else {
      countryInput = trimmed;
    }
  } else if (geoInput && typeof geoInput === 'object') {
    countryInput = geoInput.country;
    proxyUrlInput = geoInput.proxyUrl;
    explicitTimezone = geoInput.timezone;
    explicitLocale = geoInput.locale;
    explicitLanguages = geoInput.languages;
    explicitAcceptLanguage = geoInput.acceptLanguage;
    fallbackCountry = geoInput.fallbackCountry || DEFAULT_COUNTRY;
    explicitCoordinates = geoInput.coordinates;
  }

  // 1. Detect target country
  const detectedTarget = proxyUrlInput || countryInput;
  const country = detectCountry(detectedTarget, { fallbackCountry });
  const config: CountryLocaleConfig = getCountryConfig(country);

  // 2. Resolve aligned timezone
  let timezone: string;
  if (explicitTimezone && isValidTimezone(explicitTimezone)) {
    timezone = explicitTimezone;
  } else {
    timezone = config.defaultTimezone || getDefaultTimezoneForCountry(country);
  }

  // 3. Resolve aligned locale & languages
  const locale = explicitLocale || config.primaryLocale || DEFAULT_LOCALE;
  const languages = explicitLanguages && explicitLanguages.length > 0 ? explicitLanguages : [...config.languages];

  // 4. Resolve strictly formatted Accept-Language header
  let acceptLanguage: string;
  if (explicitAcceptLanguage) {
    acceptLanguage = explicitAcceptLanguage;
  } else if (explicitLanguages && explicitLanguages.length > 0) {
    acceptLanguage = formatAcceptLanguage(explicitLanguages);
  } else {
    acceptLanguage = config.acceptLanguage || DEFAULT_ACCEPT_LANGUAGE;
  }

  // 5. Calculate real timezone offset in minutes relative to UTC
  const timezoneOffset = getTimezoneOffsetMinutes(timezone);

  // 6. Coordinates and currency
  const coordinates = explicitCoordinates || config.coordinates;
  const currency = config.currency || 'USD';

  return {
    country,
    timezone,
    locale,
    acceptLanguage,
    languages,
    timezoneOffset,
    currency,
    coordinates,
    language: locale,
  };
}

/**
 * Verify whether a partial or full GeoContext is free of geographic or chronological contradictions.
 */
export function isGeoAligned(context: Partial<GeoContext>): boolean {
  if (!context || !context.country) {
    return false;
  }

  const country = context.country.toUpperCase();

  // Validate timezone alignment if provided
  if (context.timezone) {
    if (!isValidTimezone(context.timezone)) {
      return false;
    }
    if (!isTimezoneAlignedWithCountry(context.timezone, country)) {
      return false;
    }
  }

  // Validate locale alignment if provided
  if (context.locale) {
    const config = getCountryConfig(country);
    const localeNorm = context.locale.toLowerCase();
    const configLocaleNorm = config.primaryLocale.toLowerCase();
    const countryNorm = country.toLowerCase();

    // Check if locale ends with the country code or starts with supported language
    const matchesCountry = localeNorm.endsWith(`-${countryNorm}`) || localeNorm.endsWith(`_${countryNorm}`);
    const matchesPrimary = localeNorm === configLocaleNorm;
    const matchesLanguages = config.languages.some((l) => l.toLowerCase() === localeNorm);

    if (!matchesCountry && !matchesPrimary && !matchesLanguages) {
      return false;
    }
  }

  return true;
}

/**
 * Format GeoContext into a LocaleProfile for runtime device-passport consumers.
 */
export function toLocaleProfile(geo: GeoContext) {
  return {
    language: geo.locale,
    languages: [...geo.languages],
    timezone: geo.timezone,
    timezoneOffset: geo.timezoneOffset,
    country: geo.country,
    currency: geo.currency,
  };
}

/**
 * Format GeoContext into a GeoLocation object for browser geolocation emulation.
 */
export function toGeoLocation(geo: GeoContext) {
  return {
    latitude: geo.coordinates.latitude,
    longitude: geo.coordinates.longitude,
    accuracy: geo.coordinates.accuracy ?? 1000,
    country: geo.country,
    countryCode: geo.country,
    timezone: geo.timezone,
    locale: geo.locale,
    languages: [...geo.languages],
  };
}
