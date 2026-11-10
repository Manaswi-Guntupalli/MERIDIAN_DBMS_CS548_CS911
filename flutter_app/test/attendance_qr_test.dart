import 'package:flutter_test/flutter_test.dart';
import 'package:meridian_app/features/student/data/attendance_qr.dart';

void main() {
  test(
    'reads the projected localhost URL without opening it in a phone browser',
    () {
      final qr = parseAttendanceQr(
        'http://localhost:5173/scan?s=session-1&t=token_123',
      );
      expect(qr, (sessionId: 'session-1', token: 'token_123'));
      expect(
        parseAttendanceQr('https://school.example/scan?s=s&t=a%2Bb')?.token,
        'a+b',
      );
    },
  );
  test('rejects unrelated, malformed and incomplete QR codes', () {
    for (final raw in [
      'not a URL',
      'http://[',
      'http://school/scan?s=s',
      'http://school/scan?s=&t=t',
      'http://school/scan?s=s&t=',
      'https://school/other?s=s&t=t',
      'file:///scan?s=s&t=t',
    ]) {
      expect(parseAttendanceQr(raw), isNull, reason: raw);
    }
  });
  test(
    'a real server PRESENT state displays its late/already-present reason',
    () {
      final result = attendanceQrFeedback({
        'state': 'PRESENT',
        'reason': 'Present (late, 5 min)',
      });
      expect(result.accepted, isTrue);
      expect(result.complete, isTrue);
      expect(result.message, 'Present (late, 5 min)');
      expect(
        attendanceQrFeedback({
          'state': 'PRESENT',
          'reason': 'Already marked present',
        }).message,
        'Already marked present',
      );
    },
  );
  test(
    'face-required QR acceptance explains that attendance is still incomplete',
    () {
      expect(
        attendanceQrFeedback({'state': 'QR_VERIFIED'}).message,
        contains('awaiting face'),
      );
      expect(
        attendanceQrFeedback({'state': 'QR_VERIFIED'}).message,
        isNot(contains('Marked present')),
      );
    },
  );
  test('neither single-factor state claims complete attendance', () {
    for (final state in ['QR_VERIFIED', 'FACE_VERIFIED']) {
      final feedback = attendanceQrFeedback({'state': state});
      expect(feedback.accepted, isTrue);
      expect(feedback.complete, isFalse);
      expect(feedback.message, contains('not present yet'));
    }
  });
  test('proxy, expired and unknown results never claim attendance success', () {
    for (final state in [
      'PROXY_ATTEMPT',
      'UNVERIFIED_QR',
      'ABSENT',
      'UNKNOWN',
      null,
    ]) {
      expect(attendanceQrFeedback({'state': state}).accepted, isFalse);
    }
  });
}
