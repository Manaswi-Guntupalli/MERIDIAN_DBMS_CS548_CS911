// Real projected QR, student scan page, PostgreSQL and live register; isolated fixtures only.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, expect, type BrowserContext } from '@playwright/test';
const testUrl=process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test') || testUrl===process.env.DATABASE_URL) throw new Error('Separate test database required');
process.env.DATABASE_URL=testUrl;
process.env.NODE_ENV='test';
for (const key of ['OPENAI_API_KEY','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','SENDGRID_API_KEY','FIREBASE_SERVICE_ACCOUNT_PATH']) process.env[key]='';
const [{createApp},{createFixture,enrollTestFace,unitVector},{prisma},{initSocket},{markFace}]=await Promise.all([import('../src/app.js'),import('../tests/helpers.js'),import('../src/lib/prisma.js'),import('../src/lib/socket.js'),import('../src/services/presence/engine.js')]);
const fixture=await createFixture();
const vector=unitVector(812);
await enrollTestFace(fixture.school.id,'STUDENT',fixture.student.id,fixture.student.name,vector);
const server=createServer(createApp()); const io=initSocket(server);
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();if(!address || typeof address==='string')throw new Error('No fixture port');
const backend=`http://127.0.0.1:${address.port}`;
const out=path.resolve('../tmp/qr-verification');mkdirSync(out,{recursive:true});
const results:string[]=[];const errors:string[]=[];
const check=(name:string)=>{results.push(name);console.log('PASS '+name);};
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const contexts:BrowserContext[]=[];
async function context(token:string){
  const c=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(c);
  await c.addInitScript(t=>localStorage.setItem('meridian_token',t),token);
  for(const pattern of ['**/api/**','**/socket.io**'])await c.route(pattern,async route=>{
    const url=new URL(route.request().url());await route.fulfill({response:await route.fetch({url:backend+url.pathname+url.search})});
  });
  return c;
}
try {
  const teacher=await (await context(fixture.teacher.token)).newPage();teacher.on('pageerror',e=>errors.push(e.message));
  await teacher.goto('http://localhost:5173/presence');
  await teacher.getByLabel('Attendance class').selectOption(fixture.class.id);
  await expect(teacher.getByLabel('Attendance method')).toHaveCount(0);
  await teacher.getByRole('button',{name:'Start Attendance',exact:false}).click();
  await teacher.waitForURL('**/presence/live/**');
  await expect(teacher.getByText('QR + matching face required',{exact:false})).toBeVisible();
  check('Teacher launches mandatory dual verification with no single-factor mode');
  const canvas=teacher.locator('canvas');await expect(canvas).toBeVisible();
  const png=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL('image/png').split(',')[1]);
  const image=path.join(out,'projected-qr.png');writeFileSync(image,Buffer.from(png,'base64'));
  const scanUrl=execFileSync('python',['-c','import cv2,sys; value,_,_=cv2.QRCodeDetector().detectAndDecode(cv2.imread(sys.argv[1])); print(value)',image],{windowsHide:true}).toString().trim();
  const decoded=new URL(scanUrl);assert.equal(decoded.pathname,'/scan');assert.ok(decoded.searchParams.get('t'));
  const sessionId=decoded.searchParams.get('s')!;
  check('The actual projected QR decodes to the correct session URL');
  await teacher.screenshot({path:path.join(out,'teacher-projected-qr.png'),fullPage:true});
  const studentContext=await context(fixture.student.userToken);
  const student=await studentContext.newPage();student.on('pageerror',e=>errors.push(e.message));
  await student.goto(scanUrl);
  await student.getByRole('button',{name:'Mark My Attendance',exact:true}).click();
  await expect(student.getByText('QR verified — awaiting face',{exact:true})).toBeVisible();
  await expect(teacher.getByText('0/1',{exact:true})).toBeVisible();
  assert.equal(await prisma.attendanceEvent.count({where:{sessionId}}),0);
  check('QR alone remains pending on the student page and teacher register');
  const face=await markFace({schoolId:fixture.school.id,sessionId,embedding:vector,actorId:fixture.teacher.user.id});
  assert.equal(face.state,'PRESENT');
  await expect(student.getByText("You're marked present",{exact:true})).toBeVisible({timeout:12000});
  check('The same student face completes QR-first attendance and the student page updates automatically');
  const tile=teacher.locator('[class*="rounded-xl"]').filter({has:teacher.getByText(fixture.student.name,{exact:true})}).last();
  await expect(tile).toContainText('Present',{timeout:12000});
  await expect(teacher.getByText('1/1',{exact:true})).toBeVisible();
  check('Teacher live register updates automatically to Present');
  await student.screenshot({path:path.join(out,'student-present.png'),fullPage:true});
  await student.reload();
  const repeatResponse=student.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname.endsWith('/qr'));
  await student.getByRole('button',{name:'Mark My Attendance',exact:true}).click();
  assert.equal((await (await repeatResponse).json()).reason,'Already marked present');
  await expect(student.getByText("You're marked present",{exact:true})).toBeVisible();
  assert.equal(await prisma.attendanceEvent.count({where:{sessionId}}),1);
  check('Rescanning returns Already marked present without duplicating the event');
  await teacher.getByRole('button',{name:'End attendance',exact:true}).click();
  await teacher.waitForURL('**/presence/summary/**');
  await expect(teacher.getByRole('cell',{name:'QR + Face',exact:true})).toBeVisible();
  check('Teacher ends the session and the summary reports both verification methods');
  await student.reload();await student.getByRole('button',{name:'Mark My Attendance',exact:true}).click();
  await expect(student.getByText("Couldn't mark attendance",{exact:true})).toBeVisible();
  check('The old projected QR is rejected after the teacher closes the session');
  const response=await teacher.request.post(backend+'/api/presence/session/start',{headers:{Authorization:'Bearer '+fixture.teacher.token},data:{classId:fixture.class.id}});
  assert.equal(response.status(),201);const next=await response.json();
  const firstFace=await markFace({schoolId:fixture.school.id,sessionId:next.id,embedding:vector,actorId:fixture.teacher.user.id});
  assert.equal(firstFace.state,'FACE_VERIFIED');
  assert.equal(await prisma.attendanceEvent.count({where:{sessionId:next.id}}),0);
  await teacher.goto('http://localhost:5173/presence/live/'+next.id);
  await expect(teacher.getByText('Awaiting QR',{exact:false})).toBeVisible();
  check('Face-first evidence stays pending and appears as Awaiting QR');
  await student.goto(`http://localhost:5173/scan?s=${encodeURIComponent(next.id)}&t=${encodeURIComponent(next.qr.token)}`);
  await student.getByRole('button',{name:'Mark My Attendance',exact:true}).click();
  await expect(student.getByText("You're marked present",{exact:true})).toBeVisible();
  await expect(teacher.getByText('1/1',{exact:true})).toBeVisible();
  check('The same student QR completes face-first attendance without borrowing old-session proofs');
  assert.deepEqual(errors,[]);check('No uncaught browser errors');
  writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({allPassed:true,results,errors},null,2));
} catch(error){
  const page=contexts[0]?.pages()[0];
  if(page){await page.screenshot({path:path.join(out,'browser-failure.png'),fullPage:true});writeFileSync(path.join(out,'browser-failure.txt'),await page.locator('main').innerText());}
  writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({allPassed:false,results,errors,error:String(error)},null,2));throw error;
}
finally {
  for(const c of contexts)await c.unrouteAll({behavior:'wait'});
  await browser.close();await new Promise<void>(resolve=>io.close(()=>resolve()));await prisma.$disconnect();
}
