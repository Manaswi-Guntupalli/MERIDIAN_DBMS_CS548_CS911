import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createFixture } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';
import { embedImage, EMBED_MODEL } from '../src/services/face.js';

const app = createApp();
let fixture: Awaited<ReturnType<typeof createFixture>>;
const image = 'a'.repeat(64);
const vector = (axis=0) => Array.from({length:512},(_,i)=>i===axis?1:0);
const frame = (extra={}) => ({ok:true,found:true,embedding:vector(),detScore:.95,model:EMBED_MODEL,qualityOk:true,faceCount:1,...extra});
beforeAll(async()=>{fixture=await createFixture();});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
function respond(...frames: unknown[]) {
  const fetch = vi.fn();
  for (const value of frames) fetch.mockResolvedValueOnce(new Response(JSON.stringify(value),{status:200}));
  vi.stubGlobal('fetch',fetch); return fetch;
}
function enroll() {
  return request(app).post('/api/face/enroll').set('Authorization',`Bearer ${fixture.admin.token}`).send({subjectType:'STUDENT',subjectId:fixture.student.id,images:[image,image,image],consent:true});
}
describe('Face capture and enrollment',()=>{
  it('requires an administrator to check frames',async()=>{
    expect((await request(app).post('/api/face/check').send({image})).status).toBe(401);
    expect((await request(app).post('/api/face/check').set('Authorization',`Bearer ${fixture.teacher.token}`).send({image})).status).toBe(403);
  });
  it('returns guidance without exposing or storing the embedding',async()=>{
    respond(frame());
    const result=await request(app).post('/api/face/check').set('Authorization',`Bearer ${fixture.admin.token}`).send({image});
    expect(result.status).toBe(200);expect(result.body.ready).toBe(true);
    expect(result.body).not.toHaveProperty('embedding');
    expect(await prisma.faceEmbedding.count({where:{subjectId:fixture.student.id}})).toBe(0);
  });
  it('reports a bad capture without falsely reporting an offline engine',async()=>{
    respond(frame({qualityOk:false,embedding:undefined,guidance:'Keep your whole face visible.'}));
    const result=await request(app).post('/api/face/check').set('Authorization',`Bearer ${fixture.admin.token}`).send({image});
    expect(result.body.ready).toBe(false);expect(result.body.guidance).toContain('whole face');
  });
  it('enrolls three validated frames atomically',async()=>{
    respond(frame(),frame(),frame());
    const result=await enroll();expect(result.status).toBe(201);expect(result.body.stored).toBe(3);
    const rows=await prisma.faceEmbedding.findMany({where:{subjectId:fixture.student.id}});
    expect(rows).toHaveLength(3);expect(rows.every(row=>row.model===EMBED_MODEL && row.dim===512)).toBe(true);
  });
  it('keeps existing templates when a later frame fails quality checks',async()=>{
    const before=await prisma.faceEmbedding.findMany({where:{subjectId:fixture.student.id},orderBy:{id:'asc'}});
    respond(frame(),frame({qualityOk:false,embedding:undefined,guidance:'Hold still for a sharp frame.'}));
    const result=await enroll();expect(result.status).toBe(400);expect(result.body.error).toContain('sharp');
    expect(await prisma.faceEmbedding.findMany({where:{subjectId:fixture.student.id},orderBy:{id:'asc'}})).toEqual(before);
  });
  it('rejects inconsistent identities across captured frames',async()=>{
    respond(frame(),frame({embedding:vector(1)}),frame());
    const result=await enroll();expect(result.status).toBe(400);expect(result.body.error).toContain('consistent face');
  });
  it('preserves an unavailable service response as 503',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    expect((await enroll()).status).toBe(503);
  });
  it('rejects malformed or incompatible model templates',async()=>{
    respond(frame({embedding:[1,2]}));
    await expect(embedImage(image,true)).rejects.toMatchObject({status:502});
    respond(frame({model:'wrong-model'}));
    await expect(embedImage(image,true)).rejects.toMatchObject({status:502});
  });
  it('distinguishes timeouts from offline service failures',async()=>{
    vi.useFakeTimers();
    vi.stubGlobal('fetch',vi.fn((_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted'))))));
    const pending=expect(embedImage(image)).rejects.toMatchObject({status:504});
    await vi.advanceTimersByTimeAsync(30_001);await pending;
  });
});
