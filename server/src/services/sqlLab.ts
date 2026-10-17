import { fork, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AppError, badRequest } from '../lib/errors.js';

interface Session {
  child: ChildProcess;
  ready: Promise<any>;
  busy: boolean;
  touched: number;
}
const sessions = new Map<string, Session>();
const TTL = 15 * 60_000;
const MAX_SESSIONS = 4;
const sourcePath = fileURLToPath(new URL('../../sql-lab/worker.mjs', import.meta.url));
const workerPath = existsSync(sourcePath) ? sourcePath : fileURLToPath(new URL('../../../sql-lab/worker.mjs', import.meta.url));

function discard(key: string) {
  const session = sessions.get(key);
  if (session) { sessions.delete(key); session.child.kill(); }
}
const cleanup = setInterval(() => {
  for (const [key, session] of sessions) if (!session.busy && Date.now() - session.touched > TTL) discard(key);
}, 60_000);
cleanup.unref();

function createSession(key: string): Session {
  for (const [id, session] of sessions) if (!session.busy && Date.now() - session.touched > TTL) discard(id);
  if (sessions.size >= MAX_SESSIONS) throw new AppError(503, 'All SQL playgrounds are in use. Please try again after an idle session expires.');
  const child = fork(workerPath, [], {
    execArgv: ['--max-old-space-size=256'],
    // SQL receives no website secrets or database URL. PostgreSQL uses an in-memory VFS.
    env: { NODE_ENV: 'production', SystemRoot: process.env.SystemRoot, PATH: process.env.PATH },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  const ready = new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => { discard(key); reject(new AppError(503, 'Playground initialization timed out. Please retry.')); }, 40_000);
    const onMessage = (message: any) => {
      if (!message.ready) return;
      clearTimeout(timeout); child.off('message', onMessage); resolve(message);
    };
    child.on('message', onMessage);
    child.once('error', () => { clearTimeout(timeout); discard(key); reject(new AppError(503, 'Could not start the PostgreSQL playground.')); });
    child.once('exit', () => { clearTimeout(timeout); if (sessions.get(key)?.child === child) sessions.delete(key); reject(new AppError(503, 'Playground stopped. Run again to start a fresh demo.')); });
  });
  const session = { child, ready, busy: false, touched: Date.now() };
  sessions.set(key, session);
  return session;
}

export async function sqlLab(key: string, action: 'schema' | 'execute' | 'reset', sql?: unknown) {
  if (action === 'execute' && (typeof sql !== 'string' || !sql.trim() || sql.length > 20_000)) {
    throw badRequest('Enter SQL between 1 and 20,000 characters.');
  }
  const previous = sessions.get(key);
  if (previous?.busy) throw new AppError(409, 'A query is already running in your playground.');
  if (action === 'reset') discard(key);
  const session = sessions.get(key) ?? createSession(key);
  session.busy = true;
  session.touched = Date.now();
  try {
    const ready = await session.ready;
    if (action === 'reset') return { schema: ready.schema, reset: true };
    return await new Promise<any>((resolve, reject) => {
      const finish = () => { clearTimeout(timer); session.child.off('message', onMessage); session.child.off('exit', onExit); };
      const onExit = () => { finish(); reject(new AppError(503, 'Playground stopped. Run again to start a fresh demo.')); };
      const onMessage = (message: any) => {
        finish();
        if (message.ok) resolve(message);
        else reject(new AppError(400, message.error || 'SQL execution failed.', { code: message.code, position: message.position, hint: message.hint, detail: message.detail }));
      };
      const timer = setTimeout(() => {
        finish(); discard(key);
        reject(new AppError(408, 'Query exceeded the 8-second limit. This playground has been reset; run again to start fresh.'));
      }, 8_000);
      session.child.once('message', onMessage);
      session.child.once('exit', onExit);
      session.child.send({ type: action, sql }, error => { if (error) onExit(); });
    });
  } finally { session.busy = false; session.touched = Date.now(); }
}

export function closeSqlLabs() { for (const key of sessions.keys()) discard(key); }
