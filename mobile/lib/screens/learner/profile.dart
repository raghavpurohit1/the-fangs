import 'package:flutter/material.dart';

import '../../models/data.dart';
import '../../services/app_controller.dart';
import '../membership_page.dart';
import 'learner_ui.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({required this.controller, super.key});
  final AppController controller;
  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final form = GlobalKey<FormState>();
  final fields = <String, TextEditingController>{};
  late String stage;
  late int confidence;
  late bool emailOptIn;
  late bool smsOptIn;
  bool busy = false;
  String? error;
  @override
  void initState() {
    super.initState();
    final user = widget.controller.user;
    for (final key in [
      'name',
      'goal',
      'story',
      'resume',
      'grades',
      'email',
      'phone',
    ]) {
      fields[key] = TextEditingController(text: textOf(user[key]));
    }
    stage = careerStages.contains(user['stage'])
        ? user['stage'] as String
        : careerStages.first;
    confidence = ((user['confidence'] as num?)?.toInt() ?? 3).clamp(1, 5);
    emailOptIn = user['emailOptIn'] == true;
    smsOptIn = user['smsOptIn'] == true;
  }

  @override
  void dispose() {
    for (final field in fields.values) {
      field.dispose();
    }
    super.dispose();
  }

  Future<void> save() async {
    if (!form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.controller.mutate('/api/profile', {
        for (final item in fields.entries) item.key: item.value.text.trim(),
        'stage': stage,
        'confidence': confidence,
        'emailOptIn': emailOptIn,
        'smsOptIn': smsOptIn,
      }, method: 'PUT');
      if (mounted) showNotice(context, 'Your profile is saved.');
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Widget textField(
    String key,
    String label,
    int maximum, {
    int lines = 1,
    String? helper,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: TextFormField(
      controller: fields[key],
      maxLength: maximum,
      minLines: lines,
      maxLines: lines == 1 ? 1 : lines + 3,
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        alignLabelWithHint: lines > 1,
      ),
      validator: key == 'name'
          ? (value) => value == null || value.trim().isEmpty
                ? 'Enter your name.'
                : null
          : null,
    ),
  );
  @override
  Widget build(BuildContext context) {
    final user = widget.controller.user;
    final plan = itemById(
      asList(asMap(widget.controller.state['settings'])['membershipTiers']),
      user['membershipTier'] ?? 'community',
    );
    return Scaffold(
      appBar: AppBar(title: const Text('My profile')),
      body: Form(
        key: form,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const PageIntro(
              'My profile',
              'Keep your goals, experience, and contact preferences up to date.',
            ),
            ContentCard(
              children: [
                Text(
                  '${textOf(plan?['name'], 'Community')} plan',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text('Cohort: ${textOf(user['cohort'], 'Not assigned')}'),
                const Text(
                  'Program staff manage your plan and cohort assignments.',
                ),
                TextButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) =>
                          MembershipPage(controller: widget.controller),
                    ),
                  ),
                  child: const Text('View membership plans'),
                ),
              ],
            ),
            textField('name', 'Full name', 150),
            DropdownButtonFormField<String>(
              isExpanded: true,
              initialValue: stage,
              decoration: const InputDecoration(labelText: 'Career stage'),
              items: careerStages
                  .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                  .toList(),
              onChanged: busy
                  ? null
                  : (value) =>
                        setState(() => stage = value ?? careerStages.first),
            ),
            const SizedBox(height: 20),
            textField('goal', 'Your next goal', 1000, lines: 2),
            textField(
              'story',
              'Your story',
              5000,
              lines: 4,
              helper:
                  'Share experiences you would like a mentor to understand.',
            ),
            textField(
              'resume',
              'Experience and résumé highlights (optional)',
              10000,
              lines: 4,
            ),
            textField(
              'grades',
              'Coursework and grades (optional)',
              2000,
              lines: 3,
              helper: 'Available to program staff; not shared with mentor accounts.',
            ),
            Text(
              'Contact preferences',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: fields['email'],
              maxLength: 254,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email (optional)'),
              validator: (value) {
                final v = value?.trim() ?? '';
                if (v.isEmpty) {
                  return emailOptIn
                      ? 'Add an email address to receive emails.'
                      : null;
                }
                return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v)
                    ? null
                    : 'Enter a valid email address.';
              },
            ),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: const Text('Allow program emails'),
              subtitle: const Text(
                'You can withdraw permission here at any time.',
              ),
              value: emailOptIn,
              onChanged: busy
                  ? null
                  : (value) => setState(() => emailOptIn = value),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: fields['phone'],
              maxLength: 16,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone (optional)',
                helperText:
                    'Country code and digits, for example +16025550123.',
              ),
              validator: (value) {
                final v = value?.trim() ?? '';
                if (v.isEmpty) {
                  return smsOptIn
                      ? 'Add a phone number to receive texts.'
                      : null;
                }
                return RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(v)
                    ? null
                    : 'Use a country code and digits only.';
              },
            ),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: const Text('Allow program texts'),
              subtitle: const Text(
                'You can withdraw permission here at any time.',
              ),
              value: smsOptIn,
              onChanged: busy
                  ? null
                  : (value) => setState(() => smsOptIn = value),
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<int>(
              isExpanded: true,
              initialValue: confidence,
              decoration: const InputDecoration(
                labelText: 'Overall confidence',
              ),
              items: [
                for (var value = 1; value <= 5; value++)
                  DropdownMenuItem(value: value, child: Text('$value of 5')),
              ],
              onChanged: busy
                  ? null
                  : (value) => setState(() => confidence = value ?? 3),
            ),
            ErrorMessage(error),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: busy ? null : save,
              child: Text(busy ? 'Saving…' : 'Save my profile'),
            ),
          ],
        ),
      ),
    );
  }
}
