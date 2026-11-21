import 'package:flutter/material.dart';

import '../../models/data.dart';
import '../../services/api_client.dart';
import '../../services/app_controller.dart';
import 'learner_ui.dart';
import 'messages_support.dart';

const applicationStatusLabels = {
  'submitted': 'Submitted',
  'in_review': 'In review',
  'follow_up': 'Follow-up requested',
  'accepted': 'Accepted',
  'declined': 'Declined',
};

class ApplicationPage extends StatelessWidget {
  const ApplicationPage({required this.controller, super.key});
  final AppController controller;
  void edit(BuildContext context, [Json? application]) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ApplicationFormPage(
          controller: controller,
          application: application,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (context, _) {
      final applications =
          asList(controller.state['applications'])
              .where((a) => a['userId'] == controller.user['id'])
              .toList()
            ..sort(
              (a, b) =>
                  textOf(b['updatedAt']).compareTo(textOf(a['updatedAt'])),
            );
      final active = applications
          .where(
            (a) =>
                a['applicationType'] == 'learner' &&
                ['submitted', 'in_review', 'follow_up'].contains(a['status']),
          )
          .firstOrNull;
      return Scaffold(
        appBar: AppBar(title: const Text('Application survey')),
        body: RefreshList(
          controller: controller,
          children: [
            const PageIntro(
              'Apply as a learner',
              'Tell the program team about your goals, interests, and the support you need.',
            ),
            ContentCard(
              children: [
                const Text(
                  'Program staff review your answers and post a response here. You can track your application’s progress on this page.',
                ),
                const SizedBox(height: 16),
                if (active == null)
                  FilledButton(
                    onPressed: () => edit(context),
                    child: const Text('Start learner application'),
                  )
                else ...[
                  Text(
                    'Your active application: ${applicationStatusLabels[active['status']] ?? active['status']}',
                  ),
                  const SizedBox(height: 8),
                  Text(
                    ['submitted', 'follow_up'].contains(active['status'])
                        ? 'You can update your responses below. Saving submits the application for review again.'
                        : 'The program team is reviewing it. Check here for their response.',
                  ),
                ],
              ],
            ),
            Text(
              'Saved applications',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            if (applications.isEmpty)
              const EmptyCard(
                'No application submitted yet',
                'Start the short survey above. Your submitted responses and review status will be stored here.',
              ),
            ...applications.map(
              (a) => ContentCard(
                children: [
                  Text(
                    'Learner application',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  StatusLabel(
                    applicationStatusLabels[a['status']] ?? textOf(a['status']),
                  ),
                  Text('Submitted ${dateLabel(context, a['createdAt'])}'),
                  Text('Updated ${dateLabel(context, a['updatedAt'])}'),
                  const SizedBox(height: 16),
                  const Text(
                    'Goals',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(textOf(a['goals'])),
                  const SizedBox(height: 16),
                  const Text(
                    'Interests',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: stringList(a['interests'])
                        .map((interest) => Chip(label: Text(interest)))
                        .toList(),
                  ),
                  const SizedBox(height: 12),
                  ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    title: const Text('Experience, availability, and support'),
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Experience',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(textOf(a['experience'], 'Not provided')),
                            const SizedBox(height: 16),
                            const Text(
                              'Availability',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(textOf(a['availability'], 'Not provided')),
                            const SizedBox(height: 16),
                            const Text(
                              'Support needs',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(textOf(a['supportNeeds'], 'Not provided')),
                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  const Text(
                    'Program team response',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    textOf(a['staffNote'], 'No response has been added yet.'),
                  ),
                  const SizedBox(height: 16),
                  if (['submitted', 'follow_up'].contains(a['status']))
                    OutlinedButton(
                      onPressed: () => edit(context, a),
                      child: const Text('Edit and resubmit'),
                    )
                  else
                    const Text(
                      'This application is read-only at its current status.',
                    ),
                  TextButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => SupportPage(controller: controller),
                      ),
                    ),
                    child: const Text('Ask the program team'),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    },
  );
}

class ApplicationFormPage extends StatefulWidget {
  const ApplicationFormPage({
    required this.controller,
    this.application,
    super.key,
  });
  final AppController controller;
  final Json? application;
  @override
  State<ApplicationFormPage> createState() => _ApplicationFormPageState();
}

class _ApplicationFormPageState extends State<ApplicationFormPage> {
  final form = GlobalKey<FormState>();
  final fields = <String, TextEditingController>{};
  bool busy = false;
  bool stale = false;
  String? error;
  @override
  void initState() {
    super.initState();
    final a = widget.application ?? {};
    for (final key in ['goals', 'experience', 'availability', 'supportNeeds']) {
      fields[key] = TextEditingController(text: textOf(a[key]));
    }
    fields['interests'] = TextEditingController(
      text: stringList(a['interests']).join(', '),
    );
  }

  @override
  void dispose() {
    for (final field in fields.values) {
      field.dispose();
    }
    super.dispose();
  }

  List<String> interests() => fields['interests']!.text
      .split(',')
      .map((i) => i.trim())
      .where((i) => i.isNotEmpty)
      .toList();
  Future<void> save() async {
    if (!form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    final id = widget.application?['id'];
    try {
      await widget.controller.mutate(
        id == null
            ? '/api/applications'
            : '/api/applications/${Uri.encodeComponent(id.toString())}',
        {
          'goals': fields['goals']!.text.trim(),
          'interests': interests(),
          'experience': fields['experience']!.text.trim(),
          'availability': fields['availability']!.text.trim(),
          'supportNeeds': fields['supportNeeds']!.text.trim(),
          if (id == null)
            'applicationType': 'learner'
          else
            'revision': widget.application!['revision'],
        },
        method: id == null ? 'POST' : 'PUT',
      );
      if (mounted) {
        Navigator.of(context).pop();
        showNotice(context, 'Application saved for review.');
      }
    } on ApiException catch (e) {
      if (e.statusCode == 409) {
        try {
          await widget.controller.refresh();
        } catch (_) {
          /* Keep the draft visible for the applicant. */
        }
        if (mounted) {
          setState(() {
            stale = true;
            error = 'A saved application changed or an active application already exists. Return to applications and review the latest version before editing. Your unsaved text remains here until you leave.';
          });
        }
      } else if (mounted) {
        setState(() => error = e.toString());
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Widget question(
    String key,
    String label,
    int maxLength,
    int lines,
    String helper, {
    bool required = false,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: TextFormField(
      controller: fields[key],
      maxLength: maxLength,
      minLines: lines,
      maxLines: lines + 3,
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        helperMaxLines: 4,
        alignLabelWithHint: true,
      ),
      validator: required
          ? (value) => value == null || value.trim().isEmpty
                ? 'Add a response to this question.'
                : null
          : null,
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.application == null
            ? 'Learner application'
            : 'Update application',
      ),
    ),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const PageIntro(
            'Application survey',
            'Your responses will be saved for program staff to review. Share only information relevant to the support you need.',
          ),
          question(
            'goals',
            'What would you like to achieve?',
            3000,
            3,
            'Describe your learning or career goals.',
            required: true,
          ),
          TextFormField(
            controller: fields['interests'],
            maxLength: 1500,
            minLines: 2,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: 'What are you interested in?',
              helperText: 'Separate 1–12 topics with commas, such as AI skills, career transition, leadership.',
              helperMaxLines: 3,
            ),
            validator: (_) {
              final topics = interests();
              if (topics.isEmpty || topics.length > 12) {
                return 'Add between 1 and 12 topics, separated by commas.';
              }
              if (topics.any((topic) => topic.length > 120)) {
                return 'Keep each topic to 120 characters or fewer.';
              }
              return null;
            },
          ),
          const SizedBox(height: 20),
          question(
            'experience',
            'Relevant experience (optional)',
            5000,
            4,
            'Work, study, volunteering, or life experience can be useful.',
          ),
          question(
            'availability',
            'When could you participate? (optional)',
            1000,
            2,
            'Days, times, time zone, or a rough weekly commitment are useful.',
          ),
          question(
            'supportNeeds',
            'What would help you participate? (optional)',
            2000,
            3,
            'Share practical or accessibility needs. Leave out passwords, ID numbers, and private details about other people.',
          ),
          ErrorMessage(error),
          if (stale)
            OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Return to saved applications'),
            ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: busy || stale ? null : save,
            child: Text(
              busy
                  ? 'Saving…'
                  : widget.application == null
                  ? 'Submit application'
                  : 'Save and resubmit',
            ),
          ),
        ],
      ),
    ),
  );
}
