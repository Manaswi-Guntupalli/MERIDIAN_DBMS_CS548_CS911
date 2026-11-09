import {beforeAll,describe,it,expect} from 'vitest';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {createFixture} from './helpers.js';
import {prisma} from '../src/lib/prisma.js';
const app=createApp();let a:Awaited<ReturnType<typeof createFixture>>,b:typeof a;
beforeAll(async()=>{a=await createFixture();b=await createFixture();});
const feed=async(token:string)=>(await request(app).get('/api/notifications').set('Authorization',`Bearer ${token}`));
const read=(token:string,id:string)=>request(app).patch(`/api/notifications/${id}/read`).set('Authorization',`Bearer ${token}`);
const all=(token:string)=>request(app).patch('/api/notifications/read-all').set('Authorization',`Bearer ${token}`);
const notice=(userId?:string)=>prisma.notification.create({data:{schoolId:a.school.id,userId,title:'Isolated receipt test',body:'Synthetic notification for per-user receipt tests.'}});
describe('Notification receipts stay private to the reader',()=>{
 it('requires authentication',async()=>{expect((await request(app).get('/api/notifications')).status).toBe(401);});
 it('does not let browser or shared caches reuse another account response',async()=>{
   const response=await feed(a.principal.token);expect(response.headers['cache-control']).toContain('no-store');expect(response.headers.vary).toContain('Authorization');
 });
 it('keeps a student read receipt separate from the principal and teacher',async()=>{
   const n=await notice();expect((await read(a.student.userToken,n.id)).status).toBe(200);
   expect((await feed(a.student.userToken)).body.notifications.find((x:any)=>x.id===n.id).read).toBe(true);
   for(const token of [a.principal.token,a.teacher.token]) expect((await feed(token)).body.notifications.find((x:any)=>x.id===n.id).read).toBe(false);
   expect(await prisma.notificationRead.findMany({where:{notificationId:n.id},select:{userId:true}})).toEqual([{userId:a.student.userId}]);
 });
 it('keeps repeated single-read requests idempotent',async()=>{
   const n=await notice();const results=await Promise.all([read(a.student.userToken,n.id),read(a.student.userToken,n.id)]);
   expect(results.every(r=>r.status===200)).toBe(true);expect(await prisma.notificationRead.count({where:{notificationId:n.id}})).toBe(1);
 });
 it('denies another user private notices and another school broadcasts',async()=>{
   const privateNotice=await notice(a.principal.user.id);const shared=await notice();
   expect((await feed(a.student.userToken)).body.notifications.some((x:any)=>x.id===privateNotice.id)).toBe(false);
   expect((await read(a.student.userToken,privateNotice.id)).status).toBe(404);
   expect((await read(b.principal.token,shared.id)).status).toBe(404);
   expect((await feed(b.principal.token)).body.notifications.some((x:any)=>x.id===shared.id)).toBe(false);
 });
 it('marks only the acting user visible notifications as read',async()=>{
   const shared=await notice(),own=await notice(a.student.userId!),principal=await notice(a.principal.user.id);
   expect((await all(a.student.userToken)).status).toBe(200);
   for(const n of [shared,own]) expect(await prisma.notificationRead.count({where:{notificationId:n.id,userId:a.student.userId!}})).toBe(1);
   expect(await prisma.notificationRead.count({where:{notificationId:principal.id}})).toBe(0);
   expect(await prisma.notificationRead.count({where:{notificationId:shared.id,userId:a.principal.user.id}})).toBe(0);
 });
 it('handles concurrent mark-all requests without losing or duplicating receipts',async()=>{
   const rows=await Promise.all([notice(),notice(),notice(a.student.userId!)]);
   const responses=await Promise.all([all(a.student.userToken),all(a.student.userToken)]);expect(responses.every(r=>r.status===200)).toBe(true);
   for(const n of rows) expect(await prisma.notificationRead.count({where:{notificationId:n.id,userId:a.student.userId!}})).toBe(1);
   expect((await all(a.student.userToken)).body.marked).toBe(0);
 });
});
