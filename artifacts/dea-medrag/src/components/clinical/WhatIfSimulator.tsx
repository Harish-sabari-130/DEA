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
      // Check if candidate is contraindicated under the modified labs
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
      const rankDelta = c.ranking - newRank; // positive means promoted, negative means demoted
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
      className="glass-card rounded-xl border border-primary/25 bg-card/95 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            What-If Clinical Simulator
          </h3>
          <span className="rounded bg-primary/10 px-2 py-0.5 mono text-[10px] font-bold text-primary">
            Live Math Re-Scorer
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            title="Reset parameters to baseline"
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <button
            onClick={handleApplyRerun}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1 mono text-[11px] font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <Play size={12} />
            {isRunning ? 'Arbitrating...' : 'Re-Run Full Pipeline'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Deprescribing Medication Toggles */}
        <div className="space-y-3">
          <div className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            1. Deprescribing Simulator (Toggle Meds)
          </div>
          <div className="space-y-1.5">
            {initialPatient.medications.map((med, i) => {
              const active = activeMeds[med] ?? true;
              return (
                <label
                  key={i}
                  className={`flex items-center justify-between gap-2 rounded border px-3 py-2 text-xs cursor-pointer transition-colors ${
                    active
                      ? 'border-border bg-background text-foreground'
                      : 'border-muted bg-muted/40 text-muted-foreground line-through opacity-70'
                  }`}
                >
                  <span className="font-medium truncate">{med}</span>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActiveMeds({ ...activeMeds, [med]: e.target.checked })}
                    className="size-4 rounded accent-primary cursor-pointer"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Section 2: Patient Labs Sliders */}
        <div className="space-y-3">
          <div className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            2. Perturb Key Organ Labs
          </div>
          <div className="space-y-2.5 text-xs">
            {/* eGFR */}
            <div>
              <div className="flex justify-between mono text-[11px] mb-1">
                <span className="text-muted-foreground">eGFR (mL/min):</span>
                <span className={`font-bold ${egfr < 30 ? 'text-red-600' : 'text-primary'}`}>
                  {egfr} mL/min {egfr < 30 ? '(Stage 4/5 CKD)' : ''}
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
                <span className={`font-bold ${potassium > 5.0 ? 'text-red-600' : 'text-primary'}`}>
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
                <span className={`font-bold ${qtc >= 500 ? 'text-red-600' : 'text-primary'}`}>
                  {qtc} ms {qtc >= 500 ? '(Arrhythmia Risk)' : ''}
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
        </div>

        {/* Section 3: DEA Weight Tuning */}
        <div className="space-y-3">
          <div className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            3. DEA Formula Coefficients
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between mono text-[11px] mb-0.5">
                <span>α Guideline Quality:</span>
                <span className="font-bold text-primary">{weights.alpha.toFixed(2)}</span>
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
              <div className="flex justify-between mono text-[11px] mb-0.5">
                <span>β Semantic Relevance:</span>
                <span className="font-bold text-primary">{weights.beta.toFixed(2)}</span>
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
              <div className="flex justify-between mono text-[11px] mb-0.5">
                <span>δ Safety Risk Penalty:</span>
                <span className="font-bold text-red-500">{weights.delta.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.80"
                step="0.05"
                value={weights.delta}
                onChange={(e) => setWeights({ ...weights, delta: Number(e.target.value) })}
                className="w-full accent-red-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Rank Delta Output Matrix */}
      <div className="mt-5 border-t border-border/60 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Live Simulated Candidate Ranking
          </span>
          <span className="mono text-[10px] text-muted-foreground">
            Score = α·Q + β·R + γ·T − δ·P
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {simulatedCandidates.map((c) => {
            const isRank1 = c.newRank === 1;
            return (
              <div
                key={c.candidate}
                className={`rounded-lg border p-3 text-xs transition-all ${
                  isRank1
                    ? 'border-teal-500/50 bg-teal-500/10 shadow-xs'
                    : c.isContra
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-border/70 bg-background/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-muted px-1.5 py-0.5 mono text-[10px] font-bold">
                      #{c.newRank}
                    </span>
                    {c.rankDelta > 0 && (
                      <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-[10px] mono">
                        <TrendingUp size={11} className="mr-0.5" />+{c.rankDelta}
                      </span>
                    )}
                    {c.rankDelta < 0 && (
                      <span className="inline-flex items-center text-red-500 font-bold text-[10px] mono">
                        <TrendingDown size={11} className="mr-0.5" />{c.rankDelta}
                      </span>
                    )}
                    {c.rankDelta === 0 && (
                      <span className="text-muted-foreground font-mono text-[10px]">=</span>
                    )}
                  </div>

                  <span className="mono text-xs font-bold text-foreground">
                    {c.simulatedScore.toFixed(3)}
                  </span>
                </div>

                <div className="font-semibold text-foreground line-clamp-2" title={c.candidate}>
                  {c.candidate}
                </div>

                {c.isContra && (
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] mono font-bold text-red-600 dark:text-red-400">
                    <span>▼ Contraindicated</span>
                  </div>
                )}
                {isRank1 && (
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] mono font-bold text-teal-700 dark:text-teal-300">
                    <Sparkles size={11} />
                    <span>Preferred Pathway</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
