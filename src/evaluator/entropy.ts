/**
 * Shannon Entropy Analyzer for Device Passport HTTP Headers.
 *
 * Grounded in Information Theory (Shannon, 1948: "A Mathematical Theory of Communication"):
 * H(X) = - \sum_{i=1}^{n} P(x_i) \log_2 P(x_i)
 *
 * Evaluates generated header distributions against empirical modern browser baselines
 * to detect:
 * 1. Under-parameterized / Low-entropy signatures (naive scrapers, curl, missing sec-ch headers)
 * 2. Over-parameterized / High-entropy anomalies (random noise injection, spoofing artifacts)
 * 3. Relative Entropy (Kullback-Leibler Divergence) against empirical Chrome/Edge/Safari profiles
 */

export interface HeaderEntropyProfile {
  characterEntropy: number; // Shannon entropy in bits per character
  structuralEntropy: number; // Header presence and complexity entropy
  klDivergence: number; // KL-Divergence from baseline modern browser distribution
  totalHeaderBytes: number;
  headerCount: number;
}

export interface EntropyAnalysisResult {
  entropyScore: number; // 0 - 100% (100% = optimal human/browser natural distribution)
  estimatedBits: number;
  klDivergence: number;
  anomaly: 'too_low' | 'too_high' | 'optimal';
  collisionRisk: 'very_low' | 'low' | 'moderate' | 'high';
  verdict: string;
  details: {
    characterEntropy: number;
    structuralEntropy: number;
    baselineEntropy: number;
    deltaFromOptimal: number;
  };
}

/**
 * Empirical baseline frequency distribution of headers in real modern desktop browsers (Chromium 120+).
 * Baseline average entropy is calibrated at 4.45 bits/char.
 */
export const BROWSER_BASELINE_FREQUENCIES: Record<string, number> = {
  'sec-ch-ua': 0.12,
  'sec-ch-ua-mobile': 0.04,
  'sec-ch-ua-platform': 0.08,
  'upgrade-insecure-requests': 0.04,
  'user-agent': 0.22,
  'accept': 0.14,
  'sec-fetch-site': 0.05,
  'sec-fetch-mode': 0.05,
  'sec-fetch-user': 0.03,
  'sec-fetch-dest': 0.05,
  'accept-encoding': 0.08,
  'accept-language': 0.10,
};

export const OPTIMAL_CHAR_ENTROPY_MIN = 4.6; // bits per character for serialized full browser headers
export const OPTIMAL_CHAR_ENTROPY_MAX = 5.6; // bits per character
export const OPTIMAL_ENTROPY_MIN = OPTIMAL_CHAR_ENTROPY_MIN;
export const OPTIMAL_ENTROPY_MAX = OPTIMAL_CHAR_ENTROPY_MAX;
export const BASELINE_OPTIMAL_ENTROPY = 5.25; // theoretical center of mass
export const MIN_STRUCTURAL_ENTROPY = 3.5; // requires standard browser header presence

/**
 * Calculates fundamental Shannon Information Entropy (in bits) of any string input.
 * H(X) = -\sum_{i=1}^n P(x_i) \log_2 P(x_i)
 */
export function calculateShannonEntropy(data: string): number {
  if (!data || data.length === 0) return 0;

  const frequencies = new Map<string, number>();
  const total = data.length;

  for (let i = 0; i < total; i++) {
    const char = data[i];
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return Number(entropy.toFixed(4));
}

/**
 * Calculates structural header presence entropy across expected browser header space.
 */
export function calculateStructuralEntropy(headers: Record<string, string>): number {
  const normalizedKeys = Object.keys(headers).map((k) => k.toLowerCase());
  const baselineKeys = Object.keys(BROWSER_BASELINE_FREQUENCIES);

  if (normalizedKeys.length === 0) return 0;

  let presentCount = 0;
  for (const key of baselineKeys) {
    if (normalizedKeys.includes(key)) {
      presentCount++;
    }
  }

  // Ratio of expected modern headers present
  const presenceRatio = presentCount / baselineKeys.length;
  // Weight by total unique headers
  const countFactor = Math.min(normalizedKeys.length / 10, 1.0);

  return Number((presenceRatio * 3.0 + countFactor * 2.0).toFixed(4));
}

/**
 * Calculates Kullback-Leibler (KL) Divergence:
 * D_KL(P || Q) = \sum P(x) * log2(P(x) / Q(x))
 * Measures informational distance between current header distribution and natural browser baseline.
 */
export function calculateKLDivergence(headers: Record<string, string>): number {
  const normalizedHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    normalizedHeaders[k.toLowerCase()] = v;
  }

  const baselineKeys = Object.keys(BROWSER_BASELINE_FREQUENCIES);
  let totalLength = 0;
  const observedLengths: Record<string, number> = {};

  for (const key of baselineKeys) {
    const val = normalizedHeaders[key] || '';
    const len = val.length + key.length;
    observedLengths[key] = len;
    totalLength += len;
  }

  if (totalLength === 0) return 3.5; // High divergence on empty set

  let klDiv = 0;
  const epsilon = 1e-4; // Smoothing factor for zero probabilities

  for (const key of baselineKeys) {
    const p = (observedLengths[key] || 0) / totalLength + epsilon;
    const q = BROWSER_BASELINE_FREQUENCIES[key] || epsilon;

    klDiv += p * Math.log2(p / q);
  }

  return Number(Math.max(0, klDiv).toFixed(4));
}

