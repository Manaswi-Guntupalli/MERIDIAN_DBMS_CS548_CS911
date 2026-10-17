import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createServer } from 'node:http';
import { io as connect, type Socket } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { createFixture, authHeader, type Fixture } from './helpers.js';
import { initSocket, emitToSchool } from '../src/lib/socket.js';
import { startSession } from '../src/services/presence/session.js';
import { markManual } from '../src/services/presence/engine.js';
import { undoEvent } from '../src/services/eventStore.js';
import { signToken } from '../src/lib/auth.js';
import { saveKnowledge, knowledgeContext } from '../src/services/knowledge.js';

const app = createApp();
let a: Fixture, b: Fixture;
beforeAll(async()=>{ a=await createFixture(); b=await createFixture(); });
const forbiddenFields = new Set(['password','tokenVersion','failedLogins','lastLoginIp','lockedUntil','mustChangePassword']);
function assertSafe(value: any) {
  if (!value || typeof value !== 'object') return;
  for (const [key,v] of Object.entries(value)) { expect(forbiddenFields.has(key),key).toBe(false); assertSafe(v); }
}
const start = (f:Fixture, other=false) => startSession({schoolId:f.school.id,classId:other?f.otherClass.id:f.class.id,teacherId:other?f.otherTeacher.teacher.id:f.teacher.teacher.id});

describe('Audit fixes: privacy and authorization',()=>{
  it('real login succeeds, invalid credentials stay 401, and /me verifies the returned token',async()=>{
    const login=await request(app).post('/api/auth/login').send({email:a.admin.user.email,password:'password123'});
    expect(login.status).toBe(200);expect(login.body.token).toBeTruthy();expect(login.body.user.password).toBeUndefined();
    expect((await request(app).get('/api/auth/me').set(authHeader(login.body.token))).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({email:a.admin.user.email,password:'wrong-password'})).status).toBe(401);
  });
  it('F01 student and class details recursively exclude account security fields',async()=>{
    for (const path of [`/api/students/${a.student.id}`,`/api/classes/${a.class.id}`]) {
      const res=await request(app).get(path).set(authHeader(a.teacher.token));
      expect(res.status).toBe(200); assertSafe(res.body);
    }
  });
  it('F04 parent sees no unrelated class session, and only their child in a shared class',async()=>{
    const f=await createFixture(); await start(f,true);
    expect((await request(app).get('/api/presence/session/active').set(authHeader(f.parent.token))).body.session).toBeNull();
    await prisma.student.create({data:{schoolId:f.school.id,admissionNo:'sibling-peer-'+f.suffix,rollNo:2,name:'Unrelated child',classId:f.class.id}});
    await start(f);
    const res=await request(app).get('/api/presence/session/active?classId='+f.class.id).set(authHeader(f.parent.token));
    expect(res.status).toBe(200); expect(res.body.session.qr).toBeNull();
    expect(res.body.session.students.map((s:any)=>s.studentId)).toEqual([f.student.id]);
    expect(res.body.session.counts.total).toBe(1);
  });
  it('F05 wrong-class teacher cannot mark, close, read or export a session; owner can mark',async()=>{
    const f=await createFixture(); const session=await start(f,true);
    for (const path of ['', '/summary','/report.pdf','/report.xlsx']) {
      expect((await request(app).get('/api/presence/session/'+session.id+path).set(authHeader(f.teacher.token))).status).toBe(403);
    }
    expect((await request(app).post(`/api/presence/session/${session.id}/manual`).set(authHeader(f.teacher.token)).send({studentId:f.studentInOtherClass.id})).status).toBe(403);
    expect((await request(app).post(`/api/presence/session/${session.id}/close`).set(authHeader(f.teacher.token))).status).toBe(403);
    expect((await request(app).post(`/api/presence/session/${session.id}/manual`).set(authHeader(f.otherTeacher.token)).send({studentId:f.studentInOtherClass.id})).status).toBe(200);
  });
  it('F06 every simulator scenario rejects another school before mutation',async()=>{
    const session=await start(b);
    for (const scenario of ['expired','correct-face','qr-only','qr-face','proxy','no-face','camera-offline','close']) {
      expect((await request(app).post('/api/presence/simulate/'+scenario).set(authHeader(a.admin.token)).send({sessionId:session.id})).status).toBe(400);
    }
    const unchanged=await prisma.attendanceSession.findUniqueOrThrow({where:{id:session.id}});
    expect(unchanged.status).toBe('ACTIVE'); expect(unchanged.expiryTime).toEqual(session.expiryTime);
  });
  it('parent cannot submit arbitrary QR claims',async()=>{
    const session=await start(a);
    expect((await request(app).post(`/api/presence/session/${session.id}/qr`).set(authHeader(a.parent.token)).send({token:session.sessionToken,studentId:a.student.id})).status).toBe(403);
  });
});

