/**
 * ego-lite bridge adapters.
 *
 * 🔴 Why this exists:
 *   ego-lite is the author's own agent browser. It runs on the local machine and is
 *   driven through the `ego-browser` CLI's nodejs heredoc mode. This package must not
 *   depend on ego-lite (it ships zero dependencies), so the ego-lite specific API is
 *   described structurally and injected from the outside.
 *
 * The capability boundary this module encodes — verified against ego-lite's own
 * source, not guessed:
 *   · `listProfiles` exists and lists browser profiles.
 *   · `createTaskSpace` / `useTaskSpace` accept a `profileId`.
 *   · There is **no** proxy API: no `Browser.setProxySettings` in CDP, and no proxy
 *     setter among ego-lite's native bindings.
 *   · `page.cdp(method, params)` can send arbitrary CDP commands.
 */

import type { EgoLiteBridge, EgoProfile } from '../types/index.js'

/**
 * The minimal shape of the ego-lite global object this bridge uses.
 *
 * Matches ego-lite's native binding names exactly, so `globalThis.ego` satisfies it
 * structurally without importing ego-lite.
 */
export interface EgoNativeBridge {
  /** Lists the browser profiles available for new task spaces. */
  listProfiles?(): Promise<{ profiles?: EgoProfile[] } | EgoProfile[]>
  /** Creates a task space, optionally bound to a browser profile. */
  createTaskSpace?(name: string, profileId?: string): Promise<unknown>
}

/**
 * Reads the ego-lite native bridge from the global scope.
 *
 * @returns The native bridge, or `null` when ego-lite is not present.
 */
export function getEgoNativeBridge(scope: unknown = globalThis): EgoNativeBridge | null {
  if (!scope || typeof scope !== 'object') {
    return null
  }
  const candidate = (scope as { ego?: unknown }).ego
  if (!candidate || typeof candidate !== 'object') {
    return null
  }
  return candidate as EgoNativeBridge
}

/**
 * Builds an {@link EgoLiteBridge} on top of the ego-lite native bindings.
 *
 * @param native The native bridge. Defaults to `globalThis.ego`.
 * @throws When ego-lite is unavailable or lacks a required binding.
 */
export function createEgoBridge(native: EgoNativeBridge | null = getEgoNativeBridge()): EgoLiteBridge {
  if (!native) {
    throw new Error(
      '[ego] ego-lite native bridge not found. Run inside the ego-browser CLI nodejs heredoc mode.',
    )
  }

  return {
    async listProfiles(): Promise<EgoProfile[]> {
      if (typeof native.listProfiles !== 'function') {
        throw new Error('[ego] ego.listProfiles is not available')
      }
      const result = await native.listProfiles()
      const profiles = Array.isArray(result) ? result : result?.profiles
      if (!Array.isArray(profiles)) {
        throw new Error('[ego] ego.listProfiles returned no profiles array')
      }
      return profiles
    },

    async createTaskSpace(name: string, profileId: string): Promise<string> {
      if (typeof native.createTaskSpace !== 'function') {
        throw new Error('[ego] ego.createTaskSpace is not available')
      }
      const result = await native.createTaskSpace(name, profileId)
      return normalizeTaskSpaceId(result, name)
    },
  }
}

/**
 * Extracts a task space identifier from the several shapes ego-lite may return.
 *
 * Mirrors ego-lite's own normalization order (`taskId ?? name ?? id`): the string
 * `taskId` is the stable locator, while the numeric `id` selects the space for
 * native calls. Either is accepted here.
 */
function normalizeTaskSpaceId(result: unknown, name: string): string {
  if (typeof result === 'string' && result.length > 0) {
    return result
  }
  if (typeof result === 'number' && Number.isFinite(result)) {
    return String(result)
  }
  if (result && typeof result === 'object') {
    const record = result as { taskId?: unknown; id?: unknown; name?: unknown }
    for (const key of ['taskId', 'id', 'name'] as const) {
      const value = record[key]
      if (typeof value === 'string' && value.length > 0) {
        return value
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value)
      }
    }
  }
  throw new Error(`[ego] could not resolve task space id for ${name}`)
}
