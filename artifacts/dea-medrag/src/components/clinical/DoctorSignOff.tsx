import { useState } from 'react';
import { Award, CheckCircle2, FileCheck, FileText, Printer, Stethoscope, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import type { AnalysisReport, CandidateScore, PatientProfileInput } from '@workspace/api-client-react';

interface DoctorSignOffProps {
  report: AnalysisReport;
  patient?: PatientProfileInput;
  candidates: CandidateScore[];
  onSignSuccess?: (decision: any) => void;
}

export function DoctorSignOff({ report, patient, candidates, onSignSuccess }: DoctorSignOffProps) {
  const topCandidate = candidates[0];
  const [selectedPathway, setSelectedPathway] = useState<string>(() => topCandidate?.candidate || '');
  const [clinicianName, setClinicianName] = useState('Dr. Sarah Lin, MD');
  const [clinicianRole, setClinicianRole] = useState('Attending Nephrologist / Hospitalist');
  const [licenseId, setLicenseId] = useState('MD-94021-CAL');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isOverride, setIsOverride] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signedRecord, setSignedRecord] = useState<any>(null);

  const isAlgorithmicMatch = selectedPathway === topCandidate?.candidate && !isOverride;

  const handleSign = async () => {
    setErrorMessage(null);

    if (!clinicianName.trim()) {
      setErrorMessage('Attending clinician name is required.');
      return;
    }

    const actionTaken = isAlgorithmicMatch ? 'accepted_top_dea' : 'clinical_override';

    if (actionTaken === 'clinical_override' && overrideNotes.trim().length < 5) {
      setErrorMessage(
        'Mandatory clinical justification (minimum 5 characters) is required when overriding the DEA Rank #1 recommendation or applying a manual override.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/clinical-signoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: report.id,
          clinician_name: `${clinicianName.trim()} (${licenseId.trim()})`,
          selected_candidate: selectedPathway,
          action_taken: actionTaken,
          override_reason: actionTaken === 'clinical_override' ? overrideNotes.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to record decision (HTTP ${response.status})`);
      }

      const data = await response.json();
      setIsSigned(true);
      setSignedRecord(data.decision);
      if (onSignSuccess) {
        onSignSuccess(data.decision);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit clinical sign-off');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      data-testid="panel-doctor-signoff"
      className="glass-card rounded-xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 shadow-lg space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Stethoscope size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Attending Clinician Decision & Sign-Off
            </h3>
            <span className="mono text-[10px] text-muted-foreground uppercase tracking-wider">
              Final Prescribing Authority • Human-in-the-Loop Governance
            </span>
          </div>
        </div>

        {isSigned ? (
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>SIGNED & CLINICALLY APPROVED ({signedRecord?.id || 'VERIFIED'})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 mono text-xs font-bold text-amber-700 dark:text-amber-300">
            <span>DRAFT • PENDING CLINICIAN SIGNATURE</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive font-medium">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSigned && signedRecord && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck size={16} />
            <span>Immutable Audit Log Record #{signedRecord.id}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mono text-[11px] text-foreground/80 pt-1">
            <div>
              <span className="text-muted-foreground">Signer: </span>
              <span className="font-semibold">{signedRecord.clinician_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Action: </span>
              <span className="font-semibold capitalize">{signedRecord.action_taken.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Timestamp: </span>
              <span className="font-semibold">{new Date(signedRecord.signed_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Selected Clinical Pathway */}
        <div className="space-y-1.5">
          <label className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Selected Clinical Treatment Pathway:
          </label>
          <select
            value={selectedPathway}
            onChange={(e) => {
              setSelectedPathway(e.target.value);
              if (e.target.value !== topCandidate?.candidate) {
                setIsOverride(true);
              }
            }}
            disabled={isSigned}
            className="w-full rounded-md border border-input bg-background p-2.5 text-xs font-medium focus:border-primary focus:outline-none"
          >
            {candidates.map((c, i) => (
              <option key={i} value={c.candidate}>
                Rank #{c.ranking}: {c.candidate} (Score: {c.score.toFixed(3)}) {c.contraindicated_flag ? '⚠️ Contraindicated' : ''}
              </option>
            ))}
          </select>
          {isAlgorithmicMatch ? (
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
              <Award size={12} /> Concordant with DEA Rank #1 mathematical optimum.
            </p>
          ) : (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
              ⚠️ Deviating from algorithmic Rank #1: Clinical override justification required.
            </p>
          )}
        </div>

        {/* Clinician Details */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Attending Clinician:
            </label>
            <input
              type="text"
              value={clinicianName}
              onChange={(e) => setClinicianName(e.target.value)}
              disabled={isSigned}
              className="w-full rounded-md border border-input bg-background p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              License / NPI ID:
            </label>
            <input
              type="text"
              value={licenseId}
              onChange={(e) => setLicenseId(e.target.value)}
              disabled={isSigned}
              className="w-full rounded-md border border-input bg-background p-2 text-xs mono focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Clinical Override & Attending Notes */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <label className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText size={12} />
            Clinical Notes & Override Documentation:
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] mono text-muted-foreground">
            <input
              type="checkbox"
              checked={isOverride}
              onChange={(e) => setIsOverride(e.target.checked)}
              disabled={isSigned}
              className="rounded accent-primary"
            />
            <span>Clinical Override Applied</span>
          </label>
        </div>
        <textarea
          value={overrideNotes}
          onChange={(e) => setOverrideNotes(e.target.value)}
          disabled={isSigned}
          rows={2}
          placeholder="Document clinical rationale, specific patient contraindication considerations, or monitoring plan (mandatory if applying clinical override)..."
          className="w-full rounded-md border border-input bg-background p-2.5 text-xs leading-relaxed focus:border-primary focus:outline-none"
        />
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3.5">
        <div className="mono text-[10px] text-muted-foreground">
          ClearDose Verification Seal • SHA-256 Audit Trail Linked • SaMD Tier 2 Concordance
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted text-foreground transition-all shadow-2xs"
          >
            <Printer size={13} />
            Export / Print Verified Report
          </button>

          {!isSigned ? (
            <button
              onClick={handleSign}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Recording in Audit Log...</span>
                </>
              ) : (
                <>
                  <FileCheck size={14} />
                  <span>Sign & Approve Decision</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                setIsSigned(false);
                setSignedRecord(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Revoke / Edit Signature
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
