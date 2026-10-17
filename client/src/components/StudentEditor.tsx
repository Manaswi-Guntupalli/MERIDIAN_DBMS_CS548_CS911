import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, apiError } from '@/lib/api';
import { useUI } from '@/store/ui';
import { Spinner } from '@/components/ui';
import type { ClassRow } from '@/types';

export default function StudentEditor({student,onClose,onSaved}:{student:any;onClose:()=>void;onSaved:()=>void}) {
  const navigate=useNavigate(); const {pushToast}=useUI();
  const [form,setForm]=useState({name:student.name,admissionNo:student.admissionNo,rollNo:String(student.rollNo),classId:student.classId??'',bloodGroup:student.bloodGroup??'',gender:student.gender??'',active:student.active});
  const [error,setError]=useState('');
  const classes=useQuery({queryKey:['classes'],queryFn:async()=>(await api.get('/classes')).data.classes as ClassRow[]});
  const save=useMutation({mutationFn:()=>api.patch(`/students/${student.id}`,{...form,rollNo:Number(form.rollNo),classId:form.classId||null}),
    onSuccess:()=>{onSaved();pushToast({title:'Student updated',severity:'SUCCESS'});onClose();},onError:e=>setError(apiError(e))});
  const remove=useMutation({mutationFn:()=>api.delete(`/students/${student.id}`),onSuccess:()=>{onSaved();onClose();navigate('/students');},onError:e=>setError(apiError(e))});
  const busy=save.isPending||remove.isPending;
  return <div role="dialog" aria-modal="true" aria-labelledby="student-editor-title" className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/25 p-4 backdrop-blur-sm">
    <form className="surface w-full max-w-md space-y-3 p-6" onSubmit={e=>{e.preventDefault();setError('');save.mutate();}}>
      <h2 id="student-editor-title" className="text-lg font-bold">Edit student</h2>
      {(['name','admissionNo','rollNo','bloodGroup','gender'] as const).map(key=><label key={key} className="block text-sm">{{name:'Full name',admissionNo:'Admission number',rollNo:'Roll number',bloodGroup:'Blood group',gender:'Gender'}[key]}<input className="input mt-1" value={form[key]} type={key==='rollNo'?'number':'text'} min={key==='rollNo'?1:undefined} required={['name','admissionNo','rollNo'].includes(key)} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
      <label className="block text-sm">Class<select className="input mt-1" value={form.classId} onChange={e=>setForm({...form,classId:e.target.value})}><option value="">Unassigned</option>{classes.data?.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>Active student</label>
      <p className="text-xs text-slate-500">Clear Active to withdraw while preserving attendance, fees and history. Permanent deletion is available only before operational history exists.</p>
      {error&&<p role="alert" className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2"><button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{save.isPending?<Spinner/>:'Save changes'}</button></div>
      <button type="button" className="text-xs text-rose-600" disabled={busy} onClick={()=>{if(window.confirm(`Permanently delete ${student.name}? Existing operational history will prevent deletion.`)){setError('');remove.mutate();}}}>Delete unused record</button>
    </form>
  </div>;
}
