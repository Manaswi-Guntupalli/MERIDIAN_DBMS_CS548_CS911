# Setup and evaluation walkthrough

1. Follow the root README setup. Start the database, API, Next.js, and optional Python services. Confirm /api/health. Sign in as principal using the documented local demo account.
2. Open SCHEMA.md in GitHub to render the ER diagram. Explain School, User, Student, Class, Fee/Payment, Attendance, TimetableSlot and KnowledgeItem; show keys in migration.sql.
3. Run `docker compose exec -T db psql -U meridian -d meridian` and paste database/demo.sql (or use input redirection in your shell). Set the username/database to your .env values. Explain rollback-only DDL/DML.
4. Open **Database Lab**. Execute class balances, above-average fees, unpaid students, attendance CTE and recursive weekly query. Show SQL and actual rows, then vector indexes and role policies.
5. Open **Fees**, record part of a balance, and show the live aggregate. Explain the stored function's row lock and why a second payer cannot exceed the remaining fee.
6. Open **Knowledge Library**. Create a policy titled “Reporting student absence” with text describing guardian reporting to the class teacher before morning attendance. Wait for the first model download. Search “what should I do if my child misses school?”. Show model/dimension/metric in the API and the returned relevance score.
7. Edit the policy, change its meaning, save, and repeat the search. Show revision increment. Delete the entry and verify it no longer appears. Show KnowledgeRevision INSERT/UPDATE/DELETE counts in Database Lab.
8. Import a processed Lumen document by its ID or a school-wide notice ID. Explain source provenance, paragraph-size entries and model truncation. Do not import private student forms into a general staff library.
9. Sign in as teacher: search/list should work; create/edit/delete controls are absent, and direct write API requests return 403. Run `npm --prefix server run db:verify` to show the independent database RLS denials.
10. Demonstrate existing workflows: student records; timetable generation/review/publication; attendance session/QR; trust ledger; notifications. Use the Flutter app with its existing backend URL. Camera/face and forecast features require their optional Python services and model dependencies.
11. Run build, tests and database verification. Review TESTING.md and honestly distinguish checks executed locally from remaining Docker/full-stack checks.
12. Each team member identifies their real commits and explains/modifies both database and application work. Fill CONTRIBUTIONS.md with evidence before submission.

Capture fresh screenshots of login, Database Lab query results, knowledge search, edited revision and teacher access restrictions. Existing screenshots show prior Meridian screens; label fresh screenshots with test date and environment rather than claiming they are current automatically.

## Recovery and original repository

Original .git metadata is retained under ignored `.backups/git-original` if migration completed. The old GitHub repository is not modified. The new origin is MERIDIAN_DBMS_CS548_CS911. To inspect the original history without changing this working tree, use `git --git-dir=.backups/git-original log`. Do not delete the backup until the new repository and project are verified.
