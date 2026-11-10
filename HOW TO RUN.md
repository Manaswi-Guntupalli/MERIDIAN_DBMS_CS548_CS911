# How to run Meridian

The full instructions are in [README.md](README.md). This quick guide distinguishes the already-configured native computer from a new clone.

## Existing configured Windows computer

From PowerShell:

```powershell
Set-Location 'D:\DBMS MINI PROJECT\MERIDIAN'
npm run start:native
npm run check:services
Start-Process 'http://localhost:5173'
```

Expect **six OK checks**: website, API, intelligence, face engine, school PostgreSQL + pgvector and SQL Lab PostgreSQL. Allow model warm-up before repeating a check.

This uses the installed `.local` PostgreSQL clusters, existing built Node apps and **Python from PATH**. It does not install packages, build source, seed records or create missing clusters. If a dependency or build is missing, follow the full [native prerequisites](README.md#run-on-the-configured-windows-computer). Docker is not needed on this configured native installation.

## New computer / fresh clone

Install Git, Node 22, Docker with Compose, and Python 3.11+ with the face engine's required build tools. Then follow [the complete fresh-clone instructions](README.md#run-the-website-from-a-fresh-clone):

1. Clone, create local configuration, and run the locked Node install.
2. Start the two Compose PostgreSQL services.
3. Run `npm run db:setup` and `npm run sql-lab:setup`.
4. Seed **only** a new disposable demonstration database.
5. Install/start the two Python engines with explicit virtual-environment interpreters.
6. Run `npm run dev`, check all six components, and open port 5173.

The clone does not contain the original computer's database, private configuration, model caches or installed `.local` binaries. Do not run the native and Compose clusters together on the same ports.

## Sign in

Newly seeded demonstration accounts use password `meridian123`:

| Role | Email |
| --- | --- |
| Principal | `principal@meridian.school` |
| Administrator | `admin@meridian.school` |
| Super administrator | `super@meridian.school` |
| Teacher | `teacher@meridian.school` |
| Student | `student@meridian.school` |
| Parent | `parent@meridian.school` |

Existing account passwords may have changed. Never reseed to repair a login or connection problem; the seed deletes existing application records.

## USB Android phone

Keep all server/database components running. Enable USB debugging and approve the connection. Use your actual authorized ID in both commands:

```powershell
adb devices
adb -s DEVICE_ID reverse tcp:4000 tcp:4000
cd flutter_app
flutter pub get
flutter run --debug -d DEVICE_ID --dart-define=MERIDIAN_API_BASE=http://127.0.0.1:4000
```

The API base has no `/api` suffix. Reapply USB reverse after reconnecting. The standard Android emulator uses `http://10.0.2.2:4000` instead. Release LAN hosts require HTTPS; loopback HTTP supports the USB demo. For builds, installation and iOS, use [the mobile guide](flutter_app/README.md).

## Attendance demonstration

Use [the QR + face walkthrough](docs/QR_ATTENDANCE.md). Enroll a consenting person under the correct student, start the student's class session as authorized staff, and submit **both the valid QR and matching face in that session**. Either order works; one factor alone remains incomplete.

## Tomorrow and shutdown

- On the configured native computer: repeat the first startup block. **Do not reseed.**
- On the Docker setup: start its databases and the same Node/Python terminals.
- Foreground apps stop with Ctrl+C. Native background apps need their recorded PIDs inspected and stopped; the full [shutdown instructions](README.md#stop-the-configured-native-setup) include clean PostgreSQL stops.
- Preserve database files/volumes, local environment keys and configured encrypted document storage. Some live document files on the configured computer are under `tmp/repaired-demo/documents`.

For a demonstration, open [PROJECT_LAYOUT.md](PROJECT_LAYOUT.md) to locate any requested source, query, diagram or test file immediately.
