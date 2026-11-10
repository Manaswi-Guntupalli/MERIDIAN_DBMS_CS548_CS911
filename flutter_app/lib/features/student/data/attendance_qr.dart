/// Reads the exact URL projected by the website; identity comes from login.
({String sessionId, String token})? parseAttendanceQr(String raw) {
  final uri = Uri.tryParse(raw);
  if (uri == null ||
      !['http', 'https'].contains(uri.scheme) ||
      uri.host.isEmpty ||
      uri.path != '/scan') {
    return null;
  }
  final sessionId = uri.queryParameters['s'];
  final token = uri.queryParameters['t'];
  if (sessionId == null ||
      sessionId.isEmpty ||
      token == null ||
      token.isEmpty) {
    return null;
  }
  return (sessionId: sessionId, token: token);
}

/// Uses the backend's `state`, never a successful HTTP response alone.
({bool accepted, bool complete, String message}) attendanceQrFeedback(
  Map<String, dynamic> data,
) {
  final state = data['state'] ?? data['status'];
  return switch (state) {
    'PRESENT' => (
      accepted: true,
      complete: true,
      message: data['reason'] as String? ?? 'Marked present.',
    ),
    'LATE' => (
      accepted: true,
      complete: true,
      message: 'Marked present — recorded as late.',
    ),
    'QR_VERIFIED' => (
      accepted: true,
      complete: false,
      message:
          'QR verified — awaiting face. Show your enrolled face to the classroom kiosk. You are not present yet.',
    ),
    'FACE_VERIFIED' => (
      accepted: true,
      complete: false,
      message:
          'Face verified — awaiting your QR scan. You are not present yet.',
    ),
    'PROXY_ATTEMPT' => (
      accepted: false,
      complete: false,
      message: 'Attendance blocked: face did not match this account.',
    ),
    _ => (
      accepted: false,
      complete: false,
      message:
          'Attendance not confirmed. Ask your teacher to check the session.',
    ),
  };
}
