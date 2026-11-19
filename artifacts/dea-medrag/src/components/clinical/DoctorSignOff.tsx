import { useState } from 'react';
import { Award, CheckCircle2, Loader2, Stethoscope, AlertTriangle, ShieldCheck } from 'lucide-react';
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
        'Mandatory clinical justification (minimum 5 characters) is required when overriding DEA Rank #1.',
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

  return (
    <div
      data-testid="panel-doctor-signoff"
      className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border p-5 shadow-xs space-y-4"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400">
            <Stethoscope size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Attending Clinician Sign-Off & Prescribing Authority
            </h3>
            <p className="text-xs text-slate-500 dark:text-muted-foreground">
              Human-in-the-Loop Clinical Decision Support Governance
            </p>
          </div>
        </div>

        {isSigned ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 px-3 py-1 font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>SIGNED & APPROVED ({signedRecord?.id ? `AUDIT #${signedRecord.id}` : 'VERIFIED'})</span>
          </div>
        ) : (
          <span className="font-mono text-[11px] text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded px-2.5 py-1 font-semibold">
            DRAFT • PENDING SIGNATURE
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Signed Status View */}
      {isSigned && signedRecord ? (
        <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 text-xs flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
            <ShieldCheck size={16} />
            <span>Audit Record #{signedRecord.id}</span>
            <span>•</span>
            <span>Signer: {signedRecord.clinician_name}</span>
            <span>•</span>
            <span>Prescribed: {signedRecord.selected_candidate}</span>
          </div>
          <span className="text-slate-500">{new Date(signedRecord.signed_at).toLocaleTimeString()}</span>
        </div>
      ) : (
        /* Form Controls */
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* Pathway Selector */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                Selected Treatment Pathway:
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
                className="w-full rounded-lg border border-slate-300 bg-white dark:bg-card px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-teal-600 focus:outline-none"
              >
                {candidates.map((c, i) => (
                  <option key={i} value={c.candidate}>
                    Rank #{c.ranking}: {c.candidate} (Score: {c.score.toFixed(3)}) {c.contraindicated_flag ? '⚠️ Contraindicated' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Clinician Name & ID */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                  Clinician Name:
                </label>
                <input
                  type="text"
                  value={clinicianName}
                  onChange={(e) => setClinicianName(e.target.value)}
                  disabled={isSigned}
                  className="w-full rounded-lg border border-slate-300 bg-white dark:bg-card px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                  NPI/License:
                </label>
                <input
                  type="text"
                  value={licenseId}
                  onChange={(e) => setLicenseId(e.target.value)}
                  disabled={isSigned}
                  className="w-full rounded-lg border border-slate-300 bg-white dark:bg-card px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Conditional Clinical Override Input */}
          {(!isAlgorithmicMatch || isOverride) && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[11px] font-bold text-amber-800 dark:text-amber-300">
                <span>⚠️ Clinical Override Active — Mandatory Justification:</span>
                <span className="font-normal">(minimum 5 characters)</span>
              </div>
              <textarea
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                disabled={isSigned}
                rows={2}
                placeholder="Specify clinical justification, specialized risk tolerance, or tailored monitoring plan..."
                className="w-full rounded-lg border border-slate-300 bg-white dark:bg-card px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isOverride}
                  onChange={(e) => setIsOverride(e.target.checked)}
                  disabled={isSigned}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-600 size-4"
                />
                <span>Clinical Override</span>
              </label>
              {isAlgorithmicMatch && (
                <span className="font-mono text-[11px] text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-1 ml-2">
                  <Award size={13} /> Concordant with DEA Rank #1
                </span>
              )}
            </div>

            <button
              onClick={handleSign}
              disabled={isSubmitting || isSigned}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 px-5 py-2 text-xs font-semibold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>{isSigned ? 'Signed & Stored' : 'Approve & Sign-Off'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
