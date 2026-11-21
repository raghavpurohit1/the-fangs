import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/data.dart';
import 'session_store.dart';

export 'session_store.dart';

const defaultApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://nextstep-techwomenaz.pages.dev',
);

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode = 0});

  final String message;
  final int statusCode;

  @override
  String toString() => message;
}

/// Native transport for the same cookie session used by the web application.
/// It never follows redirects, retries mutations, adds an Origin header, or
/// exposes a session through app state. HTTPS is required outside local testing.
class ApiClient {
  ApiClient({
    String baseUrl = defaultApiBaseUrl,
    http.Client? client,
    SessionStore? sessionStore,
    this.requestTimeout = const Duration(seconds: 30),
  }) : _baseUri = _validateBaseUrl(baseUrl),
       _client = client ?? http.Client(),
       _sessionStore = sessionStore ?? SecureSessionStore();

  final Uri _baseUri;
  final http.Client _client;
  final SessionStore _sessionStore;
  final Duration requestTimeout;
  void Function()? onUnauthorized;
  String? _session;
  DateTime? _expiresAt;
  int _sessionVersion = 0;
  Future<void> _storageQueue = Future<void>.value();

  String get baseUrl => _baseUri.origin;
  String get _storageKey => 'nextstep_session:${_baseUri.origin}';

  Future<T> _withStorage<T>(Future<T> Function() operation) {
    final work = _storageQueue.then((_) => operation());
    _storageQueue = work.then<void>(
      (_) {},
      onError: (Object _, StackTrace _) {},
    );
    return work;
  }

  static Uri _validateBaseUrl(String value) {
    final uri = Uri.tryParse(value);
    const localHosts = {'localhost', '127.0.0.1', '::1', '10.0.2.2'};
    if (uri == null ||
        !uri.hasAuthority ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment ||
        (uri.path.isNotEmpty && uri.path != '/') ||
        (uri.scheme != 'https' &&
            !(uri.scheme == 'http' && localHosts.contains(uri.host)))) {
      throw const ApiException(
        'Use an HTTPS API address, or a local development address.',
      );
    }
    return Uri.parse(uri.origin);
  }

  Uri _uri(String path) {
    final relative = Uri.tryParse(path);
    if (relative == null ||
        relative.hasScheme ||
        relative.hasAuthority ||
        relative.hasFragment ||
        !relative.path.startsWith('/api/') ||
        relative.pathSegments.any((part) => part == '.' || part == '..')) {
      throw const ApiException(
        'This request is not a valid NextStep API action.',
      );
    }
    final result = _baseUri.resolveUri(relative);
    if (result.origin != _baseUri.origin || !result.path.startsWith('/api/')) {
      throw const ApiException(
        'This request is not a valid NextStep API action.',
      );
    }
    return result;
  }

  Future<void> restoreSession() async {
    final version = ++_sessionVersion;
    _session = null;
    _expiresAt = null;
    String? stored;
    try {
      stored = await _withStorage(() => _sessionStore.read(_storageKey));
    } catch (_) {
      throw const ApiException(
        'This device could not open secure session storage. Try unlocking your device and reopening the app.',
      );
    }
    if (version != _sessionVersion || stored == null) return;
    try {
      final record = asMap(jsonDecode(stored));
      final token = record['token'];
      final expires = record['expiresAt'];
      if (token is! String ||
          !RegExp(r'^[a-f0-9]{64}$').hasMatch(token) ||
          expires is! int ||
          expires <= 0 ||
          expires >
              DateTime.now()
                  .add(const Duration(days: 7))
                  .millisecondsSinceEpoch ||
          !DateTime.fromMillisecondsSinceEpoch(expires)
              .isAfter(DateTime.now())) {
        await clearSession();
        return;
      }
      _session = token;
      _expiresAt = DateTime.fromMillisecondsSinceEpoch(expires);
    } on FormatException {
      await clearSession();
    }
  }

  Future<void> clearSession() async {
    ++_sessionVersion;
    _session = null;
    _expiresAt = null;
    try {
      await _withStorage(() => _sessionStore.delete(_storageKey));
    } catch (_) {
      throw const ApiException(
        'Signed out of memory, but this device could not remove its saved session. Check secure storage before sharing this device.',
      );
    }
  }

