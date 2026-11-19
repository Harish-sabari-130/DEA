import { useState, useMemo } from 'react';
import { Play, RotateCcw, SlidersHorizontal, Sparkles, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import type { CandidateScore, PatientProfileInput } from '@workspace/api-client-react';

interface WhatIfSimulatorProps {
  initialPatient: PatientProfileInput;
  initialCandidates: CandidateScore[];
  initialWeights: { alpha: number; beta: number; gamma: number; delta: number };
  onRerun: (modifiedPatient: PatientProfileInput, weights: { alpha: number; beta: number; gamma: number; delta: number }) => void;
  isRunning?: boolean;
}

export function WhatIfSimulator({
  initialPatient,
  initialCandidates,
  initialWeights,
  onRerun,
  isRunning = false,
}: WhatIfSimulatorProps) {
  // Deprescribing medication toggles
  const [activeMeds, setActiveMeds] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const med of initialPatient.medications) {
      map[med] = true;
    }
    return map;
  });

  // Lab adjustments
  const parseLab = (key: string, defaultVal: number): number => {
    const raw = initialPatient.lab_values[key];
    if (!raw) return defaultVal;
    const match = String(raw).match(/([0-9.]+)/);
    return match ? parseFloat(match[1]) : defaultVal;
  };

  const [egfr, setEgfr] = useState<number>(() => parseLab('eGFR', 45));
  const [potassium, setPotassium] = useState<number>(() => parseLab('potassium', 4.4));
  const [qtc, setQtc] = useState<number>(() => parseLab('QTc', 430));
  const [creatinine, setCreatinine] = useState<number>(() => parseLab('creatinine', 1.2));

  // Weight adjustments
  const [weights, setWeights] = useState(initialWeights);

  // Reset to original
  const handleReset = () => {
    const map: Record<string, boolean> = {};
    for (const med of initialPatient.medications) {
      map[med] = true;
    }
    setActiveMeds(map);
    setEgfr(parseLab('eGFR', 45));
    setPotassium(parseLab('potassium', 4.4));
    setQtc(parseLab('QTc', 430));
    setCreatinine(parseLab('creatinine', 1.2));
    setWeights(initialWeights);
  };

  // Live client-side recalculation
  const simulatedCandidates = useMemo(() => {
    return initialCandidates.map((c) => {
      const candLower = c.candidate.toLowerCase();
      let isContra = Boolean(c.contraindicated_flag);
      let pRisk = c.p_risk;

      // Real-time lab sensitivity simulation
      if (candLower.includes('metformin') || candLower.includes('glucophage')) {
        if (egfr < 30) {
          isContra = true;
          pRisk = 0.95;
        } else if (egfr >= 45) {
          isContra = false;
          pRisk = 0.20;
        }
      }
      if (candLower.includes('spironolactone') || candLower.includes('lisinopril') || candLower.includes('losartan')) {
        if (potassium > 5.2) {
          isContra = true;
          pRisk = 0.95;
        }
      }
      if (candLower.includes('citalopram')) {
        if (qtc >= 500) {
          isContra = true;
          pRisk = 0.95;
        }
      }

      // Compute score
      const rawScore =
        weights.alpha * c.q_grade +
        weights.beta * c.s_rel +
        weights.gamma * c.t_recent -
        weights.delta * pRisk;

      const finalScore = isContra ? Number((rawScore - 0.50).toFixed(3)) : Number(rawScore.toFixed(3));

      return {
        ...c,
        simulatedScore: finalScore,
        isContra,
      };
    })
    .sort((a, b) => b.simulatedScore - a.simulatedScore || a.candidate.localeCompare(b.candidate))
    .map((c, idx) => {
      const newRank = idx + 1;
      const rankDelta = c.ranking - newRank;
      return {
        ...c,
        newRank,
        rankDelta,
      };
    });
  }, [initialCandidates, weights, egfr, potassium, qtc, creatinine]);

  const handleApplyRerun = () => {
    const selectedMeds = Object.entries(activeMeds)
      .filter(([_, active]) => active)
      .map(([med]) => med);

    const modifiedPatient: PatientProfileInput = {
      ...initialPatient,
      medications: selectedMeds,
      lab_values: {
        ...initialPatient.lab_values,
        eGFR: `${egfr} mL/min/1.73m²`,
        potassium: `${potassium} mmol/L`,
        QTc: `${qtc} ms`,
        creatinine: `${creatinine} mg/dL`,
      },
    };

    onRerun(modifiedPatient, weights);
  };

  return (
    <div
      data-testid="panel-what-if-simulator"
      className="rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-5"
    >
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            What-If Clinical Simulator
          </h3>
          <span className="rounded bg-primary/10 px-2 py-0.5 mono text-[10px] font-bold text-primary">
            V = α·Q + β·R + γ·T − δ·P
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-border px-2.5 py-1 mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            title="Reset parameters to baseline"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
          <button
            onClick={handleApplyRerun}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1 mono text-[11px] font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <Play size={12} />
            <span>{isRunning ? 'Arbitrating...' : 'Re-Run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Spacious 2-Column Grid: Controls on Left, Live Ranking on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sliders & Toggles (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Organ Lab Sliders */}
          <div className="rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/30 p-3.5 space-y-3">
            <div className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Perturb Organ Labs
            </div>

            {/* eGFR */}
            <div>
              <div className="flex justify-between mono text-[11px] mb-1">
                <span className="text-muted-foreground">eGFR (mL/min):</span>
                <span className={`font-bold ${egfr < 30 ? 'text-rose-600' : 'text-primary'}`}>
                  {egfr} mL/min {egfr < 30 ? '(CKD 4/5)' : ''}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="1"
                value={egfr}
                onChange={(e) => setEgfr(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            {/* Potassium */}
            <div>
              <div className="flex justify-between mono text-[11px] mb-1">
                <span className="text-muted-foreground">Potassium K+ (mmol/L):</span>
                <span className={`font-bold ${potassium > 5.0 ? 'text-rose-600' : 'text-primary'}`}>
                  {potassium.toFixed(1)} mmol/L {potassium > 5.0 ? '(Hyperkalemia)' : ''}
                </span>
              </div>
              <input
                type="range"
                min="3.0"
                max="6.5"
                step="0.1"
                value={potassium}
                onChange={(e) => setPotassium(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            {/* QTc */}
            <div>
              <div className="flex justify-between mono text-[11px] mb-1">
                <span className="text-muted-foreground">QTc Interval (ms):</span>
                <span className={`font-bold ${qtc >= 500 ? 'text-rose-600' : 'text-primary'}`}>
                  {qtc} ms {qtc >= 500 ? '(Prolonged)' : ''}
                </span>
              </div>
              <input
                type="range"
                min="380"
                max="560"
                step="5"
                value={qtc}
                onChange={(e) => setQtc(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </div>

          {/* DEA Formula Weight Tuning */}
          <div className="rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/30 p-3.5 space-y-3">
            <div className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              DEA Weight Coefficients
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex justify-between mono text-[10px] mb-0.5">
                  <span>α Grade:</span>
                  <span className="font-bold text-teal-600">{weights.alpha.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.80"
                  step="0.05"
                  value={weights.alpha}
                  onChange={(e) => setWeights({ ...weights, alpha: Number(e.target.value) })}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mono text-[10px] mb-0.5">
                  <span>β Relevance:</span>
                  <span className="font-bold text-sky-600">{weights.beta.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.80"
                  step="0.05"
                  value={weights.beta}
                  onChange={(e) => setWeights({ ...weights, beta: Number(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mono text-[10px] mb-0.5">
                  <span>γ Recency:</span>
                  <span className="font-bold text-indigo-600">{weights.gamma.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.80"
                  step="0.05"
                  value={weights.gamma}
                  onChange={(e) => setWeights({ ...weights, gamma: Number(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mono text-[10px] mb-0.5">
                  <span>δ Risk:</span>
                  <span className="font-bold text-rose-600">{weights.delta.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.80"
                  step="0.05"
                  value={weights.delta}
                  onChange={(e) => setWeights({ ...weights, delta: Number(e.target.value) })}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Deprescribing Toggles */}
          <div className="rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/30 p-3.5 space-y-2">
            <div className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Deprescribing Simulator
            </div>
            <div className="space-y-1">
              {initialPatient.medications.map((med, i) => {
                const active = activeMeds[med] ?? true;
                return (
                  <label
                    key={i}
                    className={`flex items-center justify-between gap-2 rounded border px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                      active
                        ? 'border-slate-200 dark:border-border bg-white dark:bg-card text-foreground'
                        : 'border-muted bg-muted/40 text-muted-foreground line-through opacity-60'
                    }`}
                  >
                    <span className="truncate">{med}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActiveMeds({ ...activeMeds, [med]: e.target.checked })}
                      className="size-3.5 rounded accent-primary cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulated Candidate Ranking (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-border/60 pb-2">
            <span className="mono text-xs font-bold uppercase tracking-wider text-foreground">
              Live Simulated Candidate Ranking
            </span>
            <span className="mono text-[10px] text-muted-foreground">
              Instant Mathematical Recalculation
            </span>
          </div>

          <div className="space-y-2">
            {simulatedCandidates.map((c) => {
              const isRank1 = c.newRank === 1;
              return (
                <div
                  key={c.candidate}
                  className={`rounded-lg border p-3 text-xs transition-all ${
                    isRank1
                      ? 'border-teal-500/50 bg-teal-500/10 shadow-xs'
                      : c.isContra
                      ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 opacity-75'
                      : 'border-slate-200 dark:border-border bg-white dark:bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 mono text-[10px] font-bold">
                        #{c.newRank}
                      </span>
                      {c.rankDelta > 0 && (
                        <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-[10px] mono">
                          <TrendingUp size={11} className="mr-0.5" />+{c.rankDelta}
                        </span>
                      )}
                      {c.rankDelta < 0 && (
                        <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-bold text-[10px] mono">
                          <TrendingDown size={11} className="mr-0.5" />{c.rankDelta}
                        </span>
                      )}
                      {c.rankDelta === 0 && (
                        <span className="text-muted-foreground font-mono text-[10px]">=</span>
                      )}

                      {c.isContra && (
                        <span className="rounded bg-rose-600 px-1.5 py-0.2 mono text-[9px] font-bold text-white uppercase">
                          CONTRAINDICATED
                        </span>
                      )}
                      {isRank1 && (
                        <span className="inline-flex items-center gap-1 mono text-[10px] font-bold text-teal-700 dark:text-teal-300">
                          <Sparkles size={11} />
                          <span>Rank #1 Preferred</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mono text-xs font-black">
                      <span className="text-muted-foreground text-[10px] uppercase font-normal">Score:</span>
                      <span className={isRank1 ? 'text-primary' : 'text-foreground'}>
                        {c.simulatedScore.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <div className="font-semibold text-foreground text-xs leading-snug">
                    {c.candidate}
                  </div>

                  {/* Dimension breakdown */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 mono text-[10px] tabular-nums">
                    <span className="rounded bg-slate-100 dark:bg-muted px-1.5 py-0.2">Q: {c.q_grade.toFixed(2)}</span>
                    <span className="rounded bg-slate-100 dark:bg-muted px-1.5 py-0.2">S: {c.s_rel.toFixed(2)}</span>
                    <span className="rounded bg-slate-100 dark:bg-muted px-1.5 py-0.2">T: {c.t_recent.toFixed(2)}</span>
                    <span className={`rounded px-1.5 py-0.2 ${c.p_risk > 0.5 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 dark:bg-muted'}`}>
                      P: -{c.p_risk.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground ml-auto uppercase text-[9px]">{c.source}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
