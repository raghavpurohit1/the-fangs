import 'package:flutter/material.dart';

import '../../models/data.dart';
import '../../services/api_client.dart';
import '../../services/app_controller.dart';
import 'courses.dart';
import 'learner_ui.dart';

class MessagesPage extends StatefulWidget {
  const MessagesPage({required this.controller, super.key});
  final AppController controller;
  @override
  State<MessagesPage> createState() => _MessagesPageState();
}

class _MessagesPageState extends State<MessagesPage> {
  String? busyId;
  String? error;
  Future<void> acknowledge(Map<String, dynamic> announcement) async {
    setState(() {
      busyId = textOf(announcement['id']);
      error = null;
    });
    try {
      await widget.controller.mutate(
        '/api/announcements/${Uri.encodeComponent(busyId!)}/read',
        {'revision': announcement['revision'] ?? 1},
      );
    } on ApiException catch (e) {
      if (e.statusCode == 409) {
        try {
          await widget.controller.refresh();
          if (mounted) {
            setState(
              () => error = 'This update changed. Read the latest version before marking it as read.',
            );
          }
        } catch (_) {
          if (mounted) {
            setState(
              () => error = 'This update changed. Refresh this page to read the latest version.',
            );
          }
        }
      } else if (mounted) {
        setState(() => error = e.toString());
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) {
      final announcements =
          asList(widget.controller.state['announcements'])
              .where((a) => a['active'] == true)
              .toList()
            ..sort(
              (a, b) =>
                  textOf(b['createdAt']).compareTo(textOf(a['createdAt'])),
            );
      final reads = stringList(widget.controller.state['announcementReads']);
      return Scaffold(
        appBar: AppBar(title: const Text('Messages')),
        body: RefreshList(
          controller: widget.controller,
          children: [
            const PageIntro(
              'Program messages',
              'These updates are shared inside NextStep. Mark them as read so your program team knows you have seen them.',
            ),
            ErrorMessage(error),
            if (announcements.isEmpty)
              const EmptyCard(
                'No messages yet',
                'Your program team will post updates here.',
              ),
            ...announcements.map(
              (a) => ContentCard(
                children: [
                  Row(
                    children: [
                      Chip(
                        label: Text(reads.contains(a['id']) ? 'Read' : 'New'),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(dateLabel(context, a['createdAt']))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    textOf(a['title']),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  SelectableText(textOf(a['body'])),
                  if (!reads.contains(a['id'])) ...[
                    const SizedBox(height: 16),
                    OutlinedButton(
                      onPressed: busyId != null ? null : () => acknowledge(a),
                      child: Text(
                        busyId == a['id'] ? 'Saving…' : 'Mark as read',
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      );
    },
  );
}

class SupportPage extends StatelessWidget {
  const SupportPage({required this.controller, super.key});
  final AppController controller;
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (context, _) {
      final needs =
          asList(controller.state['needs'])
              .where((n) => n['userId'] == controller.user['id'])
              .toList()
            ..sort(
              (a, b) =>
                  textOf(b['createdAt']).compareTo(textOf(a['createdAt'])),
            );
      return Scaffold(
        appBar: AppBar(title: const Text('Get help')),
        body: RefreshList(
          controller: controller,
          children: [
            const PageIntro(
              'Get help',
              'Ask for a practical next step or send a request to your program team.',
            ),
            PlannerCard(controller: controller),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => NeedPage(controller: controller),
                ),
              ),
              icon: const Icon(Icons.add),
              label: const Text('Send a support request'),
            ),
            const SizedBox(height: 24),
            Text(
              'Your support requests',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            if (needs.isEmpty)
              const EmptyCard(
                'No support requests yet',
                'Tell the program team what you are working toward and what would help.',
              ),
            ...needs.map(
              (need) => ContentCard(
                children: [
                  Wrap(
                    spacing: 8,
                    children: [
                      StatusLabel(textOf(need['status'])),
                      Chip(label: Text(textOf(need['category']))),
                      if (need['priority'] == 'soon')
                        const Chip(label: Text('Help soon')),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(textOf(need['summary'])),
                  const SizedBox(height: 12),
                  Text('Sent ${dateLabel(context, need['createdAt'])}'),
                  const Divider(height: 28),
                  Text(
                    'Program team response',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    textOf(
                      need['adminNote'],
                      'The program team has not responded yet.',
                    ),
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

class PlannerCard extends StatefulWidget {
  const PlannerCard({required this.controller, super.key});
  final AppController controller;
  @override
  State<PlannerCard> createState() => _PlannerCardState();
}

class _PlannerCardState extends State<PlannerCard> {
  final message = TextEditingController();
  bool busy = false;
  String? error;
  Map<String, dynamic>? response;
  @override
  void dispose() {
    message.dispose();
    super.dispose();
  }

  Future<void> ask() async {
    if (message.text.trim().isEmpty) {
      setState(() => error = 'Describe a goal or question first.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await widget.controller.api.post('/api/assistant', {
        'message': message.text.trim(),
      });
      if (mounted) setState(() => response = result);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => ContentCard(
    children: [
      Text(
        'Plan your next step',
        style: Theme.of(context).textTheme.titleLarge,
      ),
      const SizedBox(height: 8),
      Text(
        widget.controller.state['aiAvailable'] == true
            ? 'Ask the AI assistant about learning or mentoring. It can make mistakes; check important details.'
            : 'Use the program guide for a practical next step. Live AI is not connected.',
      ),
      const SizedBox(height: 16),
      TextField(
        controller: message,
        maxLength: 2000,
        minLines: 3,
        maxLines: 6,
        enabled: !busy,
        decoration: const InputDecoration(
          labelText: 'What would you like help with?',
          helperText: 'Leave out passwords and private identification details.',
        ),
      ),
      ErrorMessage(error),
      FilledButton(
        onPressed: busy ? null : ask,
        child: Text(busy ? 'Preparing guidance…' : 'Get a suggested plan'),
      ),
      if (response != null) ...[
        const Divider(height: 32),
        Text(
          response!['mode'] == 'live-ai'
              ? 'AI-generated suggestion'
              : 'Program guide',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        SelectableText(textOf(response!['reply'])),
        ...asList(response!['steps']).map((step) {
          final course = itemById(
            asList(widget.controller.state['courses']),
            step['courseId'],
          );
          return Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  textOf(step['title']),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 6),
                Text(textOf(step['detail'])),
                if (course != null && course['published'] == true)
                  OutlinedButton(
                    onPressed: () => openCourse(
                      context,
                      widget.controller,
                      textOf(course['id']),
                    ),
                    child: Text('Open ${textOf(course['title'])}'),
                  ),
              ],
            ),
          );
        }),
        const SizedBox(height: 16),
        const Text(
          'These are suggestions. No meeting, message, enrollment, or support request is created automatically.',
        ),
      ],
    ],
  );
}

class NeedPage extends StatefulWidget {
  const NeedPage({required this.controller, super.key});
  final AppController controller;
  @override
  State<NeedPage> createState() => _NeedPageState();
}

class _NeedPageState extends State<NeedPage> {
  final form = GlobalKey<FormState>();
  final summary = TextEditingController();
  String category = 'learning';
  String priority = 'routine';
  String? error;
  bool busy = false;
  @override
  void dispose() {
    summary.dispose();
    super.dispose();
  }

  Future<void> save() async {
    if (!form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.controller.mutate('/api/needs', {
        'category': category,
        'summary': summary.text.trim(),
        'priority': priority,
      });
      if (mounted) {
        Navigator.of(context).pop();
        showNotice(context, 'Your support request is saved.');
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Send a support request')),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const PageIntro(
            'Tell us what would help',
            'Your program team can review this request and respond in Get help.',
          ),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: category,
            decoration: const InputDecoration(labelText: 'Category'),
            items:
                [
                      'mentoring',
                      'learning',
                      'career',
                      'community',
                      'accessibility',
                      'other',
                    ]
                    .map(
                      (value) => DropdownMenuItem(
                        value: value,
                        child: Text(
                          '${value[0].toUpperCase()}${value.substring(1)}',
                        ),
                      ),
                    )
                    .toList(),
            onChanged: busy
                ? null
                : (value) => setState(() => category = value ?? 'learning'),
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: priority,
            decoration: const InputDecoration(
              labelText: 'When would support help?',
            ),
            items: const [
              DropdownMenuItem(
                value: 'routine',
                child: Text('When the team is available'),
              ),
              DropdownMenuItem(
                value: 'soon',
                child: Text('I would appreciate help soon'),
              ),
            ],
            onChanged: busy
                ? null
                : (value) => setState(() => priority = value ?? 'routine'),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: summary,
            minLines: 4,
            maxLines: 8,
            maxLength: 1000,
            decoration: const InputDecoration(
              labelText: 'What do you need?',
              helperText: 'Share the goal or barrier. Leave out passwords or ID numbers.',
            ),
            validator: (value) => value == null || value.trim().isEmpty
                ? 'Describe what would help.'
                : null,
          ),
          ErrorMessage(error),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: busy ? null : save,
            child: Text(busy ? 'Saving…' : 'Save support request'),
          ),
        ],
      ),
    ),
  );
}
