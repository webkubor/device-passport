/**
 * Session plan builder for ego-lite.
 *
 * Turns one account profile into everything needed to launch a session:
 * the ordered CDP command sequence, the init scripts, the canonical headers,
 * the ego-lite profile id, and an explicit proxy declaration.
 *
 * The proxy declaration is the important part: ego-lite cannot set a proxy at the
 * browser layer, so the plan states plainly whether a proxy is declared and that
 * it must be arranged outside the browser.
 */

import { getCdpPlan } from '../adapters/cdp.js'
import type {
  DevicePassport,
  EgoAccountProfile,
  EgoProfileReadiness,
  EgoProxyDeclaration,
  EgoSessionPlan,
} from '../types/index.js'

/**
 * How the proxy is resolved for every ego-lite session.
 *
 * ego-lite exposes no proxy API (no `Browser.setProxySettings` in CDP, no proxy
 * setter among its native bindings), and `--proxy-server` is a browser *launch*
 * flag rather than a CDP command. A proxy must therefore be bound outside the
 * browser: OS-level proxy, TUN/transparent redirect, or a local forwarder in
 * front of the ego-lite process.
 */
export const PROXY_RESOLUTION_NOTE =
  'ego-lite cannot configure a proxy at the browser layer: CDP has no Browser.setProxySettings ' +
  'and ego-lite exposes no proxy API. Bind this proxy at the system level (OS proxy / TUN / ' +
  'local forwarder in front of the ego-lite process) before launching the session.'

/**
 * The note used when an account has no proxy declared at all.
 */
export const PROXY_MISSING_NOTE =
  'No proxy is declared for this account, so the session will egress directly. ' +
  'ego-lite cannot add a proxy later at the browser layer — either declare one on the ' +
  'account profile or route the whole ego-lite process through a system-level proxy.'

/**
 * Computes the readiness of an account profile.
 *
 * `ready` requires *both* a bound ego-lite profile and a declared proxy.
 */
export function getProfileReadiness(profile: EgoAccountProfile): EgoProfileReadiness {
  if (!profile.profileId) {
    return 'missing-profile'
  }
  if (!profile.proxy) {
    return 'missing-proxy'
  }
  return 'ready'
}

/**
 * Builds the proxy declaration for an account profile.
 */
export function buildProxyDeclaration(profile: EgoAccountProfile): EgoProxyDeclaration {
  if (profile.proxy) {
    return {
      bound: true,
      binding: profile.proxy,
      resolution: 'system-level',
      note: PROXY_RESOLUTION_NOTE,
    }
  }
  return {
    bound: false,
    binding: null,
    resolution: 'system-level',
    note: PROXY_MISSING_NOTE,
  }
}

/**
 * Options for {@link buildEgoSessionPlan}.
 */
export interface BuildEgoSessionPlanOptions {
  /** Optional task space name. Defaults to a name derived from the seed. */
  taskSpaceName?: string
  /** Optional CDP session id to attach to every command. */
  sessionId?: string
}

/**
 * Builds the complete launch plan for one account session.
 *
 * Command order is inherited from {@link getCdpPlan} and is load-bearing:
 * `Page.enable` comes first (without it the init script is accepted but never
 * runs), the user-agent override precedes navigation, and the init script is
 * installed last so it is in place before the first document is created.
 *
 * The profile id has exactly one source: the persisted account record. Accepting
 * a second, caller-supplied profile id would let the plan's profile id and its
 * readiness disagree, and a caller could end up launching a session under a
 * profile that was never validated.
 *
 * @param passport The sticky passport for the account.
 * @param profile The persisted account profile (supplies the profile id and the
 *   proxy declaration).
 * @param options Task space name and session id.
 */
export function buildEgoSessionPlan(
  passport: DevicePassport,
  profile: EgoAccountProfile,
  options: BuildEgoSessionPlanOptions = {},
): EgoSessionPlan {
  const cdpPlan = getCdpPlan(passport, options.sessionId)
  const readiness = getProfileReadiness(profile)
  const proxy = buildProxyDeclaration(profile)

  return {
    seed: profile.seed,
    profileId: profile.profileId,
    taskSpaceName: options.taskSpaceName ?? defaultTaskSpaceName(profile.seed),
    ...cdpPlan,
    proxy,
    readiness,
    launchable: readiness === 'ready',
  }
}

/**
 * Builds the default task space name for a seed.
 *
 * Task space names must be unique per launch, so callers normally append a
 * timestamp or counter. The default is stable enough to be recognizable.
 */
export function defaultTaskSpaceName(seed: string): string {
  return `dp-${seed}`
}
