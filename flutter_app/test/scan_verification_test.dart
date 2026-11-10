import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:meridian_app/core/network/dio_client.dart';
import 'package:meridian_app/features/auth/domain/app_user.dart';
import 'package:meridian_app/features/auth/presentation/auth_controller.dart';
import 'package:meridian_app/features/student/presentation/scan_screen.dart';

// The native camera and HTTP transport are seams. The scanner callback,
// pending UI, timer, server-state mapping and widget lifecycle are production code.
class _Camera extends MobileScannerPlatform {
  @override
  Stream<BarcodeCapture?> get barcodesStream => const Stream.empty();
  @override
  Stream<TorchState> get torchStateStream => const Stream.empty();
  @override
  Stream<double> get zoomScaleStateStream => const Stream.empty();
  @override
  Widget buildCameraView() => const SizedBox.expand();
  @override
  Future<MobileScannerViewAttributes> start(StartOptions options) async =>
      const MobileScannerViewAttributes(
        cameraDirection: CameraFacing.back,
        currentTorchMode: TorchState.off,
        size: Size(640, 480),
        numberOfCameras: 1,
      );
  @override
  Future<void> stop() async {}
  @override
  Future<void> pause() async {}
  @override
  Future<void> dispose() async {}
  @override
  Future<void> updateScanWindow(Rect? window) async {}
}

class _Api implements HttpClientAdapter {
  String postState = 'QR_VERIFIED';
  String mineState = 'QR_VERIFIED';
  int polls = 0;
  Map<String, dynamic>? posted;
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.method == 'POST') {
      posted = Map<String, dynamic>.from(options.data as Map);
    } else {
      polls++;
    }
    final state = options.method == 'POST' ? postState : mineState;
    return ResponseBody.fromString(
      jsonEncode({
        'state': state,
        'studentId': 'student1',
        'studentName': 'Student',
        'sessionId': 'session1',
        if (state == 'PRESENT')
          'reason': 'Marked present — both checks confirmed',
      }),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

Future<void> _flush(WidgetTester tester) async {
  for (var i = 0; i < 4; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Future<void> _scan(WidgetTester tester, _Api api) async {
  tester.view.physicalSize = const Size(400, 1100);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final original = MobileScannerPlatform.instance;
  MobileScannerPlatform.instance = _Camera();
  addTearDown(() => MobileScannerPlatform.instance = original);
  final dio = Dio(BaseOptions(baseUrl: 'http://fixture/api'))
    ..httpClientAdapter = api;
  const user = AppUser(
    id: 'user1',
    name: 'Student',
    email: 'student@test.school',
    role: UserRole.student,
    schoolId: 'school1',
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(dio),
        currentUserProvider.overrideWithValue(user),
      ],
      child: const MaterialApp(home: Scaffold(body: ScanScreen())),
    ),
  );
  await _flush(tester);
  tester.widget<MobileScanner>(find.byType(MobileScanner)).onDetect!(
    const BarcodeCapture(
      barcodes: [
        Barcode(rawValue: 'http://localhost:5173/scan?s=session1&t=token123'),
      ],
    ),
  );
  await _flush(tester);
  addTearDown(() async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  });
}

void main() {
  testWidgets(
    'QR is visibly pending; the second factor automatically turns the phone result into Present',
    (tester) async {
      final api = _Api();
      await _scan(tester, api);
      expect(api.posted, {'token': 'token123'});
      expect(find.textContaining('not present yet'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle_outline), findsNothing);
      expect(find.byIcon(Icons.hourglass_top), findsOneWidget);
      api.mineState = 'PRESENT';
      await tester.pump(const Duration(seconds: 2));
      await _flush(tester);
      expect(
        find.textContaining('Marked present — both checks confirmed'),
        findsOneWidget,
      );
      expect(find.byIcon(Icons.check_circle_outline), findsOneWidget);
    },
  );
  testWidgets(
    'a mismatch from the server blocks the result and stops polling',
    (tester) async {
      final api = _Api();
      await _scan(tester, api);
      api.mineState = 'PROXY_ATTEMPT';
      await tester.pump(const Duration(seconds: 2));
      await _flush(tester);
      expect(find.textContaining('Attendance blocked'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle_outline), findsNothing);
      final polls = api.polls;
      await tester.pump(const Duration(seconds: 5));
      expect(api.polls, polls);
    },
  );
  testWidgets(
    'face-first completion returned by the QR endpoint is already complete',
    (tester) async {
      final api = _Api()..postState = 'PRESENT';
      await _scan(tester, api);
      expect(find.byIcon(Icons.check_circle_outline), findsOneWidget);
      await tester.pump(const Duration(seconds: 3));
      expect(api.polls, 0);
    },
  );
  testWidgets(
    'a session that ends with only one check never displays Present',
    (tester) async {
      final api = _Api();
      await _scan(tester, api);
      api.mineState = 'UNVERIFIED_QR';
      await tester.pump(const Duration(seconds: 2));
      await _flush(tester);
      expect(find.textContaining('Attendance not confirmed'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle_outline), findsNothing);
    },
  );
}
