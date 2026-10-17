/**
 * Metrics, Consistency Evaluation, and Benchmark types for Device Passport.
 */

export type ConsistencyCategory =
  | 'os_ua_alignment'
  | 'client_hints_entropy'
  | 'hardware_plausibility'
  | 'geo_locale_coherence'
  | 'webgl_hardware_coupling'
  | 'screen_viewport_consistency';

export interface ConsistencyCheck {
  id: string;
  name: string;
  category: ConsistencyCategory;
  passed: boolean;
  score: number; // 0 - 100
  weight: number; // e.g. 1.0, 2.0
  message: string;
  details?: Record<string, unknown>;
}

export interface EntropyAnalysis {
  estimatedBits: number;
  collisionRisk: 'very_low' | 'low' | 'moderate' | 'high';
  fingerprintUniqueness?: number;
}

export type EvaluationStatus = 'PASS' | 'WARN' | 'FAIL';
export type EvaluationGrade = 'A+' | 'A' | 'B' | 'C' | 'F';

export interface PassportEvaluation {
  /** Overall consistency score (0 - 100) */
  overallScore: number;
  /** Pass / Warn / Fail status based on strict thresholds */
  status: EvaluationStatus;
  /** Academic grade assessment */
  grade: EvaluationGrade;
  /** Individual check breakdowns */
  checks: ConsistencyCheck[];
  /** Entropy and collision analysis */
  entropyAnalysis?: EntropyAnalysis;
  /** ISO timestamp when evaluated */
  evaluatedAt: string;
}

export interface BenchmarkMetrics {
  passportId: string;
  determinismScore: number; // 100% when same seed produces identical passport
  contradictionRate: number; // 0.0% for perfect consistency
  overallConsistencyScore: number;
  generationLatencyMs: number;
  entropyBits: number;
  timestamp: string;
}
