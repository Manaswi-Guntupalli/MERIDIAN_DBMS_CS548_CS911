import {beforeAll,describe,it,expect} from 'vitest';
import request from 'supertest';
import {createFixture} from './helpers.js';
import {createApp} from '../src/app.js';
import {prisma} from '../src/lib/prisma.js';
const app=createApp();
let f:Awaited<ReturnType<typeof createFixture>>,feeId:string;
beforeAll(async()=>{
  f=await createFixture();
  feeId=(await prisma.fee.create({data:{schoolId:f.school.id,studentId:f.student.id,title:'Atomic payment test',amount:100,dueDate:'2026-12-01'}})).id;
});
describe('Atomic fee payment API',()=>{
  it('commits payment, summary and audit event together',async()=>{
    const r=await request(app).post('/api/fees/pay').set('Authorization','Bearer '+f.admin.token).send({feeId,amount:40});
    expect(r.status).toBe(200);expect(r.body.paid).toBe(40);expect(r.body.status).toBe('PARTIAL');
    expect(await prisma.payment.count({where:{feeId}})).toBe(1);
    expect(await prisma.event.count({where:{aggregateId:feeId,type:'FEE_PAYMENT_RECORDED'}})).toBe(1);
  });
  it('rejects overpayment without a partial payment or audit mutation',async()=>{
    const r=await request(app).post('/api/fees/pay').set('Authorization','Bearer '+f.admin.token).send({feeId,amount:80});
    expect(r.status).toBe(400);
    expect((await prisma.fee.findUniqueOrThrow({where:{id:feeId}})).paid).toBe(40);
    expect(await prisma.payment.count({where:{feeId}})).toBe(1);
    expect(await prisma.event.count({where:{aggregateId:feeId,type:'FEE_PAYMENT_RECORDED'}})).toBe(1);
  });
  it('rejects a teacher payment operation',async()=>{
    const r=await request(app).post('/api/fees/pay').set('Authorization','Bearer '+f.teacher.token).send({feeId,amount:10});
    expect(r.status).toBe(403);
  });
});
