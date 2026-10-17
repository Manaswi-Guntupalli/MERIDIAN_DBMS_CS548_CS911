import { prisma } from './prisma.js';
import { verifyToken } from './auth.js';
import { unauthorized } from './errors.js';

/** Shared by HTTP and realtime: signed claims alone do not establish a live session. */
export async function liveSession(token: string) {
  let claims;
  try { claims = verifyToken(token); } catch { throw unauthorized('Invalid or expired token'); }
  const user = await prisma.user.findUnique({ where: { id: claims.sub },
    select: { active: true, tokenVersion: true, schoolId: true, role: true, name: true, mustChangePassword: true } });
  if (!user?.active || user.schoolId !== claims.schoolId || user.tokenVersion !== (claims.tv ?? 0)) {
    throw unauthorized('Your session was signed out. Please log in again.');
  }
  return { user: { ...claims, schoolId: user.schoolId, role: user.role, name: user.name }, mustChangePassword: user.mustChangePassword };
}