  Future<void> _captureSession(http.Response response, int version) async {
    if (version != _sessionVersion) return;
    final setCookie = response.headers['set-cookie'];
    if (setCookie == null) return;
    final match = RegExp(r'(?:^|,\s*)nextstep_session=([^;,\s]*)([^,]*)')
        .firstMatch(setCookie);
    if (match == null) return;
    final token = match.group(1)!;
    final ageMatch = RegExp(
      r'(?:^|;)\s*Max-Age=(-?\d+)',
      caseSensitive: false,
    ).firstMatch(match.group(2)!);
    final age = int.tryParse(ageMatch?.group(1) ?? '');
    if (token.isEmpty || (age != null && age <= 0)) {
      await clearSession();
      return;
    }
    if (!RegExp(r'^[a-f0-9]{64}$').hasMatch(token) ||
        age == null ||
        age > 604800) {
      throw const ApiException(
        'The server returned an invalid session. Please sign in again.',
      );
    }
    final expires = DateTime.now().add(Duration(seconds: age));
    try {
      await _withStorage(() async {
        if (version != _sessionVersion) return;
        await _sessionStore.write(
          _storageKey,
          jsonEncode({
            'token': token,
            'expiresAt': expires.millisecondsSinceEpoch,
          }),
        );
        if (version != _sessionVersion) return;
        _session = token;
        _expiresAt = expires;
      });
    } catch (_) {
      if (version == _sessionVersion) {
        _session = null;
        _expiresAt = null;
      }
      throw const ApiException(
        'This device could not securely save your session. Check secure storage and try again.',
      );
    }
  }

  Future<http.Response> _request(
    String method,
    String path, [
    Json? body,
  ]) async {
    final target = _uri(path);
    if (_expiresAt != null && !_expiresAt!.isAfter(DateTime.now())) {
      await clearSession();
    }
    final version = _sessionVersion;
    final request = http.Request(method, target)..followRedirects = false;
    request.headers['Accept'] = 'application/json';
    if (_session != null) {
      request.headers['Cookie'] = 'nextstep_session=$_session';
    }
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    http.Response response;
    try {
      response = await _client
          .send(request)
          .then(http.Response.fromStream)
          .timeout(requestTimeout);
    } on TimeoutException {
      throw ApiException(
        method == 'GET'
            ? 'The server took too long to respond. Check your connection and refresh.'
            : 'The server took too long to respond. Your change may have been saved; refresh before trying it again.',
      );
    } on http.ClientException {
      throw const ApiException(
        'Could not connect to NextStep. Check your connection and try again.',
      );
    }
    if (response.statusCode >= 300 && response.statusCode < 400) {
      throw const ApiException(
        'The API address redirected unexpectedly. Check the configured server address.',
      );
    }
    if (response.statusCode == 401 && version == _sessionVersion) {
      final clearing = clearSession();
      onUnauthorized?.call();
      await clearing;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      String? detail;
      try {
        final error = asMap(jsonDecode(response.body))['error'];
        if (error is String && error.isNotEmpty && error.length <= 1000) {
          detail = error.replaceAll(
            RegExp(r'[\x00-\x08\x0b\x0c\x0e-\x1f]'),
            '',
          );
        }
      } on FormatException {
        // Never expose a proxy error page, response body, or request credentials.
      }
      throw ApiException(
        detail ??
            (response.statusCode == 401
                ? 'Please sign in to continue.'
                : 'NextStep could not complete this request. Please try again.'),
        statusCode: response.statusCode,
      );
    }
    await _captureSession(response, version);
    return response;
  }

  Future<Json> _json(String method, String path, [Json? body]) async {
    final response = await _request(method, path, body);
    try {
      final value = jsonDecode(response.body);
      if (value is! Map) throw const FormatException();
      return asMap(value);
    } on FormatException {
      throw const ApiException(
        'The server returned an unreadable response. Refresh and try again.',
      );
    }
  }

  Future<Json> get(String path) => _json('GET', path);
  Future<Json> post(String path, Json body) => _json('POST', path, body);
  Future<Json> put(String path, Json body) => _json('PUT', path, body);
  Future<String> getText(String path) async =>
      (await _request('GET', path)).body;

  void close() {
    ++_sessionVersion;
    _session = null;
    _expiresAt = null;
    onUnauthorized = null;
    _client.close();
  }
}
