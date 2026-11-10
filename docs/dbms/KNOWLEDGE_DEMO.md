# Knowledge Library: ready-to-use presentation

Prepared on **10 November 2026** in the current Meridian Public School database. **Ten demonstration entries are saved persistently**, with real 384-dimensional MiniLM embeddings generated through the running website/API and stored in PostgreSQL/pgvector. The paragraphs are sample school guidance, identified as demonstration entries; they are not a claim that the school has officially adopted those policies.

## Fast presentation steps

1. Open [Knowledge Library](http://localhost:5173/knowledge) as Principal, Administrator or Teacher. If it was already open, refresh or press **Show all** to load the saved entries.
2. Set the category to **All categories**. Paste one question below and press **Search**.
3. Explain that different wording can retrieve a relevant policy because the question and paragraph are compared by meaning. The displayed similarity is a ranking score, not a probability.

You do not need to upload documents, type paragraphs or create embeddings during the presentation. The model was warmed in the running API after preparation. After restarting services, run one search before the demonstration to load it into memory again; cached model files avoid a repeated download when intact.

## Verified questions and first results

All eight questions returned the following entry first through the actual website/API. Exact scores and latency can vary with data or runtime changes.

| Paste this question | Expected first result | Category |
| --- | --- | --- |
| What should I do when my child misses class? | Reporting student absence | POLICY |
| How do I pay school fees and find my receipt? | Fee payment deadlines | POLICY |
| How many books can a student borrow and for how long? | Library borrowing rules | POLICY |
| What should students do when the school is evacuated? | Emergency assembly instructions | NOTICE |
| Where do I check if my classroom or teacher changes? | Published timetable changes | NOTICE |
| What precautions should students take during chemistry experiments? | Science laboratory safety | DOCUMENT |
| Who should a student tell about bullying or online harassment? | Reporting bullying and student concerns | POLICY |
| Which documents and details are needed to admit a new student? | Student admission document checklist | DOCUMENT |

Two additional saved entries are **Late arrival and attendance correction** and **Teacher leave and substitute arrangements**. The complete collection contains **6 POLICY, 2 NOTICE and 2 DOCUMENT entries**.

For a short demonstration, use the first three questions. For category filtering, select **NOTICE** and search the evacuation question: only notice entries appear. **Show all** ignores the search/category controls and restores the ordinary list of saved school entries; set All categories again before another unrestricted search.

## Verification and persistence

- All ten entries were created using authenticated `POST /api/knowledge`; the existing application generated genuine embeddings, applied PostgreSQL RLS context and recorded audit revisions.
- Eight semantic first-result checks and a category-filter check passed through the Next.js API rewrite.
- Nine headless Edge browser checks passed, including login, all ten saved entries, search result rendering, NOTICE filtering, Show all and absence of uncaught browser errors.
- Local preparation results, entry text and browser evidence are under `tmp/knowledge-demo/`; that ignored folder is not the database.
- The rows persist in the local PostgreSQL database across normal service/computer restarts. GitHub source does not contain this computer's live database. **Do not run the destructive school seed to prepare for the presentation.**

This operation intentionally added knowledge entries to the actual school database. Earlier SQL expected-output files remain dated snapshots; live-data changes should be interpreted using the [SQL verification guidance](../../database/rubric/VERIFICATION.md). No existing student, fee, timetable or attendance record was edited by the knowledge preparation.
