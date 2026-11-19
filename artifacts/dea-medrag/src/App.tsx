import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  Columns2,
  Database,
  FileInput,
  FileText,
  FlaskConical,
  Gauge,
  GitCompare,
  History,
  Info,
  Layers3,
  LoaderCircle,
  Maximize2,
  Menu,
  Microscope,
  Minimize2,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Pill as PillIcon,
  Play,
  Printer,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Target,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  getGetKnowledgeStatsQueryKey,
  getListDemoCasesQueryKey,
  useAnalyzeCase,
  useEvaluateFramework,
  useGetKnowledgeStats,
  useIngestDocument,
  useListDemoCases,
} from '@workspace/api-client-react';
import type {
  AnalysisReport,
  CandidateScore,
  Conflict,
  DemoCase,
  EvaluationResult,
  IngestDocumentInput,
  PatientProfileInput,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { getConflictCategory, type ConflictCategory } from './lib/conflicts';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { SafetyAlertBanner } from '@/components/clinical/SafetyAlertBanner';
import { PatientSummaryCard } from '@/components/clinical/PatientSummaryCard';
import { WhatIfSimulator } from '@/components/clinical/WhatIfSimulator';
import { ClaimChecker } from '@/components/clinical/ClaimChecker';
import { MedicationReconciler } from '@/components/clinical/MedicationReconciler';
import { DoctorSignOff } from '@/components/clinical/DoctorSignOff';
import { EvaluationDashboard } from '@/components/clinical/EvaluationDashboard';
import { ReproducibilityBadge } from '@/components/clinical/ReproducibilityBadge';
import { AuditHistoryDrawer } from '@/components/clinical/AuditHistoryDrawer';

const queryClient = new QueryClient();

const fallbackPatient: PatientProfileInput = {
  age: 67,
  sex: 'Female',
  diseases: ['Atrial fibrillation', 'Chronic kidney disease, stage 3', 'Hypertension'],
  medications: ['Apixaban 5 mg twice daily', 'Lisinopril 10 mg daily'],
  secondary_medications: [
    'Apixaban 2.5 mg twice daily',
    'Lisinopril 20 mg daily',
    'Metformin 1000 mg twice daily',
    'Atorvastatin 40 mg daily',
  ],
  symptoms: ['New unilateral calf pain', 'Mild dyspnea on exertion'],
  lab_values: { eGFR: '44 mL/min/1.73m²', 'D-dimer': '1.2 mg/L FEU', hemoglobin: '11.8 g/dL', 'K+': '4.6 mEq/L' },
  allergies: ['Penicillin'],
  conditions: ['Recent long-haul flight (14 days ago)'],
};

function cx(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

function Pill({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'teal' | 'amber' | 'red' | 'blue' | 'purple' | 'emerald';
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 mono text-[10px] font-semibold uppercase tracking-[.08em] transition-colors',
        tone === 'teal' && 'border-teal-700/25 bg-teal-700/10 text-teal-800 dark:text-teal-300',
        tone === 'emerald' && 'border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
        tone === 'amber' && 'border-amber-600/30 bg-amber-500/15 text-amber-800 dark:text-amber-300',
        tone === 'red' && 'border-red-700/25 bg-red-600/10 text-red-800 dark:text-red-300',
        tone === 'blue' && 'border-sky-700/25 bg-sky-600/10 text-sky-800 dark:text-sky-300',
        tone === 'purple' && 'border-purple-600/30 bg-purple-600/10 text-purple-800 dark:text-purple-300',
        tone === 'neutral' && 'border-border bg-muted/60 text-muted-foreground',
        className
      )}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children, icon: Icon = Activity }: { children: ReactNode; icon?: typeof Activity }) {
  return (
    <div className="flex items-center gap-2 mono text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">
      <div className="grid size-5 place-items-center rounded bg-primary/10 text-primary">
        <Icon size={12} />
      </div>
      <span>{children}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone = 'teal',
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'teal' | 'amber' | 'red' | 'blue';
  icon?: typeof Activity;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-slate-200 dark:border-border bg-white dark:bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <div
            className={cx(
              'grid size-6 place-items-center rounded-sm',
              tone === 'teal' && 'bg-primary/10 text-primary',
              tone === 'amber' && 'bg-amber-500/15 text-amber-700',
              tone === 'red' && 'bg-red-600/10 text-red-700',
              tone === 'blue' && 'bg-sky-600/10 text-sky-700'
            )}
          >
            <Icon size={12} />
          </div>
        )}
      </div>
      <div
        className={cx(
          'mt-2 text-2xl font-bold tracking-tight display',
          tone === 'amber' && 'text-amber-700 dark:text-amber-400',
          tone === 'red' && 'text-red-700 dark:text-red-400',
          tone === 'teal' && 'text-primary',
          tone === 'blue' && 'text-sky-700 dark:text-sky-400'
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm relative transition-shadow', className)}>
      {children}
    </section>
  );
}

