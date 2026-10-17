import { Server as IOServer, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { env } from '../config/env.js';
import { liveSession } from './live-session.js';
import { STAFF_ADMIN } from '../utils/constants.js';

let io: IOServer | null = null;

async function validate(socket: Socket) {
  const session = await liveSession(socket.data.token);
  if (session.mustChangePassword) throw new Error('Password change required');
  socket.data.user = session.user;
  return session.user;
}

export function initSocket(httpServer: HttpServer): IOServer {
  // Next.js normalizes the proxy URL to /socket.io without a final slash.
  // Accept both forms so browser polling works through the same-origin rewrite.
  const server = new IOServer(httpServer, { addTrailingSlash: false, cors: { origin: env.clientOrigin, credentials: true } });
  io = server;
  server.use((socket, next) => {
    socket.data.token = socket.handshake.auth?.token ?? socket.handshake.headers.authorization?.replace(/^Bearer /, '');
    void validate(socket).then(() => next()).catch(() => next(new Error('Unauthorized: invalid or revoked session')));
  });
  server.on('connection', socket => {
    socket.join(`school:${socket.data.user.schoolId}`);
    socket.join(`user:${socket.data.user.sub}`);
    socket.use((_packet, next) => { void validate(socket).then(() => next()).catch(() => socket.disconnect(true)); });
  });
  // Covers changes made outside account-management routes as well as token expiry.
  const timer = setInterval(() => {
    for (const socket of server.sockets.sockets.values()) void validate(socket).catch(() => socket.disconnect(true));
  }, 15_000);
  timer.unref();
  server.on('close', () => clearInterval(timer));
  httpServer.on('close', () => clearInterval(timer));
  return server;
}

export function revokeSockets(userId: string): void { io?.in(`user:${userId}`).disconnectSockets(true); }

/** Revalidate before delivery. Private audit content is never a school broadcast. */
export function emitToSchool(schoolId: string, event: string, payload: unknown): void {
  if (!io) return;
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.user?.schoolId !== schoolId) continue;
    void validate(socket).then(user => {
      if (user.schoolId !== schoolId) return;
      const admin = (STAFF_ADMIN as readonly string[]).includes(user.role);
      if (event === 'event:new') { socket.emit(event, {}); return; } // cache invalidation only
      if (event === 'ai:log' || event.startsWith('lumen:') || event === 'timetable:draft') {
        if (admin) socket.emit(event, payload);
        return;
      }
      if (event.startsWith('attendance:')) { socket.emit(event, admin ? payload : {}); return; }
      if (event === 'kairos:cascade' && !admin && user.role !== 'TEACHER') return;
      socket.emit(event, payload);
    }).catch(() => socket.disconnect(true));
  }
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return;
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.user?.sub !== userId) continue;
    void validate(socket).then(() => socket.emit(event, payload)).catch(() => socket.disconnect(true));
  }
}
export function getIO(): IOServer | null { return io; }
