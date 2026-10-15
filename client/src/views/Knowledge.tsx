import { useEffect, useState } from 'react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
type Item={id:string;title:string;content:string;category:string;revision:number;similarity?:number};
const empty={title:'',content:'',category:'POLICY'};
export default function Knowledge(){
  const role=useAuth(s=>s.user?.role);
  const canEdit=['ADMIN','PRINCIPAL','SUPER_ADMIN'].includes(role||'');
  const [items,setItems]=useState<Item[]>([]),[query,setQuery]=useState(''),[category,setCategory]=useState('');
  const [form,setForm]=useState(empty),[edit,setEdit]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [source,setSource]=useState(''),[kind,setKind]=useState('document');
  const load=async()=>{try{setItems((await api.get('/knowledge')).data.items);}catch(e){setError(apiError(e));}};
  useEffect(()=>{void load();},[]);
  async function run(fn:()=>Promise<void>){setError('');setBusy(true);try{await fn();}catch(e){setError(apiError(e));}finally{setBusy(false);}}
  return <div className="space-y-6 p-6"><header><h1 className="text-2xl font-semibold">Knowledge Library</h1><p className="text-slate-500">Find school policies, notices and document excerpts by meaning. Staff can search; administrators maintain the library.</p></header>
    {error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();void run(async()=>setItems((await api.get('/knowledge/search',{params:{q:query,category:category||undefined}})).data.items));}}>
      <input aria-label="Search by meaning" className="min-w-64 flex-1 rounded border p-3" value={query} onChange={e=>setQuery(e.target.value)} placeholder="What happens when a student misses class?" minLength={2} required/>
      <select aria-label="Category" className="rounded border p-2" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{['POLICY','NOTICE','DOCUMENT'].map(x=><option key={x}>{x}</option>)}</select>
      <button disabled={busy} className="rounded bg-brand-600 px-4 py-2 text-white">{busy?'Working…':'Search'}</button><button type="button" className="rounded border px-4" onClick={()=>void load()}>Show all</button>
    </form>
    <p className="text-sm text-slate-500">Results use cosine similarity, which ranks relevance and is not a confidence probability. First use downloads the embedding model.</p>
    {canEdit&&<section className="rounded-xl border bg-white p-5"><h2 className="mb-3 font-semibold">{edit?'Edit library entry':'Add a library entry'}</h2>
      <form className="grid gap-3" onSubmit={e=>{e.preventDefault();void run(async()=>{if(edit)await api.put('/knowledge/'+edit,form);else await api.post('/knowledge',form);setForm(empty);setEdit('');await load();});}}>
        <input aria-label="Entry title" className="rounded border p-2" placeholder="Title" maxLength={180} required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
        <textarea aria-label="Entry content" className="rounded border p-2" rows={5} placeholder="A focused policy paragraph or document excerpt (20–12000 characters)" minLength={20} maxLength={12000} required value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/>
        <select aria-label="Entry category" className="rounded border p-2" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['POLICY','NOTICE','DOCUMENT'].map(x=><option key={x}>{x}</option>)}</select>
        <div className="flex gap-3"><button disabled={busy} className="rounded bg-brand-600 px-4 py-2 text-white">{edit?'Save and re-embed':'Create and embed'}</button>{edit&&<button type="button" onClick={()=>{setEdit('');setForm(empty);}}>Cancel</button>}</div>
      </form>
      <form className="mt-5 flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();void run(async()=>{await api.post(`/knowledge/import/${kind}/${encodeURIComponent(source)}`);setSource('');await load();});}}><select aria-label="Source type" className="rounded border p-2" value={kind} onChange={e=>setKind(e.target.value)}><option value="document">Lumen document</option><option value="notice">School-wide notice</option></select><input aria-label="Source record ID" className="flex-1 rounded border p-2" placeholder="Existing source record ID" required value={source} onChange={e=>setSource(e.target.value)}/><button disabled={busy} className="rounded border px-3">Import source</button></form>
    </section>}
    <section className="grid gap-4">{items.map(item=><article key={item.id} className="rounded-xl border bg-white p-5"><div className="flex justify-between gap-3"><h2 className="font-semibold">{item.title}</h2><span className="text-sm text-slate-500">{item.category} · v{item.revision}{item.similarity!==undefined&&` · similarity ${item.similarity.toFixed(3)}`}</span></div><p className="mt-3 whitespace-pre-wrap text-slate-600">{item.content}</p>{canEdit&&<div className="mt-4 flex gap-4"><button onClick={()=>{setEdit(item.id);setForm({title:item.title,content:item.content,category:item.category});window.scrollTo(0,0);}}>Edit</button><button className="text-red-600" disabled={busy} onClick={()=>{if(window.confirm(`Delete “${item.title}” from the library?`))void run(async()=>{await api.delete('/knowledge/'+item.id);await load();});}}>Delete</button></div>}</article>)}{!items.length&&<p className="text-slate-500">No library entries found. An administrator can add a policy or import a document.</p>}</section>
  </div>;
}
