# Face enrollment and recognition verification

The enrollment error in the screenshot came from the API's 20-second abort being reported as an unreachable service. The service was reachable during diagnosis. The previous pipeline also ran optional landmark/attribute models and unrestricted ONNX session thread pools while the browser computed identity descriptors that the server did not use.

The face engine now runs detection and recognition only, with two CPU threads per model by default and serialized inference. Existing `insightface-buffalo_l` 512-dimensional enrollment templates remain compatible. Matching thresholds were preserved.

## Capture flow

1. Open Presence → Enrollment at <http://localhost:5173/presence/enrollment>.
2. Choose **Enroll face** or **Re-enroll** for the intended student/staff member.
3. Keep one person's whole face visible in even light. Capture a front view, then two slight turns as prompted. Avoid large turns, moving during capture, or pointing the camera up from below the face.
4. Each capture is checked by the real face engine. Blank, multiple-person, cropped, small, low-confidence, dark/overexposed or blurred frames receive retake guidance. Only accepted frames advance the counter.
5. Confirm consent and enroll after three accepted frames. All frames are revalidated before an atomic template replacement. Inconsistent faces are rejected; a failed request preserves existing enrollment.

Frames are processed in memory. The frame-check response contains guidance, not a face embedding; enrollment stores templates rather than images. Processing timeouts return 504; unavailable engines return 503. The kiosk displays failures instead of silently swallowing them. In an active session it sends camera frames directly to the face engine, without a blink requirement or a second browser detector gating recognition. The server returns face-box coordinates and stores evidence on the confidently matched student's own session row. A face alone stays **Face verified — awaiting QR**. A QR alone stays **QR verified — awaiting face**. Only both checks for that same student in the same active session produce Present. Either order works; incomplete checks expire without attendance. Only one frame request runs at a time, and repeated recognition does not duplicate attendance or success notifications. Enrollment remains a separate consent-based action.

## Executed checks — 9 November 2026

- 195 server tests passed across 26 files, including nine new face enrollment/error-handling tests.
- Nine Python face-service tests passed, including no face, multiple faces, cropped/small/blurred frames and template shape.
- Four real-model integration checks passed against a separate native PostgreSQL test database: frame validation, blank-frame rejection, three-template enrollment, and correct-student attendance with duplicate prevention.
- Eight browser checks cover camera startup, retake guidance, three accepted frames, consent, saved/updated enrollment, automatic attendance from a static face video without blinking, duplicate prevention, and no browser exceptions. They use the real face engine and a separate test database. The physical webcam is not accessed by this test.
- Production builds and TypeScript checks passed. All five service checks passed.
- A sample warm inference took about 0.5 seconds versus 2.7 seconds in the original pipeline on this computer. Six simultaneous sample requests all completed within 2.7 seconds. These are local sample timings, not a production latency guarantee.

Evidence and screenshots: `tmp/face-verification/`. Test faces use a public scikit-image sample, never the user's camera image. No sample enrollment is written to the school database.

The timetable substitute test fixture also explicitly includes an available qualified reserve teacher. This guarantees its cover-assignment assertions have eligible cover even when timetable generation uses every other qualified teacher in the affected periods; production scheduling rules are unchanged.

Reproduce from `server/` with the running face engine:

```powershell
npx tsx scripts/verify-face-enrollment.ts
$env:BROWSER_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npx tsx scripts/verify-face-browser.ts
```

These scripts refuse the school database and require a separate `TEST_DATABASE_URL` ending in `_test`. For Python unit checks, run `python -m pytest -q test_app.py` from `faceservice/`.

Restart local services with `npm run start:native` from the repository root. A physical-camera enrollment and recognition check is still required for the actual lighting, glasses, camera position and people used in the demonstration. Passing sample tests does not establish perfect accuracy or comprehensive anti-spoof protection.