describe('Audit fixes: data preservation and correctness',()=>{
  it('device registrations are authenticated, owner-scoped, and transfer on shared-device sign-in',async()=>{
    const token='synthetic-device-'+a.suffix+'-long-registration';
    expect((await request(app).post('/api/notifications/device').send({token,platform:'ANDROID'})).status).toBe(401);
    expect((await request(app).post('/api/notifications/device').set(authHeader(a.teacher.token)).send({token,platform:'ANDROID'})).status).toBe(201);
    expect((await request(app).delete('/api/notifications/device').set(authHeader(a.parent.token)).send({token})).status).toBe(200);
    expect((await prisma.pushDevice.findUniqueOrThrow({where:{token}})).userId).toBe(a.teacher.user.id);
    expect((await request(app).post('/api/notifications/device').set(authHeader(b.parent.token)).send({token,platform:'ANDROID'})).status).toBe(201);
    expect((await prisma.pushDevice.findUniqueOrThrow({where:{token}})).schoolId).toBe(b.school.id);
    await request(app).delete('/api/notifications/device').set(authHeader(b.parent.token)).send({token});
    expect(await prisma.pushDevice.count({where:{token}})).toBe(0);
  });
  it('F07 deletion conflicts preserve attendance, guardian links and student',async()=>{
    const f=await createFixture();
    await prisma.attendance.create({data:{schoolId:f.school.id,studentId:f.student.id,classId:f.class.id,date:'2026-10-01',status:'LEAVE'}});
    await prisma.fee.create({data:{schoolId:f.school.id,studentId:f.student.id,title:'History',amount:100,dueDate:'2026-10-01'}});
    expect((await request(app).delete('/api/students/'+f.student.id).set(authHeader(f.admin.token))).status).toBe(409);
    expect(await prisma.attendance.count({where:{studentId:f.student.id}})).toBe(1);
    expect(await prisma.studentParent.count({where:{studentId:f.student.id}})).toBe(1);
    expect(await prisma.student.count({where:{id:f.student.id}})).toBe(1);
    expect((await request(app).patch('/api/students/'+f.student.id).set(authHeader(f.admin.token)).send({active:false})).status).toBe(200);
  });
  it('F08 session undo restores LEAVE, source, confidence and marker',async()=>{
    const f=await createFixture(); const date=new Date().toISOString().slice(0,10);
    await prisma.attendance.create({data:{schoolId:f.school.id,studentId:f.student.id,classId:f.class.id,date,status:'LEAVE',source:'MANUAL',confidence:0.7,markedById:f.admin.user.id}});
    const session=await start(f);
    await markManual({schoolId:f.school.id,sessionId:session.id,studentId:f.student.id,actorId:f.teacher.user.id});
    const event=await prisma.event.findFirstOrThrow({where:{schoolId:f.school.id,type:'ATTENDANCE_MARKED'}});
    await undoEvent(f.school.id,event.id,{id:f.admin.user.id,name:'Admin'});
    expect(await prisma.attendance.findUnique({where:{studentId_date:{studentId:f.student.id,date}}})).toMatchObject({status:'LEAVE',source:'MANUAL',confidence:0.7,markedById:f.admin.user.id});
    expect((await prisma.attendanceVerification.findFirstOrThrow({where:{sessionId:session.id}})).state).toBe('PENDING');
  });
  it('F10 exact decimal payments settle 0.30 with 0.10 + 0.20 and retain numeric HTTP responses',async()=>{
    const f=await createFixture();
    const fee=await prisma.fee.create({data:{schoolId:f.school.id,studentId:f.student.id,title:'Decimal',amount:0.30,dueDate:'2026-10-01'}});
    for (const amount of [0.10,0.20]) {
      const res=await request(app).post('/api/fees/pay').set(authHeader(f.admin.token)).send({feeId:fee.id,amount});
      expect(res.status).toBe(200); expect(typeof res.body.payment.amount).toBe('number');
    }
    const saved=await prisma.fee.findUniqueOrThrow({where:{id:fee.id}});
    expect(saved.paid.toString()).toBe('0.3'); expect(saved.status).toBe('PAID');
    expect((await request(app).post('/api/fees/pay').set(authHeader(f.admin.token)).send({feeId:fee.id,amount:0.001})).status).toBe(400);
  });
  it('F11 OVERDUE filter agrees with live overdue labels',async()=>{
    const f=await createFixture();
    const fee=await prisma.fee.create({data:{schoolId:f.school.id,studentId:f.student.id,title:'Overdue pending',amount:100,dueDate:'2000-01-01'}});
    const res=await request(app).get('/api/fees?status=OVERDUE').set(authHeader(f.admin.token));
    expect(res.status).toBe(200); expect(res.body.fees.map((x:any)=>x.id)).toContain(fee.id);
    expect(res.body.fees.every((x:any)=>x.overdue)).toBe(true);
  });
  it('F12 duplicate admission returns conflict without creating another row',async()=>{
    const res=await request(app).post('/api/students').set(authHeader(a.admin.token)).send({name:'Duplicate',rollNo:3,admissionNo:a.student.admissionNo});
    expect(res.status).toBe(409);
    expect(await prisma.student.count({where:{schoolId:a.school.id,admissionNo:a.student.admissionNo}})).toBe(1);
  });
  it('F14 API rejects invalid dates including impossible calendar days',async()=>{
    for (const date of ['not-a-date','2026-02-30','2026-13-01','0000-01-01']) {
      const res=await request(app).post('/api/attendance/mark').set(authHeader(a.teacher.token)).send({studentId:a.student.id,classId:a.class.id,status:'PRESENT',date});
      expect(res.status).toBe(400);
    }
  });
  it('F16 proxy demonstration needs two different students',async()=>{
    const f=await createFixture(); const session=await start(f);
    const res=await request(app).post('/api/presence/simulate/proxy').set(authHeader(f.admin.token)).send({sessionId:session.id});
    expect(res.status).toBe(400); expect(res.body.error).toMatch(/two distinct/i);
    expect(await prisma.attendance.count({where:{studentId:f.student.id}})).toBe(0);
  });
  it('F15 updating a sourced embedding retains provenance; explicit null removes it',async()=>{
    const actor={sub:a.admin.user.id,schoolId:a.school.id};
    const input={title:'Attendance policy',content:'Students must attend classes regularly and notify staff about leave.',category:'POLICY',sourceId:'source-document-123'};
    const [created]=await saveKnowledge(actor,input);
    const {sourceId,...update}=input;
    await saveKnowledge(actor,{...update,title:'Updated policy'},created.id);
    let rows=await knowledgeContext(actor,tx=>tx.$queryRaw<any[]>`SELECT "sourceId","revision" FROM "KnowledgeItem" WHERE id=${created.id}`);
    expect(rows[0]).toMatchObject({sourceId,revision:2});
    await saveKnowledge(actor,{...update,sourceId:null},created.id);
    rows=await knowledgeContext(actor,tx=>tx.$queryRaw<any[]>`SELECT "sourceId" FROM "KnowledgeItem" WHERE id=${created.id}`);
    expect(rows[0].sourceId).toBeNull();
  });
});

