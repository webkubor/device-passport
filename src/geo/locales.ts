/**
 * Comprehensive Geographic-Locale Mapping Database.
 * Zero-dependency, pure TypeScript.
 */

import type { GeoCoordinates } from '../types/index.js';

export interface CountryLocaleConfig {
  /** ISO 3166-1 alpha-2 uppercase country code */
  country: string;
  /** Full English country name */
  countryName: string;
  /** Primary locale identifier, e.g. 'en-US', 'ja-JP' */
  primaryLocale: string;
  /** Primary and fallback languages ordered by preference */
  languages: string[];
  /** Strictly formatted RFC 9110 Accept-Language weighted header string */
  acceptLanguage: string;
  /** Supported IANA timezones within this country */
  timezones: string[];
  /** Default primary IANA timezone */
  defaultTimezone: string;
  /** ISO 4217 currency code */
  currency: string;
  /** Representative geographical center/capital coordinates */
  coordinates: GeoCoordinates;
}

/**
 * Global fallback defaults
 */
export const DEFAULT_COUNTRY = 'US';
export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_TIMEZONE = 'America/New_York';
export const DEFAULT_ACCEPT_LANGUAGE = 'en-US,en;q=0.9';

/**
 * Comprehensive Country Locale & Geographic Database.
 */
