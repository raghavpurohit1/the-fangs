import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:nextstep_mobile/services/api_client.dart';
import 'package:nextstep_mobile/services/app_controller.dart';

const origin = 'https://example.test';
final tokenA = List.filled(64, 'a').join();
final tokenB = List.filled(64, 'b').join();

class MemorySessionStore implements SessionStore {
  final values = <String, String>{};
  bool failWrites = false;
  Completer<void>? writeGate;

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async {
    if (failWrites) throw StateError('storage unavailable');
    if (writeGate != null) await writeGate!.future;
    values[key] = value;
  }

  @override
  Future<void> delete(String key) async => values.remove(key);
}

http.Response jsonResponse(Object data, {String? token}) => http.Response(
  jsonEncode(data),
  200,
  headers: {
    'content-type': 'application/json',
    if (token != null)
      'set-cookie':
          'nextstep_session=$token; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200; Secure',
  },
);

Map<String, dynamic> learnerState([String id = 'learner-a']) => {
  'user': {'id': id, 'name': 'Test learner', 'role': 'learner'},
  'settings': <String, dynamic>{},
};

void main() {
  test(
    'login stores only session and expiry and sends the cookie to the API',
    () async {
      final store = MemorySessionStore();
      final requests = <http.Request>[];
      final api = ApiClient(
        baseUrl: origin,
        sessionStore: store,
        client: MockClient((request) async {
          requests.add(request);
          return request.url.path == '/api/login'
              ? jsonResponse({'user': learnerState()['user']}, token: tokenA)
              : jsonResponse(learnerState());
        }),
      );
      await api.post('/api/login', {
        'username': 'learner',
        'password': 'secret-password',
      });
      await api.get('/api/state');
      expect(requests.first.headers['cookie'], isNull);
      expect(requests.last.headers['cookie'], 'nextstep_session=$tokenA');
      expect(requests.last.headers['origin'], isNull);
      expect(requests.last.followRedirects, isFalse);
      final saved = jsonDecode(store.values.values.single) as Map;
      expect(saved.keys.toSet(), {'token', 'expiresAt'});
      expect(saved['token'], tokenA);
      expect(store.values.values.single, isNot(contains('secret-password')));
      api.close();
    },
  );

  test(
    'restored sessions are origin-scoped and expired records are removed',
    () async {
      final store = MemorySessionStore();
      store.values['nextstep_session:$origin'] = jsonEncode({
        'token': tokenA,
        'expiresAt': DateTime.now()
            .add(const Duration(hours: 1))
            .millisecondsSinceEpoch,
      });
      String? cookie;
      final api = ApiClient(
        baseUrl: origin,
        sessionStore: store,
        client: MockClient((request) async {
          cookie = request.headers['cookie'];
          return jsonResponse(learnerState());
        }),
      );
      await api.restoreSession();
      await api.get('/api/state');
      expect(cookie, 'nextstep_session=$tokenA');
      final other = ApiClient(
        baseUrl: 'https://other.test',
        sessionStore: store,
        client: MockClient((request) async {
          expect(request.headers['cookie'], isNull);
          return jsonResponse({'user': null});
        }),
      );
      await other.restoreSession();
      await other.get('/api/state');
      store.values['nextstep_session:$origin'] = jsonEncode({
        'token': tokenA,
        'expiresAt': 0,
      });
      await api.restoreSession();
      expect(store.values, isEmpty);
      api.close();
      other.close();
    },
  );

  test('invalid endpoints and redirects cannot forward credentials', () async {
    var calls = 0;
    final api = ApiClient(
      baseUrl: origin,
      sessionStore: MemorySessionStore(),
      client: MockClient((request) async {
        ++calls;
        expect(request.followRedirects, isFalse);
        return http.Response(
          '',
          302,
          headers: {'location': 'https://other.test/api/state'},
        );
      }),
    );
    for (final path in [
      'https://other.test/api/state',
      '//other.test/api/state',
      '/api/../private',
      '/api/%2e%2e/private',
    ]) {
      await expectLater(api.get(path), throwsA(isA<ApiException>()));
    }
    expect(calls, 0);
    await expectLater(api.get('/api/state'), throwsA(isA<ApiException>()));
    expect(calls, 1);
    expect(
      () => ApiClient(baseUrl: 'http://remote.example'),
      throwsA(isA<ApiException>()),
    );
    api.close();
  });

  test(
    '401 removes stored authentication and private controller state',
    () async {
      final store = MemorySessionStore();
      var expired = false;
      final controller = AppController(
        api: ApiClient(
          baseUrl: origin,
          sessionStore: store,
          client: MockClient((request) async {
            if (expired) {
              return http.Response(
                '{"error":"Please sign in to continue."}',
                401,
              );
            }
            return request.url.path == '/api/login'
                ? jsonResponse({'user': learnerState()['user']}, token: tokenA)
                : jsonResponse(learnerState());
          }),
        ),
      );
      await controller.signIn('learner', 'password');
      expect(controller.signedIn, isTrue);
      expired = true;
      await expectLater(
        controller.refresh(),
        throwsA(
          isA<ApiException>().having((e) => e.statusCode, 'statusCode', 401),
        ),
      );
      expect(controller.state, isEmpty);
      expect(store.values, isEmpty);
      controller.dispose();
    },
  );

  test(
    'anonymous state invalidates a session the server no longer accepts',
    () async {
      final store = MemorySessionStore();
      store.values['nextstep_session:$origin'] = jsonEncode({
        'token': tokenA,
        'expiresAt': DateTime.now()
            .add(const Duration(hours: 1))
            .millisecondsSinceEpoch,
      });
      final controller = AppController(
        api: ApiClient(
          baseUrl: origin,
          sessionStore: store,
          client: MockClient(
            (_) async => jsonResponse({'user': null, 'demo': true}),
          ),
        ),
      );
      await controller.initialize();
      expect(controller.signedIn, isFalse);
      expect(store.values, isEmpty);
      controller.dispose();
    },
  );

  test(
    'late login response cannot restore authentication after local logout',
    () async {
      final store = MemorySessionStore();
      final pending = Completer<http.Response>();
      final api = ApiClient(
        baseUrl: origin,
        sessionStore: store,
        client: MockClient((_) => pending.future),
      );
      final login = api.post('/api/login', {
        'username': 'learner',
        'password': 'password',
      });
      await Future<void>.delayed(Duration.zero);
      await api.clearSession();
      pending.complete(
        jsonResponse({'user': learnerState()['user']}, token: tokenA),
      );
      await login;
      expect(store.values, isEmpty);
      api.close();
    },
  );

  test(
    'serial secure storage writes prevent an older login replacing a newer one',
    () async {
      final store = MemorySessionStore()..writeGate = Completer<void>();
      final api = ApiClient(
        baseUrl: origin,
        sessionStore: store,
        client: MockClient(
          (request) async => jsonResponse(
            {},
            token: request.body.contains('first') ? tokenA : tokenB,
          ),
        ),
      );
      final first = api.post('/api/login', {
        'username': 'first',
        'password': 'password',
      });
      await Future<void>.delayed(Duration.zero);
      final clear = api.clearSession();
      final second = api.post('/api/login', {
        'username': 'second',
        'password': 'password',
      });
      store.writeGate!.complete();
      await Future.wait([first, clear, second]);
      expect(jsonDecode(store.values.values.single)['token'], tokenB);
      api.close();
    },
  );

  test(
    'logout clears device state even if server revocation cannot connect',
    () async {
      final store = MemorySessionStore();
      final controller = AppController(
        api: ApiClient(
          baseUrl: origin,
          sessionStore: store,
          client: MockClient((request) async {
            if (request.url.path == '/api/logout') {
              throw http.ClientException('offline');
            }
            return request.url.path == '/api/login'
                ? jsonResponse({}, token: tokenA)
                : jsonResponse(learnerState());
          }),
        ),
      );
      await controller.signIn('learner', 'password');
      await expectLater(controller.signOut(), throwsA(isA<ApiException>()));
      expect(controller.state, isEmpty);
      expect(store.values, isEmpty);
      controller.dispose();
    },
  );

  test(
    'secure storage failures do not leave an authenticated memory session',
    () async {
      final store = MemorySessionStore()..failWrites = true;
      final api = ApiClient(
        baseUrl: origin,
        sessionStore: store,
        client: MockClient((request) async {
          if (request.url.path == '/api/login') {
            return jsonResponse({}, token: tokenA);
          }
          expect(request.headers['cookie'], isNull);
          return jsonResponse({'user': null});
        }),
      );
      await expectLater(
        api.post('/api/login', {}),
        throwsA(isA<ApiException>()),
      );
      await api.get('/api/state');
      expect(store.values, isEmpty);
      api.close();
    },
  );

  test(
    'direct API authentication failure also clears controller state',
    () async {
      final controller = AppController(
        api: ApiClient(
          baseUrl: origin,
          sessionStore: MemorySessionStore(),
          client: MockClient(
            (_) async => http.Response('{"error":"Please sign in."}', 401),
          ),
        ),
      );
      controller.state = learnerState();
      await expectLater(
        controller.api.post('/api/assistant', {'message': 'Help me learn'}),
        throwsA(isA<ApiException>()),
      );
      expect(controller.state, isEmpty);
      controller.dispose();
    },
  );

  test('older refresh cannot overwrite a newer state', () async {
    final firstResponse = Completer<http.Response>();
    var calls = 0;
    final controller = AppController(
      api: ApiClient(
        baseUrl: origin,
        sessionStore: MemorySessionStore(),
        client: MockClient((_) async {
          ++calls;
          if (calls == 1) return firstResponse.future;
          return jsonResponse({...learnerState(), 'version': 2});
        }),
      ),
    );
    final older = controller.refresh();
    await Future<void>.delayed(Duration.zero);
    await controller.refresh();
    firstResponse.complete(jsonResponse({...learnerState(), 'version': 1}));
    await older;
    expect(controller.state['version'], 2);
    controller.dispose();
  });

  test('concurrent sign-in attempts cannot select the older account', () async {
    final usernames = <String>[];
    final controller = AppController(
      api: ApiClient(
        baseUrl: origin,
        sessionStore: MemorySessionStore(),
        client: MockClient((request) async {
          if (request.url.path == '/api/login') {
            usernames.add(jsonDecode(request.body)['username'] as String);
            return jsonResponse({}, token: tokenB);
          }
          return jsonResponse(learnerState('second'));
        }),
      ),
    );
    final first = controller.signIn('first', 'password');
    final second = controller.signIn('second', 'password');
    await Future.wait([first, second]);
    expect(usernames, ['second']);
    expect(controller.user['id'], 'second');
    controller.dispose();
  });

  test(
    'timeout does not retry a mutation or claim it failed to save',
    () async {
      var calls = 0;
      final pending = Completer<http.Response>();
      final api = ApiClient(
        baseUrl: origin,
        sessionStore: MemorySessionStore(),
        requestTimeout: const Duration(milliseconds: 5),
        client: MockClient((_) {
          ++calls;
          return pending.future;
        }),
      );
      await expectLater(
        api.post('/api/needs', {}),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            contains('may have been saved'),
          ),
        ),
      );
      expect(calls, 1);
      pending.complete(jsonResponse({}));
      api.close();
    },
  );
}
