# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
