import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  AccountProfileManager,
  buildEgoSessionPlan,
  buildProxyDeclaration,
  createEgoBridge,
  defaultTaskSpaceName,
  getProfileReadiness,
  PROXY_MISSING_NOTE,
  PROXY_RESOLUTION_NOTE,
} from '../src/ego/index.js'
import { createEgoBridge as createEgoBridgeFromIndex } from '../src/ego/index.js'
import type { EgoLiteBridge, EgoProfile } from '../src/types/index.js'

/**
 * A fake ego-lite bridge.
 *
 * Mirrors the real native surface verified against ego-lite's source:
 * `listProfiles` lists existing profiles (there is no create-profile API), and
 * `createTaskSpace` binds a task space to a profile.
 */
function createFakeBridge(profiles: EgoProfile[] = []): EgoLiteBridge & {
  createdTaskSpaces: Array<{ name: string; profileId: string }>
} {
  const createdTaskSpaces: Array<{ name: string; profileId: string }> = []
  return {
    createdTaskSpaces,
    async listProfiles(): Promise<EgoProfile[]> {
      return profiles
    },
    async createTaskSpace(name: string, profileId: string): Promise<string> {
      createdTaskSpaces.push({ name, profileId })
      return `space-${createdTaskSpaces.length}`
    },
  }
}

const DEFAULT_PROFILES: EgoProfile[] = [
  { id: 'Default', name: 'Personal', isDefault: true },
  { id: 'Profile 2', name: 'Work', isDefault: false },
]

const PROXY = {
  url: 'http://user-country-jp:pass@gate.example.com:7000',
  description: 'Tokyo residential exit',
  country: 'JP',
}

