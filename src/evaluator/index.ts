/**
 * Academic Evaluation Engine for Device Passport.
 *
 * Implements verification algorithms for the formal model:
 * P = ⟨H, S, G, C⟩
 *
 * Evaluates:
 * 1. Internal Coherence Score (0 - 100%)
 * 2. Geo-Chrono-Linguistic Alignment Score (0 - 100%)
 * 3. Shannon Entropy Analyzer for HTTP Header Distributions
 * 4. Cross-layer Contradiction and Detection Anomaly Detection
 */

export * from './contradiction.js';
export * from './entropy.js';
export * from './coherence.js';

import type { DevicePassport } from '../types/index.js';
import { evaluateCoherence, type CoherenceEvaluationResult } from './coherence.js';

/**
 * High-level evaluation entry point for any DevicePassport instance.
 */
export function evaluatePassport(passport: DevicePassport): CoherenceEvaluationResult {
  return evaluateCoherence(passport);
}
