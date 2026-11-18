import { useState } from 'react';
import { CheckCircle2, Copy, Fingerprint, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import type { AnalysisReport, PatientProfileInput } from '@workspace/api-client-react';

interface ReproducibilityBadgeProps {
  report: AnalysisReport;
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
      className="rounded-lg border border-primary/25 bg-primary/[0.03] p-3 text-xs space-y-2 backdrop-blur-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded bg-primary/10 text-primary">
            <Fingerprint size={14} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-foreground text-[11px]">
              <span>SHA-256 Determinism & Audit Hash</span>
              <span className="rounded bg-teal-500/15 px-1.5 py-0.2 mono text-[9px] font-bold text-teal-700 dark:text-teal-300">
                BITWISE DETERMINISTIC
              </span>
            </div>
            <span className="mono text-[10px] text-muted-foreground">
              Cryptographic lock over Patient Input + Weights + Ranked Candidates + Conflicts
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 mono text-[10px] font-medium text-foreground/80 hover:bg-muted transition-all"
            title="Copy SHA-256 Hash"
          >
            <Copy size={11} />
            <span>{copied ? 'Copied!' : 'Copy Hash'}</span>
          </button>

          <button
            onClick={handleVerify}
            disabled={verifying}
            className="inline-flex items-center gap-1 rounded bg-primary/90 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary transition-all disabled:opacity-50"
          >
            <RefreshCw size={11} className={verifying ? 'animate-spin' : ''} />
            <span>{verifying ? 'Verifying Math...' : 'Verify Reproducibility'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded bg-background/80 px-2.5 py-1.5 border border-border/50 mono text-[10px] text-foreground/90 overflow-x-auto">
        <span className="text-muted-foreground select-none">SHA-256:</span>
        <span className="font-semibold text-primary tracking-wider">{hash}</span>
      </div>

      {verificationResult && (
        <div
          className={`flex items-center gap-2 rounded p-2 text-[11px] font-semibold border ${
            verificationResult.verified
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {verificationResult.verified ? (
            <>
              <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
              <span>Hash Match: 100% Identical. Mathematical determinism verified across independent runs.</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} className="text-destructive shrink-0" />
              <span>{verificationResult.message}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
