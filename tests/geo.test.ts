import { describe, expect, test } from 'bun:test';
import {
  COUNTRY_LOCALES,
  DEFAULT_COUNTRY,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  DEFAULT_ACCEPT_LANGUAGE,
  getCountryConfig,
  formatAcceptLanguage,
  parseAcceptLanguage,
  isValidTimezone,
  getTimezonesForCountry,
  getCountryForTimezone,
  getDefaultTimezoneForCountry,
  getTimezoneOffsetMinutes,
  isTimezoneAlignedWithCountry,
  detectCountry,
  extractCountryFromProxyUrl,
  normalizeCountryCode,
  alignGeoContext,
  isGeoAligned,
} from '../src/geo/index.js';

describe('Geographic-Locale Mapping Database', () => {
  test('US configuration adheres strictly to requirements', () => {
    const us = COUNTRY_LOCALES.US;
    expect(us).toBeDefined();
    expect(us.acceptLanguage).toBe('en-US,en;q=0.9');
    expect(us.timezones).toContain('America/New_York');
    expect(us.timezones).toContain('America/Los_Angeles');
    expect(us.timezones).toContain('America/Chicago');
    expect(us.languages).toEqual(['en-US', 'en']);
    expect(us.primaryLocale).toBe('en-US');
  });

  test('GB configuration adheres strictly to requirements', () => {
    const gb = COUNTRY_LOCALES.GB;
    expect(gb).toBeDefined();
    expect(gb.acceptLanguage).toBe('en-GB,en-US;q=0.9,en;q=0.8');
    expect(gb.defaultTimezone).toBe('Europe/London');
    expect(gb.primaryLocale).toBe('en-GB');
  });

  test('DE configuration adheres strictly to requirements', () => {
    const de = COUNTRY_LOCALES.DE;
    expect(de).toBeDefined();
    expect(de.acceptLanguage).toBe('de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7');
    expect(de.defaultTimezone).toBe('Europe/Berlin');
    expect(de.primaryLocale).toBe('de-DE');
  });

  test('FR configuration adheres strictly to requirements', () => {
    const fr = COUNTRY_LOCALES.FR;
    expect(fr).toBeDefined();
    expect(fr.acceptLanguage).toBe('fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');
    expect(fr.defaultTimezone).toBe('Europe/Paris');
    expect(fr.primaryLocale).toBe('fr-FR');
  });

  test('JP configuration adheres strictly to requirements', () => {
    const jp = COUNTRY_LOCALES.JP;
    expect(jp).toBeDefined();
    expect(jp.acceptLanguage).toBe('ja-JP,ja;q=0.9,en-US;q=0.8');
    expect(jp.defaultTimezone).toBe('Asia/Tokyo');
    expect(jp.primaryLocale).toBe('ja-JP');
  });

  test('SG configuration adheres strictly to requirements', () => {
    const sg = COUNTRY_LOCALES.SG;
    expect(sg).toBeDefined();
    expect(sg.acceptLanguage).toBe('en-SG,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7');
    expect(sg.defaultTimezone).toBe('Asia/Singapore');
    expect(sg.primaryLocale).toBe('en-SG');
  });

  test('HK configuration adheres strictly to requirements', () => {
    const hk = COUNTRY_LOCALES.HK;
    expect(hk).toBeDefined();
    expect(hk.acceptLanguage).toBe('zh-HK,zh-TW;q=0.9,zh;q=0.8,en-US;q=0.7');
    expect(hk.defaultTimezone).toBe('Asia/Hong_Kong');
    expect(hk.primaryLocale).toBe('zh-HK');
  });

  test('TW configuration adheres strictly to requirements', () => {
    const tw = COUNTRY_LOCALES.TW;
    expect(tw).toBeDefined();
    expect(tw.acceptLanguage).toBe('zh-TW,zh;q=0.9,en-US;q=0.8');
    expect(tw.defaultTimezone).toBe('Asia/Taipei');
    expect(tw.primaryLocale).toBe('zh-TW');
  });

  test('CN configuration adheres strictly to requirements', () => {
    const cn = COUNTRY_LOCALES.CN;
    expect(cn).toBeDefined();
    expect(cn.acceptLanguage).toBe('zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7');
    expect(cn.defaultTimezone).toBe('Asia/Shanghai');
    expect(cn.primaryLocale).toBe('zh-CN');
  });

  test('Additional key countries KR, AU, CA, NL, IN, BR are covered', () => {
    const countries = ['KR', 'AU', 'CA', 'NL', 'IN', 'BR'];
    for (const code of countries) {
      const cfg = COUNTRY_LOCALES[code];
      expect(cfg).toBeDefined();
      expect(cfg.primaryLocale).toBeTruthy();
      expect(cfg.acceptLanguage).toBeTruthy();
      expect(cfg.defaultTimezone).toBeTruthy();
      expect(cfg.languages.length).toBeGreaterThan(0);
    }
  });

  test('formatAcceptLanguage and parseAcceptLanguage work reciprocally', () => {
    const langs = ['en-US', 'en'];
    const formatted = formatAcceptLanguage(langs);
    expect(formatted).toBe('en-US,en;q=0.9');

    const parsed = parseAcceptLanguage(formatted);
    expect(parsed[0].locale).toBe('en-US');
    expect(parsed[0].q).toBe(1.0);
    expect(parsed[1].locale).toBe('en');
    expect(parsed[1].q).toBe(0.9);
  });
});

