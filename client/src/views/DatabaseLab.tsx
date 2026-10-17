import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Play, RotateCcw, Database, Table2, KeyRound, ChevronDown, ChevronRight, Search, Clock3, Download, Loader2, CheckCircle2, TerminalSquare, BookOpen, ArrowUpRight, Layers3 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import SqlEditor from '@/components/SqlEditor';
import { SQL_EXAMPLES } from '@/lib/sql-examples';

type Column = { table: string; name: string; type: string; native_type: string; nullable: boolean; default: string | null; primary_key: boolean };
type Structure = { columns: Column[]; relations: { table: string; column: string; target_table: string; target_column: string }[] };
type ResultSet = { fields: { name: string; dataTypeID: number }[]; rows: unknown[][]; affectedRows: number; rowCount: number; truncated: boolean; fieldsTruncated?: boolean };
type Execution = { results: ResultSet[]; elapsedMs: number; resultSetsTruncated?: boolean; schema: Structure | null };
type HistoryEntry = { sql: string; elapsedMs?: number; failed: boolean; at: string };
const cell = (value: unknown) => value === null ? 'NULL' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';

export default function DatabaseLab() {
  const [tab, setTab] = useState<'playground' | 'live'>('playground');
  const [sql, setSql] = useState<string>(SQL_EXAMPLES[0].sql);
  const [schema, setSchema] = useState<Structure | null>(null);
  const [busy, setBusy] = useState<'loading' | 'running' | 'resetting' | null>('loading');
  const [error, setError] = useState<{ text: string; code?: string; hint?: string; line?: number } | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [resultIndex, setResultIndex] = useState(0);
  const [tableSearch, setTableSearch] = useState('');
  const [expanded, setExpanded] = useState('Student');
  const [category, setCategory] = useState('All');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState('');
  const [queries, setQueries] = useState<{ id: string; label: string; sql: string }[]>([]);
  const [liveResult, setLiveResult] = useState<any>(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveError, setLiveError] = useState('');

  async function initialize() {
    setBusy('loading'); setError(null);
    try { setSchema((await api.get('/database/lab/schema', { timeout: 50_000 })).data.schema); }
    catch (err) { setError({ text: apiError(err, 'Could not start the playground. Please retry.') }); }
    finally { setBusy(null); }
  }
  useEffect(() => {
    void initialize();
    api.get('/database/queries').then(response => setQueries(response.data.queries)).catch(() => setLiveError('Could not load live query examples.'));
  }, []);

  const tables = useMemo(() => {
    const names = [...new Set(schema?.columns.map(column => column.table) ?? [])];
    const priority = ['Student', 'Class', 'Fee', 'Payment', 'Attendance', 'Teacher', 'User', 'School', 'KnowledgeItem'];
    return names.sort((a, b) => {
      const ai = priority.indexOf(a), bi = priority.indexOf(b);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b);
    });
  }, [schema]);

  async function run(selection?: string) {
    const query = selection || sql;
    if (busy || !query.trim()) return;
    setBusy('running'); setError(null); setNotice(''); setExecution(null); setResultIndex(0);
    const at = new Date().toLocaleTimeString();
    try {
      const result = (await api.post<Execution>('/database/lab/execute', { sql: query }, { timeout: 55_000 })).data;
      setExecution(result); if (result.schema) setSchema(result.schema);
      setHistory(previous => [{ sql: query, elapsedMs: result.elapsedMs, failed: false, at }, ...previous].slice(0, 15));
    } catch (err) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.details : null;
      setError({ text: apiError(err, 'The query could not finish. Please try again.'), code: detail?.code, hint: detail?.hint,
        line: detail?.position ? query.slice(0, Number(detail.position) - 1).split('\n').length : undefined });
      setHistory(previous => [{ sql: query, failed: true, at }, ...previous].slice(0, 15));
    } finally { setBusy(null); }
  }

  async function reset() {
    if (busy) return;
    setBusy('resetting'); setConfirmReset(false); setError(null); setExecution(null); setNotice('');
    try {
      const response = await api.post('/database/lab/reset', {}, { timeout: 50_000 });
      setSchema(response.data.schema); setNotice('Playground reset. The original fictional data and schema are restored.');
    } catch (err) { setError({ text: apiError(err, 'Could not reset the playground. Please retry.') }); }
    finally { setBusy(null); }
  }

  async function runLive(path: string) {
    if (liveBusy) return;
    setLiveBusy(true); setLiveError(''); setLiveResult(null);
    try { setLiveResult((await api.get(path)).data); }
    catch (err) { setLiveError(apiError(err)); }
    finally { setLiveBusy(false); }
  }

  function exportCsv() {
    const result = execution?.results[resultIndex]; if (!result?.fields.length) return;
    const escape = (value: unknown) => {
      let text = value === null ? '' : cell(value);
      if (typeof value === 'string' && /^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const csv = [result.fields.map(field => escape(field.name)).join(','), ...result.rows.map(row => row.map(escape).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'meridian-sql-results.csv'; anchor.click(); URL.revokeObjectURL(url);
  }

  const result = execution?.results[resultIndex];
  return <div className="space-y-6">
    <PageHeader overline="THE DATABASE WORKBENCH" title="Database Lab" subtitle="Write it. Run it. Understand it. Your own PostgreSQL playground, built for discovery." />
    <div className="flex gap-1 border-b border-line" role="tablist" aria-label="Database mode">
      {([{ id: 'playground', label: 'SQL playground', Icon: TerminalSquare }, { id: 'live', label: 'Live database evidence', Icon: Database }] as const).map(({ id, label, Icon }) =>
        <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${tab === id ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><Icon size={16} />{label}</button>)}
    </div>

    {tab === 'playground' ? <>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-white"><Database size={20} /></span><div><div className="font-semibold text-brand-700">Your private demo database</div><p className="mt-0.5 text-xs leading-5 text-brand-700">Meridian schema · fictional records · PostgreSQL via PGlite + pgvector</p></div></div>
        <span className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600">Website records stay untouched</span>
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="order-2 min-w-0 rounded-xl border border-line bg-white xl:order-none xl:self-start">
          <div className="flex items-center justify-between border-b border-line px-4 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Layers3 size={16} className="text-brand-500" />Schema explorer</h2><span className="text-xs text-slate-400">{tables.length} objects</span></div>
          <label className="relative m-3 block"><Search size={14} className="absolute left-3 top-3 text-slate-400" /><input aria-label="Find a table" placeholder="Find a table…" value={tableSearch} onChange={event => setTableSearch(event.target.value)} className="w-full rounded-lg border border-line bg-canvas py-2 pl-9 pr-3 text-xs" /></label>
          <div className="max-h-[520px] overflow-y-auto px-2 pb-3">
            {tables.filter(table => table.toLowerCase().includes(tableSearch.toLowerCase())).map(table => <div key={table}>
              <button aria-expanded={expanded === table} onClick={() => setExpanded(expanded === table ? '' : table)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${expanded === table ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-canvas'}`}>
                {expanded === table ? <ChevronDown size={13} /> : <ChevronRight size={13} />}<Table2 size={14} />{table}
              </button>
              {expanded === table && <div className="ml-5 border-l border-line pl-3">
                <button onClick={() => setSql(`SELECT * FROM ${quote(table)} LIMIT 100;`)} className="my-2 flex items-center gap-1 text-xs font-semibold text-brand-500">Query this table <ArrowUpRight size={12} /></button>
                {schema?.columns.filter(column => column.table === table).map(column => {
                  const relation = schema.relations.find(item => item.table === table && item.column === column.name);
                  return <div key={column.name} className="py-1.5 text-[11px]" title={`${column.nullable ? 'Nullable' : 'NOT NULL'}${column.default ? ` · Default: ${column.default}` : ''}`}>
                    <div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5 text-slate-600">{column.primary_key && <KeyRound size={10} className="shrink-0 text-amber-500" />}<span className="truncate">{column.name}</span></span><span className="shrink-0 font-mono text-[9px] text-slate-400">{column.type === 'USER-DEFINED' ? column.native_type : column.type.replace('timestamp without time zone', 'timestamp').replace('character varying', 'varchar')}</span></div>
                    {relation && <div className="mt-0.5 truncate text-[9px] text-brand-500">↳ {relation.target_table}.{relation.target_column}</div>}
                  </div>;
                })}
              </div>}
            </div>)}
            {!tables.length && <p className="p-3 text-xs text-slate-400">{busy ? 'Preparing schema…' : 'No public tables. Reset to restore the demo.'}</p>}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-xl border border-[#233647] shadow-sm" aria-label="SQL workspace">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#172938] px-4 py-3 text-slate-300"><div className="flex items-center gap-3 text-xs"><span className="flex gap-1.5" aria-hidden="true"><i className="h-2 w-2 rounded-full bg-rose-400/70" /><i className="h-2 w-2 rounded-full bg-amber-400/70" /><i className="h-2 w-2 rounded-full bg-emerald-400/70" /></span><span className="font-mono">playground.sql</span></div><span className="text-[10px] uppercase tracking-widest text-emerald-300">Isolated / editable</span></div>
            <SqlEditor value={sql} onChange={setSql} onRun={run} disabled={!!busy} />
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#172938] px-4 py-3">
              <p id="sql-shortcuts" className="text-[10px] text-slate-400">Ctrl / ⌘ + Enter to run · select text to run a selection · Esc leaves editor</p>
              <div className="flex items-center gap-3"><button disabled={!!busy} onClick={() => setConfirmReset(true)} className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white disabled:opacity-40"><RotateCcw size={13} />Reset demo</button><button disabled={!!busy || !sql.trim()} onClick={() => void run()} className="flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-[#102b27] hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}{busy === 'loading' ? 'Starting PostgreSQL…' : busy === 'resetting' ? 'Resetting…' : busy ? 'Running…' : 'Run SQL'}</button></div>
            </div>
          </section>
          <p className="text-xs leading-5 text-slate-400">Changes stay in your private playground for up to 15 idle minutes, or until an API restart. Reset restores the seed. Runs are limited to 8 seconds; a timed-out playground is discarded.</p>

          {confirmReset && <div role="alertdialog" aria-label="Reset demo database" aria-describedby="reset-description" className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4"><p id="reset-description" className="text-sm text-slate-700">Restore the original demo database? Your playground tables and data changes will be discarded.</p><div className="mt-3 flex gap-2"><button onClick={() => void reset()} className="btn-primary text-xs">Restore demo database</button><button onClick={() => setConfirmReset(false)} className="btn-ghost text-xs">Keep working</button></div></div>}
          <div aria-live="polite" role="status" className="text-sm text-brand-600">{notice}</div>
          {error && <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/5 p-4"><div className="mb-1 flex gap-3 text-xs font-bold text-rose-500">Query could not complete {error.code && <span className="font-mono">SQLSTATE {error.code}</span>}{error.line && <span>Line {error.line}</span>}</div><p className="whitespace-pre-wrap break-words font-mono text-xs text-rose-500">{error.text}</p>{error.hint && <p className="mt-2 text-xs text-slate-500">Hint: {error.hint}</p>}{!schema && <button onClick={() => void initialize()} disabled={!!busy} className="btn-ghost mt-3 text-xs">Retry connection</button>}</div>}

          <section className="overflow-hidden rounded-xl border border-line bg-white" aria-label="Query results">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Table2 size={15} className="text-brand-500" />Results {execution && <span className="flex items-center gap-1 text-xs font-normal text-brand-500"><CheckCircle2 size={12} />{execution.elapsedMs} ms</span>}</h2><div className="flex gap-4"><button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13} />History ({history.length})</button><button onClick={exportCsv} disabled={!result?.fields.length} className="flex items-center gap-1 text-xs text-slate-500 disabled:opacity-30"><Download size={13} />CSV</button></div></div>
            {showHistory && <div className="max-h-48 overflow-auto border-b border-line bg-canvas p-3">{!history.length && <p className="text-xs text-slate-400">Your query history will appear here.</p>}{history.map((item, i) => <button key={i} onClick={() => { setSql(item.sql); setShowHistory(false); }} className="flex w-full items-start justify-between gap-4 rounded p-2 text-left text-xs hover:bg-white"><span className="min-w-0 truncate font-mono text-slate-600">{item.sql.replace(/--[^\n]*/g, '').trim().slice(0, 85)}</span><span className={`shrink-0 ${item.failed ? 'text-rose-400' : 'text-brand-500'}`}>{item.at} · {item.failed ? 'error' : `${item.elapsedMs} ms`}</span></button>)}</div>}
            {execution && <div className="flex overflow-x-auto border-b border-line bg-canvas">{execution.results.map((item, i) => <button key={i} onClick={() => setResultIndex(i)} className={`shrink-0 border-b-2 px-4 py-2.5 text-xs ${resultIndex === i ? 'border-brand-500 font-semibold text-brand-600' : 'border-transparent text-slate-500'}`}>Result {i + 1} <span className="ml-1 opacity-60">{item.fields.length ? `${item.rowCount} rows` : `${item.affectedRows ?? 0} affected`}</span></button>)}</div>}
            {result?.fields.length ? <><div className="max-h-[420px] overflow-auto"><table className="w-full border-collapse text-left font-mono text-xs"><thead className="sticky top-0 bg-canvas text-slate-500"><tr><th className="border-b border-line px-3 py-3 font-normal">#</th>{result.fields.map((field, i) => <th key={i} className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold">{field.name}</th>)}</tr></thead><tbody>{result.rows.map((row, i) => <tr key={i} className="hover:bg-brand-50/50"><td className="border-b border-line/60 px-3 py-3 text-slate-300">{i + 1}</td>{row.map((value, j) => <td key={j} className={`max-w-sm whitespace-pre-wrap break-words border-b border-line/60 px-4 py-3 ${value === null ? 'italic text-slate-300' : 'text-slate-700'}`}>{cell(value)}</td>)}</tr>)}</tbody></table></div><div className="px-4 py-3 text-xs text-slate-400">{result.rows.length ? `${result.rows.length} rows displayed` : 'Query succeeded. No matching rows.'}{result.truncated && ' · Display limit reached (500 rows / 1 MB). Use LIMIT for smaller results.'}{result.fieldsTruncated && ' · First 100 columns shown.'}</div></> : result ? <p className="flex items-center gap-2 p-5 text-sm text-brand-600"><CheckCircle2 size={16} />Statement completed. {result.affectedRows ?? 0} rows affected.</p> : <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-slate-400"><TerminalSquare size={24} className="text-brand-200" /><p className="text-sm">{busy === 'running' ? 'PostgreSQL is executing your query…' : 'A good question starts with a query.'}</p><p className="text-xs">Run the starter query, or choose an example below.</p></div>}
            {execution?.resultSetsTruncated && <p className="p-3 text-xs text-amber-500">First 12 result sets displayed. Run smaller batches to inspect every statement.</p>}
          </section>
        </div>
      </div>
      <section className="rounded-xl border border-line bg-white p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><BookOpen size={17} className="text-brand-500" />The query shelf</h2><p className="mt-1 text-xs text-slate-400">Presentation-ready examples. Load one, then make it your own.</p></div><div className="flex flex-wrap gap-1">{['All', 'Read', 'Write', 'Advanced', 'Vector'].map(name => <button key={name} onClick={() => setCategory(name)} className={`rounded-lg px-3 py-1.5 text-xs ${category === name ? 'bg-brand-50 font-semibold text-brand-600' : 'text-slate-400 hover:bg-canvas'}`}>{name}</button>)}</div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{SQL_EXAMPLES.filter(example => category === 'All' || example.category === category).map(example => <button key={example.title} onClick={() => { setSql(example.sql); setNotice(`Loaded “${example.title}”. Press Run SQL to execute.`); }} className="group rounded-xl border border-line bg-canvas/50 p-4 text-left transition-colors hover:border-brand-200 hover:bg-brand-50"><div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">{example.title}<ArrowUpRight size={15} className="text-slate-300 group-hover:text-brand-500" /></div><p className="mt-1.5 text-[11px] text-slate-400">{example.description}</p></button>)}</div></section>
    </> : <section className="space-y-5 rounded-xl border border-line bg-white p-5"><div><h2 className="font-semibold">Live website database · read-only examples</h2><p className="mt-2 text-sm text-slate-500">These predefined queries inspect your school's actual records. The editable playground above uses separate fictional data.</p></div><div className="flex flex-wrap gap-2">{queries.map(query => <button key={query.id} disabled={liveBusy} onClick={() => void runLive('/database/queries/' + query.id)} className="btn-ghost text-xs">{query.label}</button>)}<button disabled={liveBusy} onClick={() => void runLive('/database/features')} className="btn-primary text-xs">Vector indexes and role policies</button></div>{liveBusy && <p role="status" className="text-sm text-slate-500">Inspecting the live database…</p>}{liveError && <p role="alert" className="text-sm text-rose-500">{liveError}</p>}{liveResult?.sql && <pre className="overflow-auto whitespace-pre-wrap rounded-xl bg-[#101e2c] p-5 font-mono text-xs text-slate-200">{liveResult.sql}</pre>}{liveResult?.rows ? <div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr>{Object.keys(liveResult.rows[0] ?? {}).map(key => <th key={key} className="border-b border-line p-3">{key}</th>)}</tr></thead><tbody>{liveResult.rows.map((row: Record<string, unknown>, i: number) => <tr key={i}>{Object.entries(row).map(([key, value]) => <td key={key} className="border-b border-line p-3">{cell(value)}</td>)}</tr>)}</tbody></table>{!liveResult.rows.length && <p className="p-3 text-sm text-slate-400">No matching records.</p>}</div> : liveResult && <pre className="max-h-[600px] overflow-auto rounded-xl bg-canvas p-4 text-xs">{JSON.stringify(liveResult, null, 2)}</pre>}</section>}
  </div>;
}
