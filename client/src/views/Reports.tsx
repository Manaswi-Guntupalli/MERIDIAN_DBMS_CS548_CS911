import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileBarChart, Printer, CheckCircle2, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { Card, Badge, LoadingScreen, StatTile } from '@/components/ui';
import { inr } from '@/lib/utils';

interface OperationsReport {
  generatedAt: string;
  title: string;
  metrics: { students: number; attendanceRate: number | null; collected: number; outstanding: number };
  narrative: string;
  narrativeSource?: 'ai' | 'template';
  recommendations: string[];
  predictions: { label: string; note: string }[];
  engineOnline: boolean;
}

export default function Reports() {
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['report'],
    queryFn: async ({ signal }) => (await api.get<OperationsReport>('/reports/summary', { signal, timeout: 90_000 })).data,
    retry: false,
    refetchOnWindowFocus: false,
  });

  async function regenerate() {
    if (isFetching) return;
    setFeedback(null);
    try {
      const result = await refetch({ throwOnError: true, cancelRefetch: false });
      setFeedback({ kind: 'success', text: result.data?.engineOnline
        ? 'Report regenerated from the latest data. Figures and wording may stay the same when the data has not changed.'
        : 'Report refreshed. The forecast service is unavailable, so forecast highlights could not be generated.' });
    } catch (err) {
      setFeedback({ kind: 'error', text: `${apiError(err, 'Could not regenerate the report. Please try again.')}${data ? ' Your previous report is still displayed.' : ''}` });
    }
  }

  if (isLoading) return <LoadingScreen label="Generating report…" />;
  if (!data) return (
    <div className="space-y-4">
      <PageHeader overline="Trust Core" title="AI-generated reports" subtitle="Generate an operations summary from live school data." />
      <p role="alert" className="text-sm text-red-700">{apiError(error, 'Could not load the report. Please try again.')}</p>
      <button onClick={regenerate} disabled={isFetching} className="btn-primary">Try again</button>
    </div>
  );
  const m = data.metrics;

  return (
    <div className="operations-report">
      <PageHeader
        overline="Trust Core"
        title="AI-generated reports"
        subtitle="One click assembles live figures into an executive summary with recommendations — grounded, never guessed."
        actions={
          <div className="report-controls flex gap-2">
            <button onClick={regenerate} disabled={isFetching} aria-busy={isFetching} className="btn-ghost disabled:cursor-wait disabled:opacity-60">
              {isFetching ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
              {isFetching ? 'Regenerating…' : 'Regenerate'}
            </button>
            <button onClick={() => window.print()} className="btn-primary"><Printer className="h-4 w-4" /> Export</button>
          </div>
        }
      />

      <div aria-live="polite" role="status" className="report-feedback mb-4 text-sm text-slate-600">
        {isFetching ? 'Refreshing school data and forecasts…' : feedback?.kind === 'success' ? feedback.text : null}
      </div>
      {!isFetching && feedback?.kind === 'error' && <p role="alert" className="report-feedback mb-4 text-sm text-red-700">{feedback.text}</p>}
      {data.narrativeSource === 'template' && <p className="mb-4 text-sm text-slate-500">Using a data-based summary template because AI generation is unavailable.</p>}

      <div className="report-metrics mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} label="Students" value={String(m.students)} accent="cyan" />
        {/* null = roll-call not taken yet, which is not the same as 0%. */}
        <StatTile index={1} label="Attendance" value={m.attendanceRate === null ? '—' : `${m.attendanceRate}%`} accent="mint" />
        <StatTile index={2} label="Collected" value={inr(m.collected)} accent="brand" />
        <StatTile index={3} label="Outstanding" value={inr(m.outstanding)} accent="amber" />
      </div>

      <div className="report-sections grid gap-6 lg:grid-cols-3">
        <Card className="report-summary lg:col-span-2">
          <div className="report-summary-heading mb-3 flex items-center gap-2"><FileBarChart className="h-4 w-4 text-brand-400" /><h2 className="font-bold text-slate-900">{data.title}</h2><Badge className="ml-auto">{new Date(data.generatedAt).toLocaleString()}</Badge></div>
          <p className="text-sm leading-relaxed text-slate-600">{data.narrative}</p>

          <div className="mt-6">
            <div className="label mb-2">Recommendations</div>
            <div className="space-y-2">
              {data.recommendations.map((r: string, i: number) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="report-item flex items-start gap-2 rounded-xl border border-line bg-ink-800/60 p-3 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-400" /> {r}
                </motion.div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="report-forecasts">
          <div className="mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-amber-400" /><h2 className="font-bold text-slate-900">Forecast highlights</h2></div>
          <div className="space-y-3">
            {data.predictions.length === 0 && (
              <div className="text-xs text-slate-500">{data.engineOnline ? 'Not enough data is available to generate forecast highlights.' : 'Intelligence engine offline — forecasts are computed there, never invented here.'}</div>
            )}
            {data.predictions.map((p, i) => (
              <div key={i} className="report-item rounded-xl border border-line bg-ink-800/60 p-3">
                <div className="text-sm text-slate-700">{p.label}</div>
                <div className="mt-1 text-[0.65rem] font-semibold text-slate-500">{p.note}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
