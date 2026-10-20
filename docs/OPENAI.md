# OpenAI setup

If a key was shared in chat or committed, revoke it in the OpenAI dashboard and create a new project key. Do not paste it into chat.

From the project folder:

```powershell
npm run configure:openai
```

Paste the **new** key into the terminal's hidden prompt and press Enter. It saves only `OPENAI_API_KEY` in the ignored `server/.env`; database, JWT and document encryption settings stay untouched. Alternatively, edit that variable in `server/.env` yourself. Never add it to `client/.env.local`, a `NEXT_PUBLIC_` variable, Flutter or Git.

Keep `OPENAI_MODEL=gpt-4o-mini` unless you deliberately choose another compatible Chat Completions model. The project must have API billing/quota and access to the configured model.

Restart the API and Python intelligence service using your usual run commands. Sign in as **Super Admin**, open **Settings → OpenAI connection → Test connection**. Configuration alone does not prove connectivity. This button makes a small billable test request without school data and reports authentication, permission, quota, rate-limit and timeout errors. Refresh Settings after changing configuration. The key is never returned to the browser.

## Where it is used

| Feature | OpenAI's job | Without a working key |
| --- | --- | --- |
| Copilot, including Flutter | Classify supported questions and phrase answers from school-scoped database/analytics facts | Keyword routing and data-based answers |
| Reports → Regenerate | Write the operations summary from current metrics | Labelled template summary |
| Notice composer → Draft | Turn the supplied subject/context into a draft | AI draft unavailable; manual compose/send still works |
| Lumen processing | Suggest repairs for low-confidence OCR text fields; suggestions are validated and checked against source text | Local text/OCR extraction and review |
| Intelligence dashboard | Polish explanation sentences from computed evidence; wait at most two seconds, reuse completed results for unchanged evidence | Original deterministic explanations; a slow request cannot hold up the dashboard |

Relevant question text, school facts, notice context or document OCR excerpts are sent to OpenAI when those features run. API usage is billable. The API key itself stays on the server. Requests set `store: false`; this is not a claim of zero provider retention. Do not upload sensitive school records without the appropriate authorization.

OpenAI does not run SQL, create students, send notices automatically, match faces, produce embeddings for pgvector search, calculate fees or train the forecasting models. Existing authorization, review and database transaction checks still apply. Fluently written AI text still needs human review.

## Quick verification

1. Test the connection in Super Admin Settings; it should report success.
2. In Copilot ask **“What is the fee collection summary?”** and check its AI source label and database figures.
3. Regenerate Reports; check the timestamp, completed state and AI/template source label.
4. In the notice composer supply a subject and context, then request a draft. Review it before sending. Drafting alone sends no notifications.
5. Upload a fictional Lumen form. OCR repair is attempted only if there are doubtful fields; clean forms need no AI repair. Review the extracted fields before committing.

Automated tests disable real provider credentials and mock successful/failing requests. They do not prove a user's live key, billing or project permissions work.

Browser regression check (with the web server running, uses fictional API responses):

```powershell
node scripts/verify-openai-settings.mjs
```

Set `BROWSER_EXECUTABLE` to your Edge/Chrome executable if Playwright's Chromium is not installed.

Verified locally on 20 October 2026: server and Next.js production builds; 183 server tests against isolated PGlite PostgreSQL + pgvector; 192 Python tests (including slow-provider isolation); five configuration-script checks; six mocked browser scenarios. After the connection-check punctuation fix, the 23 focused server tests passed again. Live `gpt-4o-mini` connection, JSON/text generation and Python prose polish passed using fictional prompts only. No live school data was sent during these integration checks. A saved key is local configuration and will not be included in GitHub clones.

Official references: [API authentication](https://developers.openai.com/api/reference/overview), [Chat Completions request options](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).
