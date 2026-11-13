/**
 * Account profile manager for ego-lite.
 *
 * Maps one account (seed) onto three things that must travel together:
 *   1. a **sticky passport** — same seed ⇒ same persona, forever (via `PassportManager`),
 *   2. an **ego-lite profile binding** (`profileId`) — the browser profile whose
 *      cookies and login state persist across task spaces,
 *   3. a **proxy declaration** — recorded, but never applied at the browser layer.
 *
 * The proxy is a declared *gap*, not a feature: ego-lite has no browser-level proxy
 * API, so the profile either has a proxy declared (and the operator must bind it at
 * the system level) or it does not, and the manager reports `missing-proxy` so
 * nobody mistakes "no proxy" for "proxy applied".
 */

import { PassportManager } from '../manager.js'
import type { PassportManagerOptions } from '../manager.js'
import { DevicePassportInstance } from '../passport.js'
import { MemoryStorage } from '../storage/memory.js'
import { JSONFileStorage } from '../storage/file.js'
import type { StorageAdapter } from '../storage/interface.js'
import type {
  DevicePassport,
  EgoAccountProfile,
  EgoLiteBridge,
  EgoProfile,
  EgoProfileReadiness,
  EgoProxyBinding,
  EgoSessionPlan,
  PassportGeneratorOptions,
} from '../types/index.js'
import { buildEgoSessionPlan, getProfileReadiness } from './plan.js'

/**
 * Options for {@link AccountProfileManager}.
 */
export interface AccountProfileManagerOptions {
  /**
   * Storage backend for the account profile records (seed → profile binding).
   * - String path → creates a `JSONFileStorage` automatically (atomic writes).
   * - StorageAdapter instance → custom backend.
   * - Omitted → `MemoryStorage`.
   */
  store?: string | StorageAdapter<EgoAccountProfile>

  /**
   * The passport manager that owns the sticky identities.
   * When omitted, an internal one is created from {@link passportOptions}.
   */
  passportManager?: PassportManager

  /**
   * Options for the internal passport manager. Ignored when
   * {@link passportManager} is supplied.
   */
  passportOptions?: PassportManagerOptions

  /**
   * The ego-lite bridge used to list profiles and open task spaces.
   * When omitted, no profile listing is possible and binding is rejected.
   */
  bridge?: EgoLiteBridge
}

/**
 * Options for binding an account to an ego-lite profile.
 */
export interface BindProfileOptions {
  /** The ego-lite profile id to bind. Must exist in the ego-lite profile list. */
  profileId: string
  /**
   * The proxy declaration for this account. Omit to leave the account unbound.
   */
  proxy?: EgoProxyBinding | null
}

/**
 * Options for creating a session plan.
 */
export interface CreateSessionPlanOptions {
  /** Task space name. Defaults to a name derived from the seed. */
  taskSpaceName?: string
  /** Optional CDP session id to attach to every command. */
  sessionId?: string
}

/**
 * Manages ego-lite account profiles: sticky passport + profile binding + proxy declaration.
 */
export class AccountProfileManager {
  /** Persistent store of account profile records. */
  public readonly storage: StorageAdapter<EgoAccountProfile>
  /** The passport manager holding the sticky identities. */
  public readonly passportManager: PassportManager
  /** The ego-lite bridge, when one was injected. */
  public readonly bridge?: EgoLiteBridge

  constructor(options: AccountProfileManagerOptions = {}) {
    if (typeof options.store === 'string') {
      this.storage = new JSONFileStorage<EgoAccountProfile>({ filePath: options.store })
    } else if (options.store && typeof (options.store as any).get === 'function') {
      this.storage = options.store
    } else {
      this.storage = new MemoryStorage<EgoAccountProfile>()
    }

    this.passportManager =
      options.passportManager ?? new PassportManager(options.passportOptions)
    this.bridge = options.bridge
  }

  /**
   * Lists the ego-lite profiles available for binding.
   *
   * @throws When no bridge was injected — ego-lite has no "create profile" API,
   * so a profile must already exist and be listed before it can be bound.
   */
  async listEgoProfiles(): Promise<EgoProfile[]> {
    if (!this.bridge) {
      throw new Error(
        '[ego] no ego-lite bridge available. Inject `bridge` to list profiles; ' +
          'ego-lite has no API for creating profiles.',
      )
    }
    return this.bridge.listProfiles()
  }

  /**
   * Returns the stored account profile record for a seed.
   */
  async getProfile(seed: string | number): Promise<EgoAccountProfile | null> {
    return this.storage.get(String(seed))
  }

  /**
   * Returns the readiness of an account profile.
   *
   * `ready` requires both a bound ego-lite profile and a declared proxy.
   */
  async getReadiness(seed: string | number): Promise<EgoProfileReadiness> {
    const profile = await this.getProfile(seed)
    if (!profile) {
      return 'missing-profile'
    }
    return getProfileReadiness(profile)
  }

