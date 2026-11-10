import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { authHeader, createFixture, enrollTestFace, unitVector } from './helpers.js';
import { closeSession, expireIfDue, startSession } from '../src/services/presence/session.js';
import { markManual, markQr, markFace } from '../src/services/presence/engine.js';
import { buildSessionSummary } from '../src/services/presence/report.js';

const app = createApp();
const open = async (fx: Awaited<ReturnType<typeof createFixture>>) => {
  await enrollTestFace(fx.school.id,'STUDENT',fx.student.id,fx.student.name,unitVector(100));
  return startSession({
  schoolId: fx.school.id, classId: fx.class.id, teacherId: fx.teacher.teacher.id,
  createdBy: fx.teacher.user.id, verificationMode: 'QR_FACE',
}); };

describe('Projected QR attendance: authenticated student to live teacher register', () => {
  it('QR first stays pending; only the same student face completes attendance and the dual-factor report', async () => {
    const fx = await createFixture();
    const started = await request(app).post('/api/presence/session/start').set(authHeader(fx.teacher.token))
      .send({ classId: fx.class.id, verificationMode: 'QR_FACE' });
    expect(started.status).toBe(201);
    expect(started.body.verificationMode).toBe('QR_FACE');
    const scan = await request(app).post(`/api/presence/session/${started.body.id}/qr`).set(authHeader(fx.student.userToken))
      .send({ token: started.body.qr.token, studentId: fx.studentInOtherClass.id });
    expect(scan.status).toBe(200);
    expect(scan.body.state).toBe('QR_VERIFIED');
    expect(scan.body.studentId).toBe(fx.student.id);
    expect(await prisma.attendance.count({where:{studentId:fx.student.id}})).toBe(0);
    await enrollTestFace(fx.school.id,'STUDENT',fx.student.id,fx.student.name,unitVector(100));
    expect((await markFace({schoolId:fx.school.id,sessionId:started.body.id,embedding:unitVector(100),actorId:fx.teacher.user.id})).state).toBe('PRESENT');
    const live = await request(app).get(`/api/presence/session/${started.body.id}`).set(authHeader(fx.teacher.token));
    expect(live.body.counts.present).toBe(1);
    expect(live.body.students[0].state).toBe('PRESENT');
    const verification = await prisma.attendanceVerification.findUniqueOrThrow({where:{sessionId_studentId:{sessionId:started.body.id,studentId:fx.student.id}}});
    expect(verification.qrVerifiedAt).toBeInstanceOf(Date);
    expect(verification.faceVerifiedAt).toBeInstanceOf(Date);
    expect(verification.faceConfidence).toBeGreaterThan(0.99);
    const daily = await prisma.attendance.findFirstOrThrow({where:{studentId:fx.student.id}});
    expect(['PRESENT','LATE']).toContain(daily.status);
    expect(daily.source).toBe('FACE');
    expect(await prisma.attendance.count({where:{studentId:fx.studentInOtherClass.id}})).toBe(0);
    await closeSession(fx.school.id,started.body.id,{id:fx.teacher.user.id});
    const summary = await buildSessionSummary(fx.school.id,started.body.id);
    expect(summary.counts.present).toBe(1);
    expect(summary.methods.qrOnly).toBe(0);
    expect(summary.methods.qrAndFace).toBe(1);
    expect(summary.methods.manual).toBe(0);
    expect(summary.students[0].method).toBe('QR + Face');
    for (const extension of ['pdf','xlsx']) {
      const report = await request(app).get(`/api/presence/session/${started.body.id}/report.${extension}`).set(authHeader(fx.teacher.token));
      expect(report.status).toBe(200);
      expect(report.headers['content-type']).toContain(extension==='pdf'?'application/pdf':'spreadsheetml');
    }
  });

  it('simultaneous/repeated scans create exactly one attendance event, audit event and parent notification', async () => {
    const fx = await createFixture(); const session = await open(fx);
    expect((await markFace({schoolId:fx.school.id,sessionId:session.id,embedding:unitVector(100),actorId:fx.teacher.user.id})).state).toBe('FACE_VERIFIED');
    expect(await prisma.attendance.count({where:{studentId:fx.student.id}})).toBe(0);
    const input={schoolId:fx.school.id,sessionId:session.id,studentId:fx.student.id,token:session.sessionToken,actorId:fx.student.userId!};
    const results=await Promise.all(Array.from({length:6},()=>markQr(input)));
    expect(results.every(r=>r.state==='PRESENT')).toBe(true);
    expect(results.filter(r=>r.eventId)).toHaveLength(1);
    expect(await prisma.attendanceEvent.count({where:{sessionId:session.id}})).toBe(1);
    expect(await prisma.attendance.count({where:{studentId:fx.student.id}})).toBe(1);
    expect(await prisma.event.count({where:{schoolId:fx.school.id,type:'ATTENDANCE_MARKED'}})).toBe(1);
    expect(await prisma.notification.count({where:{userId:fx.parent.user.id,category:'ATTENDANCE'}})).toBe(1);
  });

  it('a manual session correction cannot bypass a missing face', async () => {
    const fx = await createFixture(); const session = await open(fx);
    const input={schoolId:fx.school.id,sessionId:session.id,studentId:fx.student.id};
    const results=await Promise.allSettled([
      markQr({...input,token:session.sessionToken,actorId:fx.student.userId!}),
      markManual({...input,actorId:fx.teacher.user.id}),
    ]);
    expect(results[0]).toMatchObject({status:'fulfilled',value:{state:'QR_VERIFIED'}});
    expect(results[1].status).toBe('rejected');
    expect(await prisma.attendanceEvent.count({where:{sessionId:session.id}})).toBe(0);
  });

  it('rejects invalid tokens, wrong classes/schools and parent scans without writing attendance', async () => {
    const fx=await createFixture();const other=await createFixture();const session=await open(fx);
    const bad=await request(app).post(`/api/presence/session/${session.id}/qr`).set(authHeader(fx.student.userToken)).send({token:'forged'});
    expect(bad.status).toBe(400);
    const another=await startSession({schoolId:fx.school.id,classId:fx.otherClass.id,teacherId:fx.otherTeacher.teacher.id});
    const wrongClass=await request(app).post(`/api/presence/session/${another.id}/qr`).set(authHeader(fx.student.userToken)).send({token:another.sessionToken});
    expect(wrongClass.status).toBe(403);
    expect((await request(app).post(`/api/presence/session/${session.id}/qr`).set(authHeader(other.student.userToken)).send({token:session.sessionToken})).status).toBe(404);
    expect((await request(app).post(`/api/presence/session/${session.id}/qr`).set(authHeader(fx.parent.token)).send({token:session.sessionToken})).status).toBe(403);
    expect(await prisma.attendanceEvent.count({where:{schoolId:fx.school.id}})).toBe(0);
  });

  it('rejects expired and closed QR codes; students who never scan remain absent', async () => {
    const fx=await createFixture();const session=await open(fx);
    await prisma.attendanceSession.update({where:{id:session.id},data:{expiryTime:new Date(Date.now()-1000)}});
    expect(await expireIfDue(session.id)).toBe('EXPIRED');
    const expired=await request(app).post(`/api/presence/session/${session.id}/qr`).set(authHeader(fx.student.userToken)).send({token:session.sessionToken});
    expect(expired.status).toBe(400);
    expect((await buildSessionSummary(fx.school.id,session.id)).counts).toMatchObject({present:0,absent:1,unverifiedQr:0});
    const next=await open(fx);await closeSession(fx.school.id,next.id,{id:fx.teacher.user.id});
    expect((await request(app).post(`/api/presence/session/${next.id}/qr`).set(authHeader(fx.student.userToken)).send({token:next.sessionToken})).status).toBe(400);
    expect(await prisma.attendance.count({where:{studentId:fx.student.id}})).toBe(0);
  });

  it('cannot downgrade the policy through API input or teacher/student permissions', async () => {
    const fx=await createFixture();
    expect((await request(app).post('/api/presence/session/start').set(authHeader(fx.student.userToken)).send({classId:fx.class.id,verificationMode:'QR_ONLY'})).status).toBe(403);
    expect((await request(app).post('/api/presence/session/start').set(authHeader(fx.otherTeacher.token)).send({classId:fx.class.id})).status).toBe(403);
    for(const mode of ['QR_ONLY','FACE_REQUIRED']) expect((await request(app).post('/api/presence/session/start').set(authHeader(fx.teacher.token)).send({classId:fx.class.id,verificationMode:mode})).status).toBe(400);
    const session=await startSession({schoolId:fx.school.id,classId:fx.class.id,teacherId:fx.teacher.teacher.id});
    const scan=await request(app).post(`/api/presence/session/${session.id}/qr`).set(authHeader(fx.student.userToken)).send({token:session.sessionToken,verificationMode:'QR_ONLY'});
    expect(scan.body.state).toBe('QR_VERIFIED');
    expect(await prisma.attendance.count({where:{studentId:fx.student.id}})).toBe(0);
  });
});
