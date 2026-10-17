/**
 * device-passport — Digital Device Passports for Modern Web Automation & Scrapers
 * 100% consistent, stateful browser personas with sticky hardware, correlated Client-Hints,
 * and geo-aligned locales.
 *
 * @packageDocumentation
 */

export const VERSION = '1.0.0'

// --- Core Passport APIs ---
export {
  DevicePassportInstance,
  createPassport,
  type CreatePassportInputOptions
} from './passport'

export {
  PassportManager,
  type PassportManagerOptions
} from './manager'

// --- Engine & Matrix ---
export * from './engine'

// --- Geo & Chrono Aligner ---
export * from './geo'

// --- Dual-Mode Adapters ---
export * from './adapters'

// --- Storage Adapters ---
export * from './storage'

// --- Evaluator & Academic Metrics ---
export * from './evaluator'

// --- Academic Benchmark Suite ---
export * from './benchmark'

// --- Types ---
export * from './types'