describe('ego-lite account profile manager', () => {
  describe('sticky passport', () => {
    it('produces the same passport for the same seed', async () => {
      const manager = new AccountProfileManager({ store: new MapStorage() })

      const first = await manager.getPassport('alice')
      const second = await manager.getPassport('alice')

      expect(second.id).toBe(first.id)
      expect(second.browser.userAgent).toBe(first.browser.userAgent)
      expect(second.hardware.gpu.renderer).toBe(first.hardware.gpu.renderer)
      expect(second.locale.timezone).toBe(first.locale.timezone)
    })

    it('produces different personas for different seeds', async () => {
      const manager = new AccountProfileManager({ store: new MapStorage() })

      const alice = await manager.getPassport('alice')
      const bob = await manager.getPassport('bob')

      expect(bob.id).not.toBe(alice.id)
      expect(bob.browser.userAgent).not.toBe(alice.browser.userAgent)
    })

    it('keeps the passport stable across manager instances backed by the same store', async () => {
      const store = new MapStorage()
      const passportStore = new MapStorage()
      const first = new AccountProfileManager({
        store,
        passportOptions: { store: passportStore },
      })
      const firstPassport = await first.getPassport('alice')

      const second = new AccountProfileManager({
        store,
        passportOptions: { store: passportStore },
      })
      const passport = await second.getPassport('alice')

      expect(passport.id).toBe(firstPassport.id)
      expect(passport.browser.userAgent).toBe(firstPassport.browser.userAgent)
    })

    it('survives a real restart: file-backed store keeps the persona, not just its id', async () => {
      // 🔴 A restart is the case that matters. With the persona living only in
      //    memory, the passport id stays the same while the geo context silently
      //    changes — so this asserts the *content* (timezone, language, GPU),
      //    never the id alone.
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-ego-restart-'))
      const accountFile = path.join(dir, 'accounts.json')
      const passportFile = path.join(dir, 'passports.json')

      const first = new AccountProfileManager({
        store: accountFile,
        passportStore: passportFile,
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })
      await first.bindProfile('alice', { profileId: 'Default', proxy: PROXY })
      const before = await first.createSessionPlan('alice')

      // A brand new manager over the same files — nothing carried over in memory.
      const second = new AccountProfileManager({
        store: accountFile,
        passportStore: passportFile,
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })
      const after = await second.createSessionPlan('alice')

      expect(after.commands.length).toBe(before.commands.length)
      expect(after.headers['accept-language']).toBe(before.headers['accept-language'])
      expect(after.initScripts[0].source).toBe(before.initScripts[0].source)
      // The persona's geo context must not drift away from the declared exit country.
      expect(after.headers['accept-language']).toContain('ja-JP')

      fs.rmSync(dir, { recursive: true, force: true })
    })
  })

  describe('profile binding', () => {
    it('binds an account to an existing ego-lite profile and reads it back', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      const bound = await manager.bindProfile('alice', { profileId: 'Profile 2' })

      expect(bound.seed).toBe('alice')
      expect(bound.profileId).toBe('Profile 2')
      expect(bound.passportId).toMatch(/^pass_/)

      const stored = await manager.getProfile('alice')
      expect(stored?.profileId).toBe('Profile 2')
    })

    it('lists the ego-lite profiles available for binding', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      const profiles = await manager.listEgoProfiles()

      expect(profiles).toHaveLength(2)
      expect(profiles[0]!.id).toBe('Default')
      expect(profiles[0]!.isDefault).toBe(true)
      expect(profiles[1]!.name).toBe('Work')
    })

    it('rejects binding to a profile that does not exist in ego-lite', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      await expect(manager.bindProfile('alice', { profileId: 'Nope' })).rejects.toThrow(
        /does not exist in ego-lite/,
      )
      expect(await manager.getProfile('alice')).toBeNull()
    })

    it('rejects listing profiles when no bridge is available', async () => {
      const manager = new AccountProfileManager({ store: new MapStorage() })

      await expect(manager.listEgoProfiles()).rejects.toThrow(/no ego-lite bridge/)
    })

    it('opens a task space bound to the account profile', async () => {
      const bridge = createFakeBridge(DEFAULT_PROFILES)
      const manager = new AccountProfileManager({ store: new MapStorage(), bridge })

      await manager.bindProfile('alice', { profileId: 'Profile 2' })
      const spaceId = await manager.openTaskSpace('alice', 'alice-session-1')

      expect(spaceId).toBe('space-1')
      expect(bridge.createdTaskSpaces).toEqual([
        { name: 'alice-session-1', profileId: 'Profile 2' },
      ])
    })
  })

  describe('proxy gap is explicit', () => {
    it('reports missing-proxy when no proxy is bound', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      await manager.bindProfile('alice', { profileId: 'Profile 2' })

      expect(await manager.getReadiness('alice')).toBe('missing-proxy')
    })

    it('reports ready once a proxy is bound', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      await manager.bindProfile('alice', { profileId: 'Profile 2' })
      await manager.setProxy('alice', PROXY)

      expect(await manager.getReadiness('alice')).toBe('ready')
    })

    it('falls back to missing-proxy when the proxy is cleared', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      await manager.bindProfile('alice', { profileId: 'Profile 2', proxy: PROXY })
      expect(await manager.getReadiness('alice')).toBe('ready')

      await manager.setProxy('alice', null)
      expect(await manager.getReadiness('alice')).toBe('missing-proxy')
    })

    it('marks the session plan as not launchable without a proxy', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      await manager.bindProfile('alice', { profileId: 'Profile 2' })
      const plan = await manager.createSessionPlan('alice')

      expect(plan.readiness).toBe('missing-proxy')
      expect(plan.launchable).toBe(false)
      expect(plan.proxy.bound).toBe(false)
      expect(plan.proxy.binding).toBeNull()
      expect(plan.proxy.resolution).toBe('system-level')
      expect(plan.proxy.note).toBe(PROXY_MISSING_NOTE)
    })

    it('declares the proxy as system-level even when it is bound', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      await manager.bindProfile('alice', { profileId: 'Profile 2', proxy: PROXY })
      const plan = await manager.createSessionPlan('alice')

      expect(plan.readiness).toBe('ready')
      expect(plan.launchable).toBe(true)
      expect(plan.proxy.bound).toBe(true)
      expect(plan.proxy.binding?.url).toBe(PROXY.url)
      // The browser layer cannot apply it — the declaration must say so.
      expect(plan.proxy.resolution).toBe('system-level')
      expect(plan.proxy.note).toBe(PROXY_RESOLUTION_NOTE)
      expect(plan.proxy.note).toMatch(/cannot configure a proxy at the browser layer/)
    })

    it('never claims the proxy is applied by the browser', () => {
      const unbound = buildProxyDeclaration({
        seed: 'alice',
        passportId: 'pass_1',
        profileId: 'Profile 2',
        proxy: null,
        updatedAt: '2026-11-13T00:00:00.000Z',
      })
      const bound = buildProxyDeclaration({
        seed: 'alice',
        passportId: 'pass_1',
        profileId: 'Profile 2',
        proxy: PROXY,
        updatedAt: '2026-11-13T00:00:00.000Z',
      })

      // Both branches declare the same resolution: the proxy is never a browser-level thing.
      expect(unbound.resolution).toBe('system-level')
      expect(bound.resolution).toBe('system-level')
      expect(unbound.bound).toBe(false)
      expect(bound.bound).toBe(true)
    })
  })

  describe('readiness computation', () => {
    it('reports missing-profile when no profile is bound', () => {
      expect(
        getProfileReadiness({
          seed: 'alice',
          passportId: 'pass_1',
          profileId: '',
          proxy: PROXY,
          updatedAt: '2026-11-13T00:00:00.000Z',
        }),
      ).toBe('missing-profile')
    })
  })

  describe('CDP session plan', () => {
    it('emits commands in a load-bearing order', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      await manager.bindProfile('alice', { profileId: 'Profile 2', proxy: PROXY })
      const plan = await manager.createSessionPlan('alice')
      const methods = plan.commands.map(c => c.method)

      // Page.enable must come first: without it the init script is accepted but never runs.
      expect(methods[0]).toBe('Page.enable')

      // The UA override has to precede any navigation.
      const uaIndex = methods.indexOf('Emulation.setUserAgentOverride')
      expect(uaIndex).toBeGreaterThan(-1)
      expect(methods.indexOf('Page.navigate')).toBe(-1)

      const uaCommand = plan.commands.find(c => c.method === 'Emulation.setUserAgentOverride')
      expect(uaCommand?.params?.userAgent).toBe(
        (await manager.getPassport('alice')).browser.userAgent,
      )
    })

    it('includes the stealth init script in the plan', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      await manager.bindProfile('alice', { profileId: 'Profile 2', proxy: PROXY })
      const plan = await manager.createSessionPlan('alice')

      expect(plan.initScripts).toHaveLength(1)
      expect(plan.initScripts[0]!.source.length).toBeGreaterThan(0)
      expect(plan.initScripts[0]!.source).toContain('webgl')
    })

    it('carries the canonical headers and the profile id', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      await manager.bindProfile('alice', { profileId: 'Profile 2', proxy: PROXY })
      const plan = await manager.createSessionPlan('alice')

      expect(plan.profileId).toBe('Profile 2')
      expect(plan.seed).toBe('alice')
      expect(plan.headers['user-agent']).toBeDefined()
      expect(plan.headers['accept-language']).toBeDefined()
    })

    it('uses the requested task space name and defaults it otherwise', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      await manager.bindProfile('alice', { profileId: 'Profile 2', proxy: PROXY })

      const named = await manager.createSessionPlan('alice', { taskSpaceName: 'custom' })
      expect(named.taskSpaceName).toBe('custom')

      const fallback = await manager.createSessionPlan('alice')
      expect(fallback.taskSpaceName).toBe(defaultTaskSpaceName('alice'))
    })

    it('builds a plan directly from a passport and a profile record', async () => {
      const manager = new AccountProfileManager({ store: new MapStorage() })
      const passport = await manager.getPassport('alice')

      const plan = buildEgoSessionPlan(passport.profile, {
        seed: 'alice',
        passportId: passport.id,
        profileId: 'Default',
        proxy: null,
        updatedAt: '2026-11-13T00:00:00.000Z',
      })

      expect(plan.readiness).toBe('missing-proxy')
      expect(plan.profileId).toBe('Default')
      expect(plan.commands[0]!.method).toBe('Page.enable')
    })
  })

  describe('storage', () => {
    it('persists to disk atomically and reloads consistently', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-ego-'))
      const filePath = path.join(tmpDir, 'accounts.json')

      try {
        const manager = new AccountProfileManager({
          store: filePath,
          bridge: createFakeBridge(DEFAULT_PROFILES),
        })

        await manager.bindProfile('alice', { profileId: 'Profile 2', proxy: PROXY })
        await manager.bindProfile('bob', { profileId: 'Default' })

        // The file must exist and be valid JSON — no partial writes.
        expect(fs.existsSync(filePath)).toBe(true)
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        expect(raw.alice.profileId).toBe('Profile 2')
        expect(raw.alice.proxy.url).toBe(PROXY.url)
        expect(raw.bob.proxy).toBeNull()

        // No temp file left behind by the atomic write.
        const stray = fs.readdirSync(tmpDir).filter(f => f !== 'accounts.json')
        expect(stray).toEqual([])

        // A fresh manager over the same file sees the same records.
        const reloaded = new AccountProfileManager({
          store: filePath,
          bridge: createFakeBridge(DEFAULT_PROFILES),
        })

        const alice = await reloaded.getProfile('alice')
        expect(alice?.profileId).toBe('Profile 2')
        expect(alice?.proxy?.description).toBe('Tokyo residential exit')
        expect(await reloaded.getReadiness('alice')).toBe('ready')
        expect(await reloaded.getReadiness('bob')).toBe('missing-proxy')

        const seeds = await reloaded.listSeeds()
        expect(seeds.sort()).toEqual(['alice', 'bob'])
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('refuses to serve half-written data after the file is corrupted', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-ego-'))
      const filePath = path.join(tmpDir, 'accounts.json')

      try {
        const manager = new AccountProfileManager({
          store: filePath,
          bridge: createFakeBridge(DEFAULT_PROFILES),
        })
        await manager.bindProfile('alice', { profileId: 'Profile 2', proxy: PROXY })

        // Corrupt the file the way a killed process would.
        fs.writeFileSync(filePath, '{ "alice": ', 'utf-8')

        const reloaded = new AccountProfileManager({ store: filePath })

        // The atomic write guarantees the store never *serves* partial records:
        // a parse failure surfaces as an error, with a .corrupt backup left behind.
        await expect(reloaded.getProfile('alice')).rejects.toThrow(/Failed to parse JSON/)
        const backups = fs.readdirSync(tmpDir).filter(f => f.includes('.corrupt-'))
        expect(backups.length).toBe(1)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('removes a profile record', async () => {
      const manager = new AccountProfileManager({
        store: new MapStorage(),
        bridge: createFakeBridge(DEFAULT_PROFILES),
      })

      await manager.bindProfile('alice', { profileId: 'Profile 2' })
      expect(await manager.removeProfile('alice')).toBe(true)
      expect(await manager.getProfile('alice')).toBeNull()
    })
  })

  describe('ego-lite bridge', () => {
    it('adapts the native listProfiles binding', async () => {
      const bridge = createEgoBridge({
        async listProfiles() {
          return { profiles: DEFAULT_PROFILES }
        },
      })

      expect(await bridge.listProfiles()).toEqual(DEFAULT_PROFILES)
    })

    it('adapts a native listProfiles that returns a bare array', async () => {
      const bridge = createEgoBridge({
        async listProfiles() {
          return DEFAULT_PROFILES
        },
      })

      expect(await bridge.listProfiles()).toHaveLength(2)
    })

    it('adapts the native createTaskSpace binding', async () => {
      const calls: Array<[string, string | undefined]> = []
      const bridge = createEgoBridge({
        async createTaskSpace(name: string, profileId?: string) {
          calls.push([name, profileId])
          // Real ego-lite descriptor shape: taskId is the string locator,
          // id is the numeric selector.
          return { taskId: 'task-7', id: 42, name, ownership: 'agent' }
        },
      })

      expect(await bridge.createTaskSpace('space-a', 'Profile 2')).toBe('task-7')
      expect(calls).toEqual([['space-a', 'Profile 2']])
    })

    it('falls back to the numeric id when the descriptor lacks taskId', async () => {
      const bridge = createEgoBridge({
        async createTaskSpace(name: string) {
          return { id: 42, name }
        },
      })

      expect(await bridge.createTaskSpace('space-b', 'Default')).toBe('42')
    })

    it('throws when ego-lite is not present', () => {
      expect(() => createEgoBridge(null)).toThrow(/not found/)
    })

    it('throws when the native bridge lacks listProfiles', async () => {
      const bridge = createEgoBridge({})
      await expect(bridge.listProfiles()).rejects.toThrow(/listProfiles/)
    })

    it('exposes the same bridge factory from the module barrel', () => {
      expect(createEgoBridgeFromIndex).toBe(createEgoBridge)
    })
  })
})

/**
 * A minimal in-memory {@link StorageAdapter} for tests.
 *
 * The repo's `MemoryStorage` is used by the manager by default; this explicit
 * adapter keeps the storage-focused tests independent of that default.
 */
class MapStorage {
  private readonly store = new Map<string, any>()

  async get(key: string) {
    return this.store.has(key) ? this.store.get(key) : null
  }

  async set(key: string, value: any): Promise<void> {
    this.store.set(key, value)
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key)
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key)
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys())
  }

  async clear(): Promise<void> {
    this.store.clear()
  }
}
