import { useEffect,useState } from 'react';
import { api,apiError } from '@/lib/api';
export default function DatabaseLab(){
  const [queries,setQueries]=useState<{id:string;label:string;sql:string}[]>([]),[result,setResult]=useState<any>(),[error,setError]=useState('');
  useEffect(()=>{api.get('/database/queries').then(r=>setQueries(r.data.queries)).catch(e=>setError(apiError(e)));},[]);
  async function run(path:string){setError('');try{setResult((await api.get(path)).data);}catch(e){setError(apiError(e));}}
  const rows=result?.rows as Record<string,unknown>[]|undefined;
  return <div className="space-y-5 p-6"><h1 className="text-2xl font-semibold">Database Lab</h1><p className="text-slate-500">Inspect live, school-scoped PostgreSQL queries and vector database features.</p>{error&&<p role="alert" className="text-red-700">{error}</p>}<div className="flex flex-wrap gap-2">{queries.map(q=><button key={q.id} className="rounded border bg-white p-3 text-left" onClick={()=>void run('/database/queries/'+q.id)}>{q.label}</button>)}<button className="rounded border p-3" onClick={()=>void run('/database/features')}>Vector indexes and role policies</button></div>
    {result?.sql&&<pre className="overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-4 text-sm text-white">{result.sql}</pre>}
    {rows&&<div className="overflow-auto"><table className="w-full text-left"><thead><tr>{Object.keys(rows[0]||{}).map(k=><th key={k} className="border-b p-3">{k}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{Object.entries(r).map(([k,v])=><td key={k} className="border-b p-3">{String(v??'—')}</td>)}</tr>)}</tbody></table>{!rows.length&&<p>No matching records.</p>}</div>}
    {result&&!rows&&<pre className="overflow-auto rounded border bg-white p-4 text-sm">{JSON.stringify(result,null,2)}</pre>}
  </div>;
}
