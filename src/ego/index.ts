/**
 * ego-lite account profile layer.
 *
 * Manages the mapping between an account (seed) and:
 *   · a sticky device passport (same seed ⇒ same persona, forever),
 *   · an ego-lite browser profile binding (cookies and login state persist per profile),
 *   · a proxy declaration.
 *
 * ⚠️ The proxy is a declared gap. ego-lite has no browser-level proxy API — CDP has
 * no `Browser.setProxySettings`, and ego-lite's native bindings expose no proxy
 * setter. `--proxy-server` is a browser *launch* flag, not a CDP command, so it
 * cannot be changed on a running profile. A proxy must be bound outside the browser
 * (OS proxy / TUN / local forwarder). This layer surfaces that gap explicitly
 * instead of pretending the browser can do it.
 */

export {
  AccountProfileManager,
  type AccountProfileManagerOptions,
  type BindProfileOptions,
  type CreateSessionPlanOptions,
} from './manager.js'

export {
  buildEgoSessionPlan,
  buildProxyDeclaration,
  defaultTaskSpaceName,
  getProfileReadiness,
  PROXY_MISSING_NOTE,
  PROXY_RESOLUTION_NOTE,
  type BuildEgoSessionPlanOptions,
} from './plan.js'

export {
  createEgoBridge,
  getEgoNativeBridge,
  type EgoNativeBridge,
} from './bridge.js'
