/**
 * StorageAdapter interface for DevicePassport persistence.
 * Implementations provide pluggable storage backends (Memory, File, Redis, DB, etc.)
 */
export interface StorageAdapter<T = any> {
  /**
   * Retrieve an item by key.
   * Returns null if key does not exist.
   */
  get(key: string): Promise<T | null>

  /**
   * Store an item with the given key.
   */
  set(key: string, value: T): Promise<void>

  /**
   * Check if a key exists in storage.
   */
  has(key: string): Promise<boolean>

  /**
   * Delete an item by key.
   * Returns true if item existed and was deleted, false otherwise.
   */
  delete(key: string): Promise<boolean>

  /**
   * Return all keys currently stored.
   */
  keys(): Promise<string[]>

  /**
   * Clear all items in this storage.
   */
  clear(): Promise<void>

  /**
   * Optional synchronous capability.
   *
   * Backends that can read and write without a microtask boundary (MemoryStorage,
   * JSONFileStorage) implement these; adapters backed by a network or database
   * usually do not. Callers must feature-detect before using them.
   */
  getSync?(key: string): T | null
  setSync?(key: string, value: T): void
  hasSync?(key: string): boolean
  deleteSync?(key: string): boolean
  keysSync?(): string[]
  clearSync?(): void
}
