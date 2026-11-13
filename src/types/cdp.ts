/**
 * Chrome DevTools Protocol command types.
 *
 * 🔴 SSOP: these live in `src/types/` so that both the CDP adapter and the
 * ego-lite account profile layer speak about "a CDP command" with one shape.
 * Do not redeclare these interfaces inside a submodule.
 */

/** A single CDP command, ready to be sent over any CDP transport. */
export interface CdpCommand {
  method: string
  params?: Record<string, unknown>
  /** `sessionId` is required for page-scoped domains when using flattened sessions. */
  sessionId?: string
}

/** An init script installed on every new document of a target. */
export interface CdpInitScript {
  source: string
}

/** The ordered, declarative plan that applies a passport to a CDP target. */
export interface CdpPassportPlan {
  /** Ordered commands to apply the passport to a target. */
  commands: CdpCommand[]
  /** Init scripts to install on every new document. */
  initScripts: CdpInitScript[]
  /** Extra HTTP headers to set on the session. */
  headers: Record<string, string>
  /** The raw stealth + pixel-protection script, for callers that prefer their own path. */
  stealthScript: string
}
