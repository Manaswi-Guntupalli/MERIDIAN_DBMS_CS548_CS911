import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:meridian_app/features/auth/domain/app_user.dart';
import 'package:meridian_app/features/auth/presentation/auth_controller.dart';
import 'package:meridian_app/features/family/data/family_repository.dart';
import 'package:meridian_app/features/timetable/data/timetable_repository.dart';
import 'package:meridian_app/features/timetable/presentation/weekly_timetable_screen.dart';

// Mirrors GET /api/timetable: periods is a label array, not an integer.
Map<String, dynamic> published() => {
  'name': 'Published week',
  'days': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  'periods': ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'],
  'slots': [
    {
      'day': 0,
      'period': 3,
      'className': '7A',
      'classId': 'c7',
      'subject': 'Physics',
      'subjectColor': '#336699',
      'teacher': 'Ms. Patel',
      'teacherId': 't2',
    },
    {
      'day': 0,
      'period': 0,
      'className': '7A',
      'classId': 'c7',
      'subject': 'English',
      'subjectColor': '#336699',
      'teacher': 'Ms. Patel',
      'teacherId': 't2',
      'room': 'A-201',
    },
    {
      'day': 0,
      'period': 1,
      'className': '6A',
      'classId': 'c6',
      'subject': 'Art',
      'subjectColor': '#336699',
      'teacher': 'Mr. Rao',
      'teacherId': 't1',
    },
    {
      'day': 1,
      'period': 0,
      'className': '7A',
      'classId': 'c7',
      'subject': 'Maths',
      'subjectColor': '#336699',
      'teacher': 'Ms. Patel',
      'teacherId': 't2',
    },
  ],
};
const student = AppUser(
  id: 'student',
  name: 'Student',
  email: 'student@test.school',
  role: UserRole.student,
  schoolId: 'school',
);
const teacher = AppUser(
  id: 'teacher',
  name: 'Mr. Rao',
  email: 'teacher@test.school',
  role: UserRole.teacher,
  schoolId: 'school',
);
List<FamilyCard> cards() => [
  FamilyCard.fromJson({'id': 's1', 'name': 'Student', 'className': '7A'}),
];
Future<void> settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
}

Future<void> screen(
  WidgetTester tester, {
  AppUser user = student,
  Future<List<FamilyCard>> Function()? family,
  bool empty = false,
}) async {
  tester.view.physicalSize = const Size(400, 1100);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        currentUserProvider.overrideWithValue(user),
        liveTimetableProvider.overrideWith(
          (ref) async => empty ? null : LiveTimetable.fromJson(published()),
        ),
        familyCardsProvider.overrideWith(
          (ref) => family?.call() ?? Future.value(cards()),
        ),
      ],
      child: const MaterialApp(home: Scaffold(body: WeeklyTimetableScreen())),
    ),
  );
  await settle(tester);
}

void main() {
  test(
    'parses the published period-label array and preserves sorted class slots',
    () {
      final t = LiveTimetable.fromJson(published());
      expect(t.periods, ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
      expect(
        t
            .forDay(0, where: (slot) => slot.classId == 'c7')
            .map((s) => s.subject),
        ['English', 'Physics'],
      );
      expect(t.periodLabel(3), 'P4');
      expect(
        t.forDay(1, where: (slot) => slot.classId == 'c7').single.subject,
        'Maths',
      );
    },
  );
  test(
    'uses published custom labels and a safe fallback for missing metadata',
    () {
      final json = published()..['periods'] = ['Start', 'Lab'];
      final t = LiveTimetable.fromJson(json);
      expect(t.periodLabel(1), 'Lab');
      expect(t.periodLabel(7), 'P8');
      expect(LiveTimetable.fromJson({'slots': []}).periods, isEmpty);
    },
  );
  testWidgets(
    'the 7A student timetable renders periods and subjects without the cast error',
    (tester) async {
      await screen(tester);
      await tester.tap(find.text('Mon'));
      await settle(tester);
      expect(find.text('English'), findsOneWidget);
      expect(find.text('Physics'), findsOneWidget);
      expect(find.text('P1'), findsOneWidget);
      expect(find.text('P4'), findsOneWidget);
      expect(find.text('Art'), findsNothing);
      expect(find.text("Couldn't load this"), findsNothing);
      expect(
        tester.getTopLeft(find.text('English')).dy,
        lessThan(tester.getTopLeft(find.text('Physics')).dy),
      );
      await tester.tap(find.text('Tue'));
      await settle(tester);
      expect(find.text('Maths'), findsOneWidget);
      expect(find.text('English'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'teacher view filters to their periods and never loads a family account',
    (tester) async {
      await screen(
        tester,
        user: teacher,
        family: () => throw StateError('Teacher must not load family cards'),
      );
      await tester.tap(find.text('Mon'));
      await settle(tester);
      expect(find.text('Art'), findsOneWidget);
      expect(find.text('6A'), findsOneWidget);
      expect(find.text('English'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'class lookup stays loading instead of falsely showing an empty schedule',
    (tester) async {
      final pending = Completer<List<FamilyCard>>();
      await screen(tester, family: () => pending.future);
      expect(find.text('Loading your class...'), findsOneWidget);
      expect(find.text('Nothing scheduled'), findsNothing);
      pending.complete(cards());
      await settle(tester);
      await tester.tap(find.text('Mon'));
      await settle(tester);
      expect(find.text('English'), findsOneWidget);
    },
  );
  testWidgets(
    'a school with no published timetable shows the proper empty state',
    (tester) async {
      await screen(tester, empty: true);
      expect(find.text('No published timetable'), findsOneWidget);
      expect(find.text("Couldn't load this"), findsNothing);
    },
  );
}
