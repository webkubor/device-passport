import fs from 'node:fs'
import path from 'node:path'
import type { StorageAdapter } from './interface'

export interface JSONFileStorageOptions {
  /**
   * Path to the JSON file on disk.
   */
  filePath: string

  /**
   * Format JSON with indentation for readability.
   * Defaults to true.
   */
  pretty?: boolean

  /**
   * Auto-save to disk immediately when values change.
   * Defaults to true.
   */
  autoSave?: boolean
}

/**
 * File-backed JSON storage adapter.
 * Uses atomic writes via temp-file + renameSync to ensure zero corruption
 * even if the process is killed mid-write. Automatically creates directories.
 */
export class JSONFileStorage<T = any> implements StorageAdapter<T> {
  public readonly filePath: string
  private readonly pretty: boolean
  private readonly autoSave: boolean
  private readonly cache: Map<string, T> = new Map()
  private isLoaded = false
  private writeQueue: Promise<void> = Promise.resolve()

  constructor(filePathOrOptions: string | JSONFileStorageOptions) {
    if (typeof filePathOrOptions === 'string') {
      this.filePath = path.resolve(filePathOrOptions)
      this.pretty = true
      this.autoSave = true
    } else {
      this.filePath = path.resolve(filePathOrOptions.filePath)
      this.pretty = filePathOrOptions.pretty ?? true
      this.autoSave = filePathOrOptions.autoSave ?? true
    }
  }

  /**
   * Ensure data is loaded from disk into the in-memory cache.
   */
  private ensureLoaded(): void {
    if (this.isLoaded) return

    this.isLoaded = true
    if (!fs.existsSync(this.filePath)) {
      return
    }

    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8').trim()
      if (!raw) return

      const data = JSON.parse(raw)
      if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          this.cache.set(key, value as T)
        }
      }
    } catch (err: any) {
      // In case of JSON corruption, create a .corrupt backup to prevent data loss
      const corruptBackup = `${this.filePath}.corrupt-${Date.now()}`
      try {
        fs.copyFileSync(this.filePath, corruptBackup)
      } catch {
        // Ignore backup error
      }
      throw new Error(
        `[JSONFileStorage] Failed to parse JSON file at ${this.filePath}: ${err.message}. A backup was created at ${corruptBackup}`,
      )
    }
  }

  /**
   * Atomic flush to disk. Writes to a unique temp file in the same directory,
   * then atomically renames it to target file.
   */
  private flushAtomic(): void {
    const dir = path.dirname(this.filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const obj: Record<string, T> = {}
    for (const [k, v] of this.cache.entries()) {
      obj[k] = v
    }

    const jsonString = this.pretty
      ? JSON.stringify(obj, null, 2)
      : JSON.stringify(obj)

    // Write to a temporary file in the same filesystem directory to guarantee atomic rename
    const nonce = Math.random().toString(36).slice(2, 8)
    const tmpPath = path.join(dir, `.${path.basename(this.filePath)}.${process.pid}.${Date.now()}.${nonce}.tmp`)

    try {
      fs.writeFileSync(tmpPath, jsonString, 'utf-8')
      fs.renameSync(tmpPath, this.filePath)
    } catch (err) {
      if (fs.existsSync(tmpPath)) {
        try {
          fs.unlinkSync(tmpPath)
        } catch {
          // ignore cleanup error
        }
      }
      throw err
    }
  }

  /**
   * Queue a disk write to prevent race conditions during rapid concurrent mutations.
   */
  private queueSave(): Promise<void> {
    if (!this.autoSave) {
      return Promise.resolve()
    }

    this.writeQueue = this.writeQueue
      .then(() => {
        this.flushAtomic()
      })
      .catch((err) => {
        // Reset queue to resolve so subsequent writes are not blocked
        return Promise.reject(err)
      })

    return this.writeQueue
  }

  async get(key: string): Promise<T | null> {
    return this.getSync(key)
  }

  getSync(key: string): T | null {
    this.ensureLoaded()
    const val = this.cache.get(key)
    return val !== undefined ? val : null
  }

  async set(key: string, value: T): Promise<void> {
    this.ensureLoaded()
    this.cache.set(key, value)
    await this.queueSave()
  }

  setSync(key: string, value: T): void {
    this.ensureLoaded()
    this.cache.set(key, value)
    if (this.autoSave) {
      this.flushAtomic()
    }
  }

  async has(key: string): Promise<boolean> {
    return this.hasSync(key)
  }

  hasSync(key: string): boolean {
    this.ensureLoaded()
    return this.cache.has(key)
  }

  async delete(key: string): Promise<boolean> {
    this.ensureLoaded()
    const existed = this.cache.delete(key)
    if (existed && this.autoSave) {
      await this.queueSave()
    }
    return existed
  }

  deleteSync(key: string): boolean {
    this.ensureLoaded()
    const existed = this.cache.delete(key)
    if (existed && this.autoSave) {
      this.flushAtomic()
    }
    return existed
  }

  async keys(): Promise<string[]> {
    return this.keysSync()
  }

  keysSync(): string[] {
    this.ensureLoaded()
    return Array.from(this.cache.keys())
  }

  async clear(): Promise<void> {
    this.ensureLoaded()
    this.cache.clear()
    if (this.autoSave) {
      await this.queueSave()
    }
  }

  clearSync(): void {
    this.ensureLoaded()
    this.cache.clear()
    if (this.autoSave) {
      this.flushAtomic()
    }
  }

  /**
   * Explicitly force a flush to disk (useful if autoSave is set to false).
   */
  async flush(): Promise<void> {
    await this.queueSave()
  }

  flushSync(): void {
    this.flushAtomic()
  }

  get size(): number {
    this.ensureLoaded()
    return this.cache.size
  }
}
