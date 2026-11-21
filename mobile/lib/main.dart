import 'package:flutter/material.dart';

import 'services/app_controller.dart';
import 'models/data.dart';
import 'screens/admin_workspace.dart';
import 'screens/learner/learner_workspace.dart';
import 'widgets/record_form.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const NextStepApp());
}

class NextStepApp extends StatefulWidget {
  final AppController? controller;
  const NextStepApp({super.key, this.controller});
  @override
  State<NextStepApp> createState() => _NextStepAppState();
}

class _NextStepAppState extends State<NextStepApp> {
  late final AppController controller;
  final navigatorKey = GlobalKey<NavigatorState>();
  bool wasSignedIn = false;
  bool loading = true;
  String? error;
  @override
  void initState() {
    super.initState();
    controller = widget.controller ?? AppController();
    wasSignedIn = controller.signedIn;
    controller.addListener(_authChanged);
    _initialize();
  }

  void _authChanged() {
    final signedIn = controller.signedIn;
    if (wasSignedIn && !signedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          navigatorKey.currentState?.popUntil((route) => route.isFirst);
        }
      });
    }
    wasSignedIn = signedIn;
  }

  Future<void> _initialize() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      await controller.initialize();
    } catch (e) {
      error = e.toString();
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  void dispose() {
    controller.removeListener(_authChanged);
    if (widget.controller == null) controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'NextStep',
    debugShowCheckedModeBanner: false,
    navigatorKey: navigatorKey,
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xffb8402a),
        primary: const Color(0xffb8402a),
      ),
      scaffoldBackgroundColor: const Color(0xfff5f7fa),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
        filled: true,
        fillColor: Colors.white,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xffdfe4eb)),
        ),
      ),
    ),
    home: _home(),
  );
  Widget _home() {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (error != null) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.cloud_off_outlined, size: 48),
                  const SizedBox(height: 16),
                  const Text('Could not connect to NextStep'),
                  const SizedBox(height: 8),
                  Text(error!),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _initialize,
                    child: const Text('Try again'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        if (!controller.signedIn) return SignInPage(controller: controller);
        if (controller.isAdmin) return AdminWorkspace(controller: controller);
        if (controller.user['role'] == 'learner') {
          return LearnerWorkspace(controller: controller);
        }
        return Scaffold(
          appBar: AppBar(title: const Text('Mentor workspace')),
          body: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'This Android app currently supports learner and administrator workspaces. Mentors can use the website.',
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () => openWebLink(
                    context,
                    'https://nextstep-techwomenaz.pages.dev',
                  ),
                  child: const Text('Open mentor website'),
                ),
                TextButton(
                  onPressed: () async {
                    try {
                      await controller.signOut();
                    } catch (e) {
                      if (context.mounted) showMessage(context, e);
                    }
                  },
                  child: const Text('Sign out'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class SignInPage extends StatefulWidget {
  final AppController controller;
  const SignInPage({super.key, required this.controller});
  @override
  State<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  final _form = GlobalKey<FormState>();
  final _username = TextEditingController(),
      _password = TextEditingController();
  bool busy = false, hidden = true;
  String? error;
  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> signIn() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.controller.signIn(_username.text.trim(), _password.text);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void register() => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => RecordFormPage(
        title: 'Create learner account',
        submitLabel: 'Create account',
        description: 'Administrators use the login supplied by the program. This form creates a learner account.',
        fields: const [
          FieldSpec('name', 'Full name', required: true),
          FieldSpec('username', 'Username', required: true),
          FieldSpec(
            'password',
            'Password',
            required: true,
            secret: true,
            help: 'Use at least 8 characters.',
          ),
          FieldSpec(
            'stage',
            'Career stage',
            required: true,
            options: careerStageOptions,
          ),
          FieldSpec('goal', 'Your learning goal', lines: 3),
        ],
        initial: const {'stage': 'Exploring tech'},
        onSave: widget.controller.register,
      ),
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(28),
            children: [
              const Icon(
                Icons.auto_awesome_rounded,
                size: 48,
                color: Color(0xffb8402a),
              ),
              const SizedBox(height: 16),
              Text(
                'nextstep.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineLarge
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              const Text(
                'Learn, connect, and grow.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              Text(
                'Welcome back',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              const Text('Sign in with your learner or administrator account.'),
              const SizedBox(height: 24),
              Form(
                key: _form,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _username,
                      enabled: !busy,
                      autofillHints: const [AutofillHints.username],
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(labelText: 'Username'),
                      validator: (v) => (v ?? '').trim().isEmpty
                          ? 'Enter your username.'
                          : null,
                    ),
                    const SizedBox(height: 18),
                    TextFormField(
                      controller: _password,
                      enabled: !busy,
                      obscureText: hidden,
                      autocorrect: false,
                      enableSuggestions: false,
                      autofillHints: const [AutofillHints.password],
                      onFieldSubmitted: (_) {
                        if (!busy) signIn();
                      },
                      decoration: InputDecoration(
                        labelText: 'Password',
                        suffixIcon: IconButton(
                          tooltip: hidden ? 'Show password' : 'Hide password',
                          icon: Icon(
                            hidden
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                          onPressed: () => setState(() => hidden = !hidden),
                        ),
                      ),
                      validator: (v) =>
                          (v ?? '').isEmpty ? 'Enter your password.' : null,
                    ),
                    const SizedBox(height: 18),
                    if (error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 18),
                        child: Text(
                          error!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                      ),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: busy ? null : signIn,
                        child: Text(busy ? 'Signing in…' : 'Sign in'),
                      ),
                    ),
                    TextButton(
                      onPressed: busy ? null : register,
                      child: const Text('Create learner account'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Your app and website share the same account and saved progress.',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
