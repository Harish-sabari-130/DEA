import { useState, useMemo } from 'react';
import { AlertOctagon, ChevronDown, ChevronUp, ExternalLink, ShieldAlert } from 'lucide-react';
import type { AnalysisReport } from '@workspace/api-client-react';

interface SafetyAlertBannerProps {
  report: AnalysisReport;
}

export function SafetyAlertBanner({ report }: SafetyAlertBannerProps) {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

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
      className="bg-rose-50 dark:bg-rose-950 border-l-4 border-l-rose-600 border border-rose-200 dark:border-rose-900 rounded-xl p-4 shadow-sm relative space-y-3"
    >
      {/* Alert Header Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200 dark:border-rose-900 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-rose-600 text-white shadow-xs shrink-0">
            <AlertOctagon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-rose-950 dark:text-rose-100">
                Critical Clinical Contraindication Alert
              </span>
              <span className="rounded bg-rose-600 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white shadow-2xs">
                {criticalConflicts.length || contraindicatedCandidates.length} Gated
              </span>
            </div>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
              Decoupled Safety Gate actively penalizing candidate pathways below guideline-concordant safe alternatives.
            </p>
          </div>
        </div>

        <span className="font-mono text-[11px] font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900 px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-800">
          Penalty Applied (−0.50 Risk Weight)
        </span>
      </div>

      {/* Accordion List of High-Risk Collisions */}
      <div className="space-y-2">
        {criticalConflicts.map((c, i) => {
          const isExpanded = Boolean(expandedIndices[i]);
          const treatment = c.affected_treatment || 'Affected Drug';
          const factor = c.risk_factor || c.conflict_type || 'Organ Impairment';
          const sourceId = (c.provenance as Record<string, any> | undefined)?.source_id;
          const sourceUrl =
            (c.provenance as Record<string, any> | undefined)?.url ||
            `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(treatment)}`;

          return (
            <div
              key={`crit-${i}`}
              className="rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-card p-3 text-xs shadow-2xs relative space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={15} className="text-rose-600 shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-white">{treatment}</span>
                  <span className="text-slate-400">vs</span>
                  <span className="font-semibold text-rose-700 dark:text-rose-400">{factor}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                    {c.severity || 'HIGH RISK'}
                  </span>
                  <button
                    onClick={() => toggleExpand(i)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide Evidence' : 'View Evidence'}</span>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{c.description}</p>

              {isExpanded && (
                <div className="pt-2 border-t border-slate-100 dark:border-border space-y-2 bg-slate-50 dark:bg-muted p-2.5 rounded-md">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    Authority Source Provenance:
                  </div>
                  {c.provenance && (
                    <blockquote className="border-l-2 border-rose-500 pl-2 text-[11px] italic text-slate-600 dark:text-slate-300">
                      "{String((c.provenance as any)?.relevant_excerpt || (c.provenance as any)?.match_rationale || c.description)}"
                    </blockquote>
                  )}
                  {sourceId && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                      <span>Source ID: {sourceId}</span>
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                      >
                        <span>NLM DailyMed Drug Label</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* If no critical conflict records exist but candidates are flagged */}
        {criticalConflicts.length === 0 &&
          contraindicatedCandidates.map((c, i) => (
            <div
              key={`cand-contra-${i}`}
              className="rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-card p-3 text-xs flex items-center justify-between gap-3 shadow-2xs relative"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-rose-600 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white">{c.candidate}</span>
                <span className="text-rose-700 text-xs">
                  {c.safety_rationale || 'Contraindicated for patient clinical profile'}
                </span>
              </div>
              <span className="rounded bg-rose-600 text-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase shrink-0">
                PENALIZED TO RANK #{c.ranking}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
