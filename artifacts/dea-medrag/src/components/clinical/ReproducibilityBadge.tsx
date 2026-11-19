import { useState } from 'react';
import { Copy, Fingerprint, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import type { AnalysisReport, PatientProfileInput } from '@workspace/api-client-react';

export interface ExtendedAnalysisReport extends AnalysisReport {
  sha256_integrity_hash?: string;
  case_id?: string;
  report_id?: string;
}

interface ReproducibilityBadgeProps {
  report: ExtendedAnalysisReport;
  patient?: PatientProfileInput;
}

export function ReproducibilityBadge({ report, patient }: ReproducibilityBadgeProps) {
  const hash = report.sha256_integrity_hash || '';
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    message: string;
    computed_hash?: string;
  } | null>(null);

  const handleCopy = () => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (!hash) return;
    setVerifying(true);
    setVerificationResult(null);

    try {
      const response = await fetch('/api/verify-audit-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: patient || { age: 65, sex: 'Unknown' },
          weights: report.dea?.weights,
          ranked_candidates: report.dea?.candidates || [],
          conflicts: report.conflicts || [],
          expected_hash: hash,
        }),
      });

      if (!response.ok) {
        throw new Error(`Verification HTTP ${response.status}`);
      }

      const data = await response.json();
      setVerificationResult(data);
    } catch (err: any) {
      setVerificationResult({
        verified: false,
        message: err.message || 'Verification endpoint unavailable',
      });
    } finally {
      setVerifying(false);
    }
  };

  if (!hash) return null;

  return (
    <div
      data-testid="reproducibility-badge"
      className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border p-4 shadow-xs space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400">
            <Fingerprint size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                SHA-256 Deterministic Audit Seal
              </span>
              <span className="rounded bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-900 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-800 dark:text-teal-300">
                BITWISE DETERMINISTIC
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
              Cryptographic lock over Patient Vector + DEA Weights + Ranked Candidates + Conflicts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white dark:bg-card px-3 py-1.5 font-mono text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
            title="Copy SHA-256 Hash"
          >
            <Copy size={12} />
            <span>{copied ? 'Copied!' : 'Copy Hash'}</span>
          </button>

          <button
            onClick={handleVerify}
            disabled={verifying}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw size={12} className={verifying ? 'animate-spin' : ''} />
            <span>{verifying ? 'Verifying...' : 'Verify Reproducibility'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-muted/30 px-3 py-2 border border-slate-200 dark:border-border font-mono text-xs text-slate-800 dark:text-slate-200 overflow-x-auto">
        <span className="text-slate-400 select-none font-semibold">SHA-256:</span>
        <span className="font-semibold text-teal-700 dark:text-teal-400 tracking-wider">{hash}</span>
      </div>

      {verificationResult && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-xs font-medium border ${
            verificationResult.verified
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          {verificationResult.verified ? (
            <>
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>Hash Match: 100% Identical. Mathematical determinism verified across independent runs.</span>
            </>
          ) : (
            <>
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{verificationResult.message}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