describe('Timezone Matrix and Chrono-Alignment', () => {
  test('validates valid and invalid timezones', () => {
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('Asia/Tokyo')).toBe(true);
    expect(isValidTimezone('Europe/London')).toBe(true);
    expect(isValidTimezone('Mars/Olympus_Mons')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
  });

  test('retrieves timezones for countries', () => {
    const usTimezones = getTimezonesForCountry('US');
    expect(usTimezones).toContain('America/New_York');
    expect(usTimezones).toContain('America/Los_Angeles');

    const jpTimezones = getTimezonesForCountry('JP');
    expect(jpTimezones).toEqual(['Asia/Tokyo']);
  });

  test('maps timezone to country code', () => {
    expect(getCountryForTimezone('America/New_York')).toBe('US');
    expect(getCountryForTimezone('Asia/Tokyo')).toBe('JP');
    expect(getCountryForTimezone('Europe/Paris')).toBe('FR');
  });

  test('checks alignment between timezone and country', () => {
    expect(isTimezoneAlignedWithCountry('America/Chicago', 'US')).toBe(true);
    expect(isTimezoneAlignedWithCountry('Asia/Tokyo', 'US')).toBe(false);
    expect(isTimezoneAlignedWithCountry('Europe/Berlin', 'DE')).toBe(true);
  });

  test('calculates correct timezone offset minutes relative to UTC', () => {
    const tokyoOffset = getTimezoneOffsetMinutes('Asia/Tokyo');
    expect(tokyoOffset).toBe(540); // UTC+9 = +540 min

    const shanghaiOffset = getTimezoneOffsetMinutes('Asia/Shanghai');
    expect(shanghaiOffset).toBe(480); // UTC+8 = +480 min

    const utcOffset = getTimezoneOffsetMinutes('UTC');
    expect(utcOffset).toBe(0);
  });
});

