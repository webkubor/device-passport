/**
 * Academic Coherence Evaluator for Device Passport.
 *
 * Implements the Formal Mathematical Model:
 * P = ⟨H, S, G, C⟩
 *
 * Where:
 * - H ∈ Ω_H: Hardware Sub-space ⟨Screen, CPU, Memory, GPU⟩
 * - S ∈ Ω_S: System Sub-space ⟨OS, Browser, UserAgent⟩
 * - G ∈ Ω_G: Geo-Chrono Sub-space ⟨Country, Timezone, Locale, Languages, Coordinates⟩
 * - C ∈ Ω_C: Client-Hints Sub-space ⟨Sec-CH-UA*, Low & High Entropy Hints⟩
 *
 * The coherence evaluation function Φ(P) maps P into [0, 100%], quantifying
 * cross-subspace plausibility and absence of anti-bot contradiction signatures.
 */

import type { DevicePassport } from '../types/index.js';
import {
  detectAllContradictions,
  detectGeoChronoContradictions,
  type Contradiction,
} from './contradiction.js';
import { analyzeHeaderEntropy, type EntropyAnalysisResult } from './entropy.js';

export interface SubspaceEvaluation {
  valid: boolean;
  score: number; // 0 - 100
  notes: string[];
}

export interface MathematicalModelFormalism {
  formalism: string; // 'P = ⟨H, S, G, C⟩'
  definition: {
    H: string; // Hardware Sub-space
    S: string; // System Sub-space
    G: string; // Geo-Chrono Sub-space
    C: string; // Client-Hints Sub-space
  };
  subspaces: {
    H: SubspaceEvaluation;
    S: SubspaceEvaluation;
    G: SubspaceEvaluation;
    C: SubspaceEvaluation;
  };
}

export interface CoherenceEvaluationResult {
  /** Overall cross-layer coherence score (0 - 100%) */
  coherenceScore: number;
  /** Specific geo-temporal-linguistic alignment score (0 - 100%) */
  geoAlignmentScore: number;
  /** Shannon entropy realistic score (0 - 100%) */
  entropyScore: number;
  /** List of detected contradictions and anomalies */
  contradictions: Contradiction[];
  /** Mathematical formalization of the evaluation state */
  mathematicalModel: MathematicalModelFormalism;
  /** Entropy analysis breakdown */
  entropyAnalysis: EntropyAnalysisResult;
  /** Evaluation summary and grade */
  summary: {
    passed: boolean;
    fatalCount: number;
    warningCount: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'F';
    verdict: string;
  };
}

/**
 * Calculates Geo-Alignment score between Geographic Country, Timezone, and Accept-Language.
 */
export function evaluateGeoAlignment(passport: DevicePassport): number {
  const geoContradictions = detectGeoChronoContradictions(passport);
  let score = 100;

  for (const c of geoContradictions) {
    score -= c.impactPenalty;
  }

  // Check language tag formatting and q-factor decay sanity
  const acceptLang = passport.headers['accept-language'] || '';
  if (acceptLang) {
    if (!/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)?(;q=[0-1](\.\d{1,3})?)?/.test(acceptLang.trim())) {
      score -= 10;
    }
  } else {
    // Missing Accept-Language header is anomalous for real browsers
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Evaluates the complete internal consistency and coherence of a Device Passport.
 *
 * Implements:
 * Φ: Ω_H × Ω_S × Ω_G × Ω_C → [0, 100%]
 */
export function evaluateCoherence(passport: DevicePassport): CoherenceEvaluationResult {
  const contradictions = detectAllContradictions(passport);
  const geoAlignmentScore = evaluateGeoAlignment(passport);
  const entropyResult = analyzeHeaderEntropy(passport.headers || {});
  const entropyScore = entropyResult.entropyScore;

  // Calculate cumulative penalty
  let totalPenalty = 0;
  let fatalCount = 0;
  let warningCount = 0;

  for (const item of contradictions) {
    totalPenalty += item.impactPenalty;
    if (item.severity === 'fatal') {
      fatalCount++;
    } else {
      warningCount++;
    }
  }

  // Deduct penalty if entropy is severely anomalous
  if (entropyResult.anomaly !== 'optimal') {
    const entropyPenalty = Math.max(0, 100 - entropyScore) * 0.25;
    totalPenalty += entropyPenalty;
  }

  const rawCoherence = 100 - totalPenalty;
  const coherenceScore = Number(Math.max(0, Math.min(100, rawCoherence)).toFixed(1));

  // Sub-space breakdown analysis
  const hContradictions = contradictions.filter((c) => c.category === 'hardware_system');
  const sContradictions = contradictions.filter((c) => c.category === 'os_browser');
  const gContradictions = contradictions.filter((c) => c.category === 'geo_chrono');
  const cContradictions = contradictions.filter((c) => c.category === 'client_hints');

  const calcSubScore = (list: Contradiction[]) =>
    Math.max(0, 100 - list.reduce((acc, curr) => acc + curr.impactPenalty, 0));

  const mathematicalModel: MathematicalModelFormalism = {
    formalism: 'P = ⟨H, S, G, C⟩',
    definition: {
      H: 'Hardware Sub-space ⟨Screen, CPU, Memory, GPU⟩',
      S: 'System Sub-space ⟨OS, Browser, UserAgent⟩',
      G: 'Geo-Chrono Sub-space ⟨Country, Timezone, Locale, Languages, Coordinates⟩',
      C: 'Client-Hints Sub-space ⟨Sec-CH-UA*, Low & High Entropy Hints⟩',
    },
    subspaces: {
      H: {
        valid: hContradictions.every((c) => c.severity !== 'fatal'),
        score: calcSubScore(hContradictions),
        notes: hContradictions.map((c) => c.description),
      },
      S: {
        valid: sContradictions.every((c) => c.severity !== 'fatal'),
        score: calcSubScore(sContradictions),
        notes: sContradictions.map((c) => c.description),
      },
      G: {
        valid: gContradictions.every((c) => c.severity !== 'fatal'),
        score: geoAlignmentScore,
        notes: gContradictions.map((c) => c.description),
      },
      C: {
        valid: cContradictions.every((c) => c.severity !== 'fatal'),
        score: calcSubScore(cContradictions),
        notes: cContradictions.map((c) => c.description),
      },
    },
  };

  // Grade categorization
  let grade: 'A+' | 'A' | 'B' | 'C' | 'F' = 'F';
  if (fatalCount === 0) {
    if (coherenceScore >= 95 && entropyScore >= 80) grade = 'A+';
    else if (coherenceScore >= 88) grade = 'A';
    else if (coherenceScore >= 75) grade = 'B';
    else grade = 'C';
  } else {
    grade = 'F';
  }

  const passed = fatalCount === 0 && coherenceScore >= 80;
  let verdict = '';
  if (grade === 'A+') {
    verdict = 'Flawless mathematical coherence. Zero contradictions across H, S, G, C spaces.';
  } else if (grade === 'A') {
    verdict = 'High consistency persona with natural browser characteristics and low bot detection risk.';
  } else if (grade === 'B' || grade === 'C') {
    verdict = 'Minor cross-layer discrepancies detected; susceptible to advanced anti-bot heuristics.';
  } else {
    verdict = 'Fatal architectural contradiction detected. Persona is trivially flagged by Cloudflare/DataDome.';
  }

  return {
    coherenceScore,
    geoAlignmentScore,
    entropyScore,
    contradictions,
    mathematicalModel,
    entropyAnalysis: entropyResult,
    summary: {
      passed,
      fatalCount,
      warningCount,
      grade,
      verdict,
    },
  };
}
