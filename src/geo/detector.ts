/**
 * Proxy and Geo-Context Detector.
 * Extracts country and geo information from residential proxy URLs, IP hints, or explicit ISO codes.
 * Pure TypeScript, zero external dependencies.
 */

import { DEFAULT_COUNTRY, hasCountryConfig } from './locales.js';
import { getCountryForTimezone } from './timezone-matrix.js';

export interface GeoDetectOptions {
  /** Country code to fall back to if detection fails. Defaults to 'US'. */
  fallbackCountry?: string;
}

/**
 * ISO 3166-1 alpha-3 to alpha-2 code mapping.
 */
export const ALPHA3_TO_ALPHA2: Record<string, string> = {
  USA: 'US',
  GBR: 'GB',
  DEU: 'DE',
  FRA: 'FR',
  JPN: 'JP',
  SGP: 'SG',
  HKG: 'HK',
  TWN: 'TW',
  CHN: 'CN',
  KOR: 'KR',
  AUS: 'AU',
  CAN: 'CA',
  NLD: 'NL',
  IND: 'IN',
  BRA: 'BR',
  ITA: 'IT',
  ESP: 'ES',
  RUS: 'RU',
  MEX: 'MX',
  IDN: 'ID',
  MYS: 'MY',
  THA: 'TH',
  VNM: 'VN',
  PHL: 'PH',
  SWE: 'SE',
  NOR: 'NO',
  DNK: 'DK',
  FIN: 'FI',
  POL: 'PL',
  CHE: 'CH',
  AUT: 'AT',
  BEL: 'BE',
  IRL: 'IE',
  NZL: 'NZ',
  TUR: 'TR',
  SAU: 'SA',
  ARE: 'AE',
  ZAF: 'ZA',
  ARG: 'AR',
  CHL: 'CL',
  COL: 'CO',
  ISR: 'IL',
  UKR: 'UA',
  PRT: 'PT',
  CZE: 'CZ',
  ROU: 'RO',
  GRC: 'GR',
  HUN: 'HU',
};

/**
 * Common English country name aliases to ISO 3166-1 alpha-2 code.
 */
export const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US',
  'united states of america': 'US',
  'great britain': 'GB',
  'united kingdom': 'GB',
  england: 'GB',
  uk: 'GB',
  germany: 'DE',
  deutschland: 'DE',
  france: 'FR',
  japan: 'JP',
  singapore: 'SG',
  'hong kong': 'HK',
  taiwan: 'TW',
  china: 'CN',
  'south korea': 'KR',
  korea: 'KR',
  australia: 'AU',
  canada: 'CA',
  netherlands: 'NL',
  holland: 'NL',
  india: 'IN',
  brazil: 'BR',
  brasil: 'BR',
  italy: 'IT',
  spain: 'ES',
  russia: 'RU',
  mexico: 'MX',
  indonesia: 'ID',
  malaysia: 'MY',
  thailand: 'TH',
  vietnam: 'VN',
  philippines: 'PH',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  finland: 'FI',
  poland: 'PL',
  switzerland: 'CH',
  austria: 'AT',
  belgium: 'BE',
  ireland: 'IE',
  'new zealand': 'NZ',
  turkey: 'TR',
  türkiye: 'TR',
  'saudi arabia': 'SA',
  'united arab emirates': 'AE',
  uae: 'AE',
  'south africa': 'ZA',
  argentina: 'AR',
  chile: 'CL',
  colombia: 'CO',
  israel: 'IL',
  ukraine: 'UA',
  portugal: 'PT',
  'czech republic': 'CZ',
  czechia: 'CZ',
  romania: 'RO',
  greece: 'GR',
  hungary: 'HU',
};

/**
 * Normalize any country input (2-letter, 3-letter, alias, name) to an ISO 3166-1 alpha-2 uppercase code.
 */
export function normalizeCountryCode(code?: string | null): string | null {
  if (!code || typeof code !== 'string') return null;
  const trimmed = code.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();

  // Special UK handling
  if (upper === 'UK') return 'GB';

  // 2-letter alpha-2
  if (/^[A-Z]{2}$/.test(upper)) {
    return upper;
  }

  // 3-letter alpha-3
  if (/^[A-Z]{3}$/.test(upper) && ALPHA3_TO_ALPHA2[upper]) {
    return ALPHA3_TO_ALPHA2[upper];
  }

  // Full country name matching
  const lower = trimmed.toLowerCase();
  if (COUNTRY_NAME_TO_CODE[lower]) {
    return COUNTRY_NAME_TO_CODE[lower];
  }

  return null;
}

/**
 * Extract an ISO country code from a residential proxy URL or connection string.
 * Supports:
 * - Username authentication tokens (e.g. user-country-us, customer-zone-cc-DE, lum-customer-*-country-fr)
 * - Query parameters (e.g. ?country=JP, &country_code=KR, ?cc=SG, &geo=DE)
 * - Subdomain patterns (e.g. us.smartproxy.com, jp.proxy-seller.com)
 */
