import type { StorageAdapter } from './interface'

export interface MemoryStorageOptions {
  /**
   * Whether to deep-clone stored and retrieved objects to prevent external mutations.
   * Defaults to true.
   */
  clone?: boolean
}

/**
 * In-memory storage adapter.
 * Useful for ephemeral scraping runs, tests, and caching.
 */
export class MemoryStorage<T = any> implements StorageAdapter<T> {
  private readonly store: Map<string, T> = new Map()
  private readonly clone: boolean

  constructor(options?: MemoryStorageOptions) {
    this.clone = options?.clone ?? true
  }

  private deepClone<V>(val: V): V {
    if (!this.clone || val === null || typeof val !== 'object') {
      return val
    }
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(val)
      } catch {
        // Fallback to JSON serialization if structuredClone fails on complex prototypes
        return JSON.parse(JSON.stringify(val))
      }
    }
    return JSON.parse(JSON.stringify(val))
  }

  async get(key: string): Promise<T | null> {
    return this.getSync(key)
  }

  getSync(key: string): T | null {
    const val = this.store.get(key)
    if (val === undefined) {
      return null
    }
    return this.deepClone(val)
  }

  async set(key: string, value: T): Promise<void> {
    this.setSync(key, value)
  }

  setSync(key: string, value: T): void {
    this.store.set(key, this.deepClone(value))
  }

  async has(key: string): Promise<boolean> {
    return this.hasSync(key)
  }

  hasSync(key: string): boolean {
    return this.store.has(key)
  }

  async delete(key: string): Promise<boolean> {
    return this.deleteSync(key)
  }

  deleteSync(key: string): boolean {
    return this.store.delete(key)
  }

  async keys(): Promise<string[]> {
    return this.keysSync()
  }

  keysSync(): string[] {
    return Array.from(this.store.keys())
  }

  async clear(): Promise<void> {
    this.clearSync()
  }

  clearSync(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }
}