function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  testId,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger';
  disabled?: boolean;
  testId: string;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-semibold tracking-wide transition-all active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45',
        variant === 'primary' && 'bg-primary text-primary-foreground shadow-sm hover:opacity-90 hover:shadow-md hover:shadow-primary/20',
        variant === 'ghost' && 'border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10',
        variant === 'quiet' && 'text-muted-foreground hover:bg-muted hover:text-foreground',
        variant === 'danger' && 'border border-red-700/25 bg-red-700/5 text-red-700 hover:bg-red-700/10',
        className
      )}
    >
      {children}
    </button>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const demoQuery = useListDemoCases({ query: { queryKey: getListDemoCasesQueryKey() } });

  useEffect(() => {
    const handleOpenAudit = () => setAuditOpen(true);
    window.addEventListener('cleardose:open_audit_drawer', handleOpenAudit);
    return () => window.removeEventListener('cleardose:open_audit_drawer', handleOpenAudit);
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="grain min-h-[100dvh] bg-background">
      {/* Global Header Bar (Rigid 64px, non-wrapping) */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-border bg-white dark:bg-card px-6 shrink-0 shadow-2xs">
        {/* Left Zone: ClearDose Logo + Clinical Status Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" data-testid="link-brand" className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Stethoscope size={18} />
            </div>
            <div className="leading-tight">
              <span className="display text-base font-bold text-foreground tracking-tight">ClearDose</span>
              <span className="mono text-[10px] text-primary font-bold ml-1">CDS</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SECURE PIPELINE</span>
          </div>
        </div>

        {/* Center Zone: Global Tab / View Switcher */}
        <nav className="hidden md:flex mx-auto items-center gap-1 rounded-xl border border-slate-200/70 dark:border-border bg-slate-100/80 dark:bg-muted/50 p-1 text-xs shadow-2xs">
          <Link
            href="/"
            data-testid="link-nav-workspace"
            className={cx(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all',
              location === '/'
                ? 'bg-white dark:bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Stethoscope size={14} />
            <span>Workspace</span>
          </Link>
          <Link
            href="/evaluation"
            data-testid="link-nav-evaluation"
            className={cx(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all',
              location === '/evaluation'
                ? 'bg-white dark:bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Gauge size={14} />
            <span>Clinical Benchmarks</span>
          </Link>
          <button
            onClick={() => setAuditOpen(true)}
            data-testid="link-nav-audit-history"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <History size={14} />
            <span>Audit Ledger</span>
          </button>
          <Link
            href="/knowledge"
            data-testid="link-nav-knowledge"
            className={cx(
              'hidden xl:flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all',
              location === '/knowledge'
                ? 'bg-white dark:bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Database size={14} />
            <span>Evidence Corpus</span>
          </Link>
        </nav>

        {/* Right Zone: Compact Utility Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Print Official Report Button */}
          <button
            data-testid="button-print-report"
            onClick={() => window.print()}
            title="Print Official Medical Decision Support Report"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-muted transition-all shadow-2xs cursor-pointer"
          >
            <Printer size={14} className="text-primary" />
            <span>Print Report</span>
          </button>

          {/* New Case / Reset */}
          <button
            data-testid="button-reset-case"
            onClick={() => {
              sessionStorage.setItem(
                'cleardose_load_case',
                JSON.stringify({ patient: fallbackPatient, title: 'New Case Intake' })
              );
              window.dispatchEvent(
                new CustomEvent('cleardose:load_case', {
                  detail: { patient: fallbackPatient, title: 'New Case Intake' },
                })
              );
              if (location !== '/') setLocation('/');
            }}
            title="Start New Patient Case / Reset Form"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-muted transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} className="text-primary" />
            <span>New Case / Reset</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            data-testid="button-toggle-fullscreen"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen mode'}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-2xs cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            data-testid="button-open-menu"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="md:hidden inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-card text-muted-foreground"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card p-3 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-xs font-semibold"
          >
            <Stethoscope size={14} /> Workspace
          </Link>
          <Link
            href="/evaluation"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-xs font-semibold"
          >
            <Gauge size={14} /> Clinical Benchmarks
          </Link>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setAuditOpen(true);
            }}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-xs font-semibold w-full text-left"
          >
            <History size={14} /> Audit Ledger
          </button>
          <Link
            href="/knowledge"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-xs font-semibold"
          >
            <Database size={14} /> Evidence Corpus
          </Link>
        </div>
      )}

      {/* Strict Viewport Main Canvas Container */}
      <main className="w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-background">
        {children}
      </main>

      {/* Slide-Over Clinical Audit Ledger Drawer */}
      <AuditHistoryDrawer
        open={auditOpen}
        onOpenChange={setAuditOpen}
        onLoadCase={(casePatient) => {
          sessionStorage.setItem('cleardose_load_case', JSON.stringify({ patient: casePatient }));
          window.dispatchEvent(new CustomEvent('cleardose:load_case', { detail: { patient: casePatient } }));
          if (location !== '/') {
            setLocation('/');
          }
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  testId,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  testId: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className="w-full rounded-lg border border-slate-200 dark:border-input bg-white dark:bg-background px-3 py-1.5 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  testId: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className="min-h-[58px] w-full resize-y rounded-lg border border-slate-200 dark:border-input bg-white dark:bg-background px-3 py-1.5 text-xs leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
      />
    </div>
  );
}

function CaseForm({
  patient,
  setPatient,
  onRun,
  demoCases,
  isLoadingCases,
  isRunning,
  onLoadDemo,
  onFold,
}: {
  patient: PatientProfileInput;
  setPatient: React.Dispatch<React.SetStateAction<PatientProfileInput>>;
  onRun: (p: PatientProfileInput) => void;
  demoCases?: DemoCase[];
  isLoadingCases: boolean;
  isRunning: boolean;
  onLoadDemo: (c: DemoCase) => void;
  onFold?: () => void;
}) {
  const update = (key: keyof PatientProfileInput, value: string) =>
    setPatient((p) => ({
      ...p,
      [key]: key === 'age' ? Number(value) : value.split(',').map((x) => x.trim()).filter(Boolean),
    }));

  const getLabVal = (name: string, fallback = '') => {
    for (const [k, v] of Object.entries(patient.lab_values || {})) {
      if (k.toLowerCase().includes(name.toLowerCase())) return String(v);
    }
    return fallback;
  };

  const setLabVal = (name: string, val: string) => {
    setPatient((p) => {
      const nextLabs = { ...(p.lab_values || {}) };
      for (const k of Object.keys(nextLabs)) {
        if (k.toLowerCase().includes(name.toLowerCase())) {
          delete nextLabs[k];
        }
      }
      if (val.trim()) {
        nextLabs[name] = val.trim();
      }
      return { ...p, lab_values: nextLabs };
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onRun(patient);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Fold Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-border">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
            <FileInput size={14} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Patient Dossier & Intake
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Clinical parameters & biomarker profile
            </span>
          </div>
        </div>
        {onFold && (
          <button
            type="button"
            data-testid="button-fold-case-form"
            onClick={onFold}
            title="Fold patient dossier for full-width results"
            className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 dark:border-border bg-slate-50 dark:bg-card text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-all shadow-2xs cursor-pointer"
          >
            <PanelLeftClose size={14} />
          </button>
        )}
      </div>

      {/* Preset Dropdown */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          Load Case Preset
        </label>
        <select
          data-testid="select-case-preset"
          onChange={(e) => {
            const found = demoCases?.find((c) => c.id === e.target.value);
            if (found) {
              setPatient(found.patient);
              onLoadDemo(found);
            }
          }}
          defaultValue=""
          className="w-full rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-card px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none cursor-pointer shadow-2xs"
        >
          <option value="" disabled>
            {isLoadingCases ? 'Loading clinical presets…' : 'Select Patient Preset (6 Demos & 23 Benchmarks)…'}
          </option>
          {demoCases?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {/* 2-Column: Age & Sex */}
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Age"
            value={String(patient.age)}
            onChange={(v) => update('age', v)}
            type="number"
            placeholder="e.g., 67"
            testId="input-age"
          />
          <Field
            label="Sex"
            value={patient.sex}
            onChange={(v) => update('sex', v)}
            placeholder="e.g., Female"
            testId="input-sex"
          />
        </div>

        {/* 2-Column Structured Lab Grid */}
        <div className="rounded-xl border border-slate-200 dark:border-border bg-slate-50/70 dark:bg-muted/10 p-3 space-y-2.5 shadow-2xs">
          <span className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Key Organ Labs & Biomarkers:
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <Field
              label="eGFR (mL/min)"
              value={getLabVal('eGFR', '')}
              onChange={(v) => setLabVal('eGFR', v)}
              placeholder="e.g., 24"
              testId="input-lab-egfr"
            />
            <Field
              label="K+ (mEq/L)"
              value={getLabVal('potassium', getLabVal('k', ''))}
              onChange={(v) => setLabVal('potassium', v)}
              placeholder="e.g., 5.4"
              testId="input-lab-potassium"
            />
            <Field
              label="Creatinine (mg/dL)"
              value={getLabVal('creatinine', getLabVal('cr', ''))}
              onChange={(v) => setLabVal('creatinine', v)}
              placeholder="e.g., 2.1"
              testId="input-lab-creatinine"
            />
            <Field
              label="QTc (ms)"
              value={getLabVal('QTc', '')}
              onChange={(v) => setLabVal('QTc', v)}
              placeholder="e.g., 460"
              testId="input-lab-qtc"
            />
            <Field
              label="INR"
              value={getLabVal('INR', '')}
              onChange={(v) => setLabVal('INR', v)}
              placeholder="e.g., 1.1"
              testId="input-lab-inr"
            />
            <Field
              label="ALT/AST (U/L)"
              value={getLabVal('ALT', getLabVal('AST', ''))}
              onChange={(v) => setLabVal('ALT', v)}
              placeholder="e.g., 32"
              testId="input-lab-alt"
            />
          </div>
        </div>

        {/* Diagnoses */}
        <TextArea
          label="Active Diagnoses & Conditions"
          value={patient.diseases.join(', ')}
          onChange={(v) => update('diseases', v)}
          placeholder="e.g., Type 2 Diabetes, CKD Stage 4, Atrial Fibrillation"
          testId="input-diseases"
        />

        {/* Medications */}
        <TextArea
          label="Active Outpatient Medications"
          value={patient.medications.join(', ')}
          onChange={(v) => update('medications', v)}
          placeholder="e.g., Metformin 1000mg BID, Lisinopril 20mg daily"
          testId="input-medications"
        />

        {/* Secondary Meds */}
        <TextArea
          label="Secondary / Inpatient Orders (Reconciler)"
          value={(patient.secondary_medications || []).join(', ')}
          onChange={(v) =>
            setPatient((p) => ({
              ...p,
              secondary_medications: v.split(',').map((x) => x.trim()).filter(Boolean),
            }))
          }
          placeholder="e.g., Glipizide 5mg daily, Apixaban 2.5mg BID"
          testId="input-secondary-medications"
        />

        {/* Chief Complaint */}
        <TextArea
          label="Chief Complaint / Clinical Question"
          value={patient.symptoms.join(', ')}
          onChange={(v) => update('symptoms', v)}
          placeholder="e.g., Optimize glycemic control given declining renal function"
          testId="input-symptoms"
        />

        {/* Allergies & Comorbidities */}
        <div className="grid grid-cols-2 gap-2.5">
          <TextArea
            label="Documented Allergies"
            value={patient.allergies.join(', ')}
            onChange={(v) => update('allergies', v)}
            placeholder="e.g., Penicillin"
            testId="input-allergies"
          />
          <TextArea
            label="Comorbidities & Notes"
            value={patient.conditions.join(', ')}
            onChange={(v) => update('conditions', v)}
            placeholder="e.g., Prior TIA"
            testId="input-conditions"
          />
        </div>

        {/* Submit Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-border pt-3">
          <div className="flex items-center gap-1.5 mono text-[10px] text-muted-foreground">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>HIPAA De-Identified</span>
          </div>

          <Button type="submit" disabled={isRunning} testId="button-run-analysis" className="px-5 py-2 text-xs">
            {isRunning ? (
              <>
                <LoaderCircle size={14} className="animate-spin" />
                <span>Arbitrating…</span>
              </>
            ) : (
              <>
                <Play size={13} fill="currentColor" />
                <span>Run Clinical Arbitration</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AgentRail({ report, running }: { report?: AnalysisReport; running: boolean }) {
  const statuses = report?.agent_statuses ?? [
    { agent: 'Clinical Reasoning', status: running ? 'running' : 'standby', summary: 'Disease & guideline guideline synthesis' },
    { agent: 'Drug Safety', status: running ? 'running' : 'standby', summary: 'Contraindication & cross-silo interaction check' },
    { agent: 'Literature Retrieval', status: running ? 'running' : 'standby', summary: 'Dense + lexical BM25 evidence boost' },
    { agent: 'DEA Arbitration', status: report ? 'complete' : 'standby', summary: 'Deterministic mathematical candidate ranking' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-border pb-3">
        <SectionLabel icon={BrainCircuit}>Clinical Pipeline Telemetry & Silo Resolution</SectionLabel>
        <span className="mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">
          {running ? (
            <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
              <span className="size-2 animate-ping rounded-full bg-amber-500" />
              Arbitration in progress
            </span>
          ) : report ? (
            <span className="flex items-center gap-1.5 text-primary font-semibold">
              <CheckCircle2 size={13} /> All silos resolved
            </span>
          ) : (
            'Standby'
          )}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statuses.map((s, i) => {
          const live = s.status.toLowerCase().includes('running') || s.status.toLowerCase().includes('progress');
          const done = s.status.toLowerCase().includes('complete') || s.status.toLowerCase().includes('success');
          return (
            <div
              key={s.agent}
              data-testid={`status-agent-${i}`}
              className={cx(
                'relative flex flex-col justify-between rounded-lg border p-3.5 transition-all',
                done
                  ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                  : live
                  ? 'border-amber-500/40 bg-amber-500/[0.06]'
                  : 'border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/20'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cx(
                    'grid size-6 place-items-center rounded-full border text-xs font-semibold',
                    done
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : live
                      ? 'border-amber-600/50 bg-amber-500/20 text-amber-800'
                      : 'border-slate-200 dark:border-border bg-slate-100 dark:bg-muted text-muted-foreground'
                  )}
                >
                  {done ? <Check size={12} /> : live ? <LoaderCircle size={12} className="animate-spin" /> : <span>{i + 1}</span>}
                </div>
                <Pill tone={done ? 'emerald' : live ? 'amber' : 'neutral'}>{s.status}</Pill>
              </div>
              <div className="mt-2.5">
                <div className="text-xs font-semibold text-foreground">{s.agent}</div>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{s.summary}</p>
              </div>
            </div>
          );
        })}
      </div>
      {running && (
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-slate-100 dark:border-border pt-3 mono text-[10px] uppercase tracking-[.1em] text-amber-700">
          <span className="size-2 animate-ping rounded-full bg-amber-500" />
          Deterministic evidence arbitration matrix evaluating candidates...
        </div>
      )}
    </div>
  );
}

function EvidencePanel({ report }: { report: AnalysisReport }) {
  const [activeTab, setActiveTab] = useState<'all' | 'clinical' | 'drug' | 'literature'>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'stacked'>('grid');
  const silos = [
    { id: 'clinical', label: 'Clinical Silo', tone: 'teal' as const, icon: Activity, data: report.clinical, colorClass: 'text-teal-700 dark:text-teal-400 bg-teal-500/10 border-teal-500/20' },
    { id: 'drug', label: 'Drug Safety Silo', tone: 'red' as const, icon: ShieldAlert, data: report.drug, colorClass: 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { id: 'literature', label: 'Literature Silo', tone: 'blue' as const, icon: BookOpen, data: report.literature, colorClass: 'text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/20' },
  ];

  const displayedSilos = activeTab === 'all' ? silos : silos.filter(s => s.id === activeTab);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel icon={Layers3}>Independent Evidence Silos</SectionLabel>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-card/60 p-1 mono text-[10px]">
            <button
              onClick={() => setActiveTab('all')}
              className={cx('rounded-sm px-2.5 py-1 font-semibold uppercase tracking-wider transition-colors', activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              All Silos ({silos.length})
            </button>
            <button
              onClick={() => setActiveTab('clinical')}
              className={cx('rounded-sm px-2.5 py-1 font-semibold uppercase tracking-wider transition-colors', activeTab === 'clinical' ? 'bg-teal-700 text-white' : 'text-muted-foreground hover:text-foreground')}
            >
              Clinical
            </button>
            <button
              onClick={() => setActiveTab('drug')}
              className={cx('rounded-sm px-2.5 py-1 font-semibold uppercase tracking-wider transition-colors', activeTab === 'drug' ? 'bg-rose-700 text-white' : 'text-muted-foreground hover:text-foreground')}
            >
              Drug Safety
            </button>
            <button
              onClick={() => setActiveTab('literature')}
              className={cx('rounded-sm px-2.5 py-1 font-semibold uppercase tracking-wider transition-colors', activeTab === 'literature' ? 'bg-sky-700 text-white' : 'text-muted-foreground hover:text-foreground')}
            >
              Literature
            </button>
          </div>

          {activeTab === 'all' && (
            <div className="hidden sm:flex items-center gap-1 rounded-md border border-border bg-card/60 p-1">
              <button
                data-testid="button-evidence-grid-view"
                onClick={() => setLayoutMode('grid')}
                title="3-Column Side-by-Side Comparison (Full Screen)"
                className={cx('rounded-sm p-1.5 transition-colors', layoutMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <Columns2 size={13} />
              </button>
              <button
                data-testid="button-evidence-stacked-view"
                onClick={() => setLayoutMode('stacked')}
                title="Stacked Cards View"
                className={cx('rounded-sm p-1.5 transition-colors', layoutMode === 'stacked' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <Layers3 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={cx(
        activeTab === 'all' && layoutMode === 'grid'
          ? 'grid gap-5 grid-cols-1 xl:grid-cols-3 items-start'
          : 'space-y-5'
      )}>
        {displayedSilos.map(({ id, label, tone, icon: Icon, data, colorClass }) => (
          <div key={id} className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl shadow-sm relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-5 py-4 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className={cx('grid size-9 place-items-center rounded-md border', colorClass)}>
                  <Icon size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
                  <div className="mono text-[10px] text-muted-foreground">
                    {data.agent} · {data.source} · {data.year}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={tone}>Grade {data.evidence_grade.toFixed(1)} / 1.0</Pill>
                <span className="mono text-[10px] text-muted-foreground">
                  {data.evidence.length} retrieved chunk{data.evidence.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="p-5">
              {'claims' in data ? (
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                      Clinical Claims & Guideline Findings
                    </div>
                    <div className="grid gap-2">
                      {data.claims.map((claim, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 rounded-md border border-border/60 bg-card/60 p-3 text-xs leading-relaxed">
                          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" />
                          <span>{claim}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-4">
                    <div className="mb-2 mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                      Guideline Recommendations
                    </div>
                    <div className="space-y-2">
                      {data.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/[0.04] p-3 text-xs leading-relaxed">
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground mono text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-foreground">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : 'drug' in data ? (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-md border border-border/70 bg-card/60 p-4">
                      <div className="mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                        Exposure Under Review
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-lg font-bold">
                        <PillIcon size={18} className="text-rose-600" />
                        <span>{data.drug}</span>
                      </div>
                    </div>

                    <div className="rounded-md border border-border/70 bg-card/60 p-4">
                      <div className="flex items-center justify-between">
                        <div className="mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                          Patient-Specific Risk Score
                        </div>
                        <Pill tone={data.patient_specific_risk >= 0.7 ? 'red' : data.patient_specific_risk >= 0.3 ? 'amber' : 'teal'}>
                          {data.patient_specific_risk >= 0.7 ? 'High Risk' : data.patient_specific_risk >= 0.3 ? 'Moderate' : 'Low Risk'}
                        </Pill>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold display text-rose-700 dark:text-rose-400">
                          {(data.patient_specific_risk * 100).toFixed(0)}
                        </span>
                        <span className="text-xs text-muted-foreground">/100 penalty surface</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-600 transition-all duration-500"
                          style={{ width: `${Math.min(100, data.patient_specific_risk * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                        Identified Drug Warnings & Interactions
                      </div>
                      <div className="space-y-2">
                        {data.interactions.map((x, i) => (
                          <div key={i} className="rounded-md border border-rose-600/25 bg-rose-500/[0.06] p-3 text-xs leading-relaxed text-foreground">
                            <div className="flex items-start gap-2">
                              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-600" />
                              <span className="font-medium">{x}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                        Contraindications Check
                      </div>
                      <div className="space-y-2">
                        {data.contraindications.map((x, i) => (
                          <div key={i} className="rounded-md border border-border/70 bg-card/60 p-3 text-xs leading-relaxed text-muted-foreground">
                            <div className="flex items-start gap-2">
                              <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
                              <span>{x}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                      Empirical Findings & Trials
                    </div>
                    <div className="space-y-2">
                      {data.findings.map((x, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-md border border-sky-600/20 bg-sky-500/[0.04] p-3 text-xs leading-relaxed">
                          <BookOpen size={14} className="mt-0.5 shrink-0 text-sky-700" />
                          <span>{x}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                      Alternative Treatment Options
                    </div>
                    <div className="space-y-2">
                      {data.alternative_treatments.map((x, i) => (
                        <div key={i} className="rounded-md border border-border/70 bg-card/60 p-3 text-xs">
                          <div className="flex items-center gap-2">
                            <PillIcon size={13} className="text-sky-600" />
                            <span className="font-semibold text-foreground">{x}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 border-t border-border/70 pt-4">
                <div className="mb-3 flex items-center justify-between mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                  <span>Retrieved Knowledge Evidence Trace</span>
                  <span>{data.evidence.length} Cited Record{data.evidence.length === 1 ? '' : 's'}</span>
                </div>
                <div className="space-y-2">
                  {data.evidence.map((e, i) => (
                    <details key={e.id} className="group rounded-md border border-border/80 bg-muted/20 p-3 transition-colors hover:border-border">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="mono text-[11px] font-bold text-primary">#{String(i + 1).padStart(2, '0')}</span>
                          <span className="truncate">{e.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {e.similarity !== undefined && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 mono text-[10px] font-semibold text-primary">
                              Cosine {e.similarity.toFixed(3)}
                            </span>
                          )}
                          <ChevronDown size={14} className="text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                        </div>
                      </summary>
                      <div className="mt-3 border-t border-border/50 pt-2.5 text-xs leading-relaxed text-muted-foreground space-y-2">
                        <div className="flex flex-wrap items-center gap-3 mono text-[10px] uppercase text-muted-foreground">
                          <span>Collection: <strong className="text-foreground">{e.domain}</strong></span>
                          <span>Source: <strong className="text-foreground">{e.source}</strong></span>
                          <span>Page: <strong className="text-foreground">{e.page ?? 'N/A'}</strong></span>
                        </div>
                        <blockquote className="rounded border-l-2 border-primary/50 bg-background/60 p-2.5 text-xs text-foreground/90 italic">
                          "{e.chunk ?? e.excerpt}"
                        </blockquote>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportView({
  report,
  patient,
  onReRun,
  isReRunning = false,
  initialTab = 'arbitration',
}: {
  report: AnalysisReport;
  patient?: PatientProfileInput;
  onReRun?: (modifiedPatient: PatientProfileInput, weights: { alpha: number; beta: number; gamma: number; delta: number }) => void;
  isReRunning?: boolean;
  initialTab?: 'arbitration' | 'whatif' | 'evidence' | 'reconciler';
}) {
  const [reportTab, setReportTab] = useState<'arbitration' | 'whatif' | 'evidence' | 'reconciler'>(initialTab);
  const [expandedCandidate, setExpandedCandidate] = useState<number | null>(null);

  useEffect(() => {
    if (initialTab) {
      setReportTab(initialTab);
    }
  }, [initialTab]);

  const top = report.dea.candidates[0];

  const confirmedConflicts = useMemo(
    () => report.conflicts.filter(c => getConflictCategory(c) === 'CONFIRMED_CONFLICT'),
    [report.conflicts]
  );
  const coverageGapAdvisories = useMemo(
    () => report.conflicts.filter(c => getConflictCategory(c) === 'RETRIEVAL_COVERAGE_GAP_ADVISORY'),
    [report.conflicts]
  );
  const dataQualityAdvisories = useMemo(
    () => report.conflicts.filter(c => getConflictCategory(c) === 'DATA_QUALITY_ADVISORY'),
    [report.conflicts]
  );
  const unknownAlerts = useMemo(
    () => report.conflicts.filter(c => getConflictCategory(c) === 'UNKNOWN_STATUS_CONFLICT'),
    [report.conflicts]
  );

  const hasActiveFindings =
    confirmedConflicts.length > 0 ||
    coverageGapAdvisories.length > 0 ||
    dataQualityAdvisories.length > 0 ||
    unknownAlerts.length > 0;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 5-Second Patient Summary Card (Crisp 2-Row White Card) */}
      <PatientSummaryCard report={report} patient={patient} />

      {/* Real-Time Safety & Contraindication Alert Banner */}
      <SafetyAlertBanner report={report} />

      {/* 4-Tab Navigation Bar cleanly below SafetyAlertBanner */}
      <div className="mt-2 border-b border-slate-200 dark:border-border pb-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card p-1 text-xs shadow-xs w-fit">
          <button
            onClick={() => setReportTab('arbitration')}
            data-testid="tab-report-arbitration"
            className={cx(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer',
              reportTab === 'arbitration'
                ? 'bg-slate-100 dark:bg-muted text-primary shadow-xs font-black'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Target size={13} />
            <span>Arbitration & Ranking</span>
            <span className="rounded bg-primary/10 dark:bg-white/20 px-1.5 py-0.2 text-[9px]">
              {report.dea.candidates.length}
            </span>
          </button>

          <button
            onClick={() => setReportTab('whatif')}
            data-testid="tab-report-whatif"
            className={cx(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer',
              reportTab === 'whatif'
                ? 'bg-slate-100 dark:bg-muted text-primary shadow-xs font-black'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <SlidersHorizontal size={13} />
            <span>What-If Simulator</span>
          </button>

          <button
            onClick={() => setReportTab('evidence')}
            data-testid="tab-report-evidence"
            className={cx(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer',
              reportTab === 'evidence'
                ? 'bg-slate-100 dark:bg-muted text-primary shadow-xs font-black'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Layers3 size={13} />
            <span>Evidence Silos & Conflicts</span>
            {confirmedConflicts.length > 0 && (
              <span className="rounded bg-rose-500 text-white px-1.5 py-0.2 text-[9px] font-bold">
                {confirmedConflicts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setReportTab('reconciler')}
            data-testid="tab-report-reconciler"
            className={cx(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer',
              reportTab === 'reconciler'
                ? 'bg-slate-100 dark:bg-muted text-primary shadow-xs font-black'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <GitCompare size={13} />
            <span>Medication Reconciler</span>
            {report?.reconciliation?.has_discrepancy && (
              <span className="rounded bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-bold">
                !
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Tab Panel in normal document flow */}
      <div className="space-y-4">
        {/* Tab 1: Arbitration & Ranking */}
        {reportTab === 'arbitration' && (
          <div className="space-y-4">
            {/* DEA Ranked Candidates Card */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl shadow-sm relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-border px-5 py-3.5 bg-slate-50 dark:bg-muted/40">
                <div className="flex items-center gap-2">
                  <Target size={15} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    DEA Ranked Treatment Pathways
                  </h3>
                  <span className="rounded bg-teal-500/10 border border-teal-500/20 px-2 py-0.2 mono text-[10px] font-bold text-teal-800 dark:text-teal-300">
                    V = 0.35Q + 0.30S + 0.15T − 0.20P
                  </span>
                </div>

                <div className="flex items-center gap-2 mono text-[10px] text-muted-foreground">
                  <span>Deterministic Arbitration</span>
                  <span>•</span>
                  <span>Zero Hallucination</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-border/60">
                {report.dea.candidates.map((c) => {
                  const isRank1 = c.ranking === 1;
                  const isContra = Boolean(c.contraindicated_flag);
                  const isExpanded = expandedCandidate === c.ranking;

                  return (
                    <div
                      key={c.ranking}
                      data-testid={`row-candidate-${c.ranking}`}
                      className={cx(
                        'p-4 transition-colors relative',
                        isContra
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-l-4 border-l-rose-600'
                          : isRank1
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-l-teal-600'
                          : 'bg-white dark:bg-card hover:bg-slate-50/80 dark:hover:bg-muted/20'
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={cx(
                              'grid size-7 shrink-0 place-items-center rounded-md border mono text-xs font-bold',
                              isContra
                                ? 'border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : isRank1
                                ? 'border-teal-600 bg-teal-600 text-white'
                                : 'border-slate-200 dark:border-border bg-slate-100 dark:bg-muted text-muted-foreground'
                            )}
                          >
                            {String(c.ranking).padStart(2, '0')}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cx(
                                  'text-sm font-bold text-foreground cursor-pointer hover:underline',
                                  isContra && 'line-through text-rose-900 dark:text-rose-300',
                                  !isExpanded && 'line-clamp-2'
                                )}
                                onClick={() => setExpandedCandidate(isExpanded ? null : c.ranking)}
                                title="Click to toggle full excerpt"
                              >
                                {c.candidate}
                              </span>

                              {isContra && (
                                <span className="rounded bg-rose-600 px-1.5 py-0.2 mono text-[9px] font-black uppercase text-white shrink-0">
                                  CONTRAINDICATED
                                </span>
                              )}
                              {isRank1 && !isContra && (
                                <span className="rounded bg-teal-600 px-1.5 py-0.2 mono text-[9px] font-bold uppercase text-white shrink-0">
                                  RANK #1 PREFERRED
                                </span>
                              )}
                            </div>

                            {c.safety_rationale && (
                              <div className="mt-1 text-xs text-rose-700 dark:text-rose-300 font-medium">
                                ⚠️ {c.safety_rationale}
                              </div>
                            )}

                            {/* Dimension breakdown in font-mono tabular-nums */}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px] tabular-nums">
                              <span className="rounded bg-slate-100 dark:bg-muted px-2 py-0.5 font-semibold text-slate-700 dark:text-slate-300">
                                Q: {c.q_grade.toFixed(2)}
                              </span>
                              <span className="rounded bg-slate-100 dark:bg-muted px-2 py-0.5 font-semibold text-slate-700 dark:text-slate-300">
                                S: {c.s_rel.toFixed(2)}
                              </span>
                              <span className="rounded bg-slate-100 dark:bg-muted px-2 py-0.5 font-semibold text-slate-700 dark:text-slate-300">
                                T: {c.t_recent.toFixed(2)}
                              </span>
                              <span
                                className={cx(
                                  'rounded px-2 py-0.5 font-bold',
                                  c.p_risk > 0.5
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-slate-100 dark:bg-muted text-slate-700 dark:text-slate-300'
                                )}
                              >
                                P: -{c.p_risk.toFixed(2)}
                              </span>
                              <span className="text-muted-foreground ml-1 uppercase text-[9px]">
                                · {c.source}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Composite V_score Pill */}
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="mono text-[10px] text-muted-foreground uppercase">Score:</span>
                            <span
                              className={cx(
                                'mono text-lg font-black tabular-nums display',
                                isContra ? 'text-rose-600' : isRank1 ? 'text-primary' : 'text-foreground'
                              )}
                            >
                              {c.score.toFixed(3)}
                            </span>
                          </div>
                          {top && c.ranking > 1 && (
                            <div className="mono text-[10px] text-muted-foreground">
                              -{(top.score - c.score).toFixed(3)} vs #1
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verified Clinical Synthesis */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-border px-5 py-3.5 bg-slate-50 dark:bg-muted/40">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Arbitration Synthesis & Claim Verification
                  </h3>
                  <span className="rounded bg-teal-500/10 border border-teal-500/20 px-2 py-0.2 mono text-[10px] font-bold text-teal-800 dark:text-teal-300">
                    Deterministic Grounding
                  </span>
                </div>
              </div>
              <div className="p-4">
                <ClaimChecker report={report} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: What-If Simulator */}
        {reportTab === 'whatif' && (
          <div className="relative">
            <WhatIfSimulator
              initialPatient={patient || fallbackPatient}
              initialCandidates={report.dea.candidates}
              initialWeights={report.dea.weights}
              onRerun={(modPatient, weights) => {
                if (onReRun) onReRun(modPatient, weights);
              }}
              isRunning={isReRunning}
            />
          </div>
        )}

        {/* Tab 3: Evidence Silos & Conflicts */}
        {reportTab === 'evidence' && (
          <div className="space-y-4">
            {/* Conflict Register Card */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm relative space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-border pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Cross-Silo Conflict Register
                  </h3>
                  <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.2 mono text-[10px] font-bold text-rose-800 dark:text-rose-300">
                    {confirmedConflicts.length} Confirmed Conflict{confirmedConflicts.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {hasActiveFindings ? (
                <div className="space-y-2.5">
                  {confirmedConflicts.map((c, i) => (
                    <div
                      key={`conf-${i}`}
                      className="rounded-md border-l-4 border-l-rose-600 border border-slate-200 dark:border-border p-3 text-xs bg-white dark:bg-card relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-foreground">{c.conflict_type}</div>
                        <div className="flex items-center gap-1.5">
                          <Pill tone="red">{c.severity}</Pill>
                          <Pill tone="teal">Verified Linkage</Pill>
                        </div>
                      </div>
                      <p className="mt-1.5 text-muted-foreground leading-relaxed text-xs">{c.description}</p>
                      <div className="mt-2 flex items-center justify-between mono text-[10px]">
                        <span className="font-semibold text-rose-700 dark:text-rose-400">
                          Affects: {c.affected_treatment}
                        </span>
                        <span>Risk factor: {c.risk_factor}</span>
                      </div>
                    </div>
                  ))}

                  {coverageGapAdvisories.map((c, i) => (
                    <div
                      key={`gap-${i}`}
                      className="rounded-md border-l-4 border-l-sky-500 border border-slate-200 dark:border-border p-3 text-xs bg-white dark:bg-card relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-foreground">{c.conflict_type}</div>
                        <Pill tone="blue">Coverage Gap</Pill>
                      </div>
                      <p className="mt-1.5 text-muted-foreground leading-relaxed text-xs">{c.description}</p>
                      <div className="mt-2 mono text-[10px] text-sky-700 dark:text-sky-400">
                        Affects: {c.affected_treatment}
                      </div>
                    </div>
                  ))}

                  {dataQualityAdvisories.map((c, i) => (
                    <div
                      key={`dq-${i}`}
                      className="rounded-md border-l-4 border-l-amber-500 border border-slate-200 dark:border-border p-3 text-xs bg-white dark:bg-card relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-foreground">{c.conflict_type}</div>
                        <Pill tone="amber">Data Quality</Pill>
                      </div>
                      <p className="mt-1.5 text-muted-foreground leading-relaxed text-xs">{c.description}</p>
                      <div className="mt-2 mono text-[10px] text-amber-700 dark:text-amber-400">
                        Affects: {c.affected_treatment}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded border border-teal-500/20 bg-teal-500/5 p-4 text-xs flex items-center gap-2.5 text-teal-900 dark:text-teal-200">
                  <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                  <span>Zero cross-silo contradictions or safety collisions detected under retrieved evidence.</span>
                </div>
              )}
            </div>

            {/* Specialist Evidence Silos */}
            <EvidencePanel report={report} />
          </div>
        )}

        {/* Tab 4: Medication Reconciler */}
        {reportTab === 'reconciler' && (
          <div className="relative">
            <MedicationReconciler
              initialClinicMeds={patient?.medications || []}
              initialDischargeMeds={
                patient?.secondary_medications && patient.secondary_medications.length > 0
                  ? patient.secondary_medications
                  : [
                      'Metformin 1000 mg twice daily',
                      'Lisinopril 20 mg daily',
                      'Apixaban 2.5 mg twice daily',
                      'Atorvastatin 40 mg daily',
                    ]
              }
              patient={patient || fallbackPatient}
              initialReport={report?.reconciliation}
              onConfirmMerge={(newMeds) => {
                if (patient && onReRun) {
                  const updated = { ...patient, medications: newMeds };
                  onReRun(updated, report.dea.weights);
                  setReportTab('arbitration');
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Action Bar Anchored in Canvas Flow */}
      <div className="space-y-4 pt-2">
        <ReproducibilityBadge report={report} patient={patient} />
        <DoctorSignOff report={report} patient={patient} candidates={report.dea.candidates} />
      </div>

      {/* Clean Compact Clinical CDS Footer */}
      <div
        data-testid="text-disclaimer"
        className="pt-2 text-center mono text-[10px] text-muted-foreground"
      >
        Clinical Decision Support System • AI Finds the Evidence, Math Ranks It, Doctors Decide • Final Prescribing Authority Resides with the Attending Clinician.
      </div>
    </div>
  );
}

function Workspace() {
  const demoQuery = useListDemoCases({ query: { queryKey: getListDemoCasesQueryKey() } });
  const analyze = useAnalyzeCase();
  const [report, setReport] = useState<AnalysisReport>();
  const [currentPatient, setCurrentPatient] = useState<PatientProfileInput>(fallbackPatient);
  const [loadedCase, setLoadedCase] = useState<DemoCase>();
  const [inputFolded, setInputFolded] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'arbitration' | 'reconciler'>('arbitration');

  const run = (patient: PatientProfileInput, weights?: { alpha: number; beta: number; gamma: number; delta: number }) => {
    setCurrentPatient(patient);
    const payload = weights ? { ...patient, weights } : patient;
    analyze.mutate({ data: payload }, { onSuccess: setReport });
  };

  // Listen for cases loaded directly from the Evaluation Dashboard
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('cleardose_load_case');
      if (stored) {
        sessionStorage.removeItem('cleardose_load_case');
        const parsed = JSON.parse(stored);
        if (parsed?.patient) {
          setCurrentPatient(parsed.patient);
          setLoadedCase({
            id: parsed.case_id || 'BENCHMARK',
            title: parsed.title || 'Benchmark Case',
            description: parsed.clinical_scenario || parsed.description || '',
            conflict_profile: parsed.conflict_profile || 'Benchmark Guideline Collision',
            patient: parsed.patient,
          });
          run(parsed.patient);
        }
      }
    } catch (e) {
      console.error('Failed to parse pending benchmark case', e);
    }
  }, []);

  // Listen for cases loaded directly from the Audit History Drawer
  useEffect(() => {
    const handleLoadCaseEvent = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.patient) {
        const patientData = custom.detail.patient;
        setCurrentPatient(patientData);
        setLoadedCase({
          id: custom.detail.case_id || 'AUDIT-CASE',
          title: custom.detail.title || 'Historical Audited Patient Vector',
          description: custom.detail.clinical_scenario || custom.detail.description || 'Loaded from cryptographic clinical audit store',
          conflict_profile: custom.detail.conflict_profile || 'Audit Ledger Record',
          patient: patientData,
        });
        run(patientData);
      }
    };
    window.addEventListener('cleardose:load_case', handleLoadCaseEvent);
    return () => window.removeEventListener('cleardose:load_case', handleLoadCaseEvent);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 dark:bg-background">
      {/* Left Column: Patient Dossier & Intake Drawer (w-96, collapsible) */}
      <aside
        className={cx(
          'w-96 shrink-0 border-r border-slate-200 dark:border-border bg-white dark:bg-card overflow-y-auto p-5 space-y-4 transition-all duration-300',
          inputFolded ? 'hidden' : 'block'
        )}
      >
        <CaseForm
          patient={currentPatient}
          setPatient={setCurrentPatient}
          onRun={run}
          demoCases={demoQuery.data}
          isLoadingCases={demoQuery.isLoading}
          isRunning={analyze.isPending}
          onLoadDemo={(c) => {
            setLoadedCase(c);
            setCurrentPatient(c.patient);
          }}
          onFold={() => setInputFolded(true)}
        />

        {loadedCase && (
          <div
            data-testid="status-loaded-case"
            className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs leading-relaxed text-foreground/80 shadow-2xs"
          >
            <Sparkles size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <strong className="font-semibold text-foreground">{loadedCase.title}</strong>
              <p className="mt-0.5 text-muted-foreground text-[11px]">Loaded from verified clinical benchmark cohort.</p>
            </div>
          </div>
        )}

        {analyze.isError && (
          <div
            data-testid="status-analysis-error"
            className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-3.5 text-xs text-rose-800 dark:text-rose-300 shadow-2xs"
          >
            <AlertTriangle size={16} className="shrink-0 text-rose-600 mt-0.5" />
            <div>
              <strong>Arbitration could not complete.</strong>
              <p className="mt-1 text-xs">The clinical server returned an error. Check connectivity and retry.</p>
              <button
                data-testid="button-dismiss-analysis-error"
                onClick={() => analyze.reset()}
                className="mt-2 text-xs font-semibold underline hover:no-underline cursor-pointer"
              >
                Dismiss Error
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Right Column: Clinical Arbitration Canvas (flex-1) */}
      <section className="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-background">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
          {/* Workspace Sub-Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="display text-xl font-bold tracking-tight text-foreground">
                Clinical Arbitration Workspace
              </span>
              <span className="hidden sm:inline-block rounded bg-primary/10 px-2 py-0.5 mono text-[10px] font-bold text-primary">
                Multi-Silo Evidence & Deterministic DEA Arbitration
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI Finds the Evidence. Math Ranks It. Doctors Decide. • Final prescribing authority resides with attending clinician.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Workspace Tab Switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card p-1 shadow-2xs text-xs">
              <button
                onClick={() => setWorkspaceTab('arbitration')}
                data-testid="tab-arbitration-view"
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1 mono text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer',
                  workspaceTab === 'arbitration'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Microscope size={13} />
                <span>Arbitration Workspace</span>
              </button>
              <button
                onClick={() => setWorkspaceTab('reconciler')}
                data-testid="tab-reconciler-view"
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1 mono text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer',
                  workspaceTab === 'reconciler'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <GitCompare size={13} />
                <span>Medication Reconciler</span>
                {report?.reconciliation?.has_discrepancy && (
                  <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-bold">
                    {(report.reconciliation.missing_in_discharge?.length || 0) +
                      (report.reconciliation.added_in_discharge?.length || 0) +
                      (report.reconciliation.dose_discrepancy?.length || 0) +
                      (report.reconciliation.therapeutic_duplications?.length || 0) || '!'}
                  </span>
                )}
              </button>
            </div>

            <button
              data-testid="button-toggle-input-layout"
              onClick={() => setInputFolded((f) => !f)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-slate-100 dark:hover:bg-muted hover:text-foreground transition-all shadow-2xs cursor-pointer"
              title={inputFolded ? 'Open Patient Dossier' : 'Fold Patient Dossier for Full-Width Canvas'}
            >
              {inputFolded ? (
                <>
                  <PanelLeftOpen size={14} className="text-primary" />
                  <span>Open Patient Dossier</span>
                </>
              ) : (
                <>
                  <PanelLeftClose size={14} className="text-primary" />
                  <span>Fold Dossier</span>
                </>
              )}
            </button>

            <button
              data-testid="button-workspace-audit-history"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('cleardose:open_audit_drawer'));
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-slate-100 dark:hover:bg-muted hover:text-foreground transition-all shadow-2xs cursor-pointer"
              title="View immutable SHA-256 case audit records and clinician sign-offs"
            >
              <History size={13} className="text-primary" />
              <span>Audit Ledger</span>
            </button>
          </div>
        </div>

        {/* Medication Reconciler Tab Content */}
        {workspaceTab === 'reconciler' ? (
          <div className="space-y-6 animate-rise">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Inpatient & Discharge Transition Safety
                </div>
                <h2 className="display text-2xl font-bold">Medication List Reconciler</h2>
              </div>
              <Button variant="ghost" testId="button-switch-to-workspace" onClick={() => setWorkspaceTab('arbitration')}>
                <Microscope size={14} />
                <span>Back to Clinical Arbitration</span>
              </Button>
            </div>
            <MedicationReconciler
              initialClinicMeds={currentPatient.medications}
              initialDischargeMeds={
                currentPatient.secondary_medications && currentPatient.secondary_medications.length > 0
                  ? currentPatient.secondary_medications
                  : [
                      'Metformin 1000 mg twice daily',
                      'Lisinopril 20 mg daily',
                      'Apixaban 2.5 mg twice daily',
                      'Atorvastatin 40 mg daily',
                      'Omeprazole 20 mg daily',
                    ]
              }
              patient={currentPatient}
              initialReport={report?.reconciliation}
              onConfirmMerge={(newMeds) => {
                const updated: PatientProfileInput = { ...currentPatient, medications: newMeds };
                setCurrentPatient(updated);
                setWorkspaceTab('arbitration');
                run(updated);
              }}
            />
          </div>
        ) : (
          <>
            {/* Folded Input Vector Notification Banner */}
            {inputFolded && (
              <div
                data-testid="banner-input-folded"
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-3 text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Stethoscope size={15} />
                  </div>
                  <div>
                    <span className="font-bold text-foreground">
                      Patient Dossier Folded • Full-Width Clinical Arbitration Canvas Active
                    </span>
                    <span className="text-muted-foreground ml-2 text-[11px]">
                      ({loadedCase ? loadedCase.title : `${currentPatient.age}yo ${currentPatient.sex}`})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setInputFolded(false)}
                  data-testid="button-unfold-input-panel"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white dark:bg-card px-2.5 py-1 text-xs font-semibold text-primary hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                >
                  <PanelLeftOpen size={13} />
                  <span>Expand Patient Dossier</span>
                </button>
              </div>
            )}

            {/* Right Column Content */}
            <AgentRail report={report} running={analyze.isPending} />

            {!report && !analyze.isPending && (
              <Card className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center border-dashed">
                <div className="mb-4 grid size-16 place-items-center rounded-2xl border border-primary/25 bg-primary/5 text-primary shadow-inner">
                  <FlaskConical size={28} />
                </div>
                <div className="display text-xl font-bold text-foreground">Awaiting Clinical Case Vector</div>
                <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Select a preset patient case or customize the profile on the left to initialize multi-silo biomedical retrieval and deterministic mathematical DEA arbitration.
                </p>
                {demoQuery.data && demoQuery.data.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <span className="mono text-[10px] uppercase text-muted-foreground mr-1">Quick Presets:</span>
                    {demoQuery.data.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setLoadedCase(c);
                          setCurrentPatient(c.patient);
                          run(c.patient);
                        }}
                        className="rounded-lg border border-border bg-white dark:bg-card px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary transition-colors cursor-pointer shadow-2xs"
                      >
                        {c.title.split('/')[1]?.trim() ?? c.title}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {analyze.isPending && (
              <Card className="p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <LoaderCircle size={18} className="animate-spin text-primary" />
                    <span className="mono text-xs uppercase tracking-wider font-semibold text-primary">
                      Multi-Silo Retrieval & Deterministic DEA Ranking in progress…
                    </span>
                  </div>
                  <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
                  <div className="h-8 w-3/4 animate-pulse rounded-md bg-muted" />
                  <div className="h-24 animate-pulse rounded-md bg-muted" />
                  <div className="h-12 w-1/2 animate-pulse rounded-md bg-muted" />
                </div>
              </Card>
            )}

            {report && (
              <ReportView
                report={report}
                patient={currentPatient}
                onReRun={run}
                isReRunning={analyze.isPending}
                initialTab="arbitration"
              />
            )}
          </>
        )}
        </div>
      </section>
    </div>
  );
}

function Evaluation() {
  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto space-y-6">
      <EvaluationDashboard />
    </div>
  );
}

function Knowledge() {
  const ingest = useIngestDocument();
  const statsQuery = useGetKnowledgeStats({ query: { queryKey: getGetKnowledgeStatsQueryKey() } });
  const [form, setForm] = useState<IngestDocumentInput>({
    title: '',
    domain: 'clinical',
    source: '',
    year: 2024,
    evidence_grade: 0.7,
    risk_level: 'moderate',
    content: '',
  });
  const [receipts, setReceipts] = useState<Array<{ id: string; title: string; collection: string; chunks: number }>>([]);
  const set = (key: keyof IngestDocumentInput, value: string) =>
    setForm(f => ({ ...f, [key]: ['year', 'evidence_grade'].includes(key) ? Number(value) : value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    ingest.mutate(
      { data: form },
      {
        onSuccess: receipt => {
          setReceipts(r => [{ id: receipt.document_id, title: form.title, collection: receipt.collection, chunks: receipt.chunk_count }, ...r]);
          setForm(f => ({ ...f, title: '', source: '', content: '' }));
        },
      }
    );
  };
  const siloDetails = {
    clinical: { name: 'Clinical Guidelines', color: 'teal', detail: 'Diseases, pathways, practice guidelines' },
    drug: { name: 'Drug Safety & Labels', color: 'red', detail: 'FDA labels, contraindications, black-box warnings' },
    literature: { name: 'Biomedical Literature', color: 'blue', detail: 'RCTs, meta-analyses, alternative treatments' },
  } as const;
  const silos = (statsQuery.data?.silos ?? Object.keys(siloDetails).map(key => ({
    domain: key,
    collection: key,
    document_count: 0,
    chunk_count: 0,
    source_names: [],
    status: 'loading',
    embedding_model: '',
  }))).map(s => ({ ...s, ...siloDetails[s.domain as keyof typeof siloDetails], key: s.domain }));

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto space-y-6 animate-rise">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Pill tone="teal">CORPUS CONTROL</Pill>
          <span className="mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Knowledge / 03</span>
        </div>
        <h1 className="display text-4xl font-semibold tracking-tight">
          Keep the silos<br />
          <span className="text-primary">independent.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Register documents into separate persisted ChromaDB collections. DEA evaluates and verifies citations against authoritative medical guidelines and product labels.
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {silos.map(s => (
          <Card key={s.key} className="p-5">
            <div className="flex items-start justify-between">
              <div
                className={cx(
                  'grid size-9 place-items-center rounded-sm',
                  s.color === 'teal' && 'bg-teal-700/10 text-teal-800',
                  s.color === 'red' && 'bg-red-700/10 text-red-800',
                  s.color === 'blue' && 'bg-sky-700/10 text-sky-800'
                )}
              >
                <Database size={17} />
              </div>
              <Pill>{s.key}</Pill>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.detail}</div>
              </div>
              <div data-testid={`text-silo-count-${s.key}`} className="mono text-2xl font-semibold">
                {s.chunk_count}
              </div>
            </div>
            <div className="mt-2 mono text-[10px] text-muted-foreground">
              {s.document_count} document{s.document_count === 1 ? '' : 's'} · {s.status}
            </div>
            <div className="mt-4 h-1 rounded-full bg-muted">
              <div
                className={cx(
                  'h-1 rounded-full',
                  s.color === 'teal' && 'w-[58%] bg-teal-700',
                  s.color === 'red' && 'w-[34%] bg-red-700',
                  s.color === 'blue' && 'w-[78%] bg-sky-700'
                )}
              />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
        <Card className="p-5">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <SectionLabel icon={Upload}>Document Ingestion</SectionLabel>
              <h2 className="display text-xl font-semibold">Register an Authoritative Source</h2>
            </div>
            <Pill tone="amber">local index</Pill>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Field
              label="Document title"
              value={form.title}
              onChange={v => set('title', v)}
              placeholder="e.g. Anticoagulation in CKD — KDIGO 2024 Practice Guideline"
              testId="input-document-title"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block mono text-[10px] uppercase tracking-[.11em] text-muted-foreground">Silo / Domain</span>
                <select
                  value={form.domain}
                  onChange={e => set('domain', e.target.value)}
                  data-testid="select-document-domain"
                  className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {['clinical', 'drug', 'literature'].map(x => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Publication year"
                value={String(form.year)}
                onChange={v => set('year', v)}
                type="number"
                testId="input-document-year"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Source / citation"
                value={form.source}
                onChange={v => set('source', v)}
                placeholder="e.g. KDIGO, DailyMed, NEJM"
                testId="input-document-source"
              />
              <label className="block">
                <span className="mb-1.5 block mono text-[10px] uppercase tracking-[.11em] text-muted-foreground">Risk level</span>
                <select
                  value={form.risk_level}
                  onChange={e => set('risk_level', e.target.value)}
                  data-testid="select-document-risk"
                  className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {['low', 'moderate', 'high'].map(x => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </label>
            </div>
            <Field
              label="Evidence grade (0—1)"
              value={String(form.evidence_grade)}
              onChange={v => set('evidence_grade', v)}
              type="number"
              testId="input-document-grade"
            />
            <TextArea
              label="Document content"
              value={form.content}
              onChange={v => set('content', v)}
              placeholder="Paste guideline, product insert, or study text for chunking and persistent indexing…"
              testId="input-document-content"
            />
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">Content will be embedded into an isolated Chroma collection.</span>
              <Button type="submit" disabled={ingest.isPending || !form.title || !form.content} testId="button-ingest-document">
                {ingest.isPending ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}
                Index Document
              </Button>
            </div>
          </form>
          {ingest.isError && (
            <div data-testid="status-ingest-error" className="mt-4 flex gap-2 border border-red-700/25 bg-red-700/5 p-3 text-xs text-red-800">
              <AlertTriangle size={14} />
              Indexing failed. Check the API server and try again.
            </div>
          )}
        </Card>

        <div>
          <Card className="p-5">
            <SectionLabel icon={FileInput}>Recent Ingestion Receipts</SectionLabel>
            {receipts.length === 0 ? (
              <div data-testid="empty-ingest-receipts" className="instrument-grid rounded-sm border border-dashed border-border p-8 text-center">
                <FileInput className="mx-auto text-muted-foreground" size={24} />
                <div className="mt-3 text-sm font-semibold">No New Documents</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Successful indexing receipts will appear here with their collection and chunk count.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {receipts.map(r => (
                  <div key={r.id} data-testid={`receipt-${r.id}`} className="rounded-sm border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Check size={14} className="text-primary" />
                      {r.title}
                    </div>
                    <div className="mt-2 flex gap-3 mono text-[10px] text-muted-foreground">
                      <span>{r.collection}</span>
                      <span>{r.chunks} chunks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="mt-5 rounded-md border border-border bg-card/60 p-5">
            <div className="flex gap-3">
              <ShieldCheck size={17} className="shrink-0 text-emerald-600" />
              <div>
                <div className="text-sm font-semibold text-foreground">Authoritative Evidence Standard</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Only use clinical practice guidelines, FDA SPL product labels, and peer-reviewed biomedical literature with verified provenance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Shell>
        <Switch>
          <Route path="/" component={Workspace} />
          <Route path="/evaluation" component={Evaluation} />
          <Route path="/knowledge" component={Knowledge} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
