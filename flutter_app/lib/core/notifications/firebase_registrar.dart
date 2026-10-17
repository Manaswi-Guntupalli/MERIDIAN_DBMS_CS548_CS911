import 'dart:async';
import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'push_service.dart';

/// Public Firebase app identifiers are build configuration, never a service-account key.
const remotePushEnabled = bool.fromEnvironment('ENABLE_REMOTE_PUSH');
const firebaseOptions = FirebaseOptions(
  apiKey: String.fromEnvironment('FIREBASE_API_KEY'),
  appId: String.fromEnvironment('FIREBASE_APP_ID'),
  messagingSenderId: String.fromEnvironment('FIREBASE_SENDER_ID'),
  projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
  iosBundleId: String.fromEnvironment('FIREBASE_IOS_BUNDLE_ID'),
);

@pragma('vm:entry-point')
Future<void> firebaseBackgroundMessage(RemoteMessage message) async {
  await Firebase.initializeApp(options: firebaseOptions);
  // Notification payloads are presented by Android/iOS while backgrounded.
  // No school data is fetched in the background isolate.
}

Future<void> initializeRemotePush() async {
  if (!remotePushEnabled || kIsWeb) return;
  if (firebaseOptions.apiKey.isEmpty || firebaseOptions.appId.isEmpty ||
      firebaseOptions.projectId.isEmpty || firebaseOptions.messagingSenderId.isEmpty) {
    debugPrint('Firebase push disabled: build configuration is incomplete.');
    return;
  }
  try {
    await Firebase.initializeApp(options: firebaseOptions);
    FirebaseMessaging.onBackgroundMessage(firebaseBackgroundMessage);
    // Registration starts after the portal has authenticated the user.
    await FirebaseMessaging.instance.setAutoInitEnabled(false);
  } catch (_) { debugPrint('Firebase initialization failed; in-app alerts remain available.'); }
}

class FirebasePushRegistrar implements PushRegistrar {
  FirebasePushRegistrar(this._dio, this._push);
  final Dio _dio;
  final PushService _push;
  StreamSubscription<String>? _refresh;
  StreamSubscription<RemoteMessage>? _messages;
  String? _token;

  Future<void> _registerToken(String token) async {
    await _dio.post<void>('/notifications/device', data: {
      'token': token,
      'platform': defaultTargetPlatform == TargetPlatform.iOS ? 'IOS' : 'ANDROID',
    });
    _token = token;
  }

  @override
  Future<void> register() async {
    if (!remotePushEnabled || Firebase.apps.isEmpty || kIsWeb) return;
    try {
      final messaging = FirebaseMessaging.instance;
      final permission = await messaging.requestPermission();
      if (permission.authorizationStatus == AuthorizationStatus.denied) return;
      await messaging.setAutoInitEnabled(true);
      _refresh = messaging.onRegistered.listen((token) async {
        try { await _registerToken(token); } catch (_) { debugPrint('Push token refresh registration failed.'); }
      });
      await messaging.register();
      _messages = FirebaseMessaging.onMessage.listen((message) {
        final notification = message.notification;
        if (notification != null) {
          unawaited(_push.show(title: notification.title ?? 'Meridian',
            body: notification.body ?? '', critical: message.data['severity'] == 'CRITICAL'));
        }
      });
    } catch (_) { debugPrint('Remote push registration failed; realtime alerts remain available.'); }
  }

  @override
  Future<void> unregister() async {
    await _refresh?.cancel(); await _messages?.cancel();
    try {
      if (_token != null) await _dio.delete<void>('/notifications/device', data: {'token': _token});
    } finally {
      _token = null;
      if (remotePushEnabled && Firebase.apps.isNotEmpty && !kIsWeb) {
        await FirebaseMessaging.instance.setAutoInitEnabled(false);
        await FirebaseMessaging.instance.unregister();
      }
    }
  }
}
