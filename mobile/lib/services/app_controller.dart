import 'package:flutter/foundation.dart';

import '../models/data.dart';
import 'api_client.dart';

class AppController extends ChangeNotifier {
  AppController({ApiClient? api}) : api = api ?? ApiClient() {
    this.api.onUnauthorized = _expireAuthentication;
  }

  final ApiClient api;
  Json state = {};
  int _generation = 0;
  int _refreshSequence = 0;
  bool _disposed = false;

  Json get user => asMap(state['user']);
  bool get signedIn => stringValue(user['id']).isNotEmpty;
  bool get isAdmin => signedIn && user['role'] == 'admin';
  bool get isLearner => signedIn && user['role'] == 'learner';
  bool get isMentor => signedIn && user['role'] == 'mentor';

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  void _expireAuthentication() {
    ++_generation;
    state = {};
    _notify();
  }

  Future<T> _withAuth<T>(Future<T> Function() work) async {
    final generation = _generation;
    try {
      return await work();
    } on ApiException catch (error) {
      if (error.statusCode == 401 && generation == _generation) {
        _expireAuthentication();
      }
      rethrow;
    }
  }

  Future<void> initialize() async {
    await api.restoreSession();
    await refresh();
  }

  Future<void> signIn(String username, String password) async {
    await _authenticate('/api/login', {
      'username': username,
      'password': password,
    });
  }

  Future<void> register(Json values) => _authenticate('/api/register', values);

  Future<void> _authenticate(String path, Json values) async {
    final generation = ++_generation;
    state = {};
    _notify();
    await api.clearSession();
    if (generation != _generation || _disposed) return;
    await _withAuth(() async {
      await api.post(path, values);
      if (generation == _generation) await refresh();
    });
  }

  Future<void> refresh() => _withAuth(() async {
    final generation = _generation;
    final sequence = ++_refreshSequence;
    final next = await api.get('/api/state');
    if (generation != _generation ||
        sequence != _refreshSequence ||
        _disposed) {
      return;
    }
    if (asMap(next['user']).isEmpty) await api.clearSession();
    if (generation != _generation ||
        sequence != _refreshSequence ||
        _disposed) {
      return;
    }
    state = next;
    _notify();
  });

  Future<void> signOut() async {
    final generation = ++_generation;
    state = {};
    _notify();
    try {
      await api.post('/api/logout', {});
    } finally {
      if (generation == _generation) await api.clearSession();
    }
  }

  Future<Json> mutate(String path, Json body, {String method = 'POST'}) =>
      _withAuth(() async {
        final generation = _generation;
        final Json response;
        if (method.toUpperCase() == 'POST') {
          response = await api.post(path, body);
        } else if (method.toUpperCase() == 'PUT') {
          response = await api.put(path, body);
        } else {
          throw const ApiException('This action must use POST or PUT.');
        }
        if (generation == _generation) {
          try {
            await refresh();
          } on ApiException catch (error) {
            if (error.statusCode == 401) rethrow;
            throw ApiException(
              'Your change was saved, but the screen could not refresh. Refresh before repeating the action.',
              statusCode: error.statusCode,
            );
          }
        }
        return response;
      });

  @override
  void dispose() {
    _disposed = true;
    ++_generation;
    state = {};
    api.onUnauthorized = null;
    api.close();
    super.dispose();
  }
}
