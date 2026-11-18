import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, Check, CheckCircle2, GitCompare, Pill, RefreshCw, ShieldAlert, Sparkles, X } from 'lucide-react';
import { useReconcileMedications, type PatientProfileInput, type MedicationReconciliationReport } from '@workspace/api-client-react';

interface MedicationReconcilerProps {
  initialClinicMeds: string[];
  initialDischargeMeds: string[];
  patient?: PatientProfileInput;
  initialReport?: MedicationReconciliationReport;
  onConfirmMerge?: (newMedList: string[]) => void;
  onClose?: () => void;
}

export function MedicationReconciler({
  initialClinicMeds,
  initialDischargeMeds,
  patient,
  initialReport,
  onConfirmMerge,
  onClose,
}: MedicationReconcilerProps) {
  const [listAText, setListAText] = useState(() => initialClinicMeds.join('\n'));
  const [listBText, setListBText] = useState(() => initialDischargeMeds.join('\n'));

  const reconcileMutation = useReconcileMedications();
  const [report, setReport] = useState<MedicationReconciliationReport | undefined>(initialReport);

  const runReconcile = () => {
    const listA = listAText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const listB = listBText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    reconcileMutation.mutate(
      {
        data: {
          clinic_medications: listA,
          discharge_medications: listB,
          patient,
        },
      },
      {
        onSuccess: (data) => setReport(data),
      }
    );
  };

  useEffect(() => {
    if (!report && (initialClinicMeds.length > 0 || initialDischargeMeds.length > 0)) {
      runReconcile();
    }
  }, []);

  const handleMerge = () => {
    const listB = listBText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (onConfirmMerge) {
      onConfirmMerge(listB);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      data-testid="panel-medication-reconciler"
      className="glass-card rounded-xl border border-primary/25 bg-card/95 p-6 shadow-xl animate-rise space-y-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <GitCompare size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Clinical Medication Reconciler
            </h2>
            <p className="text-xs text-muted-foreground">
              Cross-checks Outpatient Baseline vs. Discharge Orders to intercept omissions, dose gaps, and therapeutic duplication.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {report && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 mono text-[11px] font-bold uppercase ${
                report.safe_to_proceed
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300 animate-pulse'
              }`}
            >
              {report.safe_to_proceed ? (
                <>
                  <CheckCircle2 size={13} /> Safe to Discharge
                </>
              ) : (
                <>
                  <AlertTriangle size={13} /> High-Risk Discrepancy
                </>
              )}
            </span>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Two-Column Editor: Outpatient vs Discharge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* List A */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mono text-[11px] text-muted-foreground">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Pill size={13} className="text-primary" />
              List A: Outpatient / Clinic Baseline
            </span>
            <span>{listAText.split('\n').filter((s) => s.trim()).length} Meds</span>
          </div>
          <textarea
            value={listAText}
            onChange={(e) => setListAText(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-input bg-background p-3 mono text-xs leading-relaxed focus:border-primary focus:outline-none"
            placeholder="One medication per line, e.g. Metformin 500 mg twice daily"
          />
        </div>

        {/* List B */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mono text-[11px] text-muted-foreground">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Pill size={13} className="text-teal-600 dark:text-teal-400" />
              List B: Hospital Admission / Discharge
            </span>
            <span>{listBText.split('\n').filter((s) => s.trim()).length} Meds</span>
          </div>
          <textarea
            value={listBText}
            onChange={(e) => setListBText(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-input bg-background p-3 mono text-xs leading-relaxed focus:border-primary focus:outline-none"
            placeholder="One medication per line, e.g. Metformin 1000 mg twice daily"
          />
        </div>
      </div>

      {/* Reconcile Action Trigger */}
      <div className="flex items-center justify-between">
        <button
          onClick={runReconcile}
          disabled={reconcileMutation.isPending}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-3.5 py-1.5 text-xs font-semibold hover:bg-muted text-foreground transition-all"
        >
          <RefreshCw size={13} className={reconcileMutation.isPending ? 'animate-spin' : ''} />
          {reconcileMutation.isPending ? 'Analyzing Discrepancies...' : 'Compare Lists'}
        </button>

        <button
          onClick={handleMerge}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all"
        >
          <Check size={14} />
          Confirm & Merge into Active Profile
        </button>
      </div>

      {/* Reconciler Discrepancies Summary & Highlights */}
      {report && (
        <div className="space-y-4 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Reconciliation Findings ({report.discrepancies?.length ?? 0})
            </span>
            <span className="mono text-[11px] text-muted-foreground font-medium">
              {report.summary}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Omitted / Missing */}
            {report.missing_in_discharge && report.missing_in_discharge.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 mono text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
                  <AlertCircle size={13} />
                  <span>Omitted in Discharge ({report.missing_in_discharge.length})</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-foreground/90 font-medium">
                  {report.missing_in_discharge.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Added in Discharge */}
            {report.added_in_discharge && report.added_in_discharge.length > 0 && (
              <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 mono text-[10px] font-bold uppercase text-sky-700 dark:text-sky-400">
                  <Sparkles size={13} />
                  <span>Newly Initiated ({report.added_in_discharge.length})</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-foreground/90 font-medium">
                  {report.added_in_discharge.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dose & Frequency Discrepancies */}
            {((report.dose_discrepancy && report.dose_discrepancy.length > 0) ||
              (report.frequency_discrepancy && report.frequency_discrepancy.length > 0)) && (
              <div className="rounded-lg border border-purple-500/40 bg-purple-500/10 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 mono text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400">
                  <GitCompare size={13} />
                  <span>Dose / Frequency Shifts</span>
                </div>
                <ul className="space-y-1 text-foreground/90">
                  {report.dose_discrepancy?.map((d: any, i: number) => (
                    <li key={`d-${i}`} className="font-medium">
                      {d.medication}: {d.admission_dose} <ArrowRight size={10} className="inline mx-0.5" /> {d.discharge_dose}
                    </li>
                  ))}
                  {report.frequency_discrepancy?.map((f: any, i: number) => (
                    <li key={`f-${i}`} className="font-medium">
                      {f.medication}: {f.admission_frequency} <ArrowRight size={10} className="inline mx-0.5" /> {f.discharge_frequency}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* High-Risk Discrepancies */}
            {report.high_risk_discrepancies && report.high_risk_discrepancies.length > 0 && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/15 p-3 space-y-1.5 md:col-span-2 lg:col-span-3">
                <div className="flex items-center gap-1.5 mono text-[10px] font-bold uppercase text-red-700 dark:text-red-300">
                  <ShieldAlert size={14} className="text-red-600" />
                  <span>High-Risk Clinical Hazard Detected</span>
                </div>
                <div className="space-y-1.5">
                  {report.high_risk_discrepancies.map((hr: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-red-800 dark:text-red-200">
                      <span className="font-bold uppercase text-red-600">• {hr.medication}:</span>
                      <span>{hr.hazard || hr.details}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