describe('Proxy / IP Geo Detector', () => {
  test('extracts country code from username tokens in residential proxy URLs', () => {
    expect(extractCountryFromProxyUrl('http://user-country-us:pass@proxy.example.com:8080')).toBe('US');
    expect(extractCountryFromProxyUrl('socks5://customer-zone-cc-DE:secret@pr.oxylabs.io:7777')).toBe('DE');
    expect(extractCountryFromProxyUrl('http://lum-customer-hl_123-zone-residential-country-fr:pass@zproxy.lum-superproxy.io:22225')).toBe('FR');
    expect(extractCountryFromProxyUrl('http://package-123_country_au:pass@proxy.soax.com:9000')).toBe('AU');
    expect(extractCountryFromProxyUrl('http://user-country-cn-city-shanghai:pass@gateway:80')).toBe('CN');
  });

  test('extracts country code from query parameters', () => {
    expect(extractCountryFromProxyUrl('http://proxy.example.com:8080?country=JP')).toBe('JP');
    expect(extractCountryFromProxyUrl('https://proxy.com:8080?country_code=kr')).toBe('KR');
    expect(extractCountryFromProxyUrl('http://gate.proxyempire.io:5000?cc=SG')).toBe('SG');
    expect(extractCountryFromProxyUrl('http://user:pass@proxy.example.com:8080?geo=in')).toBe('IN');
  });

  test('extracts country code from subdomains', () => {
    expect(extractCountryFromProxyUrl('http://user:password@us.residential-proxy.example.com:1000')).toBe('US');
    expect(extractCountryFromProxyUrl('http://user:password@uk.residential-proxy.example.com:1000')).toBe('GB');
  });

  test('normalizes ISO country codes and aliases', () => {
    expect(normalizeCountryCode('US')).toBe('US');
    expect(normalizeCountryCode('jp')).toBe('JP');
    expect(normalizeCountryCode('UK')).toBe('GB');
    expect(normalizeCountryCode('GBR')).toBe('GB');
    expect(normalizeCountryCode('DEU')).toBe('DE');
    expect(normalizeCountryCode('Japan')).toBe('JP');
    expect(normalizeCountryCode('United States')).toBe('US');
  });

  test('detectCountry falls back to global default (US) when unknown', () => {
    expect(detectCountry(undefined)).toBe('US');
    expect(detectCountry(null)).toBe('US');
    expect(detectCountry('')).toBe('US');
    expect(detectCountry('unknown-gibberish-string')).toBe('US');
    expect(detectCountry('unknown', { fallbackCountry: 'DE' })).toBe('DE');
  });

  test('detectCountry accepts timezone inputs', () => {
    expect(detectCountry('Asia/Tokyo')).toBe('JP');
    expect(detectCountry('America/Los_Angeles')).toBe('US');
    expect(detectCountry('Europe/Paris')).toBe('FR');
  });
});

describe('Geo-Chrono Aligner', () => {
  test('alignGeoContext without arguments returns default US context', () => {
    const geo = alignGeoContext();
    expect(geo.country).toBe('US');
    expect(geo.timezone).toBe('America/New_York');
    expect(geo.locale).toBe('en-US');
    expect(geo.acceptLanguage).toBe('en-US,en;q=0.9');
    expect(geo.languages).toEqual(['en-US', 'en']);
    expect(geo.currency).toBe('USD');
    expect(typeof geo.timezoneOffset).toBe('number');
  });

  test('alignGeoContext with ISO string returns fully aligned context', () => {
    const geoJP = alignGeoContext('JP');
    expect(geoJP.country).toBe('JP');
    expect(geoJP.timezone).toBe('Asia/Tokyo');
    expect(geoJP.locale).toBe('ja-JP');
    expect(geoJP.acceptLanguage).toBe('ja-JP,ja;q=0.9,en-US;q=0.8');
    expect(geoJP.languages).toEqual(['ja-JP', 'ja', 'en-US']);
  });

  test('alignGeoContext with residential proxy URL extracts and aligns correctly', () => {
    const geo = alignGeoContext('http://user-country-de:{{EMAIL_h5x1116r}}:8080');
    expect(geo.country).toBe('DE');
    expect(geo.timezone).toBe('Europe/Berlin');
    expect(geo.locale).toBe('de-DE');
    expect(geo.acceptLanguage).toBe('de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7');
  });

  test('alignGeoContext with GeoOptions respects explicit overrides', () => {
    const geo = alignGeoContext({
      country: 'US',
      timezone: 'America/Los_Angeles',
      locale: 'en-US',
      languages: ['en-US', 'es'],
    });

    expect(geo.country).toBe('US');
    expect(geo.timezone).toBe('America/Los_Angeles');
    expect(geo.locale).toBe('en-US');
    expect(geo.languages).toEqual(['en-US', 'es']);
    expect(geo.acceptLanguage).toBe('en-US,es;q=0.9');
  });

  test('isGeoAligned validates consistency and flags contradictions', () => {
    expect(isGeoAligned({ country: 'US', timezone: 'America/New_York', locale: 'en-US' })).toBe(true);
    expect(isGeoAligned({ country: 'JP', timezone: 'Asia/Tokyo', locale: 'ja-JP' })).toBe(true);

    // Contradiction: US country with Tokyo timezone
    expect(isGeoAligned({ country: 'US', timezone: 'Asia/Tokyo' })).toBe(false);

    // Contradiction: JP country with German locale
    expect(isGeoAligned({ country: 'JP', locale: 'de-DE' })).toBe(false);
  });
});