/**
 * Analyzes the entropy of an HTTP header dictionary.
 * Evaluates whether entropy is in the realistic "sweet spot" of real browser traffic.
 */
export function analyzeHeaderEntropy(headers: Record<string, string>): EntropyAnalysisResult {
  if (!headers || Object.keys(headers).length === 0) {
    return {
      entropyScore: 0,
      estimatedBits: 0,
      klDivergence: 4.0,
      anomaly: 'too_low',
      collisionRisk: 'high',
      verdict: 'Completely static or empty headers; trivially detectable as automated bot.',
      details: {
        characterEntropy: 0,
        structuralEntropy: 0,
        baselineEntropy: BASELINE_OPTIMAL_ENTROPY,
        deltaFromOptimal: BASELINE_OPTIMAL_ENTROPY,
      },
    };
  }

  // Serialize headers to canonical wire format: "key: value\r\n"
  const serialized = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k.toLowerCase()}: ${v}`)
    .join('\r\n');

  const charEntropy = calculateShannonEntropy(serialized);
  const structEntropy = calculateStructuralEntropy(headers);
  const klDiv = calculateKLDivergence(headers);
  const headerCount = Object.keys(headers).length;

  // Evaluate deviation from optimal entropy band
  let anomaly: 'too_low' | 'too_high' | 'optimal' = 'optimal';
  let penalty = 0;

  if (headerCount < 4 || structEntropy < MIN_STRUCTURAL_ENTROPY || charEntropy < OPTIMAL_CHAR_ENTROPY_MIN) {
    anomaly = 'too_low';
    const structDeficit = Math.max(0, MIN_STRUCTURAL_ENTROPY - structEntropy);
    penalty += structDeficit * 15;
    const charDeficit = Math.max(0, OPTIMAL_CHAR_ENTROPY_MIN - charEntropy);
    penalty += charDeficit * 25;
    if (headerCount < 4) {
      penalty += (4 - headerCount) * 15;
    }
  } else if (charEntropy > OPTIMAL_CHAR_ENTROPY_MAX) {
    anomaly = 'too_high';
    const excess = charEntropy - OPTIMAL_CHAR_ENTROPY_MAX;
    penalty += excess * 30; // Penalty for over-randomized spoof noise
  }

  // Penalty for excessive KL-divergence
  penalty += Math.min(klDiv * 12, 30);

  const rawScore = 100 - penalty;
  const entropyScore = Number(Math.max(0, Math.min(100, rawScore)).toFixed(1));

  // Determine collision risk and verdict
  let collisionRisk: 'very_low' | 'low' | 'moderate' | 'high' = 'very_low';
  let verdict = 'Realistic entropy distribution matching authentic browser telemetry.';

  if (anomaly === 'too_low') {
    collisionRisk = 'high';
    verdict = 'Under-randomized or missing essential browser headers; high risk of bot detection.';
  } else if (anomaly === 'too_high') {
    collisionRisk = 'moderate';
    verdict = 'Hyper-randomized noise detected; synthetic fingerprint spoofing risk.';
  } else if (entropyScore >= 85) {
    collisionRisk = 'very_low';
    verdict = 'Optimal information entropy perfectly consistent with real Chromium/Safari sessions.';
  } else {
    collisionRisk = 'low';
    verdict = 'Acceptable entropy band with minor structural divergence.';
  }

  return {
    entropyScore,
    estimatedBits: charEntropy,
    klDivergence: klDiv,
    anomaly,
    collisionRisk,
    verdict,
    details: {
      characterEntropy: charEntropy,
      structuralEntropy: structEntropy,
      baselineEntropy: BASELINE_OPTIMAL_ENTROPY,
      deltaFromOptimal: Number(Math.abs(charEntropy - BASELINE_OPTIMAL_ENTROPY).toFixed(4)),
    },
  };
}
