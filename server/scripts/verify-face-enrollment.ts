// Real CPU-model/API/PostgreSQL integration using a public sample image and a test school.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const testUrl=process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test') || testUrl===process.env.DATABASE_URL) throw new Error('A separate TEST_DATABASE_URL ending in _test is required');
process.env.DATABASE_URL=testUrl;
const [{default:request},{createApp},{createFixture},{prisma},{clearFace}] = await Promise.all([import('supertest'),import('../src/app.js'),import('../tests/helpers.js'),import('../src/lib/prisma.js'),import('../src/services/face.js')]);
const images=JSON.parse(execFileSync('python',['-c',`import json,base64,cv2,numpy as np
from skimage import data
face=cv2.cvtColor(data.astronaut(),cv2.COLOR_RGB2BGR)
def enc(a): return base64.b64encode(cv2.imencode('.jpg',a)[1]).decode()
changed=cv2.warpAffine(face,cv2.getRotationMatrix2D((256,256),3,1),(512,512))
print(json.dumps({'face':enc(face),'changed':enc(changed),'blank':enc(np.zeros_like(face))}))`],{maxBuffer:4_000_000,windowsHide:true}).toString());
const fixture=await createFixture();
const app=createApp();
const auth={Authorization:`Bearer ${fixture.admin.token}`};
const results: {name:string;elapsedMs:number}[]=[];
async function check(name:string,fn:()=>Promise<void>) {const start=performance.now();await fn();results.push({name,elapsedMs:Math.round(performance.now()-start)});console.log('PASS',name,results.at(-1)!.elapsedMs+'ms');}
try {
  await check('Real frame quality check without template exposure',async()=>{
    const response=await request(app).post('/api/face/check').set(auth).send({image:images.face});
    assert.equal(response.status,200,JSON.stringify(response.body));assert.equal(response.body.ready,true);assert.equal(response.body.embedding,undefined);
  });
  await check('Empty camera frame is rejected with guidance',async()=>{
    const response=await request(app).post('/api/face/check').set(auth).send({image:images.blank});
    assert.equal(response.body.ready,false);assert.match(response.body.guidance,/No face/);
  });
  await check('Three real model templates are enrolled in native PostgreSQL',async()=>{
    const response=await request(app).post('/api/face/enroll').set(auth).send({subjectType:'STUDENT',subjectId:fixture.student.id,images:[images.face,images.changed,images.face],consent:true});
    assert.equal(response.status,201,JSON.stringify(response.body));assert.equal(response.body.stored,3);
    const templates=await prisma.faceEmbedding.findMany({where:{schoolId:fixture.school.id}});
    assert.equal(templates.length,3);assert(templates.every(t=>t.dim===512 && t.model==='insightface-buffalo_l'));
  });
  await check('Real recognition marks the correct test student present',async()=>{
    const session=await request(app).post('/api/presence/session/start').set(auth).send({classId:fixture.student.classId});
    assert.equal(session.status,201,JSON.stringify(session.body));
    const marked=await request(app).post(`/api/presence/session/${session.body.id}/face`).set(auth).send({image:images.changed});
    assert.equal(marked.status,200,JSON.stringify(marked.body));assert.equal(marked.body.state,'PRESENT');assert.equal(marked.body.studentId,fixture.student.id);
    assert.equal(marked.body.capture.width,512);assert.equal(marked.body.capture.height,512);assert.equal(marked.body.capture.bbox.length,4);
    const attendance=await prisma.attendance.findFirst({where:{studentId:fixture.student.id,source:'FACE'}});assert(attendance);
    const duplicate=await request(app).post(`/api/presence/session/${session.body.id}/face`).set(auth).send({image:images.face});
    assert.equal(duplicate.status,200);assert.equal(await prisma.attendance.count({where:{studentId:fixture.student.id}}),1);
  });
  mkdirSync('../tmp/face-verification',{recursive:true});writeFileSync('../tmp/face-verification/integration.json',JSON.stringify({results,allPassed:true},null,2));
} finally {
  await clearFace(fixture.school.id,'STUDENT',fixture.student.id);
  await prisma.$disconnect();
}