export const COUNTRY_LOCALES: Record<string, CountryLocaleConfig> = {
  US: {
    country: 'US',
    countryName: 'United States',
    primaryLocale: 'en-US',
    languages: ['en-US', 'en'],
    acceptLanguage: 'en-US,en;q=0.9',
    timezones: [
      'America/New_York',
      'America/Los_Angeles',
      'America/Chicago',
      'America/Denver',
      'America/Phoenix',
      'America/Anchorage',
      'America/Honolulu',
      'America/Detroit',
      'America/Indiana/Indianapolis',
    ],
    defaultTimezone: 'America/New_York',
    currency: 'USD',
    coordinates: { latitude: 37.7749, longitude: -122.4194, accuracy: 1000 },
  },

  GB: {
    country: 'GB',
    countryName: 'United Kingdom',
    primaryLocale: 'en-GB',
    languages: ['en-GB', 'en-US', 'en'],
    acceptLanguage: 'en-GB,en-US;q=0.9,en;q=0.8',
    timezones: ['Europe/London'],
    defaultTimezone: 'Europe/London',
    currency: 'GBP',
    coordinates: { latitude: 51.5074, longitude: -0.1278, accuracy: 1000 },
  },

  DE: {
    country: 'DE',
    countryName: 'Germany',
    primaryLocale: 'de-DE',
    languages: ['de-DE', 'de', 'en-US', 'en'],
    acceptLanguage: 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Berlin'],
    defaultTimezone: 'Europe/Berlin',
    currency: 'EUR',
    coordinates: { latitude: 52.52, longitude: 13.405, accuracy: 1000 },
  },

  FR: {
    country: 'FR',
    countryName: 'France',
    primaryLocale: 'fr-FR',
    languages: ['fr-FR', 'fr', 'en-US', 'en'],
    acceptLanguage: 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Paris'],
    defaultTimezone: 'Europe/Paris',
    currency: 'EUR',
    coordinates: { latitude: 48.8566, longitude: 2.3522, accuracy: 1000 },
  },

  JP: {
    country: 'JP',
    countryName: 'Japan',
    primaryLocale: 'ja-JP',
    languages: ['ja-JP', 'ja', 'en-US'],
    acceptLanguage: 'ja-JP,ja;q=0.9,en-US;q=0.8',
    timezones: ['Asia/Tokyo'],
    defaultTimezone: 'Asia/Tokyo',
    currency: 'JPY',
    coordinates: { latitude: 35.6762, longitude: 139.6503, accuracy: 1000 },
  },

  SG: {
    country: 'SG',
    countryName: 'Singapore',
    primaryLocale: 'en-SG',
    languages: ['en-SG', 'en-US', 'en', 'zh-CN'],
    acceptLanguage: 'en-SG,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7',
    timezones: ['Asia/Singapore'],
    defaultTimezone: 'Asia/Singapore',
    currency: 'SGD',
    coordinates: { latitude: 1.3521, longitude: 103.8198, accuracy: 1000 },
  },

  HK: {
    country: 'HK',
    countryName: 'Hong Kong',
    primaryLocale: 'zh-HK',
    languages: ['zh-HK', 'zh-TW', 'zh', 'en-US'],
    acceptLanguage: 'zh-HK,zh-TW;q=0.9,zh;q=0.8,en-US;q=0.7',
    timezones: ['Asia/Hong_Kong'],
    defaultTimezone: 'Asia/Hong_Kong',
    currency: 'HKD',
    coordinates: { latitude: 22.3193, longitude: 114.1694, accuracy: 1000 },
  },

  TW: {
    country: 'TW',
    countryName: 'Taiwan',
    primaryLocale: 'zh-TW',
    languages: ['zh-TW', 'zh', 'en-US'],
    acceptLanguage: 'zh-TW,zh;q=0.9,en-US;q=0.8',
    timezones: ['Asia/Taipei'],
    defaultTimezone: 'Asia/Taipei',
    currency: 'TWD',
    coordinates: { latitude: 25.033, longitude: 121.5654, accuracy: 1000 },
  },

  CN: {
    country: 'CN',
    countryName: 'China',
    primaryLocale: 'zh-CN',
    languages: ['zh-CN', 'zh', 'en-US', 'en'],
    acceptLanguage: 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Asia/Shanghai', 'Asia/Urumqi'],
    defaultTimezone: 'Asia/Shanghai',
    currency: 'CNY',
    coordinates: { latitude: 31.2304, longitude: 121.4737, accuracy: 1000 },
  },

  KR: {
    country: 'KR',
    countryName: 'South Korea',
    primaryLocale: 'ko-KR',
    languages: ['ko-KR', 'ko', 'en-US', 'en'],
    acceptLanguage: 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Asia/Seoul'],
    defaultTimezone: 'Asia/Seoul',
    currency: 'KRW',
    coordinates: { latitude: 37.5665, longitude: 126.978, accuracy: 1000 },
  },

  AU: {
    country: 'AU',
    countryName: 'Australia',
    primaryLocale: 'en-AU',
    languages: ['en-AU', 'en-GB', 'en-US', 'en'],
    acceptLanguage: 'en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: [
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Brisbane',
      'Australia/Perth',
      'Australia/Adelaide',
      'Australia/Hobart',
      'Australia/Darwin',
    ],
    defaultTimezone: 'Australia/Sydney',
    currency: 'AUD',
    coordinates: { latitude: -33.8688, longitude: 151.2093, accuracy: 1000 },
  },

  CA: {
    country: 'CA',
    countryName: 'Canada',
    primaryLocale: 'en-CA',
    languages: ['en-CA', 'en-US', 'en', 'fr-CA'],
    acceptLanguage: 'en-CA,en-US;q=0.9,en;q=0.8,fr-CA;q=0.7',
    timezones: [
      'America/Toronto',
      'America/Vancouver',
      'America/Montreal',
      'America/Edmonton',
      'America/Winnipeg',
      'America/Halifax',
      'America/St_Johns',
    ],
    defaultTimezone: 'America/Toronto',
    currency: 'CAD',
    coordinates: { latitude: 43.6532, longitude: -79.3832, accuracy: 1000 },
  },

  NL: {
    country: 'NL',
    countryName: 'Netherlands',
    primaryLocale: 'nl-NL',
    languages: ['nl-NL', 'nl', 'en-US', 'en'],
    acceptLanguage: 'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Amsterdam'],
    defaultTimezone: 'Europe/Amsterdam',
    currency: 'EUR',
    coordinates: { latitude: 52.3676, longitude: 4.9041, accuracy: 1000 },
  },

  IN: {
    country: 'IN',
    countryName: 'India',
    primaryLocale: 'en-IN',
    languages: ['en-IN', 'en-GB', 'en-US', 'en', 'hi'],
    acceptLanguage: 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6',
    timezones: ['Asia/Kolkata'],
    defaultTimezone: 'Asia/Kolkata',
    currency: 'INR',
    coordinates: { latitude: 28.6139, longitude: 77.209, accuracy: 1000 },
  },

  BR: {
    country: 'BR',
    countryName: 'Brazil',
    primaryLocale: 'pt-BR',
    languages: ['pt-BR', 'pt', 'en-US', 'en'],
    acceptLanguage: 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: [
      'America/Sao_Paulo',
      'America/Fortaleza',
      'America/Manaus',
      'America/Recife',
      'America/Belem',
      'America/Cuiaba',
    ],
    defaultTimezone: 'America/Sao_Paulo',
    currency: 'BRL',
    coordinates: { latitude: -23.5505, longitude: -46.6333, accuracy: 1000 },
  },

  IT: {
    country: 'IT',
    countryName: 'Italy',
    primaryLocale: 'it-IT',
    languages: ['it-IT', 'it', 'en-US', 'en'],
    acceptLanguage: 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Rome'],
    defaultTimezone: 'Europe/Rome',
    currency: 'EUR',
    coordinates: { latitude: 41.9028, longitude: 12.4964, accuracy: 1000 },
  },

  ES: {
    country: 'ES',
    countryName: 'Spain',
    primaryLocale: 'es-ES',
    languages: ['es-ES', 'es', 'en-US', 'en'],
    acceptLanguage: 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Madrid', 'Atlantic/Canary'],
    defaultTimezone: 'Europe/Madrid',
    currency: 'EUR',
    coordinates: { latitude: 40.4168, longitude: -3.7038, accuracy: 1000 },
  },

  RU: {
    country: 'RU',
    countryName: 'Russia',
    primaryLocale: 'ru-RU',
    languages: ['ru-RU', 'ru', 'en-US', 'en'],
    acceptLanguage: 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Moscow', 'Europe/Samara', 'Asia/Yekaterinburg', 'Asia/Novosibirsk', 'Asia/Vladivostok'],
    defaultTimezone: 'Europe/Moscow',
    currency: 'RUB',
    coordinates: { latitude: 55.7558, longitude: 37.6173, accuracy: 1000 },
  },

  MX: {
    country: 'MX',
    countryName: 'Mexico',
    primaryLocale: 'es-MX',
    languages: ['es-MX', 'es', 'en-US', 'en'],
    acceptLanguage: 'es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['America/Mexico_City', 'America/Cancun', 'America/Monterrey', 'America/Tijuana'],
    defaultTimezone: 'America/Mexico_City',
    currency: 'MXN',
    coordinates: { latitude: 19.4326, longitude: -99.1332, accuracy: 1000 },
  },

  ID: {
    country: 'ID',
    countryName: 'Indonesia',
    primaryLocale: 'id-ID',
    languages: ['id-ID', 'id', 'en-US', 'en'],
    acceptLanguage: 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'],
    defaultTimezone: 'Asia/Jakarta',
    currency: 'IDR',
    coordinates: { latitude: -6.2088, longitude: 106.8456, accuracy: 1000 },
  },

  MY: {
    country: 'MY',
    countryName: 'Malaysia',
    primaryLocale: 'ms-MY',
    languages: ['ms-MY', 'ms', 'en-US', 'en'],
    acceptLanguage: 'ms-MY,ms;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Asia/Kuala_Lumpur', 'Asia/Kuching'],
    defaultTimezone: 'Asia/Kuala_Lumpur',
    currency: 'MYR',
    coordinates: { latitude: 3.139, longitude: 101.6869, accuracy: 1000 },
  },

  TH: {
    country: 'TH',
    countryName: 'Thailand',
    primaryLocale: 'th-TH',
    languages: ['th-TH', 'th', 'en-US', 'en'],
    acceptLanguage: 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Asia/Bangkok'],
    defaultTimezone: 'Asia/Bangkok',
    currency: 'THB',
    coordinates: { latitude: 13.7563, longitude: 100.5018, accuracy: 1000 },
  },

  VN: {
    country: 'VN',
    countryName: 'Vietnam',
    primaryLocale: 'vi-VN',
    languages: ['vi-VN', 'vi', 'en-US', 'en'],
    acceptLanguage: 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Asia/Ho_Chi_Minh'],
    defaultTimezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    coordinates: { latitude: 10.8231, longitude: 106.6297, accuracy: 1000 },
  },

  PH: {
    country: 'PH',
    countryName: 'Philippines',
    primaryLocale: 'en-PH',
    languages: ['en-PH', 'en-US', 'en', 'fil'],
    acceptLanguage: 'en-PH,en-US;q=0.9,en;q=0.8,fil;q=0.7',
    timezones: ['Asia/Manila'],
    defaultTimezone: 'Asia/Manila',
    currency: 'PHP',
    coordinates: { latitude: 14.5995, longitude: 120.9842, accuracy: 1000 },
  },

  SE: {
    country: 'SE',
    countryName: 'Sweden',
    primaryLocale: 'sv-SE',
    languages: ['sv-SE', 'sv', 'en-US', 'en'],
    acceptLanguage: 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Stockholm'],
    defaultTimezone: 'Europe/Stockholm',
    currency: 'SEK',
    coordinates: { latitude: 59.3293, longitude: 18.0686, accuracy: 1000 },
  },

  NO: {
    country: 'NO',
    countryName: 'Norway',
    primaryLocale: 'nb-NO',
    languages: ['nb-NO', 'nb', 'nn', 'en-US', 'en'],
    acceptLanguage: 'nb-NO,nb;q=0.9,nn;q=0.8,en-US;q=0.7,en;q=0.6',
    timezones: ['Europe/Oslo'],
    defaultTimezone: 'Europe/Oslo',
    currency: 'NOK',
    coordinates: { latitude: 59.9139, longitude: 10.7522, accuracy: 1000 },
  },

  DK: {
    country: 'DK',
    countryName: 'Denmark',
    primaryLocale: 'da-DK',
    languages: ['da-DK', 'da', 'en-US', 'en'],
    acceptLanguage: 'da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Copenhagen'],
    defaultTimezone: 'Europe/Copenhagen',
    currency: 'DKK',
    coordinates: { latitude: 55.6761, longitude: 12.5683, accuracy: 1000 },
  },

  FI: {
    country: 'FI',
    countryName: 'Finland',
    primaryLocale: 'fi-FI',
    languages: ['fi-FI', 'fi', 'sv-FI', 'en-US', 'en'],
    acceptLanguage: 'fi-FI,fi;q=0.9,sv-FI;q=0.8,en-US;q=0.7,en;q=0.6',
    timezones: ['Europe/Helsinki'],
    defaultTimezone: 'Europe/Helsinki',
    currency: 'EUR',
    coordinates: { latitude: 60.1699, longitude: 24.9384, accuracy: 1000 },
  },

  PL: {
    country: 'PL',
    countryName: 'Poland',
    primaryLocale: 'pl-PL',
    languages: ['pl-PL', 'pl', 'en-US', 'en'],
    acceptLanguage: 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Warsaw'],
    defaultTimezone: 'Europe/Warsaw',
    currency: 'PLN',
    coordinates: { latitude: 52.2297, longitude: 21.0122, accuracy: 1000 },
  },

  CH: {
    country: 'CH',
    countryName: 'Switzerland',
    primaryLocale: 'de-CH',
    languages: ['de-CH', 'fr-CH', 'it-CH', 'en-US', 'en'],
    acceptLanguage: 'de-CH,fr-CH;q=0.9,it-CH;q=0.8,en-US;q=0.7,en;q=0.6',
    timezones: ['Europe/Zurich'],
    defaultTimezone: 'Europe/Zurich',
    currency: 'CHF',
    coordinates: { latitude: 47.3769, longitude: 8.5417, accuracy: 1000 },
  },

  AT: {
    country: 'AT',
    countryName: 'Austria',
    primaryLocale: 'de-AT',
    languages: ['de-AT', 'de', 'en-US', 'en'],
    acceptLanguage: 'de-AT,de;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Vienna'],
    defaultTimezone: 'Europe/Vienna',
    currency: 'EUR',
    coordinates: { latitude: 48.2082, longitude: 16.3738, accuracy: 1000 },
  },

  BE: {
    country: 'BE',
    countryName: 'Belgium',
    primaryLocale: 'nl-BE',
    languages: ['nl-BE', 'fr-BE', 'en-US', 'en'],
    acceptLanguage: 'nl-BE,fr-BE;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Brussels'],
    defaultTimezone: 'Europe/Brussels',
    currency: 'EUR',
    coordinates: { latitude: 50.8503, longitude: 4.3517, accuracy: 1000 },
  },

  IE: {
    country: 'IE',
    countryName: 'Ireland',
    primaryLocale: 'en-IE',
    languages: ['en-IE', 'en-GB', 'en-US', 'en', 'ga'],
    acceptLanguage: 'en-IE,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,ga;q=0.6',
    timezones: ['Europe/Dublin'],
    defaultTimezone: 'Europe/Dublin',
    currency: 'EUR',
    coordinates: { latitude: 53.3498, longitude: -6.2603, accuracy: 1000 },
  },

  NZ: {
    country: 'NZ',
    countryName: 'New Zealand',
    primaryLocale: 'en-NZ',
    languages: ['en-NZ', 'en-GB', 'en-US', 'en'],
    acceptLanguage: 'en-NZ,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Pacific/Auckland', 'Pacific/Chatham'],
    defaultTimezone: 'Pacific/Auckland',
    currency: 'NZD',
    coordinates: { latitude: -36.8485, longitude: 174.7633, accuracy: 1000 },
  },

  TR: {
    country: 'TR',
    countryName: 'Turkey',
    primaryLocale: 'tr-TR',
    languages: ['tr-TR', 'tr', 'en-US', 'en'],
    acceptLanguage: 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Istanbul'],
    defaultTimezone: 'Europe/Istanbul',
    currency: 'TRY',
    coordinates: { latitude: 41.0082, longitude: 28.9784, accuracy: 1000 },
  },

  SA: {
    country: 'SA',
    countryName: 'Saudi Arabia',
    primaryLocale: 'ar-SA',
    languages: ['ar-SA', 'ar', 'en-US', 'en'],
    acceptLanguage: 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Asia/Riyadh'],
    defaultTimezone: 'Asia/Riyadh',
    currency: 'SAR',
    coordinates: { latitude: 24.7136, longitude: 46.6753, accuracy: 1000 },
  },

  AE: {
    country: 'AE',
    countryName: 'United Arab Emirates',
    primaryLocale: 'ar-AE',
    languages: ['ar-AE', 'ar', 'en-US', 'en'],
    acceptLanguage: 'ar-AE,ar;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Asia/Dubai'],
    defaultTimezone: 'Asia/Dubai',
    currency: 'AED',
    coordinates: { latitude: 25.2048, longitude: 55.2708, accuracy: 1000 },
  },

  ZA: {
    country: 'ZA',
    countryName: 'South Africa',
    primaryLocale: 'en-ZA',
    languages: ['en-ZA', 'en-GB', 'en-US', 'en', 'af'],
    acceptLanguage: 'en-ZA,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,af;q=0.6',
    timezones: ['Africa/Johannesburg'],
    defaultTimezone: 'Africa/Johannesburg',
    currency: 'ZAR',
    coordinates: { latitude: -26.2041, longitude: 28.0473, accuracy: 1000 },
  },

  AR: {
    country: 'AR',
    countryName: 'Argentina',
    primaryLocale: 'es-AR',
    languages: ['es-AR', 'es', 'en-US', 'en'],
    acceptLanguage: 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['America/Argentina/Buenos_Aires', 'America/Argentina/Cordoba'],
    defaultTimezone: 'America/Argentina/Buenos_Aires',
    currency: 'ARS',
    coordinates: { latitude: -34.6037, longitude: -58.3816, accuracy: 1000 },
  },

  CL: {
    country: 'CL',
    countryName: 'Chile',
    primaryLocale: 'es-CL',
    languages: ['es-CL', 'es', 'en-US', 'en'],
    acceptLanguage: 'es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['America/Santiago', 'Pacific/Easter'],
    defaultTimezone: 'America/Santiago',
    currency: 'CLP',
    coordinates: { latitude: -33.4489, longitude: -70.6693, accuracy: 1000 },
  },

  CO: {
    country: 'CO',
    countryName: 'Colombia',
    primaryLocale: 'es-CO',
    languages: ['es-CO', 'es', 'en-US', 'en'],
    acceptLanguage: 'es-CO,es;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['America/Bogota'],
    defaultTimezone: 'America/Bogota',
    currency: 'COP',
    coordinates: { latitude: 4.711, longitude: -74.0721, accuracy: 1000 },
  },

  IL: {
    country: 'IL',
    countryName: 'Israel',
    primaryLocale: 'he-IL',
    languages: ['he-IL', 'he', 'en-US', 'en'],
    acceptLanguage: 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Asia/Jerusalem'],
    defaultTimezone: 'Asia/Jerusalem',
    currency: 'ILS',
    coordinates: { latitude: 31.7683, longitude: 35.2137, accuracy: 1000 },
  },

  UA: {
    country: 'UA',
    countryName: 'Ukraine',
    primaryLocale: 'uk-UA',
    languages: ['uk-UA', 'uk', 'en-US', 'en'],
    acceptLanguage: 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Kyiv'],
    defaultTimezone: 'Europe/Kyiv',
    currency: 'UAH',
    coordinates: { latitude: 50.4501, longitude: 30.5234, accuracy: 1000 },
  },

  PT: {
    country: 'PT',
    countryName: 'Portugal',
    primaryLocale: 'pt-PT',
    languages: ['pt-PT', 'pt', 'en-US', 'en'],
    acceptLanguage: 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Lisbon', 'Atlantic/Madeira', 'Atlantic/Azores'],
    defaultTimezone: 'Europe/Lisbon',
    currency: 'EUR',
    coordinates: { latitude: 38.7223, longitude: -9.1393, accuracy: 1000 },
  },

  CZ: {
    country: 'CZ',
    countryName: 'Czech Republic',
    primaryLocale: 'cs-CZ',
    languages: ['cs-CZ', 'cs', 'en-US', 'en'],
    acceptLanguage: 'cs-CZ,cs;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Prague'],
    defaultTimezone: 'Europe/Prague',
    currency: 'CZK',
    coordinates: { latitude: 50.0755, longitude: 14.4378, accuracy: 1000 },
  },

  RO: {
    country: 'RO',
    countryName: 'Romania',
    primaryLocale: 'ro-RO',
    languages: ['ro-RO', 'ro', 'en-US', 'en'],
    acceptLanguage: 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Bucharest'],
    defaultTimezone: 'Europe/Bucharest',
    currency: 'RON',
    coordinates: { latitude: 44.4268, longitude: 26.1025, accuracy: 1000 },
  },

  GR: {
    country: 'GR',
    countryName: 'Greece',
    primaryLocale: 'el-GR',
    languages: ['el-GR', 'el', 'en-US', 'en'],
    acceptLanguage: 'el-GR,el;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Athens'],
    defaultTimezone: 'Europe/Athens',
    currency: 'EUR',
    coordinates: { latitude: 37.9838, longitude: 23.7275, accuracy: 1000 },
  },

  HU: {
    country: 'HU',
    countryName: 'Hungary',
    primaryLocale: 'hu-HU',
    languages: ['hu-HU', 'hu', 'en-US', 'en'],
    acceptLanguage: 'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7',
    timezones: ['Europe/Budapest'],
    defaultTimezone: 'Europe/Budapest',
    currency: 'HUF',
    coordinates: { latitude: 47.4979, longitude: 19.0402, accuracy: 1000 },
  },
};

