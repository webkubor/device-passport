import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { MemoryStorage, JSONFileStorage } from '../src/storage/index.js'

describe('Storage Engine - MemoryStorage', () => {
  it('supports basic get, set, has, delete, keys, and clear', async () => {
    const mem = new MemoryStorage()

    expect(await mem.get('key1')).toBeNull()
    expect(await mem.has('key1')).toBe(false)

    await mem.set('key1', { foo: 'bar', count: 42 })
    expect(await mem.has('key1')).toBe(true)

    const val = await mem.get('key1')
    expect(val).toEqual({ foo: 'bar', count: 42 })

    expect(await mem.keys()).toEqual(['key1'])
    expect(mem.size).toBe(1)

    const deleted = await mem.delete('key1')
    expect(deleted).toBe(true)
    expect(await mem.has('key1')).toBe(false)
    expect(await mem.get('key1')).toBeNull()

    await mem.set('k1', 'v1')
    await mem.set('k2', 'v2')
    expect((await mem.keys()).sort()).toEqual(['k1', 'k2'])

    await mem.clear()
    expect(await mem.keys()).toEqual([])
    expect(mem.size).toBe(0)
  })

  it('guarantees object cloning to prevent external mutation leaks', async () => {
    const mem = new MemoryStorage({ clone: true })
    const original = { user: 'crawler', settings: { timeout: 5000 } }

    await mem.set('cfg', original)
    original.settings.timeout = 9999

    const retrieved = await mem.get('cfg')
    expect(retrieved.settings.timeout).toBe(5000)

    retrieved.settings.timeout = 1111
    const retrieved2 = await mem.get('cfg')
    expect(retrieved2.settings.timeout).toBe(5000)
  })

  it('supports synchronous access methods', () => {
    const mem = new MemoryStorage()
    mem.setSync('syncKey', 12345)
    expect(mem.hasSync('syncKey')).toBe(true)
    expect(mem.getSync('syncKey')).toBe(12345)
    expect(mem.keysSync()).toEqual(['syncKey'])
    expect(mem.deleteSync('syncKey')).toBe(true)
    expect(mem.hasSync('syncKey')).toBe(false)
  })
})

describe('Storage Engine - JSONFileStorage', () => {
  let tmpDir: string
  let tmpFilePath: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'passport-storage-test-'))
    tmpFilePath = path.join(tmpDir, 'nested', 'store', 'test-passports.json')
  })

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
  })

  it('automatically creates directories and atomically writes JSON to disk', async () => {
    const store = new JSONFileStorage(tmpFilePath)

    expect(await store.get('seed-1')).toBeNull()
    await store.set('seed-1', { id: 'pass-1', seed: 'seed-1', os: 'macOS' })

    expect(fs.existsSync(tmpFilePath)).toBe(true)
    const raw = fs.readFileSync(tmpFilePath, 'utf-8')
    const parsed = JSON.parse(raw)
    expect(parsed['seed-1']).toEqual({ id: 'pass-1', seed: 'seed-1', os: 'macOS' })

    // Verify retrieval
    const retrieved = await store.get('seed-1')
    expect(retrieved).toEqual({ id: 'pass-1', seed: 'seed-1', os: 'macOS' })

    // Verify keys
    expect(await store.keys()).toEqual(['seed-1'])

    // Verify delete
    const deleted = await store.delete('seed-1')
    expect(deleted).toBe(true)
    expect(await store.get('seed-1')).toBeNull()
  })

  it('persists data across separate JSONFileStorage instances (sticky persistence)', async () => {
    const store1 = new JSONFileStorage(tmpFilePath)
    await store1.set('agent-alpha', { seed: 'agent-alpha', hardware: 'Apple M3 Pro' })

    // Create a new instance pointing to the same file
    const store2 = new JSONFileStorage(tmpFilePath)
    const val = await store2.get('agent-alpha')
    expect(val).toEqual({ seed: 'agent-alpha', hardware: 'Apple M3 Pro' })
    expect(await store2.has('agent-alpha')).toBe(true)
  })

  it('handles synchronous methods (getSync, setSync, flushSync)', () => {
    const store = new JSONFileStorage(tmpFilePath)
    store.setSync('sync-seed', { ok: true })

    expect(store.hasSync('sync-seed')).toBe(true)
    expect(store.getSync('sync-seed')).toEqual({ ok: true })

    const store2 = new JSONFileStorage(tmpFilePath)
    expect(store2.getSync('sync-seed')).toEqual({ ok: true })
  })
})
