import { useEffect, useRef, useState } from 'react';
import { EnrollDialog } from '@/components/face/FaceEnroll';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanFace, Users, ShieldCheck, AlertTriangle, Loader2, Play, ShieldAlert } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';
import { useWebcam } from '@/hooks/useWebcam';
import { captureFrameBase64 } from '@/lib/camera';
import { Card, Badge, StatTile, LoadingScreen, EmptyState, Meter, Spinner } from '@/components/ui';
import { cn, initials, timeAgo } from '@/lib/utils';
import { FACE } from '@/constants/theme';
import type { AttendanceSessionView, MarkResultView } from '@/types';

// These three now mount directly as Presence tabs (Kiosk / Enrollment /
// Insights) under PresenceLayout, which supplies the page header + tab bar.
// Face recognition is the camera half of Presence attendance — same engine,
// same session — so it lives in the same module rather than a separate one.

// ─────────────────────────── LIVE KIOSK ───────────────────────────
interface LogEntry { name: string; state: string; confidence: number; at: string; reason?: string }

export function LiveKiosk() {
  const qc = useQueryClient();
  const { pushToast } = useUI();
  const { videoRef, ready, error, start, stop } = useWebcam();
  const [running, setRunning] = useState(false);
  const [faces, setFaces] = useState<{ box: { x: number; y: number; width: number; height: number } }[]>([]);
  const [faceCount, setFaceCount] = useState(0);
  const [dims, setDims] = useState({ w: 640, h: 480 });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [classId, setClassId] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState('');
  const [starting, setStarting] = useState(false);

  const runFlag = useRef(false);
  const busyRef = useRef(false);
  const announcedRef = useRef(new Set<string>());

  const classes = useQuery({ queryKey: ['classes'], queryFn: async () => (await api.get('/classes')).data.classes as { id: string; name: string }[] });
  useEffect(() => { if (!classId && classes.data?.length) setClassId(classes.data[0].id); }, [classes.data, classId]);
  const session = useQuery({
    queryKey: ['attendance-session', sessionId],
    queryFn: async () => (await api.get(`/presence/session/${sessionId}`)).data as AttendanceSessionView,
    enabled: !!sessionId,
    refetchInterval: 4000,
  });

  const startSession = async () => {
    try {
      const existing = (await api.get(`/presence/session/active?classId=${classId}`)).data.session as AttendanceSessionView | null;
      const s = existing ?? ((await api.post('/presence/session/start', { classId })).data as AttendanceSessionView);
      setSessionId(s.id);
      return s.id;
    } catch (e) { pushToast({ title: 'Could not open session', body: apiError(e), severity: 'CRITICAL' }); return null; }
  };

  const boot = async () => {
    setStarting(true); setRecognitionError('');
    try {
      if ((!sessionId || session.data?.status !== 'ACTIVE') && !(await startSession())) return;
      if (!(await start())) return;
      setRunning(true);
      runFlag.current = true;
    } catch (err) { setRecognitionError(apiError(err, 'Camera could not start. Please retry.')); }
    finally { setStarting(false); }
  };
  useEffect(() => () => { runFlag.current = false; stop(); }, [stop]);
  useEffect(() => { announcedRef.current.clear(); setLog([]); setFaces([]); setFaceCount(0); }, [sessionId]);

  // When the session ends (timer expiry or a manual close), stop the camera —
  // no attendance can be captured outside an active session anyway.
  useEffect(() => {
    if (running && session.data && session.data.status !== 'ACTIVE') {
      runFlag.current = false;
      stop();
      setRunning(false);
      pushToast({ title: 'Session ended', body: 'Attendance closed — camera stopped.', severity: 'INFO' });
    }
  }, [session.data, running, stop, pushToast]);

  // Capture the frame and send the IMAGE to the server, which embeds + matches
  // + marks. The browser never holds a face template.
  const submitFrame = async () => {
    if (!videoRef.current || !sessionId || busyRef.current) return;
    busyRef.current = true;
    try {
      const image = captureFrameBase64(videoRef.current);
      if (!image) return;
      const result = (await api.post(`/presence/session/${sessionId}/face`, { image })).data as MarkResultView;
      setRecognitionError('');
      setFaceCount(result.capture?.faceCount ?? 0);
      const capture = result.capture;
      if (capture?.width && capture.height) setDims({ w: capture.width, h: capture.height });
      const box = capture?.bbox;
      setFaces(box ? [{ box: { x: box[0], y: box[1], width: box[2] - box[0], height: box[3] - box[1] } }] : []);
      if (result.state === 'PRESENT') {
        if (announcedRef.current.has(result.studentId)) return;
        announcedRef.current.add(result.studentId);
        setLog((l) => [{ name: result.studentName, state: 'PRESENT', confidence: result.face?.confidence ?? 0, at: new Date().toISOString() }, ...l].slice(0, 15));
        pushToast({ title: `${result.studentName} ✓`, body: result.face ? `Present · ${Math.round(result.face.confidence * 100)}% match` : 'Already present in this session', severity: 'SUCCESS' });
        qc.invalidateQueries({ queryKey: ['attendance-session', sessionId] });
      } else if (result.state === 'PROXY_ATTEMPT') {
        if (announcedRef.current.has('proxy:' + result.studentId)) return;
        announcedRef.current.add('proxy:' + result.studentId);
        setLog((l) => [{ name: result.studentName, state: 'PROXY_ATTEMPT', confidence: result.face?.confidence ?? 0, at: new Date().toISOString(), reason: result.reason }, ...l].slice(0, 15));
      } else if (result.state === 'FACE_VERIFIED') {
        setRecognitionError(`${result.studentName}: face verified. Scan the session QR to complete attendance.`);
      }
      // ABSENT (no confident match / not on register) is quiet — expected while scanning.
    } catch (err) { setRecognitionError(apiError(err, 'Face recognition could not finish. Please retry.')); } finally {
      busyRef.current = false;
    }
  };

  useEffect(() => {
    if (!ready || !running) return;
    let lastShot = -Infinity;
    let cancelled = false;
    let animationId = 0;
    const loop = async (t: number) => {
      if (cancelled || !runFlag.current || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState >= 2) {
        if (t - lastShot > 700) {
          lastShot = t;
          void submitFrame();
        }
      }
      if (!cancelled && runFlag.current) animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => { cancelled = true; cancelAnimationFrame(animationId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, running, sessionId]);

  const s = session.data;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="!p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
            <select value={classId} onChange={(e) => { setClassId(e.target.value); setSessionId(null); }} className="input !w-auto !py-1.5 text-xs" disabled={running || starting}>
              {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {s && <Badge severity={s.status === 'ACTIVE' ? 'SUCCESS' : 'INFO'}>{s.status === 'ACTIVE' ? `${s.counts.present}/${s.counts.total} present` : s.status}</Badge>}
            <span className="text-[0.7rem] text-slate-500">Present requires this student's QR and matching face, in either order.</span>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-slate-900" style={{ aspectRatio: `${dims.w}/${dims.h}` }}>
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
            {faces.map((f, i) => (
              <div key={i} className="absolute rounded-lg border-2 transition-all" style={{ left: `${(f.box.x / dims.w) * 100}%`, top: `${(f.box.y / dims.h) * 100}%`, width: `${(f.box.width / dims.w) * 100}%`, height: `${(f.box.height / dims.h) * 100}%`, borderColor: FACE.known, boxShadow: '0 2px 10px rgba(30,138,99,0.28)' }} />
            ))}
            {running && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <motion.div className="absolute inset-x-0 h-20 bg-gradient-to-b from-cyan-400/15 to-transparent" animate={{ y: ['-10%', '120%'] }} transition={{ repeat: Infinity, duration: 2.6, ease: 'linear' }} />
              </div>
            )}
            {!running && (
              <div className="absolute inset-0 grid place-items-center">
                <div className="px-5 text-center">{error && <p className="mb-3 text-sm text-rose-300">{error}</p>}<button onClick={boot} disabled={starting} className="btn-primary">{starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {starting ? 'Starting camera…' : 'Start kiosk'}</button></div>
              </div>
            )}
            {running && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="chip"><span className="live-dot" /> {faceCount} face{faceCount === 1 ? '' : 's'}</span>
                <span className="chip"><ScanFace className="h-3 w-3" /> Automatic recognition</span>
              </div>
            )}
          </div>
          {recognitionError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{recognitionError}</p>}
          <div className="mt-3 flex items-center justify-between px-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-mint-400" /> Frames embedded server-side in memory · only vectors compared, never stored</span>
          </div>
        </Card>
      </div>

      <Card className="!p-0">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4"><span className="live-dot" /><h2 className="font-bold text-slate-900">Recognised now</h2></div>
        <div className="max-h-[28rem] space-y-2 overflow-y-auto p-3 no-scrollbar">
          <AnimatePresence initial={false}>
            {log.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">Look at the camera. Enrolled students are marked present automatically when recognized.</div>
            ) : log.map((e, i) => (
              <motion.div key={e.at + i} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={cn('rounded-xl border p-3', e.state === 'PROXY_ATTEMPT' ? 'border-rose-400/40 bg-rose-400/[0.06]' : 'border-line bg-ink-800/60')}>
                <div className="flex items-center gap-3">
                  <div className={cn('grid h-9 w-9 place-items-center rounded-lg text-xs font-bold text-white', e.state === 'PROXY_ATTEMPT' ? 'bg-rose-500' : 'bg-brand-600')}>{e.state === 'PROXY_ATTEMPT' ? <ShieldAlert className="h-4 w-4" /> : initials(e.name)}</div>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-900">{e.name}</div><div className="text-xs text-slate-500">{timeAgo(e.at)}</div></div>
                  <Badge severity={e.state === 'PROXY_ATTEMPT' ? 'CRITICAL' : 'SUCCESS'}>{e.state === 'PROXY_ATTEMPT' ? 'Proxy blocked' : 'Present'}</Badge>
                </div>
                {e.reason && <div className="mt-1.5 border-t border-line pt-1.5 text-[0.68rem] text-slate-500">{e.reason}</div>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────── ENROLLMENT ───────────────────────────
export function Enrollment() {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user)!;
  const canEnroll = ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL'].includes(user.role);
  const [enrolling, setEnrolling] = useState<{ type: 'STUDENT' | 'TEACHER'; id: string; name: string } | null>(null);
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['face', 'enrolled'], queryFn: async () => (await api.get('/face/enrolled')).data as { students: any[]; teachers: any[] } });

  if (isLoading) return <LoadingScreen />;
  const students = (data?.students ?? []).filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));

  const Row = ({ p, type }: { p: any; type: 'STUDENT' | 'TEACHER' }) => (
    <div className="surface flex items-center gap-3 p-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-xs font-bold text-white">{initials(p.name)}</div>
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-900">{p.name}</div><div className="text-xs text-slate-500">{type === 'STUDENT' ? `${p.className ?? '—'} · Roll ${p.rollNo}` : p.department}</div></div>
      {p.enrolled ? (
        <div className="flex items-center gap-2"><Badge severity="SUCCESS">{p.faceCount} faces</Badge>{canEnroll && <button onClick={() => setEnrolling({ type, id: p.id, name: p.name })} className="btn-ghost !py-1.5 text-xs">Re-enroll</button>}</div>
      ) : canEnroll ? (
        <button onClick={() => setEnrolling({ type, id: p.id, name: p.name })} className="btn-primary !py-1.5 text-xs"><ScanFace className="h-3.5 w-3.5" /> Enroll face</button>
      ) : <Badge>Not enrolled</Badge>}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…" className="input sm:max-w-xs" />
        <div className="text-sm text-slate-500 sm:ml-auto">{data?.students.filter((s) => s.enrolled).length}/{data?.students.length} students · {data?.teachers.filter((t) => t.enrolled).length}/{data?.teachers.length} staff enrolled</div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div><h3 className="mb-2 font-bold text-slate-900">Teachers</h3><div className="space-y-2">{data?.teachers.map((t) => <Row key={t.id} p={t} type="TEACHER" />)}</div></div>
        <div><h3 className="mb-2 font-bold text-slate-900">Students</h3><div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1 no-scrollbar">{students.length ? students.map((s) => <Row key={s.id} p={s} type="STUDENT" />) : <EmptyState title="No students" />}</div></div>
      </div>
      {enrolling && <EnrollDialog subject={enrolling} onClose={() => setEnrolling(null)} onDone={() => qc.invalidateQueries({ queryKey: ['face'] })} />}
    </div>
  );
}


// ─────────────────────────── INSIGHTS ───────────────────────────
export function Insights() {
  const status = useQuery({ queryKey: ['face', 'status'], queryFn: async () => (await api.get('/face/status')).data, refetchInterval: 5000 });
  const unknown = useQuery({ queryKey: ['face', 'unknown'], queryFn: async () => (await api.get('/face/unknown')).data.events as any[] });
  if (status.isLoading) return <LoadingScreen />;
  const s = status.data;
  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} label="Enrollment coverage" value={`${s.coverage}%`} sub={`${s.enrolledStudents}/${s.totalStudents} students`} icon={<Users className="h-4 w-4" />} accent="brand" />
        <StatTile index={1} label="Recognised today" value={s.recognizedToday} sub="via face kiosk" icon={<ScanFace className="h-4 w-4" />} accent="mint" />
        <StatTile index={2} label="Unknown faces" value={s.unknownToday} sub="today" icon={<AlertTriangle className="h-4 w-4" />} accent="amber" />
        <StatTile index={3} label="Proxy attempts" value={s.proxyToday} sub="blocked today" icon={<ShieldAlert className="h-4 w-4" />} accent="rose" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-bold text-slate-900">Enrollment coverage</h3>
          <div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-500">Students with a face profile</span><span className="font-bold text-slate-900">{s.coverage}%</span></div>
          <Meter value={s.coverage} tone={s.coverage >= 80 ? 'mint' : s.coverage >= 40 ? 'brand' : 'amber'} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border border-line bg-ink-800/60 p-3"><div className="tnum text-2xl font-extrabold text-slate-900">{s.embeddings}</div><div className="label">Total embeddings</div></div>
            <div className="rounded-xl border border-line bg-ink-800/60 p-3"><div className="tnum text-2xl font-extrabold text-slate-900">{s.enrolledTeachers}/{s.totalTeachers}</div><div className="label">Staff enrolled</div></div>
          </div>
          <p className="mt-3 text-[0.7rem] text-slate-500">Model: {s.model}</p>
        </Card>
        <Card className="!p-0">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4"><ShieldAlert className="h-4 w-4 text-rose-400" /><h3 className="font-bold text-slate-900">Unknown / proxy log</h3></div>
          <div className="max-h-72 space-y-2 overflow-y-auto p-3 no-scrollbar">
            {unknown.data?.length ? unknown.data.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-line bg-ink-800/60 p-3">
                <span className={cn('grid h-8 w-8 place-items-center rounded-lg', e.kind === 'PROXY' ? 'bg-rose-400/10 text-rose-400' : 'bg-amber-400/10 text-amber-400')}>{e.kind === 'PROXY' ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}</span>
                <div className="flex-1"><div className="text-sm font-semibold text-slate-900">{e.kind === 'PROXY' ? 'Proxy blocked' : 'Unknown face'}</div><div className="text-xs text-slate-500">{timeAgo(e.createdAt)}{e.note ? ` · ${e.note}` : ''}</div></div>
              </div>
            )) : <div className="py-10 text-center text-sm text-slate-500">No unknown or proxy events. Clean feed. ✓</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