/**
 * Get country locale configuration with fallback.
 */
export function getCountryConfig(countryCode?: string | null): CountryLocaleConfig {
  if (!countryCode) {
    return COUNTRY_LOCALES[DEFAULT_COUNTRY];
  }
  const normalized = countryCode.trim().toUpperCase();
  return COUNTRY_LOCALES[normalized] || COUNTRY_LOCALES[DEFAULT_COUNTRY];
}

/**
 * Check if a country code is supported in the database.
 */
export function hasCountryConfig(countryCode?: string | null): boolean {
  if (!countryCode) return false;
  return Object.prototype.hasOwnProperty.call(COUNTRY_LOCALES, countryCode.trim().toUpperCase());
}

/**
 * Get all supported ISO country codes.
 */
export function getAllSupportedCountries(): string[] {
  return Object.keys(COUNTRY_LOCALES);
}

/**
 * Strictly format an Accept-Language weighted header string from an array of languages.
 * Example: ['en-US', 'en'] -> 'en-US,en;q=0.9'
 * Example: ['de-DE', 'de', 'en-US', 'en'] -> 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
 */
export function formatAcceptLanguage(languages: string[]): string {
  if (!languages || languages.length === 0) {
    return DEFAULT_ACCEPT_LANGUAGE;
  }

  // Deduplicate preserving order
  const uniqueLangs: string[] = [];
  for (const lang of languages) {
    const trimmed = lang.trim();
    if (trimmed && !uniqueLangs.includes(trimmed)) {
      uniqueLangs.push(trimmed);
    }
  }

  if (uniqueLangs.length === 0) {
    return DEFAULT_ACCEPT_LANGUAGE;
  }

  return uniqueLangs
    .map((lang, index) => {
      if (index === 0) return lang;
      const weight = Math.max(0.1, Number((1 - index * 0.1).toFixed(1)));
      return `${lang};q=${weight}`;
    })
    .join(',');
}

/**
 * Parse an Accept-Language header string into an array of { locale, q } items ordered by weight descending.
 */
export function parseAcceptLanguage(header: string): Array<{ locale: string; q: number }> {
  if (!header || typeof header !== 'string') return [];

  return header
    .split(',')
    .map((part) => {
      const [localePart, ...params] = part.trim().split(';');
      const locale = localePart.trim();
      let q = 1.0;
      for (const param of params) {
        const [key, val] = param.trim().split('=');
        if (key && key.trim() === 'q' && val) {
          const parsed = parseFloat(val.trim());
          if (!isNaN(parsed)) {
            q = parsed;
          }
        }
      }
      return { locale, q };
    })
    .filter((item) => item.locale.length > 0)
    .sort((a, b) => b.q - a.q);
}
