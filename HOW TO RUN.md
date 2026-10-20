# How to run Meridian

These steps are for **Windows PowerShell + Android**. For Mac/iPhone, use the [Flutter guide](flutter_app/README.md#5-ios-setup-mac-only).

## 1. Install these first

- Git, Node.js **22**, and Python **3.11 or newer**. Add them to PATH during installation.
- Docker Desktop. **Open it and wait until it is running.**
- Flutter **3.38.5** and Android Studio. Install Android SDK **36**, Command-line Tools and Platform-Tools. Add Flutter's `bin` and Android's `platform-tools` to PATH.
- For the face service, install Visual Studio Build Tools with **Desktop development with C++** if InsightFace needs compiling.
- An Android **7.0+** phone with a USB cable, or an Android emulator.

Keep an internet connection for the first installation and model downloads.

## 2. Clone and install

Open PowerShell where you want to keep the project:

```powershell
git clone https://github.com/Manaswi-Guntupalli/MERIDIAN_DBMS_CS548_CS911.git
cd MERIDIAN_DBMS_CS548_CS911
node scripts/configure-local.mjs
$env:ONNXRUNTIME_NODE_INSTALL = 'skip'
npm ci
```

The configuration command creates the local settings for you. Keep those files; do not replace their passwords or storage key later.

## 3. Prepare the database — first installation only

From the project folder:

```powershell
docker compose up -d --wait
npm run db:setup
```

**Only on your new demo database**, run this to add sample students and login accounts:

```powershell
npm run seed
```

**Do not run `seed` again once you have records to keep. It deletes existing application records.**

## 4. Install the Python services — first installation only

Stay in the project folder:

```powershell
python -m venv intelligence/.venv
./intelligence/.venv/Scripts/python.exe -m pip install --upgrade pip
./intelligence/.venv/Scripts/python.exe -m pip install -r intelligence/requirements.txt

python -m venv faceservice/.venv
./faceservice/.venv/Scripts/python.exe -m pip install --upgrade pip
./faceservice/.venv/Scripts/python.exe -m pip install -r faceservice/requirements.txt
```

## 5. Start the website and services

Open **three PowerShell terminals**, all inside `MERIDIAN_DBMS_CS548_CS911`. Keep them open.

**Terminal 1 — website and backend:**

```powershell
npm run dev
```

**Terminal 2 — analytics:**

```powershell
./intelligence/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir intelligence --host 127.0.0.1 --port 8010
```

**Terminal 3 — face service:**

```powershell
./faceservice/.venv/Scripts/python.exe -m uvicorn app:api --app-dir faceservice --host 127.0.0.1 --port 8020
```

The face model downloads on the first start. Wait for **Application startup complete**. Other models may download when you first use their features.

## 6. Open the website

In a **fourth terminal**, inside the project folder:

```powershell
npm run check:services
```

All four services should say **OK**. Open **http://localhost:5173**.

Sign in with **`principal@meridian.school`** and password **`meridian123`**.

## 7. Run Flutter on your Android phone

Keep the website/backend and both Python services running.

Enable **Developer options → USB debugging** on your phone. Connect it by USB and accept the phone's debugging prompt.

In the fourth terminal:

```powershell
cd flutter_app
flutter doctor -v
flutter doctor --android-licenses
flutter pub get
flutter devices
adb devices
```

Resolve any Android toolchain errors shown by `flutter doctor`. Read and accept the SDK licenses when prompted.

Replace `DEVICE_ID` below with your phone's ID shown above:

```powershell
adb -s DEVICE_ID reverse tcp:4000 tcp:4000
flutter run --debug -d DEVICE_ID --dart-define=MERIDIAN_API_BASE=http://127.0.0.1:4000
```

This builds, installs and opens the app. Keep the USB cable connected. Grant camera permission when using QR/face features.

**Using an emulator instead?** Start it in Android Studio, get its ID from `flutter devices`, and use this command instead of the two phone commands:

```powershell
flutter run --debug -d DEVICE_ID --dart-define=MERIDIAN_API_BASE=http://10.0.2.2:4000
```

Use the same password **`meridian123`** with any of these accounts:

| Role | Email |
| --- | --- |
| Principal | `principal@meridian.school` |
| Teacher | `teacher@meridian.school` |
| Student | `student@meridian.school` |
| Parent | `parent@meridian.school` |

For a phone over Wi-Fi instead of USB, follow the [Wi-Fi instructions](flutter_app/README.md#physical-phone-over-wi-fi). Do not use the emulator's `10.0.2.2` address on a physical phone.

## 8. Next time you run it

1. Open Docker Desktop, then run `docker compose up -d --wait` from the project folder.
2. Start the same three terminals from step 5.
3. Open the website. For Flutter, repeat the USB reverse and `flutter run` commands from step 7.
4. **Do not repeat `npm run seed`.**

To stop, press **Ctrl+C** in the running terminals and run `docker compose stop`. Your database stays saved.

Optional OpenAI: run `npm run configure:openai`, paste a fresh key into the hidden terminal prompt, then restart the API and intelligence services. Super Admin can verify it under **Settings → OpenAI connection**. See [OpenAI setup](docs/OPENAI.md).

SMS, email and Firebase push need separate provider credentials. For errors, see [website troubleshooting](README.md#troubleshooting) or [Flutter troubleshooting](flutter_app/README.md#verification-and-troubleshooting).
