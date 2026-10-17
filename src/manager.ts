import type {
  DevicePassport,
  PassportGeneratorOptions,
  SupportedBrowserName,
  SupportedPlatform,
} from './types/index.js'
import { generatePassport } from './engine/index.js'
import { DevicePassportInstance } from './passport.js'
import type { StorageAdapter } from './storage/interface.js'
import { MemoryStorage } from './storage/memory.js'
import { JSONFileStorage } from './storage/file.js'

export interface PassportManagerOptions {
  /**
   * Storage backend for persisting passports:
   * - String path (e.g. './passports.json') -> creates JSONFileStorage automatically.
   * - StorageAdapter instance -> custom pluggable storage (Memory, File, Redis, DB).
   * - Omitted or 'memory' -> uses MemoryStorage.
   */
  store?: string | StorageAdapter<DevicePassport>

  /**
   * Default geographic country code for newly generated personas (e.g. 'US', 'GB', 'DE', 'JP').
   * Defaults to 'US'.
   */
  defaultGeo?: string

  /**
   * Default operating system preference ('macOS' | 'Windows').
   */
  defaultOS?: SupportedPlatform

  /**
   * Default browser preference ('Chrome' | 'Edge').
   */
  defaultBrowser?: SupportedBrowserName

  /**
   * Generator function. Defaults to engine's generatePassport.
   */
  generator?: (options?: PassportGeneratorOptions) => DevicePassport
}

/**
 * PassportManager manages fleet-scale digital device identities.
 *
 * Guarantees true sticky identity across runs:
 * Calling `getPassport(seed)` with the same seed (e.g. account ID, proxy IP, username)
 * will consistently return the exact same device passport across restarts and cron jobs.
 */
export class PassportManager {
  public readonly storage: StorageAdapter<DevicePassport>
  public readonly defaultGeo: string
  public readonly defaultOS?: SupportedPlatform
  public readonly defaultBrowser?: SupportedBrowserName
  private readonly generator: (options?: PassportGeneratorOptions) => DevicePassport

  constructor(options?: PassportManagerOptions) {
    if (typeof options?.store === 'string') {
      this.storage = new JSONFileStorage<DevicePassport>(options.store)
    } else if (options?.store && typeof (options.store as any).get === 'function') {
      this.storage = options.store
    } else {
      this.storage = new MemoryStorage<DevicePassport>()
    }

    this.defaultGeo = options?.defaultGeo ?? 'US'
    this.defaultOS = options?.defaultOS
    this.defaultBrowser = options?.defaultBrowser
    this.generator = options?.generator ?? generatePassport
  }

  /**
   * Retrieves an existing sticky passport by seed or deterministically generates
   * and persists a new one if it does not already exist.
   *
   * @param seed Deterministic seed (user ID, account handle, proxy IP, worker slot)
   * @param options Generator options to use if persona needs to be created
   */
  async getPassport(
    seed: string | number,
    options?: PassportGeneratorOptions,
  ): Promise<DevicePassportInstance> {
    const seedStr = String(seed)

    // 1. Check storage for existing sticky profile
    const existing = await this.storage.get(seedStr)
    if (existing) {
      return new DevicePassportInstance(existing)
    }

    // 2. Generate new consistent passport
    const mergedOptions: PassportGeneratorOptions = {
      seed: seedStr,
      country: options?.country ?? this.defaultGeo,
      os: options?.os ?? this.defaultOS,
      browser: options?.browser ?? this.defaultBrowser,
      ...options,
    }

    const profile = this.generator(mergedOptions)

    // 3. Persist to storage
    await this.storage.set(seedStr, profile)

    return new DevicePassportInstance(profile)
  }

  /**
   * Synchronous passport retrieval for environments backed by MemoryStorage or JSONFileStorage.
   */
  getPassportSync(
    seed: string | number,
    options?: PassportGeneratorOptions,
  ): DevicePassportInstance {
    const seedStr = String(seed)
    const syncStore = this.storage as any

    if (typeof syncStore.getSync === 'function') {
      const existing = syncStore.getSync(seedStr)
      if (existing) {
        return new DevicePassportInstance(existing)
      }

      const mergedOptions: PassportGeneratorOptions = {
        seed: seedStr,
        country: options?.country ?? this.defaultGeo,
        os: options?.os ?? this.defaultOS,
        browser: options?.browser ?? this.defaultBrowser,
        ...options,
      }

      const profile = this.generator(mergedOptions)
      if (typeof syncStore.setSync === 'function') {
        syncStore.setSync(seedStr, profile)
      }
      return new DevicePassportInstance(profile)
    }

    throw new Error(
      '[PassportManager] Current storage adapter does not support synchronous operations. Use await manager.getPassport(seed) instead.',
    )
  }

  /**
   * Forces re-generation and overwrite of a passport for the given seed.
   */
  async renewPassport(
    seed: string | number,
    options?: PassportGeneratorOptions,
  ): Promise<DevicePassportInstance> {
    const seedStr = String(seed)

    const mergedOptions: PassportGeneratorOptions = {
      seed: seedStr,
      country: options?.country ?? this.defaultGeo,
      os: options?.os ?? this.defaultOS,
      browser: options?.browser ?? this.defaultBrowser,
      ...options,
    }

    const profile = this.generator(mergedOptions)
    await this.storage.set(seedStr, profile)

    return new DevicePassportInstance(profile)
  }

  /**
   * Check if a passport exists in storage for the given seed.
   */
  async hasPassport(seed: string | number): Promise<boolean> {
    return this.storage.has(String(seed))
  }

  /**
   * Delete a passport from storage.
   */
  async deletePassport(seed: string | number): Promise<boolean> {
    return this.storage.delete(String(seed))
  }

  /**
   * Import an existing passport into storage.
   */
  async importPassport(
    passport: DevicePassport | DevicePassportInstance,
  ): Promise<DevicePassportInstance> {
    const raw = passport instanceof DevicePassportInstance ? passport.toJSON() : passport
    await this.storage.set(raw.seed, raw)
    return new DevicePassportInstance(raw)
  }

  /**
   * List all stored seeds.
   */
  async listSeeds(): Promise<string[]> {
    return this.storage.keys()
  }

  /**
   * List all stored passports as DevicePassportInstance objects.
   */
  async listPassports(): Promise<DevicePassportInstance[]> {
    const keys = await this.storage.keys()
    const instances: DevicePassportInstance[] = []

    for (const key of keys) {
      const item = await this.storage.get(key)
      if (item) {
        instances.push(new DevicePassportInstance(item))
      }
    }

    return instances
  }

  /**
   * Clear all stored passports.
   */
  async clear(): Promise<void> {
    await this.storage.clear()
  }

  /**
   * Return number of stored personas.
   */
  async count(): Promise<number> {
    const keys = await this.storage.keys()
    return keys.length
  }
}
