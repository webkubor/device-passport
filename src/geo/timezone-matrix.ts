/**
 * Timezone Matrix and Chrono-Alignment Engine.
 * Pure TypeScript, zero external dependencies.
 */

import { COUNTRY_LOCALES, DEFAULT_COUNTRY, DEFAULT_TIMEZONE } from './locales.js';

/**
 * Direct mapping from IANA Timezone ID to ISO 3166-1 alpha-2 country code.
 */
export const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // United States
  'America/New_York': 'US',
  'America/Los_Angeles': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'America/Honolulu': 'US',
  'America/Detroit': 'US',
  'America/Indiana/Indianapolis': 'US',
  'America/Boise': 'US',
  'America/Juneau': 'US',
  'America/Adak': 'US',
  'America/Nome': 'US',
  'America/Sitka': 'US',
  'America/Yakutat': 'US',
  'America/Metlakatla': 'US',
  'America/Menominee': 'US',
  'America/Kentucky/Louisville': 'US',
  'America/Kentucky/Monticello': 'US',
  'America/Indiana/Marengo': 'US',
  'America/Indiana/Vincennes': 'US',
  'America/Indiana/Tell_City': 'US',
  'America/Indiana/Petersburg': 'US',
  'America/Indiana/Knox': 'US',
  'America/Indiana/Winamac': 'US',
  'America/Indiana/Vevay': 'US',
  'America/North_Dakota/Center': 'US',
  'America/North_Dakota/New_Salem': 'US',
  'America/North_Dakota/Beulah': 'US',

  // United Kingdom
  'Europe/London': 'GB',

  // Germany
  'Europe/Berlin': 'DE',
  'Europe/Busingen': 'DE',

  // France
  'Europe/Paris': 'FR',

  // Japan
  'Asia/Tokyo': 'JP',

  // Singapore
  'Asia/Singapore': 'SG',

  // Hong Kong
  'Asia/Hong_Kong': 'HK',

  // Taiwan
  'Asia/Taipei': 'TW',

  // China
  'Asia/Shanghai': 'CN',
  'Asia/Urumqi': 'CN',
  'Asia/Chongqing': 'CN',
  'Asia/Harbin': 'CN',
  'Asia/Kashgar': 'CN',

  // South Korea
  'Asia/Seoul': 'KR',

  // Australia
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Australia/Hobart': 'AU',
  'Australia/Darwin': 'AU',
  'Australia/Broken_Hill': 'AU',
  'Australia/Lord_Howe': 'AU',
  'Australia/Lindeman': 'AU',
  'Australia/Eucla': 'AU',

  // Canada
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Montreal': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/St_Johns': 'CA',
  'America/Regina': 'CA',
  'America/Calgary': 'CA',
  'America/Whitehorse': 'CA',
  'America/Dawson': 'CA',
  'America/Yellowknife': 'CA',
  'America/Iqaluit': 'CA',

  // Netherlands
  'Europe/Amsterdam': 'NL',

  // India
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',

  // Brazil
  'America/Sao_Paulo': 'BR',
  'America/Fortaleza': 'BR',
  'America/Manaus': 'BR',
  'America/Recife': 'BR',
  'America/Belem': 'BR',
  'America/Cuiaba': 'BR',
  'America/Porto_Velho': 'BR',
  'America/Boa_Vista': 'BR',
  'America/Rio_Branco': 'BR',
  'America/Campo_Grande': 'BR',
  'America/Maceio': 'BR',
  'America/Araguaina': 'BR',
  'America/Santarem': 'BR',
  'America/Noronha': 'BR',

  // Italy
  'Europe/Rome': 'IT',

  // Spain
  'Europe/Madrid': 'ES',
  'Atlantic/Canary': 'ES',
  'Africa/Ceuta': 'ES',

  // Russia
  'Europe/Moscow': 'RU',
  'Europe/Samara': 'RU',
  'Europe/Kaliningrad': 'RU',
  'Asia/Yekaterinburg': 'RU',
  'Asia/Novosibirsk': 'RU',
  'Asia/Krasnoyarsk': 'RU',
  'Asia/Irkutsk': 'RU',
  'Asia/Yakutsk': 'RU',
  'Asia/Vladivostok': 'RU',
  'Asia/Magadan': 'RU',
  'Asia/Kamchatka': 'RU',

  // Mexico
  'America/Mexico_City': 'MX',
  'America/Cancun': 'MX',
  'America/Monterrey': 'MX',
  'America/Tijuana': 'MX',
  'America/Hermosillo': 'MX',
  'America/Chihuahua': 'MX',
  'America/Mazatlan': 'MX',
  'America/Merida': 'MX',

  // Indonesia
  'Asia/Jakarta': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Jayapura': 'ID',
  'Asia/Pontianak': 'ID',

  // Malaysia
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kuching': 'MY',

  // Thailand
  'Asia/Bangkok': 'TH',

  // Vietnam
  'Asia/Ho_Chi_Minh': 'VN',

  // Philippines
  'Asia/Manila': 'PH',

  // Sweden
  'Europe/Stockholm': 'SE',

  // Norway
  'Europe/Oslo': 'NO',

  // Denmark
  'Europe/Copenhagen': 'DK',

  // Finland
  'Europe/Helsinki': 'FI',

  // Poland
  'Europe/Warsaw': 'PL',

  // Switzerland
  'Europe/Zurich': 'CH',

  // Austria
  'Europe/Vienna': 'AT',

  // Belgium
  'Europe/Brussels': 'BE',

  // Ireland
  'Europe/Dublin': 'IE',

  // New Zealand
  'Pacific/Auckland': 'NZ',
  'Pacific/Chatham': 'NZ',

  // Turkey
  'Europe/Istanbul': 'TR',

  // Saudi Arabia
  'Asia/Riyadh': 'SA',

  // United Arab Emirates
  'Asia/Dubai': 'AE',

  // South Africa
  'Africa/Johannesburg': 'ZA',

  // Argentina
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Argentina/Cordoba': 'AR',
  'America/Argentina/Salta': 'AR',
  'America/Argentina/Jujuy': 'AR',
  'America/Argentina/Tucuman': 'AR',
  'America/Argentina/Catamarca': 'AR',
  'America/Argentina/La_Rioja': 'AR',
  'America/Argentina/San_Juan': 'AR',
  'America/Argentina/Mendoza': 'AR',
  'America/Argentina/San_Luis': 'AR',
  'America/Argentina/Rio_Gallegos': 'AR',
  'America/Argentina/Ushuaia': 'AR',

  // Chile
  'America/Santiago': 'CL',
  'America/Punta_Arenas': 'CL',
  'Pacific/Easter': 'CL',

  // Colombia
  'America/Bogota': 'CO',

  // Israel
  'Asia/Jerusalem': 'IL',

  // Ukraine
  'Europe/Kyiv': 'UA',

  // Portugal
  'Europe/Lisbon': 'PT',
  'Atlantic/Madeira': 'PT',
  'Atlantic/Azores': 'PT',

  // Czech Republic
  'Europe/Prague': 'CZ',

  // Romania
  'Europe/Bucharest': 'RO',

  // Greece
  'Europe/Athens': 'GR',

  // Hungary
  'Europe/Budapest': 'HU',
};

