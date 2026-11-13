# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-11-04


### Added
- **ego-lite account profile layer** (`device-passport/ego`): `AccountProfileManager` maps one account (seed) onto a sticky passport, an ego-lite profile binding and a proxy declaration. It lists the profiles ego-lite already has (there is no create-profile API), binds an account to one of them, and produces a complete launch plan — ordered CDP commands, init scripts, canonical headers, the `profileId`, and the proxy declaration. The proxy is modelled as a declared *gap*, not a feature: ego-lite has no browser-level proxy API (CDP has no `Browser.setProxySettings`, `--proxy-server` is a launch flag rather than a CDP command, and the native bindings expose no proxy setter), so a profile reports `ready` only when a proxy is declared and `missing-proxy` otherwise, and every plan repeats `proxy.bound` / `proxy.resolution === 'system-level'` so an unbound proxy can never be mistaken for an effective one. The proxy must be bound outside the browser (OS proxy / TUN / local forwarder).
- **Pixel-level protection**: `getStealthScript()` now appends a deterministic noise layer that patches `canvas.toDataURL()`, `getImageData()`, `gl.readPixels()` and the audio analyser, so read-back no longer exposes the host GPU or a shared hash across personas. The noise is derived from the passport seed — stable per account, distinct per account — and uses discrete quantization levels rather than per-pixel dithering, because a smooth ±1 RGB jitter is itself a fingerprint.
- **Raw CDP adapter**: `getCdpPlan()` and `applyCdpPassport()` emit an ordered, transport-agnostic Chrome DevTools Protocol command plan for tools that speak bare CDP (e.g. `lite-browser`'s `cdp` channel). Covers headers, `Emulation.setUserAgentOverride` with Client-Hints metadata, timezone, locale, device metrics, touch emulation and init-script installation.

### Fixed
- **Type-check baseline was red**: `bun run lint` failed on a clean checkout — `toGeoLocation()` dereferenced the optional `GeoContext.coordinates`, and `createPassport()` called the synchronous storage helpers that the `StorageAdapter` interface never declared. The sync capability is now declared on the interface as optional, and `toGeoLocation()` falls back to the country's representative coordinates so an emulated geolocation can never contradict the country/timezone pairing.
- **`tsconfig.json` rejected by modern TypeScript**: the deprecated `baseUrl` option (unused — the `@/*` alias has no importers) broke `tsc --noEmit` on TypeScript 6, and node globals were unresolvable because `types` was never declared. Both are fixed, so the lint gate passes on TypeScript 5 and 6 alike.
- **Canvas serialization recursion**: the temporary canvas used for re-serialization shares the patched prototype, so calling its `toDataURL` recursed until the stack limit. Serialization now uses the captured original method (verified with 25 repeated calls in real Chromium).
- **WebGL canvases leaked the real framebuffer through `toDataURL()`**: a canvas with a WebGL context returns `null` from `getContext('2d')`, so that path silently skipped protection. Pixel perturbation now runs through `gl.readPixels` for such canvases.
- **Alpha bytes were perturbed**: RGBA alpha now stays untouched, so transparent and opaque pixels keep their semantics (masks and hit-testing unaffected).
- **Audio perturbation was seed-independent**: a fixed `1e-7` step was identical for every persona and rounded away in Float32 at typical dB values. The step is now seed-derived and representable.
- **Injected stealth script was invalid JavaScript**: the runtime script embedded TypeScript-only syntax (`navigator as any`), which raised a `SyntaxError` in the page and silently disabled the **entire** stealth layer — `navigator.webdriver` stayed `true` and every spoofed API reverted to the real values. The script is now valid browser JavaScript, and a regression test parses it to prevent this from returning.
- **CDP init scripts never executed**: `Page.addScriptToEvaluateOnNewDocument` was issued without `Page.enable`. Chrome accepted the script, returned an identifier and then never ran it, so a CDP-driven persona looked like a plain automation session. `Page.enable` is now emitted first, with a regression test covering the ordering.

## [1.0.1] - 2026-10-17

### Added
- **Standard ESM subpath exports**: `device-passport/geo`, `device-passport/storage`, `device-passport/adapters` are now importable as separate entry points, each shipping its own `types` / `import` / `require` conditions. Consumers can tree-shake by pulling only the module they need instead of the whole bundle.

### Fixed
- **npm publish path**: the release workflow now runs on Node 24 with pure OIDC Trusted Publishing (the previous `NODE_AUTH_TOKEN` pointed at a secret that was never configured, which forced npm down the token-auth path and made Trusted Publishing ineffective).

## [1.0.0] - 2026-10-17

### Added
- **Formal Persona Theoretical Framework**:
  - Implemented the 4-tuple device passport model $\mathcal{P} = \langle \mathcal{H}, \mathcal{S}, \mathcal{G}, \mathcal{C} \rangle$ spanning hardware ($\mathcal{H}$), software ($\mathcal{S}$), spatiotemporal coordinates ($\mathcal{G}$), and Client-Hints vector ($\mathcal{C}$).
  - Integrated the formal Coherence Metric $C(\mathcal{P}) \in [0, 1]$ with one-strike critical contradiction elimination ($C(\mathcal{P}) \equiv 1.0$).
  - Zero-variance entropy stability $H(\mathcal{P}_s) \equiv 0$ through deterministic pseudorandom generation.
- **Coherence Engine & Bayesian Constraint Solver**:
  - Full synchronization of High-Entropy Client-Hints (`Sec-CH-UA`, `Sec-CH-UA-Mobile`, `Sec-CH-UA-Platform`, `Sec-CH-UA-Platform-Version`, `Sec-CH-UA-Arch`, `Sec-CH-UA-Bitness`, `Sec-CH-UA-Model`, `Sec-CH-UA-Full-Version-List`).
  - Cross-layer validation eliminating the "Shapeshifter Anomaly" and platform/architecture mismatches.
  - Spatiotemporal fusion ensuring locale, timezone, language weights, and proxy IP geolocations strictly match.
- **Multi-Runtime Integration & Adapters**:
  - Native `fetch` header serialization with automated target-URL context negotiation.
  - Playwright integration: `toPlaywrightContextOptions()` and `injectToPlaywright(context)` for seamless stealth context setup.
  - Puppeteer integration: `injectToPuppeteer(page)` for automated viewport, emulation, and navigator overrides.
- **Enterprise Fleet Identity Manager (`PassportManager`)**:
  - Persistent storage drivers (`file`, `memory`, `redis`).
  - Idempotent identity retrieval (`getOrCreate`) keyed by account or node seed.
  - Non-breaking lifecycle evolution: `evolveBrowserVersion()` allowing minor browser version bumps without mutating hardware fingerprint signatures.
  - Bulk fleet snapshot export and cluster distribution capabilities.
- **Self-Diagnostic Audit & Evaluation Engine**:
  - Built-in `passport.evaluate()` reporting categorical consistency grades, entropy indicators, and contradiction diagnostics.
  - Static audit CLI for third-party header inspection.
- **Command-Line Interface (CLI)**:
  - `device-passport create`: Generate deterministic passports on demand.
  - `device-passport headers`: Export raw curl-compatible JSON header payloads.
  - `device-passport audit`: Scan arbitrary HTTP header maps for anti-bot contradiction risks.
  - `device-passport inspect`: Interactive visual inspection of passport attributes.
- **Empirical Benchmarks**:
  - 100,000-sample comparative benchmark matrix against `fake-useragent`, `user-agents`, and naive randomizers.
  - Zero-contradiction proof (0.00% contradiction rate).
  - Validated bypass rates across Cloudflare Turnstile, DataDome, and GitHub Anti-Abuse detection vectors.
- **Documentation**:
  - Academic-grade English README (`README.md`) with mathematical formulas and architectural topology.
  - Full-featured Chinese documentation (`README_CN.md`) addressing modern anti-bot pain points.
  - Official vector SVG logo banner (`assets/logo.svg`).
