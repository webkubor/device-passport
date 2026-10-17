import type { DevicePassport } from '../types/index.js'

/**
 * Standard Chromium browser header ordering.
 * Anti-bot systems (Cloudflare, Akamai, DataDome, Kasada) strictly inspect
 * the sequence of HTTP request headers. A mismatch in header order triggers
 * immediate bot heuristics.
 */
export const CANONICAL_HEADER_ORDER: readonly string[] = [
  // HTTP/2 Pseudo-headers (if provided)
  ':method',
  ':authority',
  ':scheme',
  ':path',

  // Client Hints block (low-entropy)
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',

  // Upgrade requests
  'upgrade-insecure-requests',

  // User-Agent
  'user-agent',

  // Accept
  'accept',

  // Sec-Fetch-* metadata block
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-user',
  'sec-fetch-dest',

  // Client Hints high-entropy hints
  'sec-ch-ua-arch',
  'sec-ch-ua-bitness',
  'sec-ch-ua-model',
  'sec-ch-ua-platform-version',
  'sec-ch-ua-full-version-list',
  'sec-ch-ua-wow64',

  // Navigation context
  'referer',
  'origin',

  // Encoding & Localization
  'accept-encoding',
  'accept-language',

  // Chromium priority hint
  'priority',

  // Stateful session headers
  'cookie',
  'authorization',
  'connection',
  'cache-control',
  'pragma',
]

/**
 * Sorts and formats HTTP headers according to canonical browser ordering.
 * Merges base headers with optional overrides.
 */
export function formatCanonicalHeaders(
  baseHeaders: Record<string, string>,
  overrides?: Record<string, string>,
): Record<string, string> {
  // Normalize base and overrides into lowercase keys
  const merged: Record<string, string> = {}

  for (const [key, val] of Object.entries(baseHeaders)) {
    if (val !== undefined && val !== null) {
      merged[key.toLowerCase()] = String(val)
    }
  }

  if (overrides) {
    for (const [key, val] of Object.entries(overrides)) {
      if (val !== undefined && val !== null) {
        merged[key.toLowerCase()] = String(val)
      }
    }
  }

  // Create an ordered map preserving canonical insertion order
  const ordered: Record<string, string> = {}

  // 1. First add known headers in canonical order
  for (const canonicalKey of CANONICAL_HEADER_ORDER) {
    if (canonicalKey in merged) {
      ordered[canonicalKey] = merged[canonicalKey]
      delete merged[canonicalKey]
    }
  }

  // 2. Append any remaining custom headers
  for (const [remainingKey, val] of Object.entries(merged)) {
    ordered[remainingKey] = val
  }

  return ordered
}

export interface PassportLike {
  headers: Record<string, string>
  getHeaders?: (overrides?: Record<string, string>) => Record<string, string>
}

/**
 * Normalizes headers from various input formats (Headers instance, Array, Record)
 * into a plain Record<string, string>.
 */
function normalizeHeadersInput(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {}

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const res: Record<string, string> = {}
    headers.forEach((val, key) => {
      res[key] = val
    })
    return res
  }

  if (Array.isArray(headers)) {
    const res: Record<string, string> = {}
    for (const [k, v] of headers) {
      res[k] = v
    }
    return res
  }

  return { ...(headers as Record<string, string>) }
}

/**
 * Higher-order fetch function wrapping standard fetch with canonical DevicePassport headers.
 * Ensures consistent TLS/HTTP persona across API calls, scraping requests, and webhooks.
 *
 * @param passport DevicePassport instance or object
 * @param customFetch Optional fetch implementation (e.g. node-fetch, undici, or global fetch)
 */
export function withPassport(
  passport: PassportLike | DevicePassport,
  customFetch?: typeof fetch,
): typeof fetch {
  const fetchImpl = customFetch ?? (typeof globalThis.fetch !== 'undefined' ? globalThis.fetch : undefined)

  if (!fetchImpl) {
    throw new Error(
      '[device-passport] Global fetch is not available. Please pass a custom fetch implementation to withPassport(passport, customFetch).',
    )
  }

  return async function passportFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const explicitHeaders = normalizeHeadersInput(init?.headers)

    // Resolve canonical headers from passport
    const canonicalHeaders = typeof passport.getHeaders === 'function'
      ? passport.getHeaders(explicitHeaders)
      : formatCanonicalHeaders(passport.headers, explicitHeaders)

    // Handle Request object as input
    if (typeof Request !== 'undefined' && input instanceof Request) {
      const requestHeaders = normalizeHeadersInput(input.headers)
      const mergedHeaders = formatCanonicalHeaders(canonicalHeaders, requestHeaders)

      const clonedInit: RequestInit = {
        ...init,
        headers: mergedHeaders,
      }
      return fetchImpl(input, clonedInit)
    }

    return fetchImpl(input, {
      ...init,
      headers: canonicalHeaders,
    })
  } as typeof fetch
}

/**
 * Generates an executable cURL command with correct browser headers.
 */
export function toCurl(
  passport: PassportLike | DevicePassport,
  url: string,
  options?: {
    method?: string
    data?: any
    headers?: Record<string, string>
  },
): string {
  const method = options?.method?.toUpperCase() ?? 'GET'
  const explicitHeaders = options?.headers ?? {}
  const canonicalHeaders = typeof passport.getHeaders === 'function'
    ? passport.getHeaders(explicitHeaders)
    : formatCanonicalHeaders(passport.headers, explicitHeaders)

  const parts: string[] = ['curl', '-sSL']

  if (method !== 'GET') {
    parts.push(`-X ${method}`)
  }

  parts.push(`'${url}'`)

  for (const [k, v] of Object.entries(canonicalHeaders)) {
    // Escape single quotes in header values
    const safeVal = String(v).replace(/'/g, `'\\''`)
    parts.push(`-H '${k}: ${safeVal}'`)
  }

  if (options?.data) {
    const payload = typeof options.data === 'string'
      ? options.data
      : JSON.stringify(options.data)
    parts.push(`--data '${payload.replace(/'/g, `'\\''`)}'`)
  }

  return parts.join(' \\\n  ')
}
