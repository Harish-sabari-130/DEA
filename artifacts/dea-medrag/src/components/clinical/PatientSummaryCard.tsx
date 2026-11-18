import { AlertTriangle, BrainCircuit, CheckCircle2, HeartPulse, Stethoscope, User } from 'lucide-react';
import type { AnalysisReport, PatientProfileInput } from '@workspace/api-client-react';

interface PatientSummaryCardProps {
  report: AnalysisReport;
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

  // Parse lab markers to highlight abnormal levels
  const labs = Object.entries(labValues).map(([key, rawVal]) => {
    const valStr = String(rawVal);
    const num = parseFloat(valStr.replace(/[^0-9.]/g, ''));
    let status: 'normal' | 'warning' | 'critical' = 'normal';
    let label = key;

    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('egfr')) {
      label = 'eGFR';
      if (!isNaN(num)) {
        if (num < 30) status = 'critical';
        else if (num < 60) status = 'warning';
      }
    } else if (lowerKey.includes('potassium') || lowerKey === 'k' || lowerKey === 'k+') {
      label = 'K+ Potassium';
      if (!isNaN(num)) {
        if (num > 5.2 || num < 3.2) status = 'critical';
        else if (num > 5.0 || num < 3.5) status = 'warning';
      }
    } else if (lowerKey.includes('qtc')) {
      label = 'QTc Interval';
      if (!isNaN(num)) {
        if (num >= 500) status = 'critical';
        else if (num >= 460) status = 'warning';
      }
    } else if (lowerKey.includes('creatinine') || lowerKey === 'cr') {
      label = 'Creatinine';
      if (!isNaN(num)) {
        if (num > 2.0) status = 'critical';
        else if (num > 1.3) status = 'warning';
      }
    } else if (lowerKey.includes('ast') || lowerKey.includes('alt')) {
      label = key.toUpperCase();
      if (!isNaN(num) && num > 100) status = 'critical';
    } else if (lowerKey.includes('inr')) {
      label = 'INR';
      if (!isNaN(num) && (num > 3.5 || num < 1.5)) status = 'warning';
    }

    return { key, label, valStr, status };
  });

  return (
    <div
      data-testid="card-patient-summary"
      className="glass-card overflow-hidden rounded-xl border border-primary/20 bg-card/95 p-5 sm:p-6 shadow-md"
    >
      {/* Top Banner: Demographics & Smart Routing Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <User size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
                {patient ? `${patient.age}y ${patient.sex}` : 'Active Patient Profile'}
              </h2>
              <span className="mono text-[11px] rounded bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
                {medications.length} Med{medications.length === 1 ? '' : 's'} Active
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2">
              <span>Arbitration ID: #{report.id.slice(0, 8).toUpperCase()}</span>
              <span>•</span>
              <span>{new Date(report.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Smart Routing & Review Tag */}
        <div className="flex items-center gap-2">
          {isHighRisk ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1 mono text-[11px] font-black uppercase text-red-700 dark:text-red-300 animate-pulse">
                <AlertTriangle size={13} className="text-red-600" />
                NEEDS DOCTOR REVIEW
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 mono text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                <BrainCircuit size={12} />
                High-Risk Deep Arbitration
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 mono text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={13} className="text-emerald-600" />
                ROUTINE CLINICAL PATH
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 mono text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                Fast Standard
              </span>
            </div>
          )}

          <div
            className="flex items-center gap-1 rounded border border-border bg-muted/40 px-2.5 py-1 mono text-[10px]"
            title={`Case Complexity Index: ${complexity}/100`}
          >
            <span className="text-muted-foreground">COMPLEXITY:</span>
            <span
              className={`font-bold ${
                complexity >= 50 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {complexity}/100
            </span>
          </div>
        </div>
      </div>

      {/* 5-Second Clinical Highlights Grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Conditions */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            <Stethoscope size={13} className="text-primary" />
            <span>Active Diseases & Diagnoses</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {diseases.length > 0 ? (
              diseases.map((d, i) => (
                <span
                  key={i}
                  className="rounded bg-background border border-border/80 px-2 py-0.5 text-xs font-medium text-foreground"
                >
                  {d}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">None documented</span>
            )}
          </div>
        </div>

        {/* Critical Lab Values with Color Alerts */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            <HeartPulse size={13} className="text-primary" />
            <span>Key Lab Values & Alerts</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {labs.length > 0 ? (
              labs.map((l, i) => {
                let badgeClass = 'border-border/80 bg-background text-foreground';
                if (l.status === 'critical') {
                  badgeClass = 'border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300 font-bold';
                } else if (l.status === 'warning') {
                  badgeClass = 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium';
                }
                return (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs mono ${badgeClass}`}
                  >
                    <span>{l.label}:</span>
                    <span>{l.valStr}</span>
                    {l.status === 'critical' && <span className="size-1.5 rounded-full bg-red-600 animate-ping" />}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-muted-foreground italic">No lab values</span>
            )}
          </div>
        </div>

        {/* Allergies & Routing Reasons */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            <AlertTriangle size={13} className="text-primary" />
            <span>Allergies & Routing Rationale</span>
          </div>
          <div className="text-xs">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-muted-foreground font-semibold">Allergies:</span>
              {allergies.length > 0 ? (
                allergies.map((a, i) => (
                  <span key={i} className="rounded bg-red-500/10 text-red-700 dark:text-red-300 font-bold px-1.5 py-0.2">
                    {a}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground italic">NKDA (No known drug allergies)</span>
              )}
            </div>
            {routing?.routing_reasons && routing.routing_reasons.length > 0 && (
              <div className="text-[11px] text-muted-foreground leading-snug truncate" title={routing.routing_reasons.join(' • ')}>
                <span className="font-semibold text-foreground">Rule:</span> {routing.routing_reasons[0]}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
