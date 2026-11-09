# Notification providers and activation

The selected providers are Twilio SMS, SendGrid email and Firebase Cloud Messaging. In-app notification storage and authenticated realtime delivery work independently of these providers. Missing credentials disable the external channel; Meridian never reports a disabled or rejected request as delivered.

## In-app feed and read status

A school-wide announcement is one shared `Notification` row. A personal notification has a recipient `userId` and is visible only to that user in that school. Realtime arrival events follow the same distinction: broadcasts go to the school room; personal notices go to the recipient's room.

Opening a notice marks it read for the current account by inserting a `NotificationRead(notificationId, userId)` receipt. **Mark all read** inserts receipts only for that account's visible notices. It does not mark other people's copies read. PostgreSQL's unique key and duplicate-skipping inserts make repeated/concurrent requests idempotent. The feed currently lists the latest 50 visible notices, and its unread badge counts unread entries in that returned feed.

The web query cache and mounted page state are isolated by school, account and role, and are discarded on account changes, including impersonation and exit. Account changes clear old toasts and reconnect authenticated realtime channels. Old requests cannot overwrite a newly signed-in identity or sign it out through an obsolete 401 response. Notification API responses are private and non-cacheable.

Tabs in one browser profile share the login token. They now synchronize when another tab signs in or out, rather than showing one account's header while sending another account's token. Use a separate browser profile or private window for two simultaneous independent accounts.

The 10 November 2026 regression reproduced a student's read state appearing in the principal's view while the database still had no principal receipt. The cause was a single user-independent React Query cache with a 15-second freshness window. The fix replaces the entire cache at the account boundary, covering private feed contents as well as read flags. Existing school notifications/read receipts are preserved.

Verification: `server/tests/notification-isolation.test.ts` covers per-user receipts, private/school boundaries, cache headers and concurrent mark-all requests. From `server/`, run `npx tsx scripts/verify-notification-accounts.ts` with `BROWSER_EXECUTABLE` set to test rapid same-tab account switches, impersonation/exit, and cross-tab synchronization using a separate `TEST_DATABASE_URL`. Browser evidence is saved under `tmp/notification-verification/`.

The deployed fix passed all 202 server tests (including seven notification isolation tests), seven browser regression checks, TypeScript checks and the production build. All five local service health checks passed. Existing tabs must refresh once to load the updated client.

## Server configuration

Configure the ignored `server/.env` using the keys in `.env.example`:

| Channel | Configuration |
| --- | --- |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID` |
| SendGrid | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` (a verified sender) |
| Firebase | `FIREBASE_SERVICE_ACCOUNT_PATH`, an absolute path to a private service-account JSON file for the Firebase project |

Restart the API after configuring providers. `GET /api/notifications/channels` is administrator-only; System Settings shows the same configuration status. Credentials being supplied does not prove provider authorization or final delivery. SMS recipients must use E.164 numbers such as `+91…`. The adapters record accepted/failed/disabled outcomes without recording credentials, recipient addresses, message bodies or device tokens in the Trust Ledger. Provider acceptance is explicitly distinguished from final delivery; delivery receipts/webhooks are not implemented.

Keep private service-account files outside Git. Never put a server credential in Flutter build definitions. Only activate external delivery in an environment authorized to contact its recipients.

## Flutter remote push

Firebase packages and device registration are implemented. Remote push is opt-in; the default build still works without Firebase app configuration. Use the public Firebase app identifiers for the actual Android/iOS app:

```text
flutter run --dart-define=ENABLE_REMOTE_PUSH=true \
  --dart-define=FIREBASE_API_KEY=your-public-app-key \
  --dart-define=FIREBASE_APP_ID=your-app-id \
  --dart-define=FIREBASE_SENDER_ID=your-project-number \
  --dart-define=FIREBASE_PROJECT_ID=your-project-id
```

These line continuations are for a POSIX shell; use one line in PowerShell. iOS additionally needs the matching `FIREBASE_IOS_BUNDLE_ID`, Xcode push/background capabilities and APNs credentials configured in Firebase. Android requires a compatible device with Google Play services and notification permission. The SDK is initialized with explicit `FirebaseOptions`; no fabricated `google-services.json` is shipped.

An authenticated device registers at `POST /api/notifications/device` and unregisters at `DELETE /api/notifications/device`. Registration belongs to the current account, school and token version. Signing into another account transfers the device registration; sign-out detaches it. Inactive users, mandatory-password-change users and revoked token versions are excluded from delivery. Firebase invalid-device responses remove stale registrations. Notification payloads support OS presentation while backgrounded; foreground FCM/socket duplicates are suppressed locally.

Provider adapters were tested with mocked networks. The Android APK compiled with Firebase dependencies. Actual carrier/email delivery, APNs provisioning, physical-device background delivery and notification permissions still require credentials and device verification. No real external message was sent during the repair checks.

## Notice drafting without OpenAI

Manual notices use **Use my wording**, then staff review the text and choose **Review & Send**. AI drafting is disabled visibly when the server has no OpenAI key. Manual notices are not falsely recorded as AI-assisted.

## Provider references

Implementation follows the official [Twilio Messages resource](https://www.twilio.com/docs/messaging/api/message-resource), [SendGrid Mail Send API](https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send), [FCM HTTP v1/Admin SDK delivery](https://firebase.google.com/docs/cloud-messaging/send/v1-api), and [Firebase Flutter messaging setup](https://firebase.google.com/docs/cloud-messaging/flutter/get-started).
