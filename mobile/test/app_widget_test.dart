import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:nextstep_mobile/main.dart';
import 'package:nextstep_mobile/services/api_client.dart';
import 'package:nextstep_mobile/services/app_controller.dart';
import 'package:nextstep_mobile/widgets/record_form.dart';

class WidgetSessionStore implements SessionStore {
  final Map<String, String> values = {};
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async {
    values[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    values.remove(key);
  }
}

Map<String, dynamic> fixture(String role) => {
  'user': {
    'id': '$role-user',
    'role': role,
    'name': role == 'admin' ? 'Program admin' : 'Test learner',
    'membershipTier': 'community',
  },
  'demo': true,
  'aiAvailable': false,
  'settings': {
    'programName': 'Current program name',
    'description': 'Current program description',
    'weeklyGoal': 3,
    'contactUrl': 'https://techwomenaz.org/',
    'membershipTiers': [
      for (final name in ['Community', 'Guided', 'Supporter'])
        {
          'id': name.toLowerCase(),
          'name': name,
          'description':
              'Free learning and community support for every career stage.',
          'benefits': ['Learning opportunities', 'Program support'],
        },
    ],
  },
  'users': [
    {
      'id': 'learner-user',
      'name': 'Test learner',
      'role': 'learner',
      'membershipTier': 'community',
      'active': true,
    },
  ],
  for (final key in [
    'courses',
    'enrollments',
    'mentors',
    'requests',
    'needs',
    'announcements',
    'announcementReads',
    'resources',
    'events',
    'programResults',
    'funding',
    'mentorAccounts',
    'applications',
  ])
    key: [],
};

Future<void> phoneSize(WidgetTester tester) async {
  tester.view.physicalSize = const Size(360, 780);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

AppController makeController(
  Future<http.Response> Function(http.Request) handler,
) => AppController(
  api: ApiClient(
    baseUrl: 'https://example.test',
    sessionStore: WidgetSessionStore(),
    client: MockClient(handler),
  ),
);

http.Response jsonResponse(
  Map<String, dynamic> body, {
  bool session = false,
}) => http.Response(
  jsonEncode(body),
  200,
  headers: {
    'content-type': 'application/json',
    if (session)
      'set-cookie':
          'nextstep_session=${List.filled(64, 'a').join()}; Path=/; HttpOnly; Max-Age=43200; Secure',
  },
);

void main() {
  for (final role in ['admin', 'learner']) {
    testWidgets('$role login routes to the correct phone workspace and plans', (
      tester,
    ) async {
      await phoneSize(tester);
      var authenticated = false;
      final controller = makeController((request) async {
        if (request.url.path == '/api/login') {
          final body = jsonDecode(request.body);
          expect(body['username'], role);
          authenticated = true;
          return jsonResponse({'user': fixture(role)['user']}, session: true);
        }
        return jsonResponse(
          authenticated ? fixture(role) : {'user': null, 'demo': true},
        );
      });
      await tester.pumpWidget(NextStepApp(controller: controller));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextFormField).first, role);
      await tester.enterText(
        find.byType(TextFormField).last,
        'review-password',
      );
      await tester.ensureVisible(find.widgetWithText(FilledButton, 'Sign in'));
      await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
      await tester.pumpAndSettle();
      expect(
        find.text(role == 'admin' ? 'Program home' : 'Hello, Test'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Plans').last);
      await tester.pumpAndSettle();
      expect(find.text('Membership plans').first, findsOneWidget);
      expect(find.text('Community'), findsOneWidget);
      expect(
        find.text(role == 'admin' ? 'Edit plans' : 'Your plan'),
        role == 'admin' ? findsNothing : findsOneWidget,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    });
  }

  testWidgets(
    'editing a priced plan preserves revision and other program settings',
    (tester) async {
      await phoneSize(tester);
      final state = fixture('admin');
      final settings = state['settings'] as Map<String, dynamic>;
      final plans = (settings['membershipTiers'] as List)
          .map((p) => Map<String, dynamic>.from(p as Map))
          .toList();
      settings['membershipTiers'] = plans;
      plans[0] = <String, dynamic>{
        ...plans[0] as Map,
        'priceAmount': 29.95,
        'currency': 'USD',
        'billingPeriod': 'monthly',
        'active': true,
        'isDefault': true,
        'revision': 1,
      };
      Map<String, dynamic>? submitted;
      final controller = makeController((request) async {
        if (request.method == 'PUT') {
          expect(request.url.path, '/api/admin/membership-plan/community');
          submitted = jsonDecode(request.body) as Map<String, dynamic>;
          plans[0] = <String, dynamic>{
            ...plans[0] as Map,
            ...submitted!,
            'revision': 2,
          };
          return jsonResponse({'plan': plans[0], 'settings': settings});
        }
        return jsonResponse(state);
      });
      await tester.pumpWidget(NextStepApp(controller: controller));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Plans').last);
      await tester.pumpAndSettle();
      expect(find.text('USD 29.95 / month'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Edit plan').first, 250, scrollable: find.descendant(of: find.byType(ListView).last, matching: find.byType(Scrollable)).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Edit plan').first);
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('field-name')),
        'Community Plus',
      );
      tester.testTextInput.hide();
      await tester.scrollUntilVisible(find.byKey(const ValueKey('field-priceAmount')), 300, scrollable: find.descendant(of: find.byType(Form), matching: find.byType(Scrollable)).first);
      await tester.enterText(
        find.byKey(const ValueKey('field-priceAmount')),
        '49.50',
      );
      settings['programName'] = 'Updated elsewhere';
      tester.testTextInput.hide();
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.widgetWithText(FilledButton, 'Save plan'),
        450,
        scrollable: find
            .descendant(
              of: find.byType(Form),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Save plan'));
      await tester.pumpAndSettle();
      expect(submitted?['revision'], 1);
      expect(submitted?['access'], {'courses':'all','courseIds':[], 'mentoring':true, 'aiHelp':true});
      expect(submitted?['priceAmount'], 49.5);
      expect(submitted?['name'], 'Community Plus');
      expect(submitted?['isDefault'], true);
      expect(submitted!.containsKey('programName'), false);
      expect(settings['programName'], 'Updated elsewhere');
      expect(find.text('Community Plus'), findsOneWidget);
      expect(find.text('USD 49.50 / month'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );

  testWidgets('authentication expiry dismisses private pushed pages', (
    tester,
  ) async {
    await phoneSize(tester);
    final controller = makeController(
      (request) async => request.url.path == '/api/state'
          ? jsonResponse(fixture('admin'))
          : http.Response('{"error":"Please sign in."}', 401),
    );
    await tester.pumpWidget(NextStepApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Plans').last);
    await tester.pumpAndSettle();
    try {
      await controller.api.post('/api/assistant', {'message': 'help'});
    } on ApiException {
      /* Expected session expiry. */
    }
    await tester.pumpAndSettle();
    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Membership plans'), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
  });

  testWidgets(
    'record form preserves revision and serializes empty optional score as null',
    (tester) async {
      await phoneSize(tester);
      Map<String, dynamic>? submitted;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => RecordFormPage(
                      title: 'Edit result',
                      initial: const {
                        'id': 'result-one',
                        'revision': 7,
                        'active': true,
                        'confidenceBefore': 3,
                      },
                      fields: const [
                        FieldSpec(
                          'beforeScore',
                          'Before score',
                          number: true,
                          minimum: 0,
                          maximum: 100,
                        ),
                        FieldSpec('active', 'Active', toggle: true),
                      ],
                      onSave: (value) async {
                        submitted = value;
                      },
                    ),
                  ),
                ),
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Save'));
      await tester.pumpAndSettle();
      expect(submitted, {
        'id': 'result-one',
        'revision': 7,
        'active': true,
        'confidenceBefore': 3,
        'beforeScore': null,
      });
      expect(tester.takeException(), isNull);
    },
  );
}
