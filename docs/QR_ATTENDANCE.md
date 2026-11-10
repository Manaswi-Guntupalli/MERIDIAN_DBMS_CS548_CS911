# QR + face attendance: both checks required

Every new session requires **both a valid QR scan and a matching enrolled face**, for the same student, in the same active session. Either order works:

- QR -> **QR verified, awaiting face** -> matching face -> **Present**.
- Face -> **Face verified, awaiting QR** -> that student's QR -> **Present**.

The single-factor mode selector is removed. The API rejects attempts to request QR-only or face-only sessions. PostgreSQL also rejects new Present verifications without both timestamps and a passing face confidence. Session-level manual marking cannot bypass these proofs. The legacy single and bulk manual APIs cannot set Present or Late either. Absent/Leave corrections remain available and audited.

Legacy active sessions were closed during the upgrade. Completed historical attendance was preserved with its original evidence; start a fresh session to test the new policy.

## Demo accounts

| Device | Account | Class | Password |
| --- | --- | --- | --- |
| Computer, teacher | `teacher@meridian.school` — Mr. Rao | 6A | `meridian123` |
| Phone, student | `student@meridian.school` — Rohan Rao | 6A | `meridian123` |
| Computer, enrollment | `principal@meridian.school` | School administrator | `meridian123` |

The updated ARM64 release APK is installed on the connected phone, signed in as Rohan. The student Scan tab is open. No personal camera images were saved by the verification work.

Rohan currently has **no face enrollment** in the live school database. Complete the consent-based enrollment in step 1 before the hands-on test.

## Test QR first

1. **Enroll the correct student first.** On the website, sign in as Principal and open **Presence -> Enrollment**. With the person's consent, enroll the face belonging to Rohan's demo account under **Rohan Rao**, capturing the required validated frames. Enrollment is not attendance; use that same person for the face test.
2. Sign in on the computer as **Teacher**, open <http://localhost:5173/presence>, select **6A**, and click **Start attendance**. All new sessions require QR + face; there is no single-factor option.
3. Display the session QR, using **Projector** if desired. On the phone, confirm Student/Rohan/6A, tap **Scan**, and scan before the countdown expires (five minutes by default).
4. The phone must show **QR verified — awaiting face**, with a pending indicator. Rohan is **not Present** yet. The teacher's live register must also show pending, with no count increase.
5. Open **Presence -> Kiosk** in another computer window, select **6A**, and click **Start kiosk**. It reuses the same active class session. Show the enrolled student's face to the classroom camera. You can switch to the kiosk after scanning, or put the kiosk and projector windows side by side.
6. Once the face matches Rohan, his row turns green as **Present**, the count increases, and the phone/browser scan page updates automatically. A face recognized as another student cannot complete Rohan's QR.
7. End attendance. The summary/PDF/Excel method should say **QR + Face**, with stored proof timestamps and face confidence. The normal school start-time/grace rule can label the daily entry late; this still means attendance was recorded.

## Test face first

Start a fresh 6A session, then use its Kiosk before scanning. Rohan's matching face must produce **Face verified — awaiting QR**, without an attendance event or a Present count increase. Scan that same session's QR while signed into Rohan's phone account. The second factor completes attendance immediately. Do not reuse an old session's face evidence or QR.

## Rejection checks

- One factor only: leave it incomplete and let the session expire or end it. QR-only becomes **Unverified QR**; face-only/neither becomes **Absent**. No Present notification or attendance event is written.
- Cross-student factors: Rohan's QR plus somebody else's face cannot mark Rohan Present. Each face is stored only against the identity it matches, not a different pending student.
- A face explicitly submitted against a QR claimant that does not match is **Proxy blocked**. The block remains for that session; rescanning, a later matching face, or manual session marking cannot silently clear it. The teacher must review it and use a fresh session if appropriate.
- Wrong class, wrong school, invalid token, closed or expired session: reject the scan.
- Repeated/concurrent checks: one verification completion, one attendance event and one parent notification.
- A Parent account cannot submit student QR attendance. Teachers can manage only their own class.

## USB and restart setup

Keep the computer services and the USB connection active. From the repository root, restart services with `npm run start:native`, then `npm run check:services`. The phone APK uses the computer API through USB:

```powershell
& 'C:/Users/Manaswi G/AppData/Local/Android/sdk/platform-tools/adb.exe' -s eee95aae reverse tcp:4000 tcp:4000
& 'C:/Users/Manaswi G/AppData/Local/Android/sdk/platform-tools/adb.exe' -s eee95aae reverse tcp:5173 tcp:5173
```

Repeat after reconnecting/restarting the phone or ADB. Port 5173 also lets a normal phone camera open the QR in the phone browser: sign in as Student and tap **Mark My Attendance**. That page stays pending until the classroom face check and updates automatically. For browser cameras, localhost over USB is a secure context; a LAN browser camera needs HTTPS.

## Verification evidence

- **216 backend tests passed**, including both orders, cross-student proof separation, latched proxy blocking, concurrency, expiry, permissions, undo, private progress reads and database constraint checks.
- **47 Flutter tests passed**, including scanner-widget pending-to-Present polling, face-first completion, blocked/expired results, and camera-tab lifecycle behavior. The camera and HTTP transport are mocked only in widget tests.
- **11 website checks passed** against isolated test data, using the actual rendered QR, both orders, automatic teacher/student updates, repeat-scan idempotence, closed-code rejection and dual-proof summaries.
- **9 real face-engine/browser checks passed** using a public sample video: enrollment, invalid captures, consent, face-only pending, QR completing the verified face, no blink gate, and no duplicate attendance.
- Both production builds passed. The final Flutter analyzer rerun was declined; 47 Flutter tests passed, and the redundant imports it reported were removed. All six APK variants were rebuilt, and the final ARM64 release is installed. Four physical-phone camera/lifecycle checks passed.
- The final physical optical scan and the person's own enrolled-face accuracy check still require the hands-on steps above. Automated tests did not alter real school attendance or send external notifications.

Evidence: `tmp/dual-*.log`, `tmp/qr-verification/browser-results.json`, `tmp/face-verification/browser-results.json`, and `tmp/qr-verification/phone-scanner-results.json`.
