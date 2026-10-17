# AGENTS.md — Guidelines for AI Coding Agents in device-passport

Welcome! You are operating in `device-passport`, a high-assurance browser persona and digital device passport library.

## Architectural Commandments

1. **SSOP (Single Source of Truth)**:
   - All shared domain types live in `src/types/`. Do not redefine duplicate interfaces in submodules.
2. **Zero Contradictions**:
   - Every passport MUST pass internal consistency checks ($C(P) \equiv 1.0$).
   - Never mix macOS with Intel x86 or Windows Direct3D WebGL renderers.
   - Never pair Japanese or European proxies with plain unweighted American English headers.
3. **Stateful Determinism**:
   - Calling `createPassport(seed)` must produce identical personas across all restarts.
   - State persistence is atomic (`JSONFileStorage` writes to `.tmp` then renames).
4. **Lightweight & Zero-Bloat**:
   - Core runtime should remain fast (< 2MB footprint) without requiring heavy headless browsers for pure HTTP tasks.
5. **Testing & Verification**:
   - Every feature must be verified with `bun test`. Ensure 100% pass rate.
   - Package builds use `unbuild` producing clean ESM, CJS, and `.d.ts` bundles.
