# GitHub Copilot Instructions for device-passport

- Use modern TypeScript 5.6+ with ES2022 targets.
- Adhere to the Single Source of Truth rule: types belong in `src/types/`.
- Ensure zero contradictions in hardware and software profiles.
- Maintain deterministic hashing: same seed must yield same persona.
- Keep tests passing using `bun test`.
