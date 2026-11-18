import { useMemo } from 'react';
import { AlertOctagon, ExternalLink, ShieldAlert } from 'lucide-react';
import type { AnalysisReport } from '@workspace/api-client-react';

interface SafetyAlertBannerProps {
  report: AnalysisReport;
}

export function SafetyAlertBanner({ report }: SafetyAlertBannerProps) {
  const criticalConflicts = useMemo(() => {
    return report.conflicts.filter(
      (c) =>
        c.conflict_detected &&
        (c.severity?.toLowerCase() === 'high' ||
          c.severity?.toLowerCase() === 'contraindication' ||
          c.conflict_type?.toLowerCase().includes('contraindication') ||
          c.conflict_type?.toLowerCase().includes('renal'))
    );
  }, [report.conflicts]);

  const contraindicatedCandidates = useMemo(() => {
    return report.dea.candidates.filter((c) => c.contraindicated_flag);
  }, [report.dea.candidates]);

  if (criticalConflicts.length === 0 && contraindicatedCandidates.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="banner-safety-contraindication"
      className="rounded-xl border-2 border-red-600/60 bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/40 p-5 shadow-lg shadow-red-950/20 backdrop-blur-md animate-pulse-slow"
    >
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-red-600 text-white shadow-md">
          <AlertOctagon size={22} className="animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-600/30 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="mono text-[11px] font-black uppercase tracking-[.18em] text-red-400">
                CRITICAL CLINICAL CONTRAINDICATION ALERT
              </span>
              <span className="inline-flex items-center rounded-full bg-red-600/30 border border-red-500/50 px-2 py-0.5 mono text-[9px] font-bold uppercase text-red-200">
                ACTION REQUIRED
              </span>
            </div>
            <span className="mono text-[10px] text-red-300/70">
              Decoupled Safety Gate • Overrides Numerical Optimism
            </span>
          </div>

          <p className="mt-2.5 text-xs font-semibold text-red-200 leading-relaxed">
            The ClearDose clinical safety gate detected {criticalConflicts.length || contraindicatedCandidates.length} high-severity contraindication(s) matching patient lab thresholds or drug-disease collisions. Harmful pathways have been penalized and demoted below guideline-concordant safe alternatives.
          </p>

          <div className="mt-3.5 space-y-2.5">
            {criticalConflicts.map((c, i) => (
              <div
                key={`crit-${i}`}
                className="rounded-lg border border-red-500/40 bg-red-950/60 p-3 text-xs text-red-100"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-300">{c.conflict_type}</span>
                    <span className="inline-flex rounded bg-red-600/40 px-1.5 py-0.5 mono text-[10px] font-bold uppercase text-red-100">
                      {c.severity}
                    </span>
                  </div>
                  {(c.provenance as Record<string, any> | undefined)?.source_id && (
                    <a
                      href={
                        (c.provenance as Record<string, any> | undefined)?.url ||
                        `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(c.affected_treatment)}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mono text-[10px] text-red-300 hover:text-white underline underline-offset-2"
                    >
                      <span>{String((c.provenance as Record<string, any>).source_id)}</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                <div className="mt-2 text-xs leading-relaxed text-red-100/90 font-medium">
                  {c.description}
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-red-800/40 pt-2 text-[11px]">
                  <div className="inline-flex items-center gap-1.5 mono">
                    <span className="text-red-400 font-semibold">TRIGGER:</span>
                    <span className="rounded bg-black/40 px-1.5 py-0.5 text-white font-mono font-bold">
                      {c.affected_treatment}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 mono">
                    <span className="text-red-400 font-semibold">FACTOR:</span>
                    <span className="text-red-200">{c.risk_factor}</span>
                  </div>
                  <div className="ml-auto inline-flex items-center gap-1 text-[10px] mono text-red-300/80">
                    <ShieldAlert size={12} className="text-red-400" />
                    <span>Safety Demotion Applied (-0.50)</span>
                  </div>
                </div>
              </div>
            ))}

            {contraindicatedCandidates.length > 0 && criticalConflicts.length === 0 && (
              <div className="rounded-lg border border-red-500/40 bg-red-950/60 p-3 text-xs text-red-100">
                <span className="font-bold text-red-300">Contraindicated Candidate Therapy:</span>
                <ul className="mt-1.5 list-disc list-inside space-y-1">
                  {contraindicatedCandidates.map((c, idx) => (
                    <li key={idx} className="text-red-200">
                      <span className="font-semibold text-white">{c.candidate}</span> — {c.safety_rationale || 'High-risk collision with patient organ impairment.'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
