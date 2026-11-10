import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/ui/ui.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/domain/app_user.dart';
import '../../family/data/family_repository.dart';
import '../data/attendance_qr.dart';

/// Student self-marking by scanning the projector's session QR.
///
/// The web flow encodes `/scan?s=<sessionId>&t=<token>` into the QR; the app
/// parses the same URL and posts to the same `POST /presence/session/:id/qr`.
/// Identity comes from the JWT, never from the QR — the code carries only a
/// session token, so a shared screenshot cannot mark someone else present.
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: [BarcodeFormat.qrCode],
  );

  bool _submitting = false;
  String? _result;
  bool _ok = false;
  bool _complete = false;
  Timer? _statusTimer;
  String? _pendingSessionId;
  bool _checkingStatus = false;

  @override
  void dispose() {
    _statusTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _watchVerification(String sessionId) {
    _statusTimer?.cancel();
    _pendingSessionId = sessionId;
    _statusTimer = Timer.periodic(
      const Duration(seconds: 2),
      (_) => _refreshVerification(),
    );
  }

  Future<void> _refreshVerification() async {
    final sessionId = _pendingSessionId;
    if (!mounted || _checkingStatus || sessionId == null) return;
    _checkingStatus = true;
    try {
      final res = await ref
          .read(dioProvider)
          .get<Map<String, dynamic>>('/presence/session/$sessionId/mine');
      if (!mounted || _pendingSessionId != sessionId) return;
      final data = res.data ?? const <String, dynamic>{};
      final feedback = attendanceQrFeedback(data);
      setState(() {
        _ok = feedback.accepted;
        _complete = feedback.complete;
        _result = feedback.message;
      });
      if ([
        'PRESENT',
        'PROXY_ATTEMPT',
        'UNVERIFIED_QR',
        'ABSENT',
      ].contains(data['state'])) {
        _statusTimer?.cancel();
        ref.invalidate(familyCardsProvider);
      }
    } catch (_) {
      // A connection failure never becomes a fake Present. Keep the pending
      // result and retry while this screen is visible.
    } finally {
      _checkingStatus = false;
    }
  }

  /// Pulls the session id and token out of the scanned URL. Returns null when
  /// the code isn't a Meridian session QR, so we can say so plainly instead of
  /// firing a doomed request.
  ({String sessionId, String token})? _parse(String raw) {
    return parseAttendanceQr(raw);
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (!mounted || _submitting) return;
    final raw = capture.barcodes
        .map((b) => b.rawValue)
        .whereType<String>()
        .firstOrNull;
    if (raw == null) return;

    final parsed = _parse(raw);
    if (parsed == null) {
      setState(() {
        _ok = false;
        _complete = false;
        _result = 'That isn’t a Meridian attendance code.';
      });
      return;
    }

    setState(() {
      _submitting = true;
      _result = null;
    });
    try {
      final res = await ref
          .read(dioProvider)
          .post<Map<String, dynamic>>(
            '/presence/session/${parsed.sessionId}/qr',
            data: {'token': parsed.token},
          );
      final feedback = attendanceQrFeedback(res.data ?? const {});
      if (!mounted) return;
      setState(() {
        _ok = feedback.accepted;
        _complete = feedback.complete;
        // One factor is pending. Only the server can confirm both checks.
        _result = feedback.message;
      });
      _statusTimer?.cancel();
      _pendingSessionId = null;
      if (feedback.accepted && !feedback.complete) {
        _watchVerification(parsed.sessionId);
      }
      // The mark changes the student's own dashboard.
      ref.invalidate(familyCardsProvider);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _ok = false;
        _complete = false;
        _result = friendlyError(e);
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // A QR carries only a short-lived session capability, never an identity.
    // The server therefore accepts a phone scan only from a STUDENT account
    // and derives the student record from its JWT. Showing the scanner to a
    // principal/teacher used to end in the unhelpful API error
    // "studentId is required" after a successful scan.
    final user = ref.watch(currentUserProvider);
    if (user?.role != UserRole.student) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        children: const [
          MPageHeader(
            overline: 'Presence',
            title: 'Student account required',
            subtitle:
                'Sign out and use a student account before scanning an attendance QR.',
          ),
          MCard(
            child: Text(
              'The QR proves only that a live session exists. Meridian uses the signed-in student account to prove whose attendance is being marked, so staff and parent accounts cannot scan on a student’s behalf.',
              style: TextStyle(
                fontSize: 13.5,
                height: 1.5,
                color: AppColors.slate700,
              ),
            ),
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      children: [
        const MPageHeader(
          overline: 'Presence',
          title: 'Scan to mark',
          subtitle:
              'Point your camera at the attendance QR on the classroom screen.',
        ),
        MCard(
          padding: EdgeInsets.zero,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(13),
            child: AspectRatio(
              aspectRatio: 1,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  MobileScanner(
                    controller: _controller,
                    onDetect: _onDetect,
                    errorBuilder: (context, error) => ColoredBox(
                      color: AppColors.well,
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(
                            'Camera unavailable — ${error.errorCode.name}. '
                            'Allow camera access to scan.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.slate500,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Aiming frame.
                  IgnorePointer(
                    child: Center(
                      child: Container(
                        width: 190,
                        height: 190,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.9),
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                  if (_submitting)
                    const ColoredBox(
                      color: Color(0x66000000),
                      child: Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        if (_result != null)
          MCard(
            child: Row(
              children: [
                Icon(
                  _ok
                      ? (_complete
                            ? Icons.check_circle_outline
                            : Icons.hourglass_top)
                      : Icons.error_outline,
                  size: 20,
                  color: _ok
                      ? (_complete ? AppColors.mint : Colors.amber.shade700)
                      : AppColors.rose,
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Text(
                    _result!,
                    style: const TextStyle(
                      fontSize: 13.5,
                      height: 1.4,
                      color: AppColors.slate700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 14),
        MCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const MSectionTitle(overline: 'How it works', title: 'Scanning'),
              const Text(
                'The QR carries only a short-lived session token — never your '
                'identity. Your signed-in student account must belong to the '
                'session class. Both the QR and your matching enrolled face '
                'are required in the same session, in either order. One check '
                'alone stays pending; this screen updates after the second check.',
                style: TextStyle(
                  fontSize: 12.5,
                  height: 1.5,
                  color: AppColors.slate500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
