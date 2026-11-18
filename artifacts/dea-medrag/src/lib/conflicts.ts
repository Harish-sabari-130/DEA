import type { Conflict } from '@workspace/api-client-react';

export type ConflictCategory =
  | 'CONFIRMED_CONFLICT'
  | 'RETRIEVAL_COVERAGE_GAP_ADVISORY'
  | 'DATA_QUALITY_ADVISORY'
  | 'UNKNOWN_STATUS_CONFLICT'
  | 'NO_CONFLICT_DETECTED_BY_RULE';

export interface EvidenceProvenance {
  source_id?: string;
  chunk_id?: string;
  source_title?: string;
  relevant_excerpt?: string;
  match_rationale?: string;
  section?: string;
  url?: string;
  [key: string]: unknown;
}

export interface ConflictLike {
  conflict_detected?: boolean;
  status?: string;
  evidence_linkage?: string;
  provenance?: EvidenceProvenance | Record<string, unknown> | null;
  [key: string]: unknown;
}

/**
 * Validate that a conflict record contains complete, valid provenance.
 * Mandatory fields: source_id, chunk_id, source_title, relevant_excerpt, match_rationale.
 * A field is valid only when it is a string containing non-whitespace characters.
 */
export function isProvenanceComplete(c: Conflict | ConflictLike): boolean {
  if (!c || typeof c !== 'object') return false;
  const prov = (c as ConflictLike).provenance;
  if (!prov || typeof prov !== 'object') return false;
  const mandatory = [
    'source_id',
    'chunk_id',
    'source_title',
    'relevant_excerpt',
    'match_rationale',
  ] as const;
  for (const field of mandatory) {
    const val = (prov as Record<string, unknown>)[field];
    if (typeof val !== 'string' || val.trim().length === 0) {
      return false;
    }
  }
  return true;
}

/**
 * Strict verified-conflict classification helper for DEA-MedRAG.
 *
 * Rules:
 * - CONFIRMED_CONFLICT + VERIFIED + complete provenance -> 'CONFIRMED_CONFLICT' (verified conflict)
 * - CONFIRMED_CONFLICT + VERIFIED + incomplete provenance -> 'UNKNOWN_STATUS_CONFLICT' (degraded unverified)
 * - CONFIRMED_CONFLICT + COVERAGE_GAP / UNMATCHED_RETRIEVAL -> 'RETRIEVAL_COVERAGE_GAP_ADVISORY' (retrieval coverage gap)
 * - CONFIRMED_CONFLICT + UNSPECIFIED / missing linkage -> 'UNKNOWN_STATUS_CONFLICT' (unverified alert)
 * - RETRIEVAL_COVERAGE_GAP_ADVISORY -> 'RETRIEVAL_COVERAGE_GAP_ADVISORY'
 * - DATA_QUALITY_ADVISORY -> 'DATA_QUALITY_ADVISORY'
 * - NO_CONFLICT_DETECTED_BY_RULE / SAFE_CONCORDANT -> 'NO_CONFLICT_DETECTED_BY_RULE'
 * - Missing status / unrecognized status with conflict_detected: true -> 'UNKNOWN_STATUS_CONFLICT'
 * - Missing status / unrecognized status with conflict_detected: false -> 'NO_CONFLICT_DETECTED_BY_RULE'
 */
export function getConflictCategory(c: Conflict | ConflictLike): ConflictCategory {
  const item = c as ConflictLike;
  const rawStatus = item.status;
  const detected = Boolean(item.conflict_detected);
  const linkage = item.evidence_linkage ? String(item.evidence_linkage).trim().toUpperCase() : undefined;

  if (linkage === 'DATA_QUALITY_GUARDRAIL') {
    return 'DATA_QUALITY_ADVISORY';
  }
  if (linkage === 'NONE' && !detected) {
    return 'NO_CONFLICT_DETECTED_BY_RULE';
  }

  if (rawStatus) {
    const s = String(rawStatus).trim().toUpperCase();
    if (s === 'CONFIRMED_CONFLICT' || s === 'VERIFIED_CONFLICT') {
      if (linkage === 'VERIFIED') {
        if (isProvenanceComplete(c)) {
          return 'CONFIRMED_CONFLICT';
        }
        return 'UNKNOWN_STATUS_CONFLICT';
      }
      if (linkage === 'COVERAGE_GAP' || linkage === 'UNMATCHED_RETRIEVAL') {
        return 'RETRIEVAL_COVERAGE_GAP_ADVISORY';
      }
      return 'UNKNOWN_STATUS_CONFLICT';
    }
    if (s === 'RETRIEVAL_COVERAGE_GAP_ADVISORY' || s === 'COVERAGE_GAP_ADVISORY') {
      return 'RETRIEVAL_COVERAGE_GAP_ADVISORY';
    }
    if (s === 'DATA_QUALITY_ADVISORY' || s === 'QUALITY_ADVISORY') {
      return 'DATA_QUALITY_ADVISORY';
    }
    if (s === 'NO_CONFLICT_DETECTED_BY_RULE' || s === 'SAFE_CONCORDANT' || s === 'NO_CONFLICT') {
      return 'NO_CONFLICT_DETECTED_BY_RULE';
    }
    return detected ? 'UNKNOWN_STATUS_CONFLICT' : 'NO_CONFLICT_DETECTED_BY_RULE';
  }

  // Conservative legacy handling: missing status is never safe and never verified
  return detected ? 'UNKNOWN_STATUS_CONFLICT' : 'NO_CONFLICT_DETECTED_BY_RULE';
}
