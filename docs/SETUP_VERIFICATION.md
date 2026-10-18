# Setup/runbook verification — 18 October 2026

The root [README](../README.md) and [Flutter guide](../flutter_app/README.md) were rewritten against the current scripts, environment examples, API wiring, mobile dependencies and platform projects.

## Changes

- `node scripts/configure-local.mjs` works before npm installation, creates missing local configuration with matching PostgreSQL credentials and independent random JWT/document-storage keys, and preserves existing environment files.
- `npm run setup` no longer automatically runs the destructive demo seed. The documented initial seed is explicit and labelled as replacing the selected demo database's records.
- `npm run check:services` checks the website/API, analytics database health and face-model readiness, and returns a nonzero exit code for missing services.
- Local web sockets default to the website origin in the client environment example, avoiding an unreachable browser-localhost socket address when using another computer.
- Python services have explicit per-service virtual-environment commands. Lumen OCR is correctly documented as a Node/Tesseract pipeline.
- Android commands distinguish emulator, USB reverse, LAN phone and HTTPS release endpoints. Default Flutter builds do not require Firebase app setup.
- iOS now has camera/local-network permission descriptions, a separate Debug-only HTTP Info.plist, CocoaPods integration files and the iOS 15 minimum required by installed Firebase packages. Release/Profile do not use the permissive Debug plist.

## Executed checks

| Check | Result |
| --- | --- |
| Fresh configuration, matching credentials, URL encoding, independent keys and no-overwrite behaviour | Four Node tests passed |
| Local documentation targets and stale-placeholder checks | Passed |
| Website, Express, analytics and face service health checker | All four passed after starting services; missing-service checks correctly failed beforehand |
| Python analytics suite | 181 passed |
| Flutter 3.38.5 / Dart 3.10.4 analysis | No issues |
| Flutter tests | 36 passed |
| Android debug APK, `MERIDIAN_API_BASE=http://10.0.2.2:4000` | Built successfully |
| iOS plist parsing, permission keys, debug-only ATS allowance, project plist selection and target checks | Passed structural checks |

The new configuration tests also run in GitHub Actions before dependency installation. The existing native PostgreSQL/pgvector workflow continues to check clean npm installation, production builds, backend tests, database assertions and real embeddings on pushed source. Check the commit's Actions run for its own status; these local checks are not a substitute for that run.

## Verification limits

Docker Desktop is unavailable on this Windows verification host. Local live service checks reused the preserved isolated PGlite demo on port 55435 with its matching isolated document directory; they did not reset or seed the user's current demo records. The README's primary fresh-clone path uses native PostgreSQL/pgvector through Compose. A completely new Docker Desktop installation and a fresh native Compose volume were not created locally for this documentation task.

The Android APK compilation and automated tests passed; no physical-device installation, USB forwarding, camera/QR capture or background notification delivery is claimed by these checks. iOS cannot be compiled on this Windows host; Xcode/CocoaPods/device verification remains required on a Mac. Model/package downloads and native InsightFace compilation can depend on network availability and installed build tools. External SMS/email/push and OpenAI capabilities require their real provider configuration.
