import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
const checks:string[]=[];
const ok=(name:string,value:unknown)=>{assert.ok(value,name);checks.push(name);};
const rollback=Symbol('verification rollback');
try {
  await db.$transaction(async tx=>{
    const school=await tx.school.create({data:{name:'Verification School',code:randomUUID()}});
    const other=await tx.school.create({data:{name:'Other Verification School',code:randomUUID()}});
    const admin=await tx.user.create({data:{schoolId:school.id,email:randomUUID()+'@test.invalid',password:'unused-not-a-login',name:'Admin',role:'ADMIN'}});
    const teacher=await tx.user.create({data:{schoolId:school.id,email:randomUUID()+'@test.invalid',password:'unused-not-a-login',name:'Teacher',role:'TEACHER'}});
    const student=await tx.student.create({data:{schoolId:school.id,admissionNo:randomUUID(),rollNo:1,name:'Verification Student'}});
    const fee=await tx.fee.create({data:{schoolId:school.id,studentId:student.id,title:'Verification',amount:100,dueDate:'2026-10-01'}});
    // Catch intentional errors in a PostgreSQL subtransaction. This also works
    // through restricted PostgreSQL protocol implementations used in local QA.
    await tx.$executeRawUnsafe(`CREATE FUNCTION pg_temp.reject_sql(command text) RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN BEGIN EXECUTE command; EXCEPTION WHEN OTHERS THEN RETURN true; END; RETURN false; END $$`);
    const reject=async(name:string,sql:string)=>{
      const rows=await tx.$queryRaw<{rejected:boolean}[]>`SELECT pg_temp.reject_sql(${sql}) AS rejected`;
      ok(name,rows[0].rejected);
    };
    await reject('CHECK rejects negative fee',`UPDATE "Fee" SET "amount"=-1 WHERE "id"='${fee.id}'`);
    await reject('Trigger rejects cross-school student',`INSERT INTO "Fee"("id","schoolId","studentId","title","amount","dueDate") VALUES('${randomUUID()}','${other.id}','${student.id}','Invalid',10,'2026-10-01')`);
    const pay=await tx.$queryRaw<any[]>`SELECT * FROM record_fee_payment(${fee.id},${school.id},${40}::double precision,'CASH',NULL,${randomUUID()})`;
    ok('Stored function records payment and balance',pay[0].paid===40 && pay[0].status==='PARTIAL');
    await reject('Stored function rejects overpayment',`SELECT * FROM record_fee_payment('${fee.id}','${school.id}',80::double precision,'CASH',NULL,'${randomUUID()}')`);
    ok('Failed payment rolls back cleanly',(await tx.payment.count({where:{feeId:fee.id}}))===1);
    const summary=await tx.$queryRaw<any[]>`SELECT * FROM school_fee_summary WHERE "schoolId"=${school.id}`;
    ok('Aggregate view reads live balance',summary[0].outstanding===60);
    const vector='['+[1,...Array(383).fill(0)].join(',')+']';
    const key=randomUUID();
    await tx.$executeRaw`SELECT set_config('meridian.user_id',${admin.id},true)`;
    await tx.$executeRaw`SELECT set_config('meridian.school_id',${school.id},true)`;
    await tx.$executeRawUnsafe('SET LOCAL ROLE meridian_knowledge');
    await tx.$executeRaw`INSERT INTO "KnowledgeItem"("id","schoolId","title","content","category","createdBy","embedding") VALUES(${key},${school.id},'Attendance policy','Please report school absences to the class teacher.','POLICY',${admin.id},${vector}::vector)`;
    let rows=await tx.$queryRaw<any[]>`SELECT "id",1-("embedding" <=> ${vector}::vector) AS similarity FROM "KnowledgeItem" WHERE "id"=${key}`;
    ok('Vector create/read and cosine identity',rows.length===1 && rows[0].similarity>0.9999);
    await tx.$executeRaw`UPDATE "KnowledgeItem" SET "title"='Updated attendance policy',"embedding"=${vector}::vector WHERE "id"=${key}`;
    rows=await tx.$queryRaw<any[]>`SELECT "revision" FROM "KnowledgeItem" WHERE "id"=${key}`;
    ok('Vector update increments revision through trigger',rows[0].revision===2);
    await tx.$executeRaw`SELECT set_config('meridian.user_id',${teacher.id},true)`;
    rows=await tx.$queryRaw<any[]>`SELECT "id" FROM "KnowledgeItem" WHERE "id"=${key}`;
    ok('Teacher role can read vector entries',rows.length===1);
    const changed=await tx.$executeRaw`UPDATE "KnowledgeItem" SET "title"='Unauthorized change' WHERE "id"=${key}`;
    ok('Database RLS denies teacher update',changed===0);
    await reject('Database RLS denies teacher insert',`INSERT INTO "KnowledgeItem"("id","schoolId","title","content","category","createdBy","embedding") VALUES('${randomUUID()}','${school.id}','Denied','This insert should be rejected by database policy.','POLICY','${teacher.id}','${vector}'::vector)`);
    await tx.$executeRaw`SELECT set_config('meridian.school_id',${other.id},true)`;
    rows=await tx.$queryRaw<any[]>`SELECT "id" FROM "KnowledgeItem"`;
    ok('Database RLS denies wrong-school access',rows.length===0);
    await tx.$executeRaw`SELECT set_config('meridian.school_id',${school.id},true)`;
    await tx.$executeRaw`SELECT set_config('meridian.user_id',${admin.id},true)`;
    await tx.$executeRaw`DELETE FROM "KnowledgeItem" WHERE "id"=${key}`;
    rows=await tx.$queryRaw<any[]>`SELECT "id" FROM "KnowledgeItem" WHERE "id"=${key}`;
    ok('Vector delete removes searchable entry',rows.length===0);
    await tx.$executeRawUnsafe('RESET ROLE');
    const audit=await tx.$queryRaw<any[]>`SELECT "operation" FROM "KnowledgeRevision" WHERE "itemId"=${key} ORDER BY "id"`;
    ok('Audit trigger records INSERT UPDATE DELETE',audit.map(x=>x.operation).join(',')==='INSERT,UPDATE,DELETE');
    throw rollback;
  },{timeout:60000});
} catch(e){if(e!==rollback)throw e;}
finally{await db.$disconnect();}
console.log(JSON.stringify({passed:checks.length,checks,fixtureCleanup:'transaction rolled back'},null,2));
