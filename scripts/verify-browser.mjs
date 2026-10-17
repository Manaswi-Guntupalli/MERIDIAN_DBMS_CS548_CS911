// Runs only against a disposable populated demo. It does not send external messages.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const origin=process.env.WEB_TEST_ORIGIN || 'http://localhost:5173';
const out=process.env.WEB_TEST_OUTPUT || 'tmp/browser-verification';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const results=[],errors=[];
const check=(name,detail={})=>{results.push({name,status:'PASS',...detail});console.log('PASS',name);};
let context;
async function login(role,viewport={width:1440,height:1000}) {
  if(context) await context.close();
  context=await browser.newContext({viewport});const page=await context.newPage();
  page.on('pageerror',e=>errors.push({path:new URL(page.url()).pathname,message:e.message}));
  page.on('response',res=>{if(res.status()>=500 && res.url().includes('/api/')) errors.push({path:new URL(res.url()).pathname,message:'HTTP '+res.status()});});
  await page.goto(origin+'/login');
  await page.locator('input[type=email]').fill(role+'@meridian.school');
  await page.locator('input[type=password]').fill('meridian123');
  await page.getByRole('button',{name:'Sign in',exact:false}).click();
  await page.waitForURL(origin+'/');await page.locator('main').waitFor({state:'visible'});
  check('Browser login: '+role);return page;
}
try {
  let page=await login('principal');
  for(const path of ['/','/students','/staff','/classes','/attendance','/fees','/lumen','/kairos','/notices','/foresight','/presence','/presence/kiosk','/presence/enrollment','/presence/activity','/presence/analytics','/presence/insights','/presence/simulator','/twin','/trust','/reports','/emergency','/copilot','/notifications','/users','/knowledge','/database']) {
    await page.goto(origin+path,{waitUntil:'domcontentloaded'});
    await page.locator('main').waitFor({state:'visible'});await page.waitForTimeout(path==='/'?5000:800);
    await expect(page.locator('main')).not.toBeEmpty();
    await expect(page.getByText('Application error: a client-side exception has occurred')).toHaveCount(0);
    check('Principal page '+path);
    if(['/','/fees','/twin','/knowledge','/database'].includes(path)) await page.screenshot({path:out+'/'+(path==='/'?'dashboard':path.slice(1))+'.png',fullPage:true});
  }
  await page.goto(origin+'/notices');
  await page.locator('main select').nth(0).selectOption('SCHOOL');
  await page.locator('main select').nth(1).selectOption('PARENTS');
  await page.getByPlaceholder('Chemistry practical rescheduled').fill('Manual draft verification');
  await page.locator('main textarea').first().fill('This is a synthetic draft used to verify the manual review workflow.');
  await page.getByRole('button',{name:'Use my wording',exact:true}).click();
  await expect(page.locator('main textarea').nth(1)).toHaveValue('This is a synthetic draft used to verify the manual review workflow.');
  await expect(page.getByRole('button',{name:'Draft with AI',exact:false})).toBeDisabled();
  check('Manual notice drafting works without OpenAI');
  const token=await page.evaluate(()=>localStorage.getItem('meridian_token'));
  const {io}=await import('socket.io-client');
  const socket=io(origin,{auth:{token},addTrailingSlash:false,transports:['polling'],reconnection:false});
  await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);setTimeout(()=>reject(new Error('Next.js socket polling connection timed out')),10000).unref();});
  socket.disconnect();check('Authenticated realtime connects through Next.js');
  // Student form -> persisted edit -> withdrawal -> reactivation -> safe deletion.
  await page.goto(origin+'/students');await page.getByRole('button',{name:'Add student',exact:true}).click();
  const modal=page.locator('.fixed').filter({has:page.getByRole('heading',{name:'Add student',exact:true})});
  const name='Browser regression '+Date.now();
  for(const [label,value] of [['Full name',name],['Roll no','999'],['Admission no','BROWSER-'+Date.now()]]) await modal.getByText(label,{exact:true}).locator('..').locator('input').fill(value);
  await modal.getByRole('button',{name:'Add student',exact:true}).click();
  await page.getByText(name,{exact:true}).click();await page.waitForURL(/\/students\//);
  await page.getByRole('button',{name:'Edit / withdraw'}).click();
  await page.getByRole('dialog').getByLabel('Full name').fill(name+' edited');
  await page.getByRole('dialog').getByLabel('Active student').uncheck();
  await page.getByRole('button',{name:'Save changes'}).click();
  await expect(page.getByRole('heading',{name:name+' edited',exact:true})).toBeVisible();
  await expect(page.getByText(/Admission.*Withdrawn/)).toBeVisible();check('Student edit and withdrawal persist');
  await page.screenshot({path:out+'/student-withdrawal.png',fullPage:true});
  await page.getByRole('button',{name:'Edit / withdraw'}).click();
  await page.getByRole('dialog').getByLabel('Active student').check();await page.getByRole('button',{name:'Save changes'}).click();
  await expect(page.getByText(/Admission.*Active/)).toBeVisible();
  await page.getByRole('button',{name:'Edit / withdraw'}).click();page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Delete unused record'}).click();await page.waitForURL(origin+'/students');check('Student reactivation and safe delete');
  // Real vector create/search/update/delete through visible controls.
  await page.goto(origin+'/knowledge');const title='Browser attendance policy '+Date.now();
  await page.getByLabel('Entry title',{exact:true}).fill(title);
  await page.getByLabel('Entry content',{exact:true}).fill('A student absent from school must provide a leave application to the class teacher.');
  await page.getByRole('button',{name:'Create and embed'}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible({timeout:90000});
  await page.getByLabel('Search by meaning').fill('What should a child do after missing classes?');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  const entry=page.locator('article').filter({has:page.getByRole('heading',{name:title,exact:true})});
  await entry.getByRole('button',{name:'Edit',exact:true}).click();
  await page.getByLabel('Entry title',{exact:true}).fill(title+' updated');await page.getByRole('button',{name:'Save and re-embed'}).click();
  await expect(page.getByRole('heading',{name:title+' updated',exact:true})).toBeVisible({timeout:90000});
  page.once('dialog',dialog=>dialog.accept());await page.locator('article').filter({has:page.getByRole('heading',{name:title+' updated',exact:true})}).getByRole('button',{name:'Delete',exact:true}).click();
  await expect(page.getByRole('heading',{name:title+' updated',exact:true})).toHaveCount(0);check('Knowledge browser create/search/edit/delete');
  await page.goto(origin+'/database');await page.getByRole('button',{name:'Vector indexes and role policies'}).click();await expect(page.locator('main pre')).toContainText('vector');check('Database Lab browser query');
  await page.goto(origin+'/fees');await page.getByRole('button',{name:'overdue',exact:true}).click();await page.waitForTimeout(500);await page.getByRole('button',{name:'Record',exact:true}).first().click();
  await page.locator('.fixed input[type=number]').fill('0.10');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('heading',{name:'Record payment',exact:true})).toHaveCount(0);check('Fee payment via browser');
  // Tablet/mobile render and role guards.
  page=await login('teacher',{width:390,height:844});
  await page.goto(origin+'/fees');await expect(page.getByText(/access denied|not authorized|not permitted|restricted/i).first()).toBeVisible();check('Teacher fee page denied');
  for(const role of ['parent','student']){page=await login(role,{width:390,height:844});await page.waitForTimeout(800);await page.screenshot({path:out+'/'+role+'-mobile.png',fullPage:true});check(role+' mobile dashboard');}
  if(errors.length) throw new Error('Browser JavaScript errors: '+JSON.stringify(errors));
} catch(error) {results.push({name:'Browser verification',status:'FAIL',message:error.message});console.error(error.message);if(context){const pages=context.pages();if(pages[0])await pages[0].screenshot({path:out+'/failure.png',fullPage:true});}process.exitCode=1;}
finally {await browser.close();await writeFile(out+'/results.json',JSON.stringify({date:new Date().toISOString(),results,errors},null,2));}