/**
 * Validate if a timezone string is a valid IANA timezone identifier.
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }
  const trimmed = timezone.trim();
  if (trimmed.length === 0) {
    return false;
  }

  // Fast-path lookup
  if (TIMEZONE_TO_COUNTRY[trimmed]) {
    return true;
  }

  // Fallback to Intl engine validation
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all supported timezones for a specific country code.
 */
export function getTimezonesForCountry(countryCode: string): string[] {
  if (!countryCode) return [DEFAULT_TIMEZONE];
  const normalized = countryCode.trim().toUpperCase();
  const config = COUNTRY_LOCALES[normalized];
  if (config && config.timezones && config.timezones.length > 0) {
    return [...config.timezones];
  }
  // Search in TIMEZONE_TO_COUNTRY
  const matched = Object.entries(TIMEZONE_TO_COUNTRY)
    .filter(([_, cc]) => cc === normalized)
    .map(([tz]) => tz);

  return matched.length > 0 ? matched : [DEFAULT_TIMEZONE];
}

/**
 * Look up the ISO country code associated with an IANA timezone identifier.
 */
export function getCountryForTimezone(timezone: string): string | undefined {
  if (!timezone) return undefined;
  const trimmed = timezone.trim();
  return TIMEZONE_TO_COUNTRY[trimmed];
}

/**
 * Get the primary/default timezone for a country code.
 */
export function getDefaultTimezoneForCountry(countryCode: string): string {
  if (!countryCode) return DEFAULT_TIMEZONE;
  const normalized = countryCode.trim().toUpperCase();
  const config = COUNTRY_LOCALES[normalized];
  if (config && config.defaultTimezone) {
    return config.defaultTimezone;
  }
  const countryTzs = getTimezonesForCountry(normalized);
  return countryTzs[0] || DEFAULT_TIMEZONE;
}

/**
 * Check if a timezone is chronologically aligned with a given country.
 */
export function isTimezoneAlignedWithCountry(timezone: string, countryCode: string): boolean {
  if (!timezone || !countryCode) return false;
  const normalized = countryCode.trim().toUpperCase();
  const mappedCountry = getCountryForTimezone(timezone);
  if (mappedCountry === normalized) {
    return true;
  }
  const countryTzs = getTimezonesForCountry(normalized);
  return countryTzs.includes(timezone.trim());
}

/**
 * Calculate timezone offset in minutes relative to UTC.
 * Note: Following the standard convention matching LocaleProfile.timezoneOffset:
 * - Negative for zones west of UTC (e.g. -240 for EDT, -300 for EST)
 * - Positive for zones east of UTC (e.g. +480 for CST / Asia/Shanghai, +540 for JST)
 * - 0 for UTC
 */
export function getTimezoneOffsetMinutes(timezone: string, date: Date = new Date()): number {
  if (!timezone || !isValidTimezone(timezone)) {
    return 0;
  }
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  } catch {
    return 0;
  }
}

/**
 * List all unique timezones known to the system.
 */
export function listAllTimezones(): string[] {
  return Object.keys(TIMEZONE_TO_COUNTRY);
}
