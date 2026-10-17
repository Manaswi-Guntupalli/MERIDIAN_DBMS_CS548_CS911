-- Preserve school records. Fail clearly on existing duplicate admissions rather
-- than choosing an arbitrary child to remove or silently renumber.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Student" GROUP BY "schoolId","admissionNo" HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Duplicate school admission numbers: resolve the duplicates before migrating';
  END IF;
  IF EXISTS (SELECT 1 FROM "Fee" WHERE abs("amount"::numeric-round("amount"::numeric,2)) > 0.0000001
    OR abs("paid"::numeric-round("paid"::numeric,2)) > 0.0000001)
    OR EXISTS (SELECT 1 FROM "Payment" WHERE abs("amount"::numeric-round("amount"::numeric,2)) > 0.0000001) THEN
    RAISE EXCEPTION 'Currency with more than two decimal places: review before migrating';
  END IF;
END $$;
DROP VIEW IF EXISTS school_fee_summary;
ALTER TABLE "Fee" ALTER COLUMN "amount" TYPE numeric(12,2) USING round("amount"::numeric,2),
  ALTER COLUMN "paid" TYPE numeric(12,2) USING round("paid"::numeric,2);
ALTER TABLE "Payment" ALTER COLUMN "amount" TYPE numeric(12,2) USING round("amount"::numeric,2);
CREATE UNIQUE INDEX "Student_schoolId_admissionNo_key" ON "Student"("schoolId","admissionNo");
