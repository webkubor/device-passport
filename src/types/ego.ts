/**
 * ego-lite account profile types.
 *
 * 🔴 SSOP: shared domain types live here, not inside `src/ego/`.
 *
 * ## Why the proxy is a declared *gap* rather than a feature
 *
 * ego-lite exposes no browser-level proxy configuration:
 *   · there is no `Browser.setProxySettings` in CDP (Chromium has never shipped it),
 *   · ego-lite's native bindings have no proxy setter either — the binding list is
 *     `listProfiles / createTaskSpace / useTaskSpace / closeTaskSpace / listTaskSpaces /
 *      sendCDPMessage / snapshot / createTab / setAgentTaskState / handOffTaskSpace /
 *      takeOverTaskSpace / claimTaskSpace / completeTaskSpace / animations / learnings / helpers`,
 *   · `--proxy-server` is a *launch* flag on the browser process, not a CDP command,
 *     so it cannot be changed after the profile is already running.
 *
 * A proxy therefore has to be bound **outside** the browser: at the OS level
 * (system proxy / TUN / transparent redirect), or by routing the ego-lite process
 * through a local forwarder that owns the upstream proxy.
 *
 * This layer refuses to pretend otherwise. An account profile either carries a
 * declared proxy binding (`ready`) or it does not (`missing-proxy`), and the
 * session plan repeats that state so a caller cannot mistake "no proxy" for
 * "proxy applied".
 */

import type { CdpCommand, CdpInitScript } from './cdp.js'

// ==========================================
// ego-lite profile listing
// ==========================================

/**
 * One browser profile exposed by ego-lite.
 *
 * Mirrors `ego.listProfiles()`: ids are stable locators, display names are not
 * guaranteed to be unique.
 */
export interface EgoProfile {
  /** Stable profile id — the value to pass as `profileId` when creating a task space. */
  id: string
  /** Human-readable display name. Not unique. */
  name: string
  /** Whether this is the browser's default profile. */
  isDefault: boolean
}

/**
 * The slice of the ego-lite global bridge this layer talks to.
 *
 * Deliberately narrow and structural: the layer never imports ego-lite (it is an
 * optional peer dependency, and this package ships zero dependencies). Tests and
 * callers inject their own implementation.
 */
export interface EgoLiteBridge {
  /**
   * List the browser profiles available for new task spaces.
   * Mirrors `ego.listProfiles()`.
   */
  listProfiles(): Promise<EgoProfile[]>
  /**
   * Create (or reuse) a task space bound to a profile.
   * Mirrors `taskSpace(name, { profileId })`.
   *
   * @returns The task space identifier used to select the space later.
   */
  createTaskSpace(name: string, profileId: string): Promise<string>
}

// ==========================================
// Proxy binding
// ==========================================

/**
 * A proxy binding for an account profile.
 *
 * ⚠️ This is a *declaration*, not an applied configuration. ego-lite cannot
 * configure a proxy at the browser layer, so the caller must make this true at
 * the system layer (OS proxy / TUN / local forwarder) before starting a session.
 */
export interface EgoProxyBinding {
  /** Proxy URL, e.g. `http://user:pass@gate.example.com:7000`. */
  url: string
  /** Human-readable description of which egress this binding represents. */
  description: string
  /**
   * ISO 3166-1 alpha-2 country the proxy egresses from, when known.
   * Used to keep the passport's geo context aligned with the exit IP.
   */
  country?: string
}

// ==========================================
// Account profile
// ==========================================

/**
 * Readiness of an account profile for launching a session.
 *
 * - `ready`         — a profile is bound AND a proxy is declared.
 * - `missing-proxy` — a profile is bound, but no proxy is declared.
 * - `missing-profile`— a proxy is declared, but no ego-lite profile is bound.
 *
 * `missing-proxy` exists so that "the browser has no proxy" can never be
 * silently read as "the proxy is in effect".
 */
export type EgoProfileReadiness = 'ready' | 'missing-proxy' | 'missing-profile'

/**
 * The persisted account profile: one account (seed) mapped to a sticky
 * passport, an ego-lite profile binding, and a proxy declaration.
 */
export interface EgoAccountProfile {
  /** The account seed. Same seed ⇒ same sticky passport, forever. */
  seed: string
  /** Id of the persisted passport record (see `DevicePassport.id`). */
  passportId: string
  /** The ego-lite profile this account is bound to. */
  profileId: string
  /** Declared proxy binding, or `null` when the account has no proxy. */
  proxy: EgoProxyBinding | null
  /** ISO 8601 timestamp of the last write. */
  updatedAt: string
}

// ==========================================
// Session plan
// ==========================================

/**
 * The proxy declaration attached to a session plan.
 *
 * `bound: false` means the session will egress directly — the caller must
 * arrange the proxy outside the browser before launching.
 */
export interface EgoProxyDeclaration {
  /** Whether a proxy is declared for this account. */
  bound: boolean
  /** The declared binding, present only when `bound` is true. */
  binding: EgoProxyBinding | null
  /**
   * How the proxy is actually applied, given ego-lite's capability boundary.
   * Always `'system-level'` — the browser layer cannot set it.
   */
  resolution: 'system-level'
  /**
   * Human-readable note telling the operator what to do when `bound` is true,
   * or why it cannot be applied when `bound` is false.
   */
  note: string
}

/**
 * Everything required to start one account session in ego-lite.
 */
export interface EgoSessionPlan {
  /** The account seed this plan belongs to. */
  seed: string
  /** The ego-lite profile the session must run under. */
  profileId: string
  /** Suggested task space name (unique per launch attempt). */
  taskSpaceName: string
  /** Ordered CDP commands — `Page.enable` first, UA override before navigation. */
  commands: CdpCommand[]
  /** Init scripts to install before the first navigation. */
  initScripts: CdpInitScript[]
  /** Canonical HTTP headers for this persona. */
  headers: Record<string, string>
  /** The proxy declaration, with its `bound` state spelled out. */
  proxy: EgoProxyDeclaration
  /** Readiness of the underlying account profile. */
  readiness: EgoProfileReadiness
  /** Whether the session may be launched as-is. */
  launchable: boolean
}
