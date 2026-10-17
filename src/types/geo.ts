/**
 * Geographic, Locale and Timezone definitions for Device Passport.
 */

export interface LanguageWeight {
  code: string;
  weight?: number; // 0.0 - 1.0, e.g. q=0.9
}

export interface LocaleProfile {
  /** Primary locale identifier, e.g. 'en-US', 'zh-CN', 'ja-JP' */
  language: string;
  /** Fallback languages ordered by preference, e.g. ['en-US', 'en'] */
  languages: string[];
  /** IANA Time Zone identifier, e.g. 'America/New_York', 'Asia/Shanghai' */
  timezone: string;
  /** Timezone offset in minutes relative to UTC (e.g. -240 for EDT, +480 for CST) */
  timezoneOffset: number;
  /** ISO 3166-1 alpha-2 country code, e.g. 'US', 'GB', 'CN', 'JP' */
  country: string;
  /** ISO 4217 currency code, e.g. 'USD', 'EUR', 'CNY', 'JPY' */
  currency?: string;
  /** Formatted Accept-Language header string e.g. 'en-US,en;q=0.9' */
  acceptLanguage?: string;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeoLocation extends GeoCoordinates {
  country: string;
  countryCode?: string;
  region?: string;
  city?: string;
  timezone: string;
  locale: string;
  languages: string[];
}

export interface CountryGeoDefinition {
  country: string;
  countryName: string;
  defaultLocale: string;
  supportedLocales: string[];
  defaultTimezone: string;
  timezones: string[];
  coordinates: GeoCoordinates;
  currency?: string;
}

export interface GeoOptions {
  /** Explicit ISO country code, country name, or connection string */
  country?: string;
  /** Residential proxy URL or IP to detect geographic location from */
  proxyUrl?: string;
  ip?: string;
  /** Explicit IANA timezone override (e.g. 'America/Los_Angeles') */
  timezone?: string;
  /** Explicit primary locale override (e.g. 'en-US') */
  locale?: string;
  /** Explicit language array override (e.g. ['en-US', 'en']) */
  languages?: string[];
  /** Explicit Accept-Language weighted header string override */
  acceptLanguage?: string;
  /** Fallback country code if detection fails (defaults to 'US') */
  fallbackCountry?: string;
  /** Explicit geographical coordinates override */
  coordinates?: GeoCoordinates;
}

export interface GeoContext {
  country: string;
  timezone: string;
  locale: string;
  language: string;
  acceptLanguage: string;
  languages: string[];
  timezoneOffset: number;
  currency?: string;
  coordinates?: GeoCoordinates;
}
