import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:nextstep_mobile/screens/admin_applications_page.dart';
import 'package:nextstep_mobile/services/api_client.dart';
import 'package:nextstep_mobile/services/app_controller.dart';

class MemoryStore implements SessionStore {
  @override
  Future<String?> read(String key) async => null;
  @override
  Future<void> write(String key, String value) async {}
  @override
  Future<void> delete(String key) async {}
}

void main() {
  testWidgets(
    'admin review saves the exact revision and refreshes the response',
    (tester) async {
      tester.view.physicalSize = const Size(360, 780);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      Map<String, dynamic> application = {
        'id': 'application-one',
        'userId': 'learner-one',
        'applicationType': 'learner',
        'goals': 'Build confidence using AI at work.',
        'interests': ['AI skills'],
        'status': 'submitted',
        'staffNote': '',
        'revision': 3,
      };
      Map<String, dynamic>? review;
      final controller = AppController(
        api: ApiClient(
          baseUrl: 'https://example.test',
          sessionStore: MemoryStore(),
          client: MockClient((request) async {
            if (request.url.path == '/api/state') {
              return http.Response(
                jsonEncode({
                  'user': {'id': 'admin-one', 'role': 'admin'},
                  'users': [
                    {'id': 'learner-one', 'name': 'Learner One'},
                  ],
                  'applications': [application],
                }),
                200,
              );
            }
            expect(request.method, 'PUT');
            expect(request.url.path, '/api/admin/application/application-one');
            review = jsonDecode(request.body) as Map<String, dynamic>;
            application = {...application, ...review!, 'revision': 4};
            return http.Response('{"ok":true}', 200);
          }),
        ),
      );
      addTearDown(controller.dispose);
      await controller.initialize();
      await tester.pumpWidget(
        MaterialApp(home: AdminApplicationsPage(controller: controller)),
      );
      await tester.pumpAndSettle();
      expect(find.text('Learner One'), findsOneWidget);
      await tester.tap(find.text('Review application'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextFormField),
        'Please share your preferred meeting times.',
      );
      await tester.ensureVisible(find.text('Save review'));
      await tester.tap(find.text('Save review'));
      await tester.pumpAndSettle();
      expect(review?['revision'], 3);
      expect(
        review?['staffNote'],
        'Please share your preferred meeting times.',
      );
      expect(review?['status'], 'submitted');
      await tester.tap(find.text('Read full application'));
      await tester.pumpAndSettle();
      expect(
        find.text('Please share your preferred meeting times.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
