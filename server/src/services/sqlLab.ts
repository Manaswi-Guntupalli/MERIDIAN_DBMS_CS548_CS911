import { fork, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AppError, badRequest } from '../lib/errors.js';
import { createNativePlayground } from './nativeSqlLab.js';

interface Session {
  child?: ChildProcess;
  native?: Awaited<ReturnType<typeof createNativePlayground>>;
  disposed: boolean;
  closing?: Promise<void>;
  ready: Promise<any>;
  busy: boolean;
  touched: number;
}
const sessions = new Map<string, Session>();
const TTL = 15 * 60_000;
const MAX_SESSIONS = 4;
const sourcePath = fileURLToPath(new URL('../../sql-lab/worker.mjs', import.meta.url));
const workerPath = existsSync(sourcePath) ? sourcePath : fileURLToPath(new URL('../../../sql-lab/worker.mjs', import.meta.url));

async function discard(key: string) {
  const session = sessions.get(key);
  if (session) {
    sessions.delete(key); session.disposed = true; session.child?.kill();
    session.closing ??= (async () => {
      await session.ready.catch(() => {});
      await session.native?.dispose();
    })();
    await session.closing;
  }
}
const cleanup = setInterval(() => {
  for (const [key, session] of sessions) if (!session.busy && Date.now() - session.touched > TTL) void discard(key).catch(() => console.error('SQL Lab cleanup failed'));
}, 60_000);
cleanup.unref();

function createSession(key: string): Session {
  if (sessions.size >= MAX_SESSIONS) throw new AppError(503, 'All SQL playgrounds are in use. Please try again after an idle session expires.');
  const session: Session = { ready: Promise.resolve(), disposed: false, busy: false, touched: Date.now() };
  sessions.set(key, session);
  session.ready = (async () => {
    session.native = await createNativePlayground();
    if (session.disposed) throw new AppError(503, 'Playground closed during startup. Please retry.');
    const child = fork(workerPath, [], {
      execArgv: ['--max-old-space-size=256'],
      // Worker receives only its restricted, disposable database credentials.
      env: { NODE_ENV: 'production', SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, SQL_LAB_DATABASE_URL: session.native.url },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    session.child = child;
    return await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => { child.kill(); reject(new AppError(503, 'Playground initialization timed out. Please retry.')); }, 40_000);
      const onMessage = (message: any) => {
        if (!message.ready) return;
        clearTimeout(timeout); child.off('message', onMessage); resolve(message);
      };
      child.on('message', onMessage);
      child.once('error', () => { clearTimeout(timeout); reject(new AppError(503, 'Could not start the PostgreSQL playground.')); });
      child.once('exit', () => { clearTimeout(timeout); reject(new AppError(503, 'Playground stopped. Run again to start a fresh demo.')); if (!session.disposed) void discard(key).catch(() => console.error('SQL Lab cleanup failed')); });
    });
  })();
  return session;
}

export async function sqlLab(key: string, action: 'schema' | 'execute' | 'reset', sql?: unknown) {
  if (action === 'execute' && (typeof sql !== 'string' || !sql.trim() || sql.length > 20_000)) {
    throw badRequest('Enter SQL between 1 and 20,000 characters.');
  }
  const previous = sessions.get(key);
  if (previous?.busy) throw new AppError(409, 'A query is already running in your playground.');
  if (action === 'reset') await discard(key);
  const session = sessions.get(key) ?? createSession(key);
  session.busy = true;
  session.touched = Date.now();
  let initialized = false;
  try {
    const ready = await session.ready;
    initialized = true;
    const child = session.child!;
    if (action === 'reset') return { schema: ready.schema, reset: true };
    return await new Promise<any>((resolve, reject) => {
      const finish = () => { clearTimeout(timer); child.off('message', onMessage); child.off('exit', onExit); };
      const onExit = () => { finish(); reject(new AppError(503, 'Playground stopped. Run again to start a fresh demo.')); };
      const onMessage = (message: any) => {
        finish();
        if (message.ok) resolve(message);
        else reject(new AppError(400, message.error || 'SQL execution failed.', { code: message.code, position: message.position, hint: message.hint, detail: message.detail }));
      };
      const timer = setTimeout(() => {
        finish();
        void discard(key).then(() => reject(new AppError(408, 'Query exceeded the 8-second limit. This playground has been reset; run again to start fresh.')), () => reject(new AppError(503, 'Playground cleanup failed. Please retry.')));
      }, 8_000);
      child.once('message', onMessage);
      child.once('exit', onExit);
      child.send({ type: action, sql }, error => { if (error) onExit(); });
    });
  } catch (error) {
    if (!initialized) await discard(key);
    throw error;
  } finally { session.busy = false; session.touched = Date.now(); }
}

export async function closeSqlLabs() { await Promise.all([...sessions.keys()].map(discard)); }
