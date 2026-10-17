import { useEffect, useState } from 'react';
import { Loader2, ScanFace } from 'lucide-react';
import { useWebcam } from '@/hooks/useWebcam';
import { captureFrameBase64 } from '@/lib/face';
import { api, apiError } from '@/lib/api';
import { useUI } from '@/store/ui';
import { Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
export function EnrollDialog({ subject, onClose, onDone }: { subject: { type: 'STUDENT' | 'TEACHER'; id: string; name: string }; onClose: () => void; onDone: () => void }) {
  const { pushToast } = useUI();
  const { videoRef, ready, error, start, stop } = useWebcam();
  const [shots, setShots] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void start(); return () => stop(); }, [start, stop]);

  const capture = () => { if (videoRef.current) setShots((s) => [...s, captureFrameBase64(videoRef.current!)].slice(0, 3)); };

  const save = async () => {
    setSaving(true);
    try {
      const res = (await api.post('/face/enroll', { subjectType: subject.type, subjectId: subject.id, images: shots, consent: true })).data;
      pushToast({ title: 'Face enrolled', body: `${res.stored} templates stored for ${subject.name}`, severity: 'SUCCESS' });
      onDone(); onClose();
    } catch (e) { pushToast({ title: 'Enrollment failed', body: apiError(e), severity: 'CRITICAL' }); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-900/25 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-bold text-slate-900">Enroll {subject.name}</h3>
        <div className="relative overflow-hidden rounded-xl bg-slate-900" style={{ aspectRatio: '4/3' }}>
          <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
          {!ready && <div className="absolute inset-0 grid place-items-center text-slate-400">{error ? <span className="text-rose-400">{error}</span> : <Loader2 className="h-6 w-6 animate-spin text-brand-400" />}</div>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {[0, 1, 2].map((i) => <div key={i} className={cn('h-2 flex-1 rounded-full', shots[i] ? 'bg-mint-500' : 'bg-ink-700')} />)}
        </div>
        <button onClick={capture} disabled={!ready || shots.length >= 3} className="btn-ghost mt-3 w-full text-sm">Capture frame ({shots.length}/3)</button>
        {shots.length > 0 && <button onClick={()=>setShots([])} disabled={saving} className="btn-quiet mt-2 w-full text-xs">Retake frames</button>}
        <label className="mt-3 flex items-start gap-2 text-[0.72rem] text-slate-600">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          <span>I confirm consent to store this person's face embedding for attendance (DPDP/GDPR). Only the vector is kept — never the image.</span>
        </label>
        <div className="mt-3 flex gap-2">
          <button onClick={onClose} className="btn-quiet flex-1 text-sm">Cancel</button>
          <button onClick={save} disabled={!shots.length || !consent || saving} className="btn-primary flex-1 text-sm">{saving ? <Spinner /> : <ScanFace className="h-3.5 w-3.5" />} Enroll</button>
        </div>
      </div>
    </div>
  );
}

export default function FaceEnroll({subjectType,subjectId,name,onClose,onDone}:{subjectType:'STUDENT'|'TEACHER';subjectId:string;name:string;onClose:()=>void;onDone:()=>void}) {
  return <EnrollDialog subject={{type:subjectType,id:subjectId,name}} onClose={onClose} onDone={onDone} />;
}
