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
    <div className="relative overflow-hidden rounded-md border border-card-border bg-card/90 p-4 shadow-sm transition-all duration-200 hover:border-primary/40 glass-card">
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
    <section className={cx('rounded-md border border-card-border bg-card/95 shadow-[var(--shadow)] backdrop-blur-xs transition-shadow', className)}>
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
  const [mobile, setMobile] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('dea_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('dea_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const nav = [
    { href: '/', label: 'Clinical Workstation', icon: Stethoscope },
    { href: '/evaluation', label: 'Evaluation & Benchmarks', icon: Gauge },
    { href: '/knowledge', label: 'Evidence Corpus', icon: Database },
  ];

  return (
    <div className="grain min-h-[100dvh] bg-background">
      {/* Foldable Navigation Sidebar */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-all duration-300 ease-in-out border-r border-[hsl(var(--sidebar-border))]',
          collapsed ? 'w-[68px]' : 'w-[256px]',
          mobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Top / Brand */}
          <div className="flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] px-3.5 py-4 min-h-[68px]">
            <Link href="/" data-testid="link-brand" className="flex items-center gap-3 overflow-hidden">
              <div className="grid size-9 shrink-0 place-items-center rounded-sm bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-sm">
                <Network size={19} />
              </div>
              {!collapsed && (
                <div className="transition-opacity duration-200 min-w-0">
                  <div className="display text-base font-semibold leading-none text-white truncate">ClearDose CDS</div>
                  <div className="mono mt-1 text-[9px] uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground))]/70 truncate">
                    Clinical Decision Support
                  </div>
                </div>
              )}
            </Link>
            <button
              data-testid="button-close-menu"
              onClick={() => setMobile(false)}
              className="text-white/50 hover:text-white md:hidden"
            >
              <X size={18} />
            </button>
            {!collapsed && (
              <button
                data-testid="button-fold-sidebar-inside"
                onClick={toggleSidebar}
                title="Fold menu bar (Full screen)"
                className="hidden md:flex size-7 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              >
                <PanelLeftClose size={15} />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <div className="px-2.5 py-6">
            {!collapsed && (
              <div className="mb-3 px-3 mono text-[9px] uppercase tracking-[.18em] text-white/35">
                Workstation Navigation
              </div>
            )}
            {nav.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
                  title={collapsed ? label : undefined}
                  className={cx(
                    'group mb-1.5 flex items-center rounded-md text-sm font-medium transition-all',
                    collapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5',
                    active
                      ? 'bg-[hsl(var(--sidebar-accent))] text-white shadow-xs'
                      : 'text-white/65 hover:bg-white/8 hover:text-white'
                  )}
                >
                  <Icon size={18} strokeWidth={1.8} className={cx('shrink-0 transition-colors', active ? 'text-[hsl(var(--sidebar-primary))]' : 'text-white/60 group-hover:text-white')} />
                  {!collapsed && <span className="truncate">{label}</span>}
                  {!collapsed && active && (
                    <span className="ml-auto size-1.5 shrink-0 rounded-full bg-[hsl(var(--sidebar-primary))]" />
                  )}
                </Link>
              );
            })}

            {/* Direct Audit History Ledger Drawer Trigger */}
            <button
              onClick={() => setAuditOpen(true)}
              data-testid="link-nav-audit-history"
              title={collapsed ? "Clinical Audit Ledger & Sign-Offs" : undefined}
              className={cx(
                'group mb-1.5 flex w-full items-center rounded-md text-sm font-medium transition-all text-white/65 hover:bg-white/8 hover:text-white',
                collapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5'
              )}
            >
              <History size={18} strokeWidth={1.8} className="shrink-0 text-white/60 group-hover:text-white" />
              {!collapsed && <span className="truncate">Audit History</span>}
            </button>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto border-t border-[hsl(var(--sidebar-border))] p-4">
            {!collapsed ? (
              <>
                <div className="flex items-start gap-2.5 text-[11px] leading-relaxed text-white/70">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span>
                    Clinical Decision Support System • AI Finds the Evidence, Math Ranks It, Doctors Decide • Final Prescribing Authority Resides with the Attending Clinician.
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between mono text-[9px] text-white/40">
                  <span>CLEARDOSE v1.2</span>
                  <span>HOSPITAL CDS</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/40">
                <button
                  onClick={toggleSidebar}
                  title="Expand menu bar"
                  className="grid size-8 place-items-center rounded hover:bg-white/10 hover:text-white transition-colors"
                >
                  <PanelLeftOpen size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container Area - expands when sidebar is folded */}
      <div
        className={cx(
          'transition-all duration-300 ease-in-out',
          collapsed ? 'md:pl-[68px]' : 'md:pl-[256px]'
        )}
      >
        {/* Top Header with Fold & Fullscreen Controls */}
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-border bg-background/95 px-4 sm:px-6 md:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Mobile menu open */}
            <button
              data-testid="button-open-menu"
              onClick={() => setMobile(true)}
              className="mr-1 text-muted-foreground hover:text-foreground md:hidden"
            >
              <Menu size={21} />
            </button>

            {/* Desktop Foldable Sidebar Toggle */}
            <button
              data-testid="button-toggle-sidebar"
              onClick={toggleSidebar}
              title={collapsed ? "Expand sidebar menu" : "Fold sidebar menu (Full screen view)"}
              className="hidden md:inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-2xs"
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>

            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_hsl(var(--primary)/.12)] animate-pulse" />
              <span className="mono text-[10px] uppercase tracking-[.15em] text-muted-foreground hidden sm:inline">
                Hospital-Grade Clinical Decision Support Workstation • ClearDose Engine
              </span>
              <span className="mono text-[10px] uppercase tracking-[.15em] text-muted-foreground sm:hidden">
                ClearDose CDS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden mono text-[10px] text-muted-foreground lg:block">
              HIPAA SECURE · DE-IDENTIFIED PATIENT DATA
            </span>

            {/* Audit History Ledger Toggle */}
            <button
              data-testid="button-open-audit-ledger"
              onClick={() => setAuditOpen(true)}
              title="Open Clinical Audit History & Immutable Ledger"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-2xs"
            >
              <History size={15} className="text-primary" />
              <span className="hidden sm:inline mono text-[11px]">Audit History</span>
            </button>

            {/* Fullscreen Mode Toggle */}
            <button
              data-testid="button-toggle-fullscreen"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen mode"}
              className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-2xs"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <div className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-primary shadow-2xs">
              CDS
            </div>
          </div>
        </header>

        {/* Fluid Edge-to-Edge Main Content Area */}
        <main className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-7 transition-all duration-300">
          {children}
        </main>
      </div>

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
    <label className="block">
      <span className="mb-1.5 block mono text-[10px] uppercase tracking-[.11em] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
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
    <label className="block">
      <span className="mb-1.5 block mono text-[10px] uppercase tracking-[.11em] text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className="min-h-[74px] w-full resize-y rounded-sm border border-input bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
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
  const [demoOpen, setDemoOpen] = useState(false);
  const update = (key: keyof PatientProfileInput, value: string) =>
    setPatient(p => ({ ...p, [key]: key === 'age' ? Number(value) : value.split(',').map(x => x.trim()).filter(Boolean) }));
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onRun(patient);
  };

  return (
    <Card className="glass-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-card-border bg-muted/40 px-5 py-4">
        <div>
          <SectionLabel icon={FileInput}>Clinical Case Vector</SectionLabel>
          <h2 className="display mt-1 text-lg font-semibold tracking-tight">Patient Profile</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Button variant="ghost" testId="button-demo-cases" onClick={() => setDemoOpen(v => !v)} className="text-xs">
              <Sparkles size={14} className="text-amber-600" />
              <span>Load benchmark case</span>
              <ChevronDown size={13} className={cx('transition-transform duration-200', demoOpen && 'rotate-180')} />
            </Button>
            {demoOpen && (
              <div className="absolute right-0 top-12 z-30 w-84 rounded-md border border-border bg-popover/98 p-2 shadow-2xl backdrop-blur-md">
                <div className="px-2 py-1.5 mono text-[9px] uppercase tracking-[.15em] text-muted-foreground">
                  Verified Polypharmacy Benchmark Cases
                </div>
                {isLoadingCases ? (
                  <div className="p-4 mono text-xs text-muted-foreground">Querying clinical cohort…</div>
                ) : demoCases?.length ? (
                  <div className="space-y-1">
                    {demoCases.map(c => (
                      <button
                        key={c.id}
                        data-testid={`button-load-case-${c.id}`}
                        onClick={() => {
                          setPatient(c.patient);
                          onLoadDemo(c);
                          setDemoOpen(false);
                        }}
                        className="group flex w-full flex-col rounded-sm p-3 text-left transition-colors hover:bg-muted/80"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold group-hover:text-primary">{c.title}</span>
                          <ChevronRight size={13} className="text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{c.description}</p>
                        <div className="mt-2">
                          <Pill
                            tone={
                              c.conflict_profile.includes('no major')
                                ? 'teal'
                                : c.conflict_profile.includes('renal')
                                ? 'amber'
                                : 'red'
                            }
                          >
                            {c.conflict_profile}
                          </Pill>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-xs text-muted-foreground">No benchmark cases available.</div>
                )}
              </div>
            )}
          </div>
          {onFold && (
            <button
              type="button"
              data-testid="button-fold-case-form"
              onClick={onFold}
              title="Fold input vector panel for full-screen results"
              className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-2xs"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
          <Field label="Age" value={String(patient.age)} onChange={v => update('age', v)} type="number" testId="input-age" />
          <Field label="Sex" value={patient.sex} onChange={v => update('sex', v)} placeholder="e.g. Female" testId="input-sex" />
        </div>

        <TextArea
          label="Active diagnoses / conditions"
          value={patient.diseases.join(', ')}
          onChange={v => update('diseases', v)}
          placeholder="Separate conditions with commas"
          testId="input-diseases"
        />

        <TextArea
          label="Active medications (Outpatient / Clinic Record)"
          value={patient.medications.join(', ')}
          onChange={v => update('medications', v)}
          placeholder="Include dose and frequency when known"
          testId="input-medications"
        />

        <TextArea
          label="Secondary / Inpatient / Discharge medications (for Reconciler)"
          value={(patient.secondary_medications || []).join(', ')}
          onChange={v => setPatient(p => ({ ...p, secondary_medications: v.split(',').map(x => x.trim()).filter(Boolean) }))}
          placeholder="Hospital admission/discharge orders for discrepancy checking"
          testId="input-secondary-medications"
        />

        <TextArea
          label="Chief complaint / Presenting inquiry"
          value={patient.symptoms.join(', ')}
          onChange={v => update('symptoms', v)}
          placeholder="What clinical intervention requires arbitration?"
          testId="input-symptoms"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextArea
            label="Documented allergies"
            value={patient.allergies.join(', ')}
            onChange={v => update('allergies', v)}
            placeholder="Known drug/food allergies"
            testId="input-allergies"
          />
          <TextArea
            label="Comorbidities & context"
            value={patient.conditions.join(', ')}
            onChange={v => update('conditions', v)}
            placeholder="Risk factors, recent clinical events"
            testId="input-conditions"
          />
        </div>

        <TextArea
          label="Lab values & biomarkers"
          value={Object.entries(patient.lab_values).map(([k, v]) => `${k}: ${v}`).join(', ')}
          onChange={v =>
            setPatient(p => ({
              ...p,
              lab_values: Object.fromEntries(
                v
                  .split(',')
                  .map(x => {
                    const [k, ...rest] = x.split(':');
                    return [k?.trim(), rest.join(':').trim()];
                  })
                  .filter(([k]) => k)
              ),
            }))
          }
          placeholder="eGFR: 44, K+: 4.6, QTc: 460, hemoglobin: 11.8"
          testId="input-labs"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>HIPAA Secure: De-identified patient profile vector</span>
          </div>
          <Button type="submit" disabled={isRunning} testId="button-run-analysis" className="px-5 py-2.5">
            {isRunning ? (
              <>
                <LoaderCircle size={15} className="animate-spin" />
                <span>Arbitrating Evidence…</span>
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
                <span>Run Clinical Arbitration</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
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
    <Card className="glass-card overflow-hidden p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
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
                'relative flex flex-col justify-between rounded-md border p-3.5 transition-all',
                done
                  ? 'border-primary/30 bg-primary/[0.04]'
                  : live
                  ? 'border-amber-500/40 bg-amber-500/[0.06]'
                  : 'border-border/70 bg-card/60'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cx(
                    'grid size-6 place-items-center rounded-full border text-xs font-semibold',
                    done
                      ? 'border-primary/50 bg-primary text-primary-foreground'
                      : live
                      ? 'border-amber-600/50 bg-amber-500/20 text-amber-800'
                      : 'border-border bg-muted/60 text-muted-foreground'
                  )}
                >
                  {done ? <Check size={12} /> : live ? <LoaderCircle size={12} className="animate-spin" /> : <span>{i + 1}</span>}
                </div>
                <Pill tone={done ? 'teal' : live ? 'amber' : 'neutral'}>{s.status}</Pill>
              </div>
              <div className="mt-2.5">
                <div className="text-xs font-semibold">{s.agent}</div>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{s.summary}</p>
              </div>
            </div>
          );
        })}
      </div>
      {running && (
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-border/50 pt-3 mono text-[10px] uppercase tracking-[.1em] text-amber-700">
          <span className="size-2 animate-ping rounded-full bg-amber-500" />
          Deterministic evidence arbitration matrix evaluating candidates...
        </div>
      )}
    </Card>
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
          <Card key={id} className="glass-card overflow-hidden">
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
          </Card>
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
}: {
  report: AnalysisReport;
  patient?: PatientProfileInput;
  onReRun?: (modifiedPatient: PatientProfileInput, weights: { alpha: number; beta: number; gamma: number; delta: number }) => void;
  isReRunning?: boolean;
}) {
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

  const advisoryCount = coverageGapAdvisories.length + dataQualityAdvisories.length + unknownAlerts.length;

  return (
    <div className="animate-rise space-y-8">
      {/* 1. Decoupled Red Safety Alert Banner (Above and Separate from Scores) */}
      <SafetyAlertBanner report={report} />

      {/* 2. 5-Second Patient Summary Card & Smart Routing Badge */}
      <PatientSummaryCard report={report} patient={patient} />

      {/* 3. Cryptographic Determinism & Reproducibility Verification Badge */}
      <ReproducibilityBadge report={report} patient={patient} />

      {/* Hero Command Header */}
      <Card className="glass-card overflow-hidden p-6 sm:p-7 border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <Pill tone="teal" className="badge-glow-teal">
              Clinical Arbitration #{report.id.slice(0, 8).toUpperCase()}
            </Pill>
            <span className="mono text-[10px] text-muted-foreground">
              {new Date(report.generated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {confirmedConflicts.length === 0 ? (
              <Pill tone="emerald">
                <CheckCircle2 size={12} />
                Zero Cross-Silo Conflicts
              </Pill>
            ) : (
              <Pill tone="red" className="badge-glow-rose">
                <AlertTriangle size={12} />
                {confirmedConflicts.length} Verified Collision{confirmedConflicts.length > 1 ? 's' : ''}
              </Pill>
            )}
            <Pill tone="neutral">ClearDose Engine v1.2</Pill>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-start gap-3">
            <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Stethoscope size={18} />
            </div>
            <div>
              <div className="mono text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">
                Clinical Context & Synthesized Vector
              </div>
              <h2
                data-testid="text-patient-summary"
                className="display mt-1 text-xl sm:text-2xl font-bold leading-snug tracking-tight text-foreground"
              >
                {report.patient_summary}
              </h2>
            </div>
          </div>
        </div>

        {/* 4 High-Precision KPI Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            label="Candidates Evaluated"
            value={String(report.dea.candidates.length)}
            sub="Ranked across 3 silos"
            icon={Target}
            tone="blue"
          />
          <Metric
            label="Verified Conflicts"
            value={String(confirmedConflicts.length)}
            tone={confirmedConflicts.length ? 'red' : 'teal'}
            sub={advisoryCount > 0 ? `+${advisoryCount} advisories` : 'Evidence-linked verified'}
            icon={ShieldAlert}
          />
          <Metric
            label="Top Ranked Score"
            value={top ? top.score.toFixed(3) : '—'}
            sub={top ? `Rank #1: ${top.candidate.slice(0, 18)}...` : 'Deterministic'}
            icon={Sparkles}
            tone="teal"
          />
          <Metric
            label="Decision Arbitration"
            value="DEA Matrix"
            sub="Zero Hallucination / Python"
            icon={Scale}
            tone="blue"
          />
        </div>
      </Card>

      {/* Ranked Candidates Matrix (DEA) */}
      <Card className="glass-card overflow-hidden">
        <div className="border-b border-card-border bg-gradient-to-r from-[hsl(var(--foreground))] to-[hsl(var(--foreground)/0.92)] px-6 py-5 text-[hsl(var(--background))]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mono text-[10px] font-semibold uppercase tracking-[.15em] text-teal-400">
                <Target size={13} />
                <span>Deterministic Evidence Arbitration (DEA)</span>
              </div>
              <h3 className="display mt-1 text-xl font-bold text-white">Ranked Candidate Options</h3>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone="amber">Mathematical Arbitration</Pill>
              <Pill tone="teal">No LLM Hallucinations</Pill>
            </div>
          </div>
          <p className="mt-2.5 max-w-3xl text-xs leading-relaxed text-white/70">
            {report.dea.method_note} Candidates are ranked deterministically by evaluating Guideline Grade (Q),
            Semantic Relevance (R), Literature Recency (T), and subtracting Patient-Specific Safety Risk (P).
            Active contraindications receive an automatic clinical safety demotion.
          </p>
        </div>

        <div className="divide-y divide-border/60">
          {report.dea.candidates.map(c => {
            const isRank1 = c.ranking === 1;
            const isContraindicated = Boolean(c.contraindicated_flag);
            return (
              <div
                key={c.ranking}
                data-testid={`row-candidate-${c.ranking}`}
                className={cx(
                  'p-5 transition-colors',
                  isContraindicated
                    ? 'bg-red-500/[0.04] border-l-4 border-red-600'
                    : isRank1
                    ? 'bg-primary/[0.04]'
                    : 'hover:bg-muted/30'
                )}
              >
                {isRank1 ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-600/30 bg-teal-500/15 px-2.5 py-0.5 mono text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                          <Award size={12} />
                          Rank #01 · Preferred Candidate
                        </span>
                        <Pill tone="neutral">{c.source}</Pill>
                        {isContraindicated && (
                          <span className="inline-flex items-center gap-1 rounded bg-red-600/15 border border-red-600/30 px-2 py-0.5 mono text-[10px] font-bold text-red-700 dark:text-red-400">
                            <AlertOctagon size={11} />
                            CONTRAINDICATED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="mono text-[11px] text-muted-foreground uppercase">Composite Score:</span>
                        <span className="mono text-2xl font-black text-primary display">{c.score.toFixed(3)}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-lg font-bold text-foreground">
                      {c.candidate}
                    </div>

                    {c.safety_rationale && (
                      <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-800 dark:text-rose-300">
                        <strong>Clinical Safety Rationale:</strong> {c.safety_rationale}
                      </div>
                    )}

                    {/* Score Bar */}
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cx(
                          'h-full rounded-full transition-all duration-500',
                          isContraindicated ? 'bg-red-600' : 'bg-gradient-to-r from-primary to-teal-500'
                        )}
                        style={{ width: `${Math.min(100, Math.max(15, c.score * 100))}%` }}
                      />
                    </div>

                    {/* 4-Dimension Metric Breakdown */}
                    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      <div className="rounded-md border border-teal-600/20 bg-teal-500/[0.05] p-3">
                        <div className="flex items-center justify-between mono text-[10px] uppercase text-muted-foreground">
                          <span>Q: Grade</span>
                          <span className="font-bold text-foreground">{c.q_grade.toFixed(2)}</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full rounded-full bg-muted">
                          <div className="h-full rounded-full bg-teal-600" style={{ width: `${c.q_grade * 100}%` }} />
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">Guideline weight: 35%</div>
                      </div>

                      <div className="rounded-md border border-sky-600/20 bg-sky-500/[0.05] p-3">
                        <div className="flex items-center justify-between mono text-[10px] uppercase text-muted-foreground">
                          <span>R: Relevance</span>
                          <span className="font-bold text-foreground">{c.s_rel.toFixed(2)}</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full rounded-full bg-muted">
                          <div className="h-full rounded-full bg-sky-600" style={{ width: `${c.s_rel * 100}%` }} />
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">Alignment weight: 30%</div>
                      </div>

                      <div className="rounded-md border border-indigo-600/20 bg-indigo-500/[0.05] p-3">
                        <div className="flex items-center justify-between mono text-[10px] uppercase text-muted-foreground">
                          <span>T: Recency</span>
                          <span className="font-bold text-foreground">{c.t_recent.toFixed(2)}</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full rounded-full bg-muted">
                          <div className="h-full rounded-full bg-indigo-600" style={{ width: `${c.t_recent * 100}%` }} />
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">Literature recency: 15%</div>
                      </div>

                      <div className="rounded-md border border-rose-600/20 bg-rose-500/[0.05] p-3">
                        <div className="flex items-center justify-between mono text-[10px] uppercase text-muted-foreground">
                          <span>P: Risk Penalty</span>
                          <span className="font-bold text-rose-700 dark:text-rose-400">-{c.p_risk.toFixed(2)}</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full rounded-full bg-muted">
                          <div className="h-full rounded-full bg-rose-600" style={{ width: `${c.p_risk * 100}%` }} />
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">Safety penalty: 20%</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cx(
                          'grid size-8 shrink-0 place-items-center rounded-full border mono text-xs font-bold',
                          isContraindicated
                            ? 'border-red-600 bg-red-600/10 text-red-700'
                            : 'border-border bg-muted/60 text-muted-foreground'
                        )}>
                          {String(c.ranking).padStart(2, '0')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{c.candidate}</span>
                            {isContraindicated && (
                              <span className="inline-flex items-center gap-1 rounded bg-red-600/15 border border-red-600/30 px-2 py-0.5 mono text-[9px] font-bold text-red-700 dark:text-red-400">
                                <AlertOctagon size={10} />
                                DEMOTED (CONTRAINDICATED)
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Pill>Q {c.q_grade.toFixed(2)}</Pill>
                            <Pill>R {c.s_rel.toFixed(2)}</Pill>
                            <Pill>T {c.t_recent.toFixed(2)}</Pill>
                            <Pill tone={c.p_risk > 0.5 ? 'red' : 'teal'}>P {c.p_risk.toFixed(2)}</Pill>
                            <span className="mono text-[10px] text-muted-foreground uppercase">· {c.source}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono text-lg font-bold text-foreground">{c.score.toFixed(3)}</div>
                        {top && (
                          <div className="mono text-[10px] text-muted-foreground">
                            -{(top.score - c.score).toFixed(3)} vs #1
                          </div>
                        )}
                      </div>
                    </div>
                    {c.safety_rationale && (
                      <div className="ml-11 rounded border border-rose-500/25 bg-rose-500/5 p-2 text-xs text-rose-800 dark:text-rose-300">
                        {c.safety_rationale}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Weights Parameter Footer */}
        <div className="grid gap-3 border-t border-border/80 bg-muted/30 px-6 py-4 sm:grid-cols-4">
          {Object.entries(report.dea.weights).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between rounded border border-border/50 bg-card/60 px-3 py-2 mono text-[10px] uppercase text-muted-foreground">
              <span>Weight {key} ({key === 'alpha' ? 'Grade' : key === 'beta' ? 'Relevance' : key === 'gamma' ? 'Recency' : 'Risk'})</span>
              <span className="font-bold text-foreground">{val.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* 4. Interactive What-If Clinical Simulator Panel */}
        <div className="border-t border-border/80 p-5 bg-card/40">
          <WhatIfSimulator
            initialPatient={patient || fallbackPatient}
            initialCandidates={report.dea.candidates}
            initialWeights={report.dea.weights}
            onRerun={(modPatient, weights) => {
              if (onReRun) {
                onReRun(modPatient, weights);
              }
            }}
            isRunning={isReRunning}
          />
        </div>
      </Card>

      {/* Responsive 2-Column: Conflict Register & Sentence-Level Claim Checker */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conflict Register Card */}
        <Card className="glass-card p-6">
          <SectionLabel icon={AlertTriangle}>Conflict Register & Safety Governance</SectionLabel>

          {hasActiveFindings ? (
            <div className="mt-4 space-y-4">
              {confirmedConflicts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mono text-[10px] font-bold uppercase tracking-[.14em] text-red-700 dark:text-red-400">
                    <span className="size-2 rounded-full bg-red-600" />
                    Evidence-Confirmed Conflicts ({confirmedConflicts.length})
                  </div>
                  {confirmedConflicts.map((c, i) => (
                    <div
                      key={`confirmed-${i}`}
                      data-testid={`conflict-confirmed-${i}`}
                      className="rounded-md border-l-4 border-red-600 bg-red-500/[0.05] p-3.5 border border-border/70"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="text-foreground">{c.conflict_type}</span>
                        <Pill tone="red">{c.severity}</Pill>
                        <Pill tone="teal">Verified Linkage</Pill>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded bg-red-600/10 px-2 py-0.5 mono text-[10px] font-bold text-red-800 dark:text-red-300">
                        <span>AFFECTS:</span>
                        <span>{c.affected_treatment}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {coverageGapAdvisories.length > 0 && (
                <div className="space-y-3 border-t border-border/60 pt-4">
                  <div className="flex items-center gap-2 mono text-[10px] font-bold uppercase tracking-[.14em] text-sky-700 dark:text-sky-400">
                    <span className="size-2 rounded-full bg-sky-600" />
                    Retrieval Coverage-Gap Advisories ({coverageGapAdvisories.length})
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                    Active risk alert flagged by deterministic rule, but retrieved evidence did not verify the specific warning text.
                  </p>
                  {coverageGapAdvisories.map((c, i) => (
                    <div
                      key={`gap-${i}`}
                      data-testid={`advisory-coverage-gap-${i}`}
                      className="rounded-md border-l-4 border-sky-600 bg-sky-500/[0.05] p-3.5 border border-border/70"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="text-foreground">{c.conflict_type}</span>
                        <Pill tone="blue">Coverage Gap</Pill>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded bg-sky-600/10 px-2 py-0.5 mono text-[10px] font-bold text-sky-800 dark:text-sky-300">
                        <span>AFFECTS:</span>
                        <span>{c.affected_treatment}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {dataQualityAdvisories.length > 0 && (
                <div className="space-y-3 border-t border-border/60 pt-4">
                  <div className="flex items-center gap-2 mono text-[10px] font-bold uppercase tracking-[.14em] text-amber-700 dark:text-amber-400">
                    <span className="size-2 rounded-full bg-amber-500" />
                    Data-Quality Advisories ({dataQualityAdvisories.length})
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                    Missing, malformed, incompatible-unit, or conflicting patient measurements require clinical confirmation.
                  </p>
                  {dataQualityAdvisories.map((c, i) => (
                    <div
                      key={`dq-${i}`}
                      data-testid={`advisory-data-quality-${i}`}
                      className="rounded-md border-l-4 border-amber-600 bg-amber-500/[0.05] p-3.5 border border-border/70"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="text-foreground">{c.conflict_type}</span>
                        <Pill tone="amber">Data Quality</Pill>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded bg-amber-600/10 px-2 py-0.5 mono text-[10px] font-bold text-amber-800 dark:text-amber-300">
                        <span>AFFECTS:</span>
                        <span>{c.affected_treatment}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {unknownAlerts.length > 0 && (
                <div className="space-y-3 border-t border-border/60 pt-4">
                  <div className="flex items-center gap-2 mono text-[10px] font-bold uppercase tracking-[.14em] text-amber-800 dark:text-amber-300">
                    <span className="size-2 rounded-full bg-amber-700" />
                    Unverified / Legacy Alerts ({unknownAlerts.length})
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                    Alert lacks explicit status metadata; treated conservatively as unverified rather than safe.
                  </p>
                  {unknownAlerts.map((c, i) => (
                    <div
                      key={`unknown-${i}`}
                      data-testid={`alert-unverified-${i}`}
                      className="rounded-md border-l-4 border-amber-700 bg-amber-600/[0.05] p-3.5 border border-border/70"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="text-foreground">{c.conflict_type}</span>
                        <Pill tone="amber">{c.severity || 'unverified'}</Pill>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded bg-amber-700/10 px-2 py-0.5 mono text-[10px] font-bold text-amber-800 dark:text-amber-300">
                        <span>AFFECTS:</span>
                        <span>{c.affected_treatment}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-md border border-teal-600/25 bg-teal-500/[0.07] p-4 text-xs text-foreground">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <div className="font-bold text-primary text-sm">
                    0 cross-silo conflicts detected under available evidence.
                  </div>
                  <p className="mt-1 leading-relaxed text-muted-foreground">
                    Deterministic rule calibration confirmed 0 active contradictions or safety violations between clinical guidelines, drug safety, and recent literature.
                  </p>
                </div>
              </div>
              <div className="mono text-[9px] uppercase tracking-[.08em] text-muted-foreground pl-1">
                Bound to retrieved evidence · Does not guarantee overall clinical safety
              </div>
            </div>
          )}
        </Card>

        {/* 5. Sentence-Level Claim Checker with Green / Yellow / Red Evidence Grounding */}
        <Card className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
              <SectionLabel icon={Sparkles}>Arbitration Synthesis & Claim Verification</SectionLabel>
              <Pill tone="teal">Deterministic Grounding</Pill>
            </div>
            <ClaimChecker report={report} />
          </div>
          <div className="mt-6 rounded border border-border/60 bg-muted/30 p-3 mono text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground">Audit Trace:</span> Calibrated via ClearDose Python Kernel. All candidate scoring and claims are 100% reproducible, verifiable, and linked to authoritative PMIDs/DailyMed SetIDs.
          </div>
        </Card>
      </div>

      {/* Independent Evidence Silos Full View */}
      <EvidencePanel report={report} />

      {/* 7. Clinician Final Sign-Off Action Bar */}
      <DoctorSignOff report={report} patient={patient} candidates={report.dea.candidates} />

      {/* Limitations & Safety Boundary Card */}
      <Card className="border-border bg-muted/20 p-6 glass-card">
        <SectionLabel icon={ShieldCheck}>Clinical Decision Support Safety Boundary</SectionLabel>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {report.limitations.map((x, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded border border-border/60 bg-background/70 p-3 text-xs leading-relaxed text-foreground/80">
              <span className="mono font-bold text-primary">0{i + 1}</span>
              <span>{x}</span>
            </div>
          ))}
        </div>
        <div
          data-testid="text-disclaimer"
          className="mt-5 border-t border-border/60 pt-4 text-xs font-semibold leading-relaxed text-foreground/80"
        >
          Clinical Decision Support System • AI Finds the Evidence, Math Ranks It, Doctors Decide • Final Prescribing Authority Resides with the Attending Clinician.
        </div>
      </Card>
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
    <>
      {/* Workspace Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-border/60 pb-6">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Pill tone="teal">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CLEARDOSE CDS WORKSTATION
            </Pill>
            <span className="mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">
              Hospital-Grade Clinical Decision Support • Multi-Silo Arbitration
            </span>
          </div>
          <h1 className="display max-w-2xl text-3xl font-extrabold tracking-tight md:text-5xl text-foreground">
            AI Finds the Evidence.<br />
            <span className="text-primary">Math Ranks It. Doctors Decide.</span>
          </h1>
          <p className="mt-3 max-w-xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
            Hospital-grade clinical decision support integrating multi-silo biomedical retrieval, deterministic mathematical arbitration, safety gating, and sentence-level evidence verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Workspace Tab Switcher */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1 shadow-2xs">
            <button
              onClick={() => setWorkspaceTab('arbitration')}
              data-testid="tab-arbitration-view"
              className={cx(
                'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 mono text-[11px] font-semibold uppercase tracking-wider transition-all',
                workspaceTab === 'arbitration'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Microscope size={14} />
              <span>Arbitration Workspace</span>
            </button>
            <button
              onClick={() => setWorkspaceTab('reconciler')}
              data-testid="tab-reconciler-view"
              className={cx(
                'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 mono text-[11px] font-semibold uppercase tracking-wider transition-all',
                workspaceTab === 'reconciler'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <GitCompare size={14} />
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
            onClick={() => setInputFolded(f => !f)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 mono text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-2xs"
            title={inputFolded ? "Show Patient Profile Vector Form" : "Fold Patient Form for Full-Screen Results View"}
          >
            {inputFolded ? (
              <>
                <PanelLeftOpen size={14} className="text-primary" />
                <span>Show Patient Profile Form</span>
              </>
            ) : (
              <>
                <PanelLeftClose size={14} className="text-primary" />
                <span>Full-Screen Results View</span>
              </>
            )}
          </button>

          <button
            data-testid="button-workspace-audit-history"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('cleardose:open_audit_drawer'));
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 mono text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-2xs"
            title="View immutable SHA-256 case audit records and clinician sign-offs"
          >
            <History size={14} className="text-primary" />
            <span>Audit Ledger</span>
          </button>

          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 mono text-[10px] uppercase tracking-[.1em] text-primary">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span>ClearDose Python Kernel Live</span>
          </div>
        </div>
      </div>

      {/* 6. Medication Reconciler Full View */}
      {workspaceTab === 'reconciler' ? (
        <div className="space-y-6 animate-rise">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground">Inpatient & Discharge Transition Safety</div>
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
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-card/90 px-4 py-3 shadow-xs glass-card animate-rise"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
                  <Stethoscope size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {loadedCase ? loadedCase.title : 'Active Patient Profile Vector'}
                    </span>
                    <Pill tone="teal">Full-Screen Mode Active</Pill>
                  </div>
                  <p className="mono text-[10px] text-muted-foreground mt-0.5">
                    Input vector panel folded. Results, telemetry, and evidence arbitration matrix taking 100% display width.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {demoQuery.data && demoQuery.data.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 mr-2">
                    <span className="mono text-[10px] text-muted-foreground">Quick Switch:</span>
                    {demoQuery.data.slice(0, 3).map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setLoadedCase(c);
                          setCurrentPatient(c.patient);
                          run(c.patient);
                        }}
                        className="rounded-full border border-border bg-card px-2.5 py-0.5 mono text-[10px] font-semibold hover:border-primary hover:text-primary transition-colors"
                      >
                        {c.title.split('/')[1]?.trim() ?? c.title}
                      </button>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setInputFolded(false)}
                  testId="button-unfold-input-panel"
                  className="text-xs gap-1.5 py-1.5"
                >
                  <PanelLeftOpen size={14} />
                  <span>Expand Profile Form</span>
                </Button>
              </div>
            </div>
          )}

          {/* Main Responsive Workspace Layout */}
          <div
            className={cx(
              'gap-7 items-start transition-all duration-300',
              inputFolded ? 'block w-full' : 'grid xl:grid-cols-[minmax(380px,430px)_1fr]'
            )}
          >
            {/* Left Column: Case Form & Inputs (Docked & Sticky on desktop) */}
            {!inputFolded && (
              <div className="space-y-5 xl:sticky xl:top-[88px] xl:self-start xl:max-h-[calc(100vh-108px)] xl:overflow-y-auto subtle-scroll pr-1">
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
                    className="flex items-start gap-3 rounded-md border border-amber-600/30 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-foreground/80 glass-card"
                  >
                    <Sparkles size={16} className="mt-0.5 shrink-0 text-amber-700" />
                    <div>
                      <strong className="font-semibold text-foreground">{loadedCase.title}</strong> loaded from benchmark cohort.
                      Modify parameters or run arbitration to evaluate the candidate options.
                    </div>
                  </div>
                )}

                {analyze.isError && (
                  <div
                    data-testid="status-analysis-error"
                    className="flex items-start gap-3 rounded-md border border-red-700/30 bg-red-700/10 p-4 text-xs text-red-800 dark:text-red-300"
                  >
                    <AlertTriangle size={18} className="shrink-0" />
                    <div>
                      <strong>Arbitration could not complete.</strong>
                      <p className="mt-1 text-xs">The clinical server returned an error. Confirm the API server is available and retry.</p>
                      <button
                        data-testid="button-dismiss-analysis-error"
                        onClick={() => analyze.reset()}
                        className="mt-2 text-xs font-semibold underline hover:no-underline"
                      >
                        Dismiss Error
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Right Column: Telemetry & Results Report */}
            <div className="space-y-6 min-w-0 w-full">
              <AgentRail report={report} running={analyze.isPending} />

              {!report && !analyze.isPending && (
                <Card className="instrument-grid flex min-h-[380px] flex-col items-center justify-center p-8 text-center glass-card border-dashed">
                  <div className="mb-4 grid size-16 place-items-center rounded-full border border-primary/30 bg-primary/5 text-primary shadow-inner">
                    <FlaskConical size={28} />
                  </div>
                  <div className="display text-xl font-bold text-foreground">Awaiting Clinical Case Vector</div>
                  <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    Load a verified benchmark case or submit the patient profile to initialize multi-silo retrieval.
                    The resulting report synthesizes each silo’s evidence, candidate ranking, contraindication check, and claim grounding trace.
                  </p>
                  {demoQuery.data && demoQuery.data.length > 0 && (
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <span className="mono text-[10px] uppercase text-muted-foreground mr-1">Quick Load:</span>
                      {demoQuery.data.slice(0, 3).map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setLoadedCase(c);
                            setCurrentPatient(c.patient);
                            run(c.patient);
                          }}
                          className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
                        >
                          {c.title.split('/')[1]?.trim() ?? c.title}
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {analyze.isPending && (
                <Card className="p-8 glass-card">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <LoaderCircle size={18} className="animate-spin text-primary" />
                      <span className="mono text-xs uppercase tracking-wider font-semibold text-primary">
                        Cross-Silo Querying & Deterministic Clinical Arbitration in progress…
                      </span>
                    </div>
                    <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                    <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-24 animate-pulse rounded bg-muted" />
                    <div className="h-12 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </Card>
              )}

              {report && (
                <ReportView
                  report={report}
                  patient={currentPatient}
                  onReRun={run}
                  isReRunning={analyze.isPending}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Evaluation() {
  return <EvaluationDashboard />;
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
    <div className="animate-rise">
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