export function extractCountryFromProxyUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Try parsing as standard URL (prepend scheme if missing)
  let parsedUrl: URL | null = null;
  try {
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
    parsedUrl = new URL(hasScheme ? trimmed : `http://${trimmed}`);
  } catch {
    parsedUrl = null;
  }

  if (parsedUrl) {
    // 1. Check query parameters first
    const paramNames = ['country', 'country_code', 'countrycode', 'cc', 'geo', 'region'];
    for (const param of paramNames) {
      const val = parsedUrl.searchParams.get(param);
      if (val) {
        const normalized = normalizeCountryCode(val);
        if (normalized) return normalized;
      }
    }

    // Check locale param (e.g. locale=ja-JP or locale=de)
    const localeVal = parsedUrl.searchParams.get('locale');
    if (localeVal) {
      const parts = localeVal.split(/[-_]/);
      const possibleCc = parts[parts.length - 1];
      const normalized = normalizeCountryCode(possibleCc);
      if (normalized) return normalized;
    }

    // 2. Check username for residential proxy targeting formats
    if (parsedUrl.username) {
      const username = decodeURIComponent(parsedUrl.username);
      const userPatterns = [
        /(?:^|[-_.:=])country[-_.:=]([a-zA-Z]{2,3})(?:[-_.:=]|$)/i,
        /(?:^|[-_.:=])cc[-_.:=]([a-zA-Z]{2,3})(?:[-_.:=]|$)/i,
        /(?:^|[-_.:=])geo[-_.:=]([a-zA-Z]{2,3})(?:[-_.:=]|$)/i,
        /(?:^|[-_.:=])region[-_.:=]([a-zA-Z]{2,3})(?:[-_.:=]|$)/i,
        /(?:^|[-_.:=])zone[-_][a-zA-Z0-9]+[-_]([a-zA-Z]{2,3})(?:[-_.:=]|$)/i,
      ];

      for (const pattern of userPatterns) {
        const match = username.match(pattern);
        if (match && match[1]) {
          const normalized = normalizeCountryCode(match[1]);
          if (normalized) return normalized;
        }
      }
    }

    // 3. Check hostname subdomains (e.g. us.smartproxy.com, de-proxy.io, jp.resi.net)
    const hostname = parsedUrl.hostname.toLowerCase();
    const hostParts = hostname.split('.');
    if (hostParts.length >= 3) {
      const firstPart = hostParts[0];
      // e.g. "us", "jp", "resi-us", "gate-us", "us-proxy"
      const subParts = firstPart.split(/[-_]/);
      for (const part of subParts) {
        if (/^[a-zA-Z]{2}$/.test(part)) {
          const normalized = normalizeCountryCode(part);
          if (normalized && hasCountryConfig(normalized)) {
            return normalized;
          }
        }
      }
    }
  }

  // 4. Fallback string regex search across full unparsed string
  const rawPatterns = [
    /(?:^|[-_.:=?&])country[-_.:=]([a-zA-Z]{2,3})(?:[-_.:=?&]|$)/i,
    /(?:^|[-_.:=?&])country_code=([a-zA-Z]{2,3})/i,
    /(?:^|[-_.:=?&])cc[-_.:=]([a-zA-Z]{2,3})(?:[-_.:=?&]|$)/i,
    /(?:^|[-_.:=?&])geo[-_.:=]([a-zA-Z]{2,3})(?:[-_.:=?&]|$)/i,
    /(?:^|[-_.:=?&])region[-_.:=]([a-zA-Z]{2,3})(?:[-_.:=?&]|$)/i,
  ];

  for (const pattern of rawPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      const normalized = normalizeCountryCode(match[1]);
      if (normalized) return normalized;
    }
  }

  return null;
}

/**
 * Universal country detector.
 * Accepts:
 * - Explicit ISO 3166-1 alpha-2 / alpha-3 codes ('US', 'GB', 'jp', 'JPN')
 * - Country names ('Japan', 'United States', 'Germany')
 * - Residential proxy URLs (http://user-country-us:pass@proxy...)
 * - IANA Timezone strings ('America/New_York' -> 'US', 'Asia/Tokyo' -> 'JP')
 * - Falls back to DEFAULT_COUNTRY ('US') when unknown.
 */
export function detectCountry(input?: string | null, options?: GeoDetectOptions): string {
  const fallback = (options?.fallbackCountry && normalizeCountryCode(options.fallbackCountry)) || DEFAULT_COUNTRY;

  if (!input || typeof input !== 'string') {
    return fallback;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }

  // 1. Direct country code or name normalization
  const directCode = normalizeCountryCode(trimmed);
  if (directCode && hasCountryConfig(directCode)) {
    return directCode;
  }

  // 2. Check if input is a timezone identifier (e.g. 'America/New_York', 'Asia/Tokyo')
  const tzCountry = getCountryForTimezone(trimmed);
  if (tzCountry) {
    return tzCountry;
  }

  // 3. Check if input is a residential proxy URL or connection string
  const proxyCountry = extractCountryFromProxyUrl(trimmed);
  if (proxyCountry && hasCountryConfig(proxyCountry)) {
    return proxyCountry;
  }

  // 4. Return directCode if recognized even if not in standard db, otherwise fallback
  return directCode || fallback;
}
