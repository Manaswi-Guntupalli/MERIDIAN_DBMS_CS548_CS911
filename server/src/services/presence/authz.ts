import { prisma } from '../../lib/prisma.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { STAFF } from '../../utils/constants.js';

// "Teacher: Manual Corrections (only own class)" — Principal/Admin bypass
// this entirely (checked by the caller before reaching here); a TEACHER may
// only correct attendance for the class where they are the class teacher.
export async function assertOwnClass(user: { sub: string; role: string }, classTeacherId: string | null | undefined) {
  if (user.role !== 'TEACHER') return;
  const teacher = await prisma.teacher.findUnique({ where: { userId: user.sub } });
  if (!teacher || classTeacherId !== teacher.id) {
    throw forbidden('Teachers may only correct attendance for their own class');
  }
}

/** Also used at the service boundary so alternate callers cannot bypass route guards. */
export async function assertSessionActor(schoolId: string, sessionId: string, actorId?: string, action = 'MARK', studentId?: string) {
  const session = await prisma.attendanceSession.findFirst({where:{id:sessionId,schoolId},include:{class:true}});
  if (!session) throw notFound('Attendance session not found');
  // Internal scheduled operations have no human actor. HTTP callers always supply one.
  if (!actorId) return session;
  const user = await prisma.user.findFirst({where:{id:actorId,schoolId,active:true}});
  if (!user) throw forbidden('Invalid session actor');
  if (action === 'QR' && user.role === 'STUDENT') {
    const own = await prisma.student.findFirst({where:{id:studentId,userId:actorId,schoolId,active:true}});
    if (own?.classId === session.classId) return session;
  }
  if (!(STAFF as readonly string[]).includes(user.role)) throw forbidden('Only staff or the student scanning their own QR may mark attendance');
  await assertOwnClass({sub:actorId,role:user.role},session.class.classTeacherId);
  return session;
}
