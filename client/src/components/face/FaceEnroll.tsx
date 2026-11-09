import { useEffect, useState } from 'react';
import { Loader2, ScanFace } from 'lucide-react';
import { useWebcam } from '@/hooks/useWebcam';
import { captureFrameBase64 } from '@/lib/camera';
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
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState('Keep one face fully visible in even light. Hold still before each capture.');
  const poses = ['Look straight at the camera', 'Turn slightly to your left', 'Turn slightly to your right'];

  useEffect(() => { void start(); return () => stop(); }, [start, stop]);

  const capture = async () => {
    if (!videoRef.current || !ready || checking || saving || shots.length >= 3) return;
    setChecking(true);
    setFeedback('Checking this frame for one clear face…');
    try {
      const image = captureFrameBase64(videoRef.current);
      const result = (await api.post('/face/check', { image }, { timeout: 35_000 })).data;
      if (!result.ready) { setFeedback(result.guidance || 'Face the camera in good light and try again.'); return; }
      setShots(previous => [...previous, image].slice(0, 3));
      setFeedback(shots.length === 2 ? 'Three clear frames captured. Confirm consent, then enroll.' : 'Clear frame captured. ' + poses[shots.length + 1] + '.');
    } catch (err) { setFeedback(apiError(err, 'Frame check could not finish. Please retry.')); }
    finally { setChecking(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = (await api.post('/face/enroll', { subjectType: subject.type, subjectId: subject.id, images: shots, consent: true }, { timeout: 100_000 })).data;
      pushToast({ title: 'Face enrolled', body: `${res.stored} templates stored for ${subject.name}`, severity: 'SUCCESS' });
      onDone(); onClose();
    } catch (e) { pushToast({ title: 'Enrollment failed', body: apiError(e), severity: 'CRITICAL' }); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-900/25 p-4 backdrop-blur-sm" onClick={() => { if (!saving && !checking) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={`Enroll ${subject.name}`} className="max-h-[95dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-bold text-slate-900">Enroll {subject.name}</h3>
        <p className="mb-3 text-sm text-slate-600">{shots.length < 3 ? poses[shots.length] : 'Ready to enroll'}</p>
        <div className="relative overflow-hidden rounded-xl bg-slate-900" style={{ aspectRatio: '4/3' }}>
          <video ref={videoRef} className="absolute inset-0 h-full w-full object-contain" muted playsInline />
          {ready && <div aria-hidden="true" className="pointer-events-none absolute inset-x-[25%] inset-y-[10%] rounded-[50%] border-2 border-dashed border-white/60" />}
          {!ready && <div className="absolute inset-0 grid place-items-center text-slate-400">{error ? <span className="text-rose-400">{error}</span> : <Loader2 className="h-6 w-6 animate-spin text-brand-400" />}</div>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {[0, 1, 2].map((i) => <div key={i} className={cn('h-2 flex-1 rounded-full', shots[i] ? 'bg-mint-500' : 'bg-ink-700')} />)}
        </div>
        <p role="status" aria-live="polite" className="mt-3 min-h-10 text-xs leading-5 text-slate-600">{feedback}</p>
        <button onClick={capture} disabled={!ready || shots.length >= 3 || checking || saving} className="btn-ghost mt-2 w-full text-sm">{checking ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking frame…</> : `Capture frame (${shots.length}/3)`}</button>
        {error && <button onClick={() => void start()} className="btn-quiet mt-2 w-full text-xs">Retry camera</button>}
        {shots.length > 0 && <button onClick={()=>{setShots([]);setFeedback('Look straight at the camera and capture a clear frame.');}} disabled={saving || checking} className="btn-quiet mt-2 w-full text-xs">Retake frames</button>}
        <label className="mt-3 flex items-start gap-2 text-[0.72rem] text-slate-600">
          <input type="checkbox" checked={consent} disabled={saving} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          <span>I confirm consent to store this person's face embedding for attendance (DPDP/GDPR). Only the vector is kept — never the image.</span>
        </label>
        <div className="mt-3 flex gap-2">
          <button onClick={onClose} disabled={saving || checking} className="btn-quiet flex-1 text-sm">Cancel</button>
          <button onClick={save} disabled={shots.length !== 3 || !consent || saving || checking} className="btn-primary flex-1 text-sm">{saving ? <Spinner /> : <ScanFace className="h-3.5 w-3.5" />} {saving ? 'Saving templates…' : 'Enroll'}</button>
        </div>
      </div>
    </div>
  );
}

export default function FaceEnroll({subjectType,subjectId,name,onClose,onDone}:{subjectType:'STUDENT'|'TEACHER';subjectId:string;name:string;onClose:()=>void;onDone:()=>void}) {
  return <EnrollDialog subject={{type:subjectType,id:subjectId,name}} onClose={onClose} onDone={onDone} />;
}
