import { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Copy,
  ExternalLink,
  Search,
  RefreshCw,
  Loader2,
  FileCheck,
  Stethoscope,
  Filter,
  ArrowRight,
  Database,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { PatientProfileInput } from '@workspace/api-client-react';

export interface AuditHistoryRecord {
  case: {
    id: string;
    patientProfileJson: any;
    routingTier: string;
    complexityScore: number;
    createdAt: string | Date;
  };
  report: {
    id: string;
    caseId: string;
    deaWeightsJson?: any;
    rankedCandidatesJson?: any;
    conflictsJson?: any;
    claimVerificationsJson?: any;
    reconciliationJson?: any;
    sha256IntegrityHash: string;
    createdAt: string | Date;
  };
  decision: {
    id: string;
    reportId: string;
    clinicianName: string;
    selectedCandidate: string;
    actionTaken: 'accepted_top_dea' | 'clinical_override' | 'deferred';
    overrideReason: string | null;
    signedAt: string | Date;
  } | null;
}

interface AuditHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadCase?: (patient: PatientProfileInput, reportId?: string) => void;
}

export function AuditHistoryDrawer({
  open,
  onOpenChange,
  onLoadCase,
}: AuditHistoryDrawerProps) {
  const [items, setItems] = useState<AuditHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'signed' | 'override' | 'pending'>('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/audit-history?limit=100');
      if (!res.ok) {
        throw new Error(`Failed to fetch audit history (HTTP ${res.status})`);
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Unable to load clinical audit history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredItems = items.filter((item) => {
    // Status filter
    if (statusFilter === 'signed' && !item.decision) return false;
    if (statusFilter === 'override' && item.decision?.actionTaken !== 'clinical_override') return false;
    if (statusFilter === 'pending' && item.decision) return false;

    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();

    const caseId = (item.case?.id || '').toLowerCase();
    const reportId = (item.report?.id || '').toLowerCase();
    const hash = (item.report?.sha256IntegrityHash || '').toLowerCase();
    const clinician = (item.decision?.clinicianName || '').toLowerCase();
    const candidate = (item.decision?.selectedCandidate || '').toLowerCase();

    const p = item.case?.patientProfileJson || {};
    const conditions = Array.isArray(p.conditions) ? p.conditions.join(' ').toLowerCase() : '';
    const meds = Array.isArray(p.medications) ? p.medications.join(' ').toLowerCase() : '';

    return (
      caseId.includes(q) ||
      reportId.includes(q) ||
      hash.includes(q) ||
      clinician.includes(q) ||
      candidate.includes(q) ||
      conditions.includes(q) ||
      meds.includes(q)
    );
  });

  const signedCount = items.filter((i) => i.decision !== null).length;
  const overrideCount = items.filter((i) => i.decision?.actionTaken === 'clinical_override').length;
  const pendingCount = items.length - signedCount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl sm:w-[640px] md:w-[720px] flex flex-col p-0 bg-background/98 backdrop-blur-xl border-l border-border/80 shadow-2xl"
      >
        {/* Drawer Header */}
        <SheetHeader className="p-6 border-b border-border/60 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <History size={20} />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Clinical Audit History & Ledger</span>
                  <span className="rounded bg-teal-500/15 px-2 py-0.5 mono text-[10px] font-bold text-teal-700 dark:text-teal-300">
                    IMMUTABLE
                  </span>
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Cryptographic SHA-256 arbitration ledger and attending clinician sign-off records
                </SheetDescription>
              </div>
            </div>

            <button
              onClick={fetchHistory}
              disabled={loading}
              title="Refresh ledger"
              className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : ''} />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 pt-2 text-center">
            <div className="rounded-md border border-border/60 bg-card/60 p-2">
              <div className="mono text-xs font-bold text-foreground">{items.length}</div>
              <div className="mono text-[9px] uppercase tracking-wider text-muted-foreground">Total Audited</div>
            </div>
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2">
              <div className="mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{signedCount}</div>
              <div className="mono text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Doctor Signed</div>
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
              <div className="mono text-xs font-bold text-amber-600 dark:text-amber-400">{overrideCount}</div>
              <div className="mono text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-300">Overrides</div>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/40 p-2">
              <div className="mono text-xs font-bold text-muted-foreground">{pendingCount}</div>
              <div className="mono text-[9px] uppercase tracking-wider text-muted-foreground">Pending Sign-off</div>
            </div>
          </div>
        </SheetHeader>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-border/60 bg-card/40 space-y-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case ID, Report ID, SHA-256 hash, Clinician, Condition, or Drug..."
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 mono text-[10px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
              <Filter size={11} /> Filter:
            </span>
            {(
              [
                { id: 'all', label: 'All Cases' },
                { id: 'signed', label: `Signed (${signedCount})` },
                { id: 'override', label: `Overrides (${overrideCount})` },
                { id: 'pending', label: `Pending (${pendingCount})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-full px-2.5 py-0.5 mono text-[10px] font-semibold transition-all ${
                  statusFilter === f.id
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Records Content Area */}
        <div className="flex-1 overflow-y-auto subtle-scroll p-4 space-y-3.5">
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-primary" />
              <div className="text-xs font-semibold text-foreground">Querying Clinical Audit Ledger...</div>
              <p className="mono text-[10px] text-muted-foreground max-w-xs">
                Retrieving cryptographic case logs, SHA-256 hashes, and attending physician sign-offs from database.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-destructive">
                <AlertTriangle size={15} />
                <span>Failed to Load Audit History</span>
              </div>
              <p className="text-muted-foreground">{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-2 inline-flex items-center gap-1 rounded bg-destructive/20 px-2.5 py-1 mono text-[10px] font-semibold text-destructive hover:bg-destructive/30 transition-all"
              >
                <RefreshCw size={11} /> Retry Fetch
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted/60 text-muted-foreground">
                <FileCheck size={24} />
              </div>
              <div className="text-sm font-semibold text-foreground">
                {items.length === 0 ? 'No Audited Cases Found' : 'No Cases Match Your Filter'}
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {items.length === 0
                  ? 'Run any patient case on the Clinical Workstation. Each evaluation generates an immutable SHA-256 hash and audit ledger record.'
                  : 'Try clearing your search query or selecting "All Cases" to view complete ledger.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const p = item.case?.patientProfileJson || {};
              const conditions: string[] = Array.isArray(p.conditions) ? p.conditions : [];
              const meds: string[] = Array.isArray(p.medications) ? p.medications : [];
              const hash = item.report?.sha256IntegrityHash || '';
              const truncatedHash = hash ? `${hash.slice(0, 16)}...${hash.slice(-8)}` : 'N/A';
              const createdDate = item.report?.createdAt
                ? new Date(item.report.createdAt).toLocaleString(undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : 'Unknown';

              const isSigned = item.decision !== null;
              const isOverride = item.decision?.actionTaken === 'clinical_override';

              return (
                <div
                  key={item.report?.id || item.case?.id}
                  data-testid={`audit-record-${item.case?.id}`}
                  className="rounded-xl border border-border/80 bg-card p-4 space-y-3 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-2 py-0.5 mono text-[11px] font-bold text-primary">
                        {item.case?.id || 'CASE'}
                      </span>
                      <span className="mono text-[10px] text-muted-foreground">
                        Report: {item.report?.id ? item.report.id.slice(0, 12) : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="mono text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock size={11} /> {createdDate}
                      </span>
                      {item.case?.routingTier && (
                        <span
                          className={`rounded px-1.5 py-0.2 mono text-[9px] font-bold uppercase tracking-wider ${
                            item.case.routingTier.toLowerCase().includes('high')
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {item.case.routingTier.includes('high') ? 'Deep Review' : 'Fast Path'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Patient Context */}
                  <div className="text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <User size={13} className="text-primary" />
                      <span>
                        Patient: Age {p.age || 'Unknown'}, {p.sex || 'Unknown'}
                      </span>
                      <span className="text-muted-foreground font-normal">
                        • {meds.length} Active Med{meds.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {conditions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {conditions.map((c, i) => (
                          <span
                            key={i}
                            className="rounded bg-muted px-2 py-0.5 mono text-[10px] text-muted-foreground"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cryptographic SHA-256 Hash Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 border border-border/40">
                    <div className="flex items-center gap-1.5 mono text-[10px]">
                      <Fingerprint size={12} className="text-teal-500 shrink-0" />
                      <span className="text-muted-foreground">SHA-256:</span>
                      <span className="font-semibold text-primary">{truncatedHash}</span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(hash, item.report.id)}
                      className="inline-flex items-center gap-1 mono text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy full 64-character SHA-256 hash"
                    >
                      <Copy size={11} />
                      <span>{copiedHash === item.report.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Clinician Sign-Off Section */}
                  <div
                    className={`rounded-lg p-3 text-xs space-y-1.5 border ${
                      isSigned
                        ? isOverride
                          ? 'border-amber-500/30 bg-amber-500/[0.04]'
                          : 'border-emerald-500/30 bg-emerald-500/[0.04]'
                        : 'border-border/60 bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        {isSigned ? (
                          isOverride ? (
                            <>
                              <AlertTriangle size={14} className="text-amber-500" />
                              <span className="text-amber-700 dark:text-amber-300">
                                Clinician Override
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={14} className="text-emerald-500" />
                              <span className="text-emerald-700 dark:text-emerald-300">
                                Attending Sign-Off: Accepted DEA Rank #1
                              </span>
                            </>
                          )
                        ) : (
                          <>
                            <Clock size={14} className="text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Draft • Pending Clinician Review & Sign-Off
                            </span>
                          </>
                        )}
                      </div>

                      {isSigned && (
                        <span className="mono text-[10px] text-muted-foreground">
                          {new Date(item.decision!.signedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {isSigned && (
                      <div className="space-y-1 text-muted-foreground text-[11px]">
                        <div>
                          <span className="font-semibold text-foreground">Signed by:</span>{' '}
                          {item.decision!.clinicianName}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Prescribed:</span>{' '}
                          <span className="mono font-bold text-foreground">
                            {item.decision!.selectedCandidate}
                          </span>
                        </div>
                        {item.decision!.overrideReason && (
                          <div className="rounded bg-amber-500/10 p-2 text-amber-900 dark:text-amber-200 mt-1 italic border border-amber-500/20">
                            &ldquo;{item.decision!.overrideReason}&rdquo;
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {onLoadCase && p.age && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          onLoadCase(p as PatientProfileInput, item.report?.id);
                          onOpenChange(false);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
                      >
                        <Stethoscope size={13} />
                        <span>Load Patient into CDS Workstation</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-border/60 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 mono text-[10px]">
            <Database size={13} className="text-primary" />
            <span>PostgreSQL + Drizzle / Local JSON Ledger</span>
          </div>
          <span className="mono text-[10px]">ClearDose Audit Specification v1.2</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
