import crypto from "crypto";

/**
 * Deterministic canonical JSON stringification (RFC 8785 JSON Canonicalization Scheme proxy)
 * Ensures dictionary keys are recursively sorted and floats/integers format predictably,
 * so identical clinical content always computes the exact same SHA-256 integrity hash.
 */
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJsonStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJsonStringify(obj[k])).join(",") + "}";
}

/**
 * Computes a deterministic SHA-256 integrity hash over:
 * (patient_profile + dea_weights + ranked_candidates + cross_silo_conflicts)
 */
export function computeAuditIntegrityHash(
  patientInput: any,
  deaWeights: any,
  rankedCandidates: any[],
  conflicts: any[],
): string {
  const normalizedPayload = {
    patient: {
      age: patientInput?.age ?? null,
      sex: patientInput?.sex ? String(patientInput.sex).toLowerCase() : null,
      diseases: Array.isArray(patientInput?.diseases) ? [...patientInput.diseases].sort() : [],
      medications: Array.isArray(patientInput?.medications) ? [...patientInput.medications].sort() : [],
      lab_values: patientInput?.lab_values || {},
      allergies: Array.isArray(patientInput?.allergies) ? [...patientInput.allergies].sort() : [],
    },
    dea_weights: {
      alpha: Number(deaWeights?.alpha ?? 0.35),
      beta: Number(deaWeights?.beta ?? 0.30),
      gamma: Number(deaWeights?.gamma ?? 0.15),
      delta: Number(deaWeights?.delta ?? 0.20),
    },
    ranked_candidates: (rankedCandidates || []).map((c: any) => ({
      candidate: String(c.candidate || "").trim(),
      score: Number(c.score ?? c.v_score ?? 0),
      p_risk: Number(c.p_risk ?? 0),
      q_grade: Number(c.q_grade ?? 0),
      s_rel: Number(c.s_rel ?? 0),
      t_recent: Number(c.t_recent ?? 0),
      source: String(c.source || "").trim(),
    })),
    conflicts: (conflicts || []).map((cf: any) => ({
      affected_treatment: String(cf.affected_treatment || ""),
      severity: String(cf.severity || ""),
      conflict_type: String(cf.conflict_type || ""),
    })),
  };

  const canonicalString = canonicalJsonStringify(normalizedPayload);
  return crypto.createHash("sha256").update(canonicalString, "utf8").digest("hex");
}

export function verifyAuditHash(
  patientInput: any,
  deaWeights: any,
  rankedCandidates: any[],
  conflicts: any[],
  expectedHash: string,
): {
  computed_hash: string;
  expected_hash: string;
  verified: boolean;
  hash_match: boolean;
  match_percentage: number;
  match_status: string;
  message: string;
} {
  const computed = computeAuditIntegrityHash(patientInput, deaWeights, rankedCandidates, conflicts);
  const isMatch = computed.toLowerCase() === (expectedHash || "").trim().toLowerCase();
  return {
    computed_hash: computed,
    expected_hash: expectedHash,
    verified: isMatch,
    hash_match: isMatch,
    match_percentage: isMatch ? 100 : 0,
    match_status: isMatch ? "100% Identical" : "Discrepancy Detected",
    message: isMatch
      ? "Hash Match: 100% Identical. Mathematical determinism verified."
      : "Hash Discrepancy: Evidence inputs or ranking parameters do not match audit log.",
  };
}
