# Meridian mobile companion

Flutter client for Meridian's existing Express API. Principal, teacher, student and parent accounts receive their role-specific screens. The app shares the website's school records; it does not run a separate mobile database or start the backend.

Complete [website/backend setup](../README.md#run-the-website-from-a-fresh-clone) first. PostgreSQL and Express must stay running. Analytics features need the intelligence service; face verification needs the face service. Lumen's web document review and SQL playground remain web features.

## 1. Install and check tools

- Reproducible SDK: **Flutter 3.38.5 / Dart 3.10.4**. The project's Dart constraint is `^3.10.4`. Avoid changing dependencies with `pub upgrade` during initial setup; use the committed lockfile with `pub get`.
- Android: Android Studio, **Android SDK Platform 36**, build tools and Command-line Tools; a running emulator or USB-debug-enabled Android device. With Flutter 3.38.5 the effective minimum is **Android 7.0 / API 24** (`maxOf(flutter.minSdkVersion, 23)`). The project uses Java 17 bytecode; use Android Studio's compatible bundled JDK and check `flutter doctor -v` for the selected toolchain. Gradle downloads its pinned distribution and may install the required NDK after licenses are accepted, so allow time and disk space for the first build.
- iOS: **macOS and Xcode**, iOS simulator support and CocoaPods. Current Firebase dependencies require **iOS 15+**. Windows cannot build or run the iOS target.

Official setup: [Flutter SDK](https://docs.flutter.dev/install), [Android](https://docs.flutter.dev/platform-integration/android/setup), [iOS](https://docs.flutter.dev/platform-integration/ios/setup).

From the repository root:

```powershell
cd flutter_app
flutter --version
flutter doctor -v
flutter doctor --android-licenses
flutter pub get
flutter devices
```

Read and accept SDK licenses when prompted. If Android tooling is missing, install it through Android Studio's SDK Manager before proceeding. No Riverpod/freezed generation command is required for the checked-in source.

## 2. Choose the correct API address

`MERIDIAN_API_BASE` is the **Express origin**, not the website or Python engine. Supply the scheme, host and port **without `/api` or a trailing slash**. The app appends `/api` for HTTP and uses the same origin for Socket.IO.

| Device | API base |
| --- | --- |
| Standard Android emulator on the backend computer | `http://10.0.2.2:4000` |
| Android USB phone with `adb reverse` | `http://127.0.0.1:4000` |
| Android/iPhone on the same Wi-Fi | `http://YOUR_PC_LAN_IP:4000` |
| iOS simulator on the backend Mac | `http://127.0.0.1:4000` |
| Release build against a deployed backend | `https://YOUR_API_HOST` |

The default is the Android emulator address. `localhost` on a Wi-Fi phone means **the phone itself**, not your computer. Dart definitions are build-time settings: stop and rerun/rebuild after changing them; hot reload does not change the API base.

### Android emulator

Start an emulator in Android Studio's Device Manager, then:

```powershell
flutter devices
flutter run --debug -d emulator-5554 --dart-define=MERIDIAN_API_BASE=http://10.0.2.2:4000
```

Replace `emulator-5554` with the exact ID shown on your machine. If using a nonstandard emulator, use its documented host mapping. Emulated camera input may not be suitable for reliable face verification; use a physical phone for the attendance demonstration.

### Physical Android phone over USB (recommended local demo)

Enable Developer options and USB debugging on the phone, connect it, and approve its USB-debugging prompt. Install its Windows USB driver if needed. `adb` is in Android SDK `platform-tools`; add that directory to PATH if the command is unavailable.

```powershell
adb devices
adb -s YOUR_ANDROID_DEVICE_ID reverse tcp:4000 tcp:4000
flutter run --debug -d YOUR_ANDROID_DEVICE_ID --dart-define=MERIDIAN_API_BASE=http://127.0.0.1:4000
```

Use the same device ID in both commands. USB reverse forwards the phone's port 4000 to the computer's API; no LAN firewall rule or phone Wi-Fi address is required. Reapply it after reconnecting/rebooting the phone if necessary.

### Physical phone over Wi-Fi

1. Connect the computer and phone to the same network; disable guest/client isolation or use another network if devices cannot reach one another.
2. Find the computer's IPv4 address: `ipconfig` on Windows; `ip addr` on Linux; Wi-Fi settings on macOS. For example, `192.168.1.50`.
3. From the phone browser, open `http://192.168.1.50:4000/api/health`. It must return JSON before Flutter login can work. If blocked, allow the Node API through the computer's firewall on the private network. Do not expose PostgreSQL or the Python engine ports to the phone.
4. For Android, while the device is connected for installation/debugging:

```powershell
flutter run --debug -d YOUR_ANDROID_DEVICE_ID --dart-define=MERIDIAN_API_BASE=http://192.168.1.50:4000
```

Replace the example IP and device ID. Native Flutter is not a browser, so changing the API's browser `CLIENT_ORIGIN` to the phone IP is unnecessary. Both its REST and realtime connections use `MERIDIAN_API_BASE`.

## 3. Sign in and exercise the app

After running the initial backend seed, all these demo accounts use password **`meridian123`**:

| Role | Email | Suggested check |
| --- | --- | --- |
| Principal | `principal@meridian.school` | Overview, attendance, timetable, notices, reports and notifications |
| Teacher | `teacher@meridian.school` | Assigned-class/session attendance flows |
| Student | `student@meridian.school` | Own timetable/attendance and session QR scanning |
| Parent | `parent@meridian.school` | Linked-child attendance, fees, timetable and alerts |

Use the web interface for administrator-wide management workflows. Newly provisioned accounts may require changing a temporary password before other screens become available.

For a QR demo, open a class attendance session as an authorized teacher/admin on the website and display its QR on the computer. Sign in as a student assigned to that class on the phone and grant camera permission. Face verification additionally needs enrollment, consent and a healthy face engine; installing the APK alone does not enroll anyone. Confirm the actual attendance result in the web register. Session expiry, class assignment and anti-proxy checks still apply.

## 4. Build and install an Android demo APK

From `flutter_app/`, for a Wi-Fi phone:

```powershell
flutter build apk --debug --dart-define=MERIDIAN_API_BASE=http://192.168.1.50:4000
adb -s YOUR_ANDROID_DEVICE_ID install -r build/app/outputs/flutter-apk/app-debug.apk
```

Substitute the actual LAN IP. For a USB-only demo, build with `http://127.0.0.1:4000` instead and keep the USB reverse mapping active. An APK built with `10.0.2.2` is for the standard emulator, not a standalone Wi-Fi phone. The backend computer must remain running and reachable after installation.

Debug builds permit local HTTP. **Android release builds require HTTPS** under the checked-in network security policy. The current release Gradle configuration uses the debug signing key, so it is not a store-ready signing setup; configure your own signing before distribution.

## 5. iOS setup (Mac only)

The project includes a CocoaPods `Podfile` and uses the CocoaPods workflow for the verified Flutter 3.38.5 SDK. Do not switch SDK/package-management modes midway through setup. Install Xcode, its command-line tools/simulator runtime, and CocoaPods. Start the following block in the **repository root**:

```bash
cd flutter_app
flutter doctor -v
flutter pub get
cd ios
pod install
cd ..
open -a Simulator
flutter devices
flutter run --debug -d YOUR_IOS_SIMULATOR_ID --dart-define=MERIDIAN_API_BASE=http://127.0.0.1:4000
```

These commands assume you started in the repository root. Replace the simulator ID. For a real iPhone, open `ios/Runner.xcworkspace` in Xcode, choose your development team and signing identity, trust the device and enable Developer Mode when required. Use the Mac/backend computer's LAN API address when running on the phone:

```bash
flutter run --debug -d YOUR_IPHONE_ID --dart-define=MERIDIAN_API_BASE=http://192.168.1.50:4000
```

The app declares camera/microphone and local-network permission descriptions. Its **Debug** Info.plist permits HTTP development connections; Release/Profile retain standard ATS restrictions and should use HTTPS. The minimum iOS target is 15.0, matching the installed Firebase pod requirements. Approve local-network/camera permissions on the device. Simulator builds do not establish physical-camera or APNs functionality.

**iOS build/device verification requires a Mac and has not been executed on the Windows verification host.** These project fixes are configuration changes, not a claim of a successful Xcode build.

## Optional Firebase remote push

Default builds work without Firebase app identifiers. In-app/realtime/local notifications are distinct from remote delivery while the app is closed. Enable remote push only after configuring the server Firebase service account and the public Firebase app identifiers for your Android/iOS application. See [provider instructions](../docs/NOTIFICATIONS.md).

Example command (one line, works in PowerShell and POSIX shells after replacing the values):

```text
flutter run --debug -d DEVICE_ID --dart-define=MERIDIAN_API_BASE=https://YOUR_API_HOST --dart-define=ENABLE_REMOTE_PUSH=true --dart-define=FIREBASE_API_KEY=PUBLIC_APP_KEY --dart-define=FIREBASE_APP_ID=APP_ID --dart-define=FIREBASE_SENDER_ID=PROJECT_NUMBER --dart-define=FIREBASE_PROJECT_ID=PROJECT_ID
```

For iOS add the matching `FIREBASE_IOS_BUNDLE_ID`, Xcode push/background capabilities and Firebase APNs configuration. Never put a server service-account key in Dart definitions. Grant notification permission; actual background delivery must be checked on a configured device.

## Verification and troubleshooting

From `flutter_app/`:

```powershell
flutter analyze
flutter test
flutter build apk --debug --dart-define=MERIDIAN_API_BASE=http://10.0.2.2:4000
```

| Problem | Action |
| --- | --- |
| `flutter` not found | Install the Flutter SDK and add its `bin` directory to PATH, then reopen the terminal. The IDE plugin alone is insufficient. |
| Dart SDK constraint fails | Use Flutter with Dart 3.10.4 or a compatible Dart 3.x version; Flutter 3.38.5 is the checked baseline. |
| No devices / unauthorized device | Start the emulator or enable USB debugging, accept the prompt and verify `adb devices` plus `flutter devices`. |
| Android toolchain licenses/SDK missing | Resolve the Android entries in `flutter doctor -v` using SDK Manager and `flutter doctor --android-licenses`. |
| Login connection refused / timeout | Check the phone-accessible `/api/health`, correct API base, running backend, firewall or USB reverse. Do not include `/api` in the Dart definition. |
| API address change seems ignored | Stop the app and rerun/rebuild with the new Dart definition. |
| Debug works but release HTTP fails | Use an HTTPS backend for release. Do not remove the release network policy to work around it. |
| No face found / QR scan unavailable | Grant camera permission, use a suitable physical camera, check session/student assignment and face enrollment/service health. |
| No push while closed | Default builds have remote push disabled. Supply the real Firebase/APNs setup and test notification permission/background delivery. |
| iOS pods require a higher deployment target | Run `pod install` with the checked-in iOS 15 target; do not lower the Firebase packages' platform requirements. |
| Old Gradle/build artifacts after a toolchain change | Run `flutter clean`, then `flutter pub get`, then rebuild. Do not delete the app/backend database as a build repair. |

Keep the web/API/Python terminals running during mobile testing. Return to the repository root with `cd ..` before using root npm commands.
