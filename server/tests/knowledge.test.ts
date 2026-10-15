import {beforeAll,describe,it,expect} from 'vitest';
import request from 'supertest';
import {randomUUID} from 'node:crypto';
import {createFixture} from './helpers.js';
import {createApp} from '../src/app.js';
import {knowledgeContext} from '../src/services/knowledge.js';
const app=createApp();
let fixture:Awaited<ReturnType<typeof createFixture>>;
let id:string;
beforeAll(async()=>{
  fixture=await createFixture();id=randomUUID();
  const vector='['+[1,...Array(383).fill(0)].join(',')+']';
  await knowledgeContext({sub:fixture.admin.user.id,schoolId:fixture.school.id},tx=>tx.$executeRaw`INSERT INTO "KnowledgeItem"("id","schoolId","title","content","category","createdBy","embedding") VALUES(${id},${fixture.school.id},'Test policy','This is an isolated knowledge authorization test entry.','POLICY',${fixture.admin.user.id},${vector}::vector)`);
});
describe('Knowledge API and database integration',()=>{
  it('requires authentication',async()=>{expect((await request(app).get('/api/knowledge')).status).toBe(401);});
  it('allows teachers to list school entries',async()=>{
    const r=await request(app).get('/api/knowledge').set('Authorization','Bearer '+fixture.teacher.token);
    expect(r.status).toBe(200);expect(r.body.items.some((x:any)=>x.id===id)).toBe(true);expect(r.body.dimensions).toBe(384);
  });
  it('rejects teacher writes and parent reads',async()=>{
    expect((await request(app).delete('/api/knowledge/'+id).set('Authorization','Bearer '+fixture.teacher.token)).status).toBe(403);
    expect((await request(app).get('/api/knowledge').set('Authorization','Bearer '+fixture.parent.token)).status).toBe(403);
  });
  it('rejects an unregistered SQL query name',async()=>{
    expect((await request(app).get('/api/database/queries/drop-table').set('Authorization','Bearer '+fixture.admin.token)).status).toBe(400);
  });
  it('allows admin deletion and removes the searchable row',async()=>{
    expect((await request(app).delete('/api/knowledge/'+id).set('Authorization','Bearer '+fixture.admin.token)).status).toBe(200);
    const r=await request(app).get('/api/knowledge').set('Authorization','Bearer '+fixture.teacher.token);
    expect(r.body.items.some((x:any)=>x.id===id)).toBe(false);
  });
});
