import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, badRequest, notFound } from '../lib/errors.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../utils/validate.js';
import { recordEvent } from '../services/eventStore.js';
import { notify } from '../services/notifications.js';
import { STAFF_ADMIN } from '../utils/constants.js';
import { randomUUID } from 'node:crypto';

const router = Router();
router.use(authenticate);
router.use(authorize(...STAFF_ADMIN));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const schoolId = req.user!.schoolId;
    const { status } = req.query as { status?: string };
    // A fee is overdue when it is past its due date and not fully paid —
    // derived live, independent of the stored (frozen-at-creation) status.
    const now = Date.now();
    const isOverdue = (f: { paid: Prisma.Decimal; amount: Prisma.Decimal; dueDate: string }) =>
      f.paid.lessThan(f.amount) && new Date(f.dueDate).getTime() < now;

    const [fees, allFees] = await Promise.all([
      prisma.fee.findMany({
        where: { schoolId },
        include: { student: { include: { class: true } }, payments: true },
        orderBy: { dueDate: 'asc' },
      }),
      // The summary describes the whole school, so it stays stable no matter
      // which status filter the list is showing.
      prisma.fee.findMany({
        where: { schoolId },
        select: { amount: true, paid: true, dueDate: true, studentId: true },
      }),
    ]);
    const summary = {
      total: allFees.reduce((a, f) => a + f.amount.toNumber(), 0),
      collected: allFees.reduce((a, f) => a + f.paid.toNumber(), 0),
      outstanding: allFees.reduce((a, f) => a + (f.amount.minus(f.paid).toNumber()), 0),
      // "Accounts due" = distinct students with a past-due, not-fully-paid fee.
      overdue: new Set(allFees.filter(isOverdue).map((f) => f.studentId)).size,
    };
    res.json({
      fees: fees.filter(f => !status || (status === 'OVERDUE' ? isOverdue(f) : !isOverdue(f) && f.status === status)).map((f) => ({
        id: f.id,
        title: f.title,
        amount: f.amount,
        paid: f.paid,
        due: f.amount.minus(f.paid).toNumber(),
        dueDate: f.dueDate,
        status: f.status,
        overdue: isOverdue(f),
        student: f.student.name,
        studentId: f.studentId,
        class: f.student.class?.name,
      })),
      summary,
    });
  }),
);

const paySchema = z.object({
  feeId: z.string(),
  amount: z.number().positive().max(9999999999.99).refine(n=>new Prisma.Decimal(n).decimalPlaces() <= 2, 'Use at most two decimal places'),
  method: z.string().optional(),
  reference: z.string().optional(),
});
router.post(
  '/pay',
  authorize(...STAFF_ADMIN),
  validateBody(paySchema),
  asyncHandler(async (req, res) => {
    const schoolId = req.user!.schoolId;
    const body = req.body as z.infer<typeof paySchema>;
    const fee = await prisma.fee.findFirst({ where: { id: body.feeId, schoolId } });
    if (!fee) throw notFound('Fee not found');
    if (fee.amount.minus(fee.paid).lessThan(body.amount)) throw badRequest('Amount exceeds outstanding balance');

    const paymentId = randomUUID();
    const {payment,paid,status,event} = await prisma.$transaction(async tx=>{
      const [result] = await tx.$queryRaw<{paymentId:string;paid:number;status:string}[]>`
        SELECT * FROM record_fee_payment(${fee.id},${schoolId},${body.amount}::numeric,
          ${body.method ?? 'CASH'},${body.reference ?? null},${paymentId})`;
      const payment=await tx.payment.findUniqueOrThrow({where:{id:paymentId}});
      const event=await recordEvent({schoolId,type:'FEE_PAYMENT_RECORDED',aggregate:'Fee',aggregateId:fee.id,
        payload:{feeId:fee.id,paymentId:payment.id,amount:body.amount},actorId:req.user!.sub,actorName:req.user!.name},tx);
      return {payment,...result,event};
    }).catch(error=>{
      if(String(error?.meta?.message ?? '').includes('amount exceeds outstanding balance')) {
        throw badRequest('Amount exceeds outstanding balance');
      }
      throw error;
    });
    event.emit();
    res.json({ payment, status, paid });
  }),
);

// Draft reminders to all overdue accounts (Command Center action).
// Each reminder is addressed ONLY to the people it concerns — the student's
// own account and their linked guardians. A fee notice as a school-wide
// broadcast (the old behaviour) leaked every family's dues to every user.
router.post(
  '/remind',
  authorize(...STAFF_ADMIN),
  asyncHandler(async (req, res) => {
    const schoolId = req.user!.schoolId;
    const now = Date.now();
    const all = await prisma.fee.findMany({
      where: { schoolId },
      include: { student: { include: { parents: { include: { parent: true } } } } },
    });
    // Same overdue rule as the list endpoint above — the stored status would
    // also pull in fees that are simply not due yet.
    const overdue = all.filter((f) => f.paid.lessThan(f.amount) && new Date(f.dueDate).getTime() < now);

    let recipients = 0;
    for (const f of overdue.slice(0, 25)) {
      const due = Math.round(f.amount.minus(f.paid).toNumber()).toLocaleString('en-IN');
      const targets = new Set<string>();
      if (f.student.userId) targets.add(f.student.userId);
      for (const link of f.student.parents) targets.add(link.parent.userId);
      for (const userId of targets) {
        await notify({
          schoolId,
          userId,
          title: 'Fee reminder',
          body: `₹${due} is due for ${f.student.name} — ${f.title} (due ${f.dueDate}).`,
          severity: 'WARNING',
          category: 'FEES',
        });
        recipients++;
      }
    }

    const drafted = Math.min(25, overdue.length);
    // The drafting admin gets one private summary, not a stream of broadcasts.
    await notify({
      schoolId,
      userId: req.user!.sub,
      title: 'Fee reminders sent',
      body: `${drafted} reminder(s) delivered to ${recipients} student/guardian account(s).`,
      severity: 'SUCCESS',
      category: 'FEES',
    });
    res.json({ drafted, recipients });
  }),
);

export default router;
