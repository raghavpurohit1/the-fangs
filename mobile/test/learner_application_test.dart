import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nextstep_mobile/models/data.dart';
import 'package:nextstep_mobile/services/app_controller.dart';
import 'package:nextstep_mobile/screens/learner/application_page.dart';

class SurveyController extends AppController {
  SurveyController() {
    state = {
      'user': {'id': 'test-learner', 'role': 'learner', 'name': 'Learner'},
      'applications': <Json>[],
    };
  }
  final writes = <Json>[];
  @override
  Future<Json> mutate(String path, Json body, {String method = 'POST'}) async {
    writes.add({'path': path, 'method': method, ...body});
    state['applications'] = [
      {
        'id': 'application-one',
        'userId': 'test-learner',
        'applicationType': 'learner',
        ...body,
        'status': 'submitted',
        'staffNote': '',
        'revision': body['revision'] == null ? 1 : 2,
        'createdAt': '2026-11-22T12:00:00Z',
        'updatedAt': '2026-11-22T13:00:00Z',
      },
    ];
    notifyListeners();
    return {'application': (state['applications'] as List).first};
  }
}

void main() {
  testWidgets(
    'learner submits survey and edits using saved revision at phone width',
    (tester) async {
      tester.view.physicalSize = const Size(360, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = SurveyController();
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        MaterialApp(home: ApplicationPage(controller: controller)),
      );
      await tester.tap(find.text('Start learner application'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextFormField, 'What would you like to achieve?'),
        'Become confident with AI',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'What are you interested in?'),
        'AI skills, career growth',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      Future<void> scrollTap(String text) async {
        await tester.scrollUntilVisible(
          find.text(text),
          350,
          scrollable: find.byType(Scrollable).first,
        );
        await Scrollable.ensureVisible(
          tester.element(find.text(text)),
          alignment: 0.5,
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text(text));
        await tester.pumpAndSettle();
      }

      await scrollTap('Submit application');
      expect(controller.writes.single['applicationType'], 'learner');
      expect(controller.writes.single['interests'], [
        'AI skills',
        'career growth',
      ]);
      expect(controller.writes.single.containsKey('revision'), false);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      await scrollTap('Edit and resubmit');
      await tester.enterText(
        find.widgetWithText(TextFormField, 'What would you like to achieve?'),
        'Updated goal',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      await scrollTap('Save and resubmit');
      expect(controller.writes.last['method'], 'PUT');
      expect(controller.writes.last['revision'], 1);
      expect(controller.writes.last['goals'], 'Updated goal');
      expect(controller.writes.last.containsKey('applicationType'), false);
      expect(tester.takeException(), isNull);
    },
  );
}
