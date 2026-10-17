# Notification providers and activation

The selected providers are Twilio SMS, SendGrid email and Firebase Cloud Messaging. In-app notification storage and authenticated realtime delivery work independently of these providers. Missing credentials disable the external channel; Meridian never reports a disabled or rejected request as delivered.

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
