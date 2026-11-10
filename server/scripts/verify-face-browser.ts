// Browser camera fixture: a public sample video, real face engine and isolated test DB.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
const testUrl=process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test') || testUrl===process.env.DATABASE_URL) throw new Error('Separate TEST_DATABASE_URL required');
process.env.DATABASE_URL=testUrl;
process.env.NODE_ENV='test';
for(const key of ['OPENAI_API_KEY','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','SENDGRID_API_KEY','FIREBASE_SERVICE_ACCOUNT_PATH'])process.env[key]='';
const [{createApp},{createFixture},{prisma},{clearFace}] = await Promise.all([import('../src/app.js'),import('../tests/helpers.js'),import('../src/lib/prisma.js'),import('../src/services/face.js')]);
const out=path.resolve('../tmp/face-verification');mkdirSync(out,{recursive:true});
const video=path.join(out,'camera.y4m');
const blank=execFileSync('python',['-c',`import cv2,numpy as np,base64,sys
from skimage import data
frame=cv2.resize(cv2.cvtColor(data.astronaut(),cv2.COLOR_RGB2BGR)[10:260,100:350],(640,480))
yuv=cv2.cvtColor(frame,cv2.COLOR_BGR2YUV_I420).tobytes()
with open(sys.argv[1],'wb') as f:
 f.write(b'YUV4MPEG2 W640 H480 F15:1 Ip A1:1 C420jpeg\\n')
 for _ in range(15): f.write(b'FRAME\\n'+yuv)
print(base64.b64encode(cv2.imencode('.jpg',np.zeros_like(frame))[1]).decode())`,video],{windowsHide:true}).toString().trim();
const fixture=await createFixture();
const server=createApp().listen(0,'127.0.0.1');
await new Promise<void>(resolve=>server.once('listening',resolve));
const address=server.address();if (!address || typeof address==='string') throw new Error('Missing fixture address');
const backend=`http://127.0.0.1:${address.port}`;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+video]});
const results:string[]=[];const errors:string[]=[];
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['camera']});
  await context.addInitScript(token=>localStorage.setItem('meridian_token',token),fixture.admin.token);
  let rejectFirst=true;
  await context.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    const options:{url:string;postData?:string}={url:backend+url.pathname+url.search};
    // Inject one blank fixture frame to exercise the retake UI, then use the video.
    if (url.pathname==='/api/face/check' && rejectFirst) { options.postData=JSON.stringify({image:blank});rejectFirst=false; }
    await route.fulfill({response:await route.fetch(options)});
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://localhost:5173/presence/enrollment');
  const card=page.locator('.surface').filter({has:page.getByText(fixture.student.name,{exact:true})});
  await card.getByRole('button',{name:'Enroll face',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Enroll '+fixture.student.name});
  const capture=dialog.getByRole('button',{name:/Capture frame/});
  await expect(capture).toBeEnabled();results.push('Camera starts with the sample video');
  await capture.click();await expect(dialog.getByRole('status')).toContainText('No face');
  await expect(capture).toHaveText('Capture frame (0/3)');results.push('Bad capture receives guidance without being accepted');
  for (let i=1;i<=3;i++) {await capture.click();await expect(capture).toHaveText(`Capture frame (${i}/3)`,{timeout:35000});}
  results.push('Three frames validated by the real face engine');
  const enroll=dialog.getByRole('button',{name:'Enroll',exact:true});
  await expect(enroll).toBeDisabled();await dialog.getByRole('checkbox').check();await expect(enroll).toBeEnabled();
  results.push('Explicit consent required before enrollment');
  await page.screenshot({path:path.join(out,'enrollment-ready.png'),fullPage:true});
  const saved=page.waitForResponse(res=>res.url().endsWith('/face/enroll'));
  await enroll.click();const response=await saved;assert.equal(response.status(),201,JSON.stringify(await response.json()));
  await expect(dialog).toHaveCount(0);await expect(card.getByText('3 faces',{exact:true})).toBeVisible();
  assert.equal(await prisma.faceEmbedding.count({where:{subjectId:fixture.student.id}}),3);
  results.push('Enrollment succeeds and stored-template status refreshes');
  await page.screenshot({path:path.join(out,'enrollment-success.png'),fullPage:true});
  // A static sample video contains no eye movement. Successful attendance here
  // proves the camera pipeline no longer waits for a blink before submission.
  await page.goto('http://localhost:5173/presence/kiosk');
  await page.locator('main select').selectOption(fixture.class.id);
  const recognized=page.waitForResponse(response=>/\/presence\/session\/[^/]+\/face$/.test(new URL(response.url()).pathname),{timeout:45000});
  await page.getByRole('button',{name:'Start kiosk',exact:true}).click();
  const recognition=await recognized;
  assert.equal(recognition.status(),200,JSON.stringify(await recognition.json()));
  const marked=await recognition.json();assert.equal(marked.state,'FACE_VERIFIED');assert.equal(marked.studentId,fixture.student.id);
  assert.equal(await prisma.attendanceEvent.count({where:{sessionId:marked.sessionId}}),0);
  results.push('Real face engine verifies the sample face but cannot mark attendance without QR');
  const active=await prisma.attendanceSession.findUniqueOrThrow({where:{id:marked.sessionId}});
  const qr=await fetch(backend+`/api/presence/session/${active.id}/qr`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+fixture.student.userToken},body:JSON.stringify({token:active.sessionToken})});
  assert.equal(qr.status,200);assert.equal((await qr.json()).state,'PRESENT');
  await expect(page.getByText('Automatic recognition',{exact:true})).toBeVisible();
  await expect(page.getByText(/blink to verify|liveness verified/i)).toHaveCount(0);
  await expect(page.getByText(fixture.student.name,{exact:true}).first()).toBeVisible();
  assert.equal(await prisma.attendance.count({where:{studentId:fixture.student.id,source:'QR'}}),1);
  results.push('Student QR plus the real verified face marks Present without blinking');
  await page.waitForTimeout(4200);
  assert.equal(await prisma.attendance.count({where:{studentId:fixture.student.id}}),1);
  const activity=page.getByRole('heading',{name:'Recognised now',exact:true}).locator('..').locator('..');
  await expect(activity.getByText(fixture.student.name,{exact:true})).toHaveCount(1);
  results.push('Continuous recognition does not duplicate attendance');
  await page.screenshot({path:path.join(out,'automatic-recognition.png'),fullPage:true});
  assert.deepEqual(errors,[]);results.push('No uncaught browser errors');
  writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors,allPassed:true},null,2));
  for (const result of results) console.log('PASS',result);
} catch (error) {
  const page=browser.contexts()[0]?.pages()[0];
  if (page) { await page.screenshot({path:path.join(out,'browser-failure.png'),fullPage:true}); console.error(await page.locator('main').innerText()); }
  throw error;
} finally {
  // The kiosk keeps polling. Drain intercepted requests before disposing the
  // request context so successful tests do not fail during browser shutdown.
  for (const context of browser.contexts()) await context.unrouteAll({behavior:'wait'});
  await browser.close();
  await clearFace(fixture.school.id,'STUDENT',fixture.student.id);
  server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
  await prisma.$disconnect();
}