  /**
   * Binds an account to an existing ego-lite profile, and optionally declares its proxy.
   *
   * The proxy is only *recorded* here. ego-lite cannot apply it at the browser layer,
   * so the operator must bind it at the system level before launching a session.
   *
   * @param seed The account seed. Doubles as the sticky passport seed.
   * @param options The profile id to bind and the optional proxy declaration.
   * @param passportOptions Generator options used when the passport is first created.
   */
  async bindProfile(
    seed: string | number,
    options: BindProfileOptions,
    passportOptions?: PassportGeneratorOptions,
  ): Promise<EgoAccountProfile> {
    const seedStr = String(seed)

    if (!options.profileId) {
      throw new Error('[ego] profileId is required to bind an account profile')
    }

    // When ego-lite is reachable, only bind to a profile that actually exists.
    // ego-lite has no create-profile API, so a typo here would silently produce
    // an account bound to nothing.
    if (this.bridge) {
      const profiles = await this.bridge.listProfiles()
      if (!profiles.some(p => p.id === options.profileId)) {
        throw new Error(
          `[ego] profile "${options.profileId}" does not exist in ego-lite. ` +
            `Available profiles: ${profiles.map(p => p.id).join(', ') || '(none)'}`,
        )
      }
    }

    // The sticky passport is created (or reused) first: binding a profile must never
    // change the persona an account already has.
    const passport = await this.passportManager.getPassport(seedStr, passportOptions)

    const existing = await this.storage.get(seedStr)
    const proxy = options.proxy !== undefined ? options.proxy : existing?.proxy ?? null

    const record: EgoAccountProfile = {
      seed: seedStr,
      passportId: passport.id,
      profileId: options.profileId,
      proxy: proxy ?? null,
      updatedAt: new Date().toISOString(),
    }

    await this.storage.set(seedStr, record)
    return record
  }

  /**
   * Declares (or clears) the proxy binding of an account.
   *
   * Passing `null` removes the declaration; the account then reports `missing-proxy`.
   */
  async setProxy(
    seed: string | number,
    proxy: EgoProxyBinding | null,
  ): Promise<EgoAccountProfile> {
    const seedStr = String(seed)
    const existing = await this.storage.get(seedStr)
    if (!existing) {
      throw new Error(
        `[ego] no account profile for seed ${seedStr}. Bind a profile before declaring a proxy.`,
      )
    }

    const record: EgoAccountProfile = {
      ...existing,
      proxy: proxy ?? null,
      updatedAt: new Date().toISOString(),
    }

    await this.storage.set(seedStr, record)
    return record
  }

  /**
   * Returns the sticky passport instance for an account.
   */
  async getPassport(
    seed: string | number,
    options?: PassportGeneratorOptions,
  ): Promise<DevicePassportInstance> {
    return this.passportManager.getPassport(String(seed), options)
  }

  /**
   * Builds the complete launch plan for one account session.
   *
   * The plan carries the CDP command sequence, init scripts, headers, the ego-lite
   * profile id, and an explicit proxy declaration whose `bound` flag reflects whether
   * a proxy is actually declared for the account.
   *
   * @throws When the account has no bound profile.
   */
  async createSessionPlan(
    seed: string | number,
    options: CreateSessionPlanOptions = {},
  ): Promise<EgoSessionPlan> {
    const seedStr = String(seed)
    const profile = await this.storage.get(seedStr)
    if (!profile) {
      throw new Error(`[ego] no account profile for seed ${seedStr}`)
    }

    const passport = await this.passportManager.getPassport(seedStr)
    return buildEgoSessionPlan(passport.profile, profile, {
      profileId: profile.profileId,
      taskSpaceName: options.taskSpaceName,
      sessionId: options.sessionId,
    })
  }

  /**
   * Opens an ego-lite task space bound to the account's profile.
   *
   * The task space inherits the profile's cookies and login state; a different
   * profile is fully isolated from it.
   *
   * @returns The task space identifier.
   * @throws When the account has no bound profile or no bridge was injected.
   */
  async openTaskSpace(
    seed: string | number,
    taskSpaceName?: string,
  ): Promise<string> {
    if (!this.bridge) {
      throw new Error(
        '[ego] no ego-lite bridge available. Inject `bridge` to open task spaces.',
      )
    }
    const seedStr = String(seed)
    const profile = await this.storage.get(seedStr)
    if (!profile) {
      throw new Error(`[ego] no account profile for seed ${seedStr}`)
    }

    const plan = await this.createSessionPlan(seedStr, { taskSpaceName })
    return this.bridge.createTaskSpace(plan.taskSpaceName, profile.profileId)
  }

  /**
   * Lists every stored account seed.
   */
  async listSeeds(): Promise<string[]> {
    return this.storage.keys()
  }

  /**
   * Removes an account profile record.
   */
  async removeProfile(seed: string | number): Promise<boolean> {
    return this.storage.delete(String(seed))
  }
}
