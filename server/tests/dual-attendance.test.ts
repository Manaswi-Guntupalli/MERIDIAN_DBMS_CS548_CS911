import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma.js';
import { createApp } from '../src/app.js';
import { authHeader, createFixture, enrollTestFace, unitVector } from './helpers.js';
import { startSession, closeSession, expireIfDue } from '../src/services/presence/session.js';
import { markFace, markQr, markManual } from '../src/services/presence/engine.js';
import { buildSessionSummary } from '../src/services/presence/report.js';
const app=createApp();
async function setup(){
  const f=await createFixture(); const vector=unitVector(11);
  await enrollTestFace(f.school.id,'STUDENT',f.student.id,f.student.name,vector);
  const session=await startSession({schoolId:f.school.id,classId:f.class.id,teacherId:f.teacher.teacher.id});
  const input={schoolId:f.school.id,sessionId:session.id,studentId:f.student.id};
  return {f,session,input,vector};
}
describe('Mandatory dual verification in either order',()=>{
  it('legacy single and bulk manual APIs cannot manufacture Present or Late',async()=>{
    const {f}=await setup();
    for(const status of ['PRESENT','LATE']) {
      const one=await request(app).post('/api/attendance/mark').set(authHeader(f.teacher.token)).send({studentId:f.student.id,classId:f.class.id,status});
      const bulk=await request(app).post('/api/attendance/bulk').set(authHeader(f.teacher.token)).send({classId:f.class.id,status});
      expect(one.status).toBe(400);expect(bulk.status).toBe(400);
    }
    expect(await prisma.attendance.count({where:{studentId:f.student.id}})).toBe(0);
    expect((await request(app).post('/api/attendance/mark').set(authHeader(f.teacher.token)).send({studentId:f.student.id,classId:f.class.id,status:'LEAVE'})).status).toBe(200);
    expect((await prisma.attendance.findFirstOrThrow({where:{studentId:f.student.id}})).status).toBe('LEAVE');
  });
  it('face alone is pending, counts as pending, and becomes absent on expiry',async()=>{
    const {f,session,input,vector}=await setup();
    expect((await markFace({...input,embedding:vector,actorId:f.teacher.user.id})).state).toBe('FACE_VERIFIED');
    expect(await prisma.attendance.count({where:{studentId:f.student.id}})).toBe(0);
    const live=await request(app).get('/api/presence/session/'+session.id).set(authHeader(f.teacher.token));
    expect(live.body.counts).toMatchObject({present:0,pending:1});
    expect((await buildSessionSummary(f.school.id,session.id)).counts.present).toBe(0);
    await prisma.attendanceSession.update({where:{id:session.id},data:{expiryTime:new Date(Date.now()-1)}});
    await expireIfDue(session.id);
    expect((await prisma.attendanceVerification.findFirstOrThrow({where:{sessionId:session.id}})).state).toBe('ABSENT');
  });
  it('another student face cannot complete the QR claimant, even if both factors exist in the class',async()=>{
    const f=await createFixture();const a=unitVector(11),b=unitVector(29);
    const other=await prisma.student.create({data:{schoolId:f.school.id,admissionNo:'B-'+f.suffix,rollNo:2,name:'Other student',classId:f.class.id}});
    await enrollTestFace(f.school.id,'STUDENT',f.student.id,f.student.name,a);
    await enrollTestFace(f.school.id,'STUDENT',other.id,other.name,b);
    const s=await startSession({schoolId:f.school.id,classId:f.class.id,teacherId:f.teacher.teacher.id});
    expect((await markQr({schoolId:f.school.id,sessionId:s.id,studentId:f.student.id,token:s.sessionToken,actorId:f.student.userId!})).state).toBe('QR_VERIFIED');
    const face=await markFace({schoolId:f.school.id,sessionId:s.id,embedding:b,actorId:f.teacher.user.id});
    expect(face).toMatchObject({state:'FACE_VERIFIED',studentId:other.id});
    expect(await prisma.attendanceEvent.count({where:{sessionId:s.id}})).toBe(0);
    expect((await prisma.attendanceVerification.findUniqueOrThrow({where:{sessionId_studentId:{sessionId:s.id,studentId:f.student.id}}})).faceVerifiedAt).toBeNull();
    expect((await markFace({schoolId:f.school.id,sessionId:s.id,embedding:a,actorId:f.teacher.user.id})).state).toBe('PRESENT');
    expect(await prisma.attendanceEvent.count({where:{sessionId:s.id,studentId:other.id}})).toBe(0);
  });
  it('a mismatched face is blocked and cannot be reset by a rescan, correct face or manual bypass',async()=>{
    const {f,session,input,vector}=await setup();
    const wrong=await markQr({...input,token:session.sessionToken,embedding:unitVector(99),actorId:f.student.userId!});
    expect(wrong.state).toBe('PROXY_ATTEMPT');
    expect((await markQr({...input,token:session.sessionToken,actorId:f.student.userId!})).state).toBe('PROXY_ATTEMPT');
    expect((await markFace({...input,embedding:vector,actorId:f.teacher.user.id})).state).toBe('PROXY_ATTEMPT');
    await expect(markManual({...input,actorId:f.teacher.user.id})).rejects.toThrow(/both.*QR.*face/i);
    expect(await prisma.attendance.count({where:{studentId:f.student.id}})).toBe(0);
    expect(await prisma.faceEvent.count({where:{schoolId:f.school.id,kind:'PROXY'}})).toBe(1);
  });
  it('proofs from an old session cannot be reused in a new session',async()=>{
    const {f,session,input,vector}=await setup();
    await markFace({...input,embedding:vector});
    await closeSession(f.school.id,session.id,{id:f.teacher.user.id});
    const next=await startSession({schoolId:f.school.id,classId:f.class.id,teacherId:f.teacher.teacher.id});
    expect((await markQr({...input,sessionId:next.id,token:next.sessionToken,actorId:f.student.userId!})).state).toBe('QR_VERIFIED');
    expect(await prisma.attendance.count({where:{studentId:f.student.id}})).toBe(0);
  });
  it('racing QR and face requests produce one attendance event and one parent notification',async()=>{
    const {f,session,input,vector}=await setup();
    const results=await Promise.all([
      markQr({...input,token:session.sessionToken,actorId:f.student.userId!}),
      markFace({...input,embedding:vector,actorId:f.teacher.user.id}),
      markQr({...input,token:session.sessionToken,actorId:f.student.userId!}),
      markFace({...input,embedding:vector,actorId:f.teacher.user.id}),
    ]);
    expect(results.some(r=>r.state==='PRESENT')).toBe(true);
    expect(await prisma.attendanceEvent.count({where:{sessionId:session.id}})).toBe(1);
    expect(await prisma.notification.count({where:{userId:f.parent.user.id,category:'ATTENDANCE'}})).toBe(1);
  });
  it('the student status endpoint returns only their proof state and follows the second factor',async()=>{
    const {f,session,input,vector}=await setup();
    await markQr({...input,token:session.sessionToken,actorId:f.student.userId!});
    const mine=()=>request(app).get(`/api/presence/session/${session.id}/mine`).set(authHeader(f.student.userToken));
    const pending=await mine();expect(pending.status).toBe(200);expect(pending.body.state).toBe('QR_VERIFIED');
    for(const key of ['qr','token','students','counts'])expect(pending.body[key]).toBeUndefined();
    expect(pending.headers['cache-control']).toContain('no-store');
    expect((await request(app).get(`/api/presence/session/${session.id}/mine`).set(authHeader(f.parent.token))).status).toBe(403);
    const foreign=await createFixture();
    expect((await request(app).get(`/api/presence/session/${session.id}/mine`).set(authHeader(foreign.student.userToken))).status).toBe(404);
    await markFace({...input,embedding:vector,actorId:f.teacher.user.id});
    expect((await mine()).body).toMatchObject({state:'PRESENT',studentId:f.student.id});
    await closeSession(f.school.id,session.id,{id:f.teacher.user.id});
    expect((await mine()).body.state).toBe('PRESENT');
  });
  it('PostgreSQL rejects a fabricated Present with neither factor and rejects an active QR-only session',async()=>{
    const {f,session}=await setup();
    const v=await prisma.attendanceVerification.findFirstOrThrow({where:{sessionId:session.id}});
    await expect(prisma.attendanceVerification.update({where:{id:v.id},data:{state:'PRESENT',markedPresentAt:new Date()}})).rejects.toThrow(/present_requires_both/);
    await expect(prisma.attendanceSession.update({where:{id:session.id},data:{verificationMode:'QR_ONLY'}})).rejects.toThrow(/active_requires_dual/);
    expect(await prisma.attendance.count({where:{studentId:f.student.id}})).toBe(0);
  });
});
