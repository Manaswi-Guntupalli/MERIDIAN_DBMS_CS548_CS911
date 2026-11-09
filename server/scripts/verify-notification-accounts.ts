// Reproduce account switching in ONE browser tab without reloading the app.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium,expect } from '@playwright/test';
const testUrl=process.env.TEST_DATABASE_URL;
if(!testUrl || !new URL(testUrl).pathname.endsWith('_test') || testUrl===process.env.DATABASE_URL) throw new Error('Separate TEST_DATABASE_URL required');
process.env.DATABASE_URL=testUrl;
const [{createApp},{createFixture},{prisma},{hashPassword}]=await Promise.all([import('../src/app.js'),import('../tests/helpers.js'),import('../src/lib/prisma.js'),import('../src/lib/auth.js')]);
const fixture=await createFixture();
const student=await prisma.user.findUniqueOrThrow({where:{id:fixture.student.userId!}});
const superUser=await prisma.user.create({data:{schoolId:fixture.school.id,email:`notification-super-${fixture.suffix}@test.school`,password:await hashPassword('password123'),name:'Notification Super '+fixture.suffix,role:'SUPER_ADMIN'}});
const broadcast=await prisma.notification.create({data:{schoolId:fixture.school.id,title:'Shared notice '+fixture.suffix,body:'A school-wide notice with separate read receipts.'}});
const studentPrivate=await prisma.notification.create({data:{schoolId:fixture.school.id,userId:student.id,title:'Student private '+fixture.suffix,body:'Visible to this student only.'}});
const principalPrivate=await prisma.notification.create({data:{schoolId:fixture.school.id,userId:fixture.principal.user.id,title:'Principal private '+fixture.suffix,body:'Visible to this principal only.'}});
const server=createApp().listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
const address=server.address();if(!address||typeof address==='string')throw new Error('Missing fixture address');
const backend=`http://127.0.0.1:${address.port}`;
const out=path.resolve('../tmp/notification-verification');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route('**/api/**',async route=>{
 const url=new URL(route.request().url());await route.fulfill({response:await route.fetch({url:backend+url.pathname+url.search})});
});
const page=await context.newPage();const results:string[]=[];const errors:string[]=[];
page.on('pageerror',error=>errors.push(error.message));
const card=(title:string)=>page.locator('main [role="button"]').filter({has:page.getByText(title,{exact:true})});
async function login(email:string){
 await page.locator('input[type=email]').fill(email);await page.locator('input[type=password]').fill('password123');
 await page.getByRole('button',{name:'Sign in',exact:false}).click();await page.waitForURL(url=>url.pathname!=='/login');
 if(new URL(page.url()).pathname!=='/notifications') await page.getByRole('button',{name:'Notifications',exact:true}).click();
 await page.waitForURL('http://localhost:5173/notifications');
 await expect(card(broadcast.title)).toBeVisible();
}
async function logout(){await page.locator('header button[aria-haspopup="menu"]').click();await page.getByRole('menuitem',{name:'Sign out',exact:true}).click();await page.waitForURL('http://localhost:5173/login');}
const pass=(name:string)=>{results.push(name);console.log('PASS',name);};
try{
 await page.goto('http://localhost:5173/login');await login(student.email);
 await expect(card(broadcast.title)).not.toHaveClass(/opacity-70/);
 const read=page.waitForResponse(res=>res.url().endsWith(`/notifications/${broadcast.id}/read`) && res.request().method()==='PATCH');
 await card(broadcast.title).click();assert.equal((await read).status(),200);await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
 await expect(card(broadcast.title)).toHaveClass(/opacity-70/);
 assert.equal(await prisma.notificationRead.count({where:{notificationId:broadcast.id,userId:fixture.principal.user.id}}),0);
 pass('Student opening a shared notice creates only the student receipt');
 await logout();await login(fixture.principal.user.email);
 await expect(card(broadcast.title)).not.toHaveClass(/opacity-70/);
 await expect(card(studentPrivate.title)).toHaveCount(0);await expect(card(principalPrivate.title)).toBeVisible();
 pass('Principal sees their own unread state and private feed after rapid student-to-principal switch');
 await logout();await login(student.email);await expect(card(broadcast.title)).toHaveClass(/opacity-70/);
 await page.getByRole('button',{name:'Mark all read',exact:true}).click();await expect(card(studentPrivate.title)).toHaveClass(/opacity-70/);
 assert.equal(await prisma.notificationRead.count({where:{userId:fixture.principal.user.id}}),0);
 pass('Student Mark all read leaves principal receipts untouched');
 await logout();await login(fixture.principal.user.email);await expect(card(broadcast.title)).not.toHaveClass(/opacity-70/);
 await expect(card(principalPrivate.title)).not.toHaveClass(/opacity-70/);
 await page.getByRole('button',{name:'Mark all read',exact:true}).click();await expect(card(broadcast.title)).toHaveClass(/opacity-70/);
 assert.equal(await prisma.notificationRead.count({where:{userId:fixture.teacher.user.id}}),0);
 pass('Principal Mark all read does not read the shared notice for teachers');
 await logout();await login(superUser.email);await expect(card(broadcast.title)).not.toHaveClass(/opacity-70/);
 await page.locator('a[href="/users"]').first().click();await page.getByTitle('View Meridian as '+student.name,{exact:true}).click();
 await expect(page.getByRole('button',{name:'Exit',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Notifications',exact:true}).click();await expect(card(broadcast.title)).toHaveClass(/opacity-70/);
 await page.getByRole('button',{name:'Exit',exact:true}).click();await expect(card(broadcast.title)).not.toHaveClass(/opacity-70/);
 await expect(card(studentPrivate.title)).toHaveCount(0);
 pass('Impersonation and Exit restore independent feeds and read states');
 const otherTab=await context.newPage();otherTab.on('pageerror',error=>errors.push(error.message));
 await otherTab.goto('http://localhost:5173/notifications');
 const otherCard=()=>otherTab.locator('main [role="button"]').filter({has:otherTab.getByText(broadcast.title,{exact:true})});
 await expect(otherCard()).not.toHaveClass(/opacity-70/);
 await logout();await otherTab.waitForURL(url=>url.pathname==='/login');
 await login(student.email);
 await otherTab.waitForURL(url=>url.pathname==='/notifications');
 await expect(otherTab.locator('header')).toContainText(student.name);
 await expect(otherCard()).toHaveClass(/opacity-70/);
 pass('Other tabs follow logout and the newly signed-in identity instead of keeping the previous account screen');
 assert.deepEqual(errors,[]);pass('No uncaught browser errors');
 await page.screenshot({path:path.join(out,'account-isolation.png'),fullPage:true});
 writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors,allPassed:true},null,2));
}catch(error){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw error;}
finally{
 await context.unrouteAll({behavior:'wait'});await browser.close();
 await prisma.notification.deleteMany({where:{schoolId:fixture.school.id}});
 server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await prisma.$disconnect();
}
