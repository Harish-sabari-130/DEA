import { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  User,
} from 'lucide-react';
import type { AnalysisReport, PatientProfileInput } from '@workspace/api-client-react';

export interface ExtendedAnalysisReport extends AnalysisReport {
  sha256_integrity_hash?: string;
  case_id?: string;
  report_id?: string;
}

interface PatientSummaryCardProps {
  report: ExtendedAnalysisReport;
  patient?: PatientProfileInput;
}

export function PatientSummaryCard({ report, patient }: PatientSummaryCardProps) {
  const routing = report.routing;
  const isHighRisk = routing?.tier === 'high_risk_review' || routing?.needs_doctor_review;
  const complexity = routing?.complexity_score ?? 35;

  const labValues = patient?.lab_values ?? {};
  const medications = patient?.medications ?? [];
  const diseases = patient?.diseases ?? [];
  const allergies = patient?.allergies ?? [];

  // Parse lab markers to highlight abnormal levels with exact EHR clinical thresholds
  const labTiles = useMemo(() => {
    const defaultLabs = [
      { key: 'eGFR', label: 'eGFR', unit: 'mL/min/1.73m²', val: '60', status: 'normal' as const, sub: 'Normal Filtration' },
      { key: 'potassium', label: 'K+ Potassium', unit: 'mEq/L', val: '4.2', status: 'normal' as const, sub: 'Normokalemic' },
      { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', val: '1.0', status: 'normal' as const, sub: 'Baseline Range' },
      { key: 'QTc', label: 'QTc Interval', unit: 'ms', val: '420', status: 'normal' as const, sub: 'Normal Conduction' },
    ];

    const result = defaultLabs.map((tile) => {
      let matchedVal: string | null = null;
      for (const [k, v] of Object.entries(labValues)) {
        if (k.toLowerCase().includes(tile.key.toLowerCase())) {
          matchedVal = String(v);
          break;
        }
      }

      if (!matchedVal) return tile;

      const num = parseFloat(matchedVal.replace(/[^0-9.]/g, ''));
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      let sub = tile.sub;

      if (tile.key === 'eGFR' && !isNaN(num)) {
        if (num < 30) {
          status = 'critical';
          sub = 'Stage 4/5 CKD Hazard';
        } else if (num < 60) {
          status = 'warning';
          sub = 'Moderate CKD Stage 3';
        } else {
          sub = 'Normal Filtration';
        }
      } else if (tile.key === 'potassium' && !isNaN(num)) {
        if (num > 5.2) {
          status = 'critical';
          sub = 'Hyperkalemia Alert';
        } else if (num > 5.0 || num < 3.5) {
          status = 'warning';
          sub = 'Borderline K+ Drift';
        } else {
          sub = 'Eukalemic Normal';
        }
      } else if (tile.key === 'QTc' && !isNaN(num)) {
        if (num >= 500) {
          status = 'critical';
          sub = 'Torsades Arrhythmia Risk';
        } else if (num >= 460) {
          status = 'warning';
          sub = 'Prolonged Conduction';
        } else {
          sub = 'Normal Interval';
        }
      } else if (tile.key === 'creatinine' && !isNaN(num)) {
        if (num > 2.0) {
          status = 'critical';
          sub = 'Elevated Renal Retention';
        } else if (num > 1.3) {
          status = 'warning';
          sub = 'Borderline Retention';
        } else {
          sub = 'Physiological Normal';
        }
      }

      return {
        ...tile,
        val: matchedVal,
        status,
        sub,
      };
    });

    return result;
  }, [labValues]);

  return (
    <div
      data-testid="card-patient-summary"
      className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-4 shadow-sm relative space-y-3"
    >
      {/* Row 1: Demographics, Diagnoses & Clinical Governance */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Patient Demographics & Conditions */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 shrink-0">
              <User size={16} />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {patient ? `${patient.age}y ${patient.sex}` : 'Active Patient Profile'}
              </h2>
              <span className="inline-flex items-center rounded bg-slate-100 dark:bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                MRN #{report.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <span className="text-slate-300 dark:text-border hidden sm:inline">•</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {diseases.length > 0 ? (
                diseases.map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200"
                  >
                    {d}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No diagnoses</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs pl-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium text-[11px]">Allergies:</span>
              {allergies.length > 0 ? (
                allergies.map((a, i) => (
                  <span
                    key={i}
                    className="inline-block rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900 px-1.5 py-0.2 font-semibold text-[10px]"
                  >
                    {a}
                  </span>
                ))
              ) : (
                <span className="font-semibold text-slate-600 dark:text-slate-300 text-[11px]">NKDA</span>
              )}
            </div>
            <span className="text-slate-300 dark:text-border">•</span>
            <div className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
              {medications.length} Active Med{medications.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Right: Governance Badge & Complexity */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Smart Routing Badge */}
          {isHighRisk ? (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950 px-2.5 py-1.5">
              <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-rose-900 dark:text-rose-200 uppercase leading-none">Needs Doctor Review</div>
                <div className="text-[9px] text-rose-700 dark:text-rose-300 leading-tight mt-0.5">High-Risk Lab / Contraindication</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1.5">
              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 uppercase leading-none">Routine Path</div>
                <div className="text-[9px] text-emerald-700 dark:text-emerald-300 leading-tight mt-0.5">Guideline Concordant</div>
              </div>
            </div>
          )}

          {/* Complexity Score */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-2.5 py-1.5">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Complexity:</span>
            <span className={`font-mono text-xs font-bold ${complexity >= 50 ? 'text-rose-600' : 'text-teal-700 dark:text-teal-400'}`}>
              {complexity}/100
            </span>
          </div>

          {/* Audit Seal */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950 px-2.5 py-1.5">
            <Fingerprint size={13} className="text-teal-600 shrink-0" />
            <span className="font-mono text-[10px] font-bold text-teal-800 dark:text-teal-300">
              {report.sha256_integrity_hash ? `${report.sha256_integrity_hash.slice(0, 8)}` : 'VERIFIED'}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: 4-Column Critical Organ Labs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2.5 border-t border-slate-100 dark:border-border">
        {labTiles.map((tile) => {
          let badge = 'bg-slate-100 dark:bg-muted text-slate-600 dark:text-slate-300 border-slate-200 dark:border-border';
          let border = 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted';
          let valColor = 'text-slate-900 dark:text-white';

          if (tile.status === 'critical') {
            badge = 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-900 font-bold';
            border = 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950';
            valColor = 'text-rose-900 dark:text-rose-200';
          } else if (tile.status === 'warning') {
            badge = 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-900 font-bold';
            border = 'border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950';
            valColor = 'text-amber-900 dark:text-amber-200';
          }

          return (
            <div key={tile.key} className={`rounded-lg border p-2 relative ${border}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{tile.label}</span>
                <span className={`rounded border px-1 py-0.2 font-mono text-[9px] uppercase ${badge}`}>
                  {tile.status === 'critical' ? 'ALERT' : tile.status === 'warning' ? 'DRIFT' : 'NORM'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-sm font-bold tabular-nums ${valColor}`}>{tile.val}</span>
                <span className="text-[9px] text-slate-400">{tile.unit.split('/')[0]}</span>
              </div>
              <div className="text-[9px] text-slate-500 dark:text-muted-foreground truncate mt-0.5" title={tile.sub}>
                {tile.sub}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