describe('Audit fixes: live sockets',()=>{
  const http=createServer(app); let url:string; const clients:Socket[]=[];
  beforeAll(async()=>{initSocket(http); await new Promise<void>(resolve=>http.listen(0,'127.0.0.1',resolve)); url=`http://127.0.0.1:${(http.address() as any).port}`;});
  afterAll(async()=>{ clients.forEach(s=>s.disconnect()); await new Promise<void>(resolve=>http.close(()=>resolve())); });
  const socketFor=(token:string)=>{const s=connect(url,{auth:{token},transports:['websocket'],reconnection:false,forceNew:true}); clients.push(s);return s;};
  const wait=(s:Socket,event:string)=>new Promise<any>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Timed out: '+event)),5000);s.once(event,x=>{clearTimeout(timer);resolve(x);});});
  it('F02 broadcasts cache invalidation without another child’s data',async()=>{
    const socket=socketFor(a.parent.token); await wait(socket,'connect');
    const event=wait(socket,'event:new');
    emitToSchool(a.school.id,'event:new',{payload:{address:'PRIVATE-ADDRESS',studentId:a.studentInOtherClass.id}});
    expect(await event).toEqual({});
  });
  it('accepts slash-normalized polling paths used by the Next.js proxy',async()=>{
    const socket=connect(url,{auth:{token:a.parent.token},path:'/socket.io',addTrailingSlash:false,transports:['polling'],reconnection:false,forceNew:true});
    clients.push(socket);await wait(socket,'connect');expect(socket.connected).toBe(true);socket.disconnect();
  });
  it('F03 rejects revoked, inactive, wrong-school and password-change tokens',async()=>{
    const f=await createFixture();
    await prisma.user.update({where:{id:f.teacher.user.id},data:{tokenVersion:{increment:1}}});
    expect((await wait(socketFor(f.teacher.token),'connect_error')).message).toMatch(/Unauthorized/);
    await prisma.user.update({where:{id:f.parent.user.id},data:{active:false}});
    await wait(socketFor(f.parent.token),'connect_error');
    await prisma.user.update({where:{id:f.admin.user.id},data:{mustChangePassword:true}});
    await wait(socketFor(f.admin.token),'connect_error');
    const forged=signToken({sub:f.principal.user.id,schoolId:a.school.id,role:'PRINCIPAL',tv:0,name:'Wrong school'});
    await wait(socketFor(forged),'connect_error');
  });
  it('F03 disconnects an existing connection immediately on administrator revocation',async()=>{
    const f=await createFixture(); const socket=socketFor(f.teacher.token); await wait(socket,'connect');
    const disconnected=wait(socket,'disconnect');
    const res=await request(app).post(`/api/users/${f.teacher.user.id}/logout-all`).set(authHeader(f.admin.token));
    expect(res.status).toBe(200); await disconnected; expect(socket.connected).toBe(false);
  });
});
