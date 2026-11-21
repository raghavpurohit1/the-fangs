import 'package:flutter/material.dart';

import '../../models/data.dart';
import '../../services/app_controller.dart';
import 'learner_ui.dart';

Map<String, dynamic>? pendingRequest(
  AppController controller,
  String? mentorId,
) {
  for (final request in asList(controller.state['requests'])) {
    if (request['userId'] == controller.user['id'] &&
        request['mentorId'] == mentorId &&
        ['waiting', 'scheduled'].contains(request['status'])) {
      return request;
    }
  }
  return null;
}

class MentorsTab extends StatelessWidget {
  const MentorsTab({required this.controller, super.key});
  final AppController controller;
  void requestMentor(BuildContext context, Map<String, dynamic>? mentor) {
    final existing = pendingRequest(controller, mentor?['id'] as String?);
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => existing != null
            ? ConnectionPage(
                controller: controller,
                requestId: textOf(existing['id']),
              )
            : MentorRequestPage(controller: controller, mentor: mentor),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final requests = asList(controller.state['requests'])
        .where((r) => r['userId'] == controller.user['id'])
        .toList();
    final words = RegExp(r'[a-z]{4,}')
        .allMatches(
          '${textOf(controller.user['goal'])} ${textOf(controller.user['story'])} ${textOf(controller.user['resume'])}'
              .toLowerCase(),
        )
        .map((m) => m.group(0))
        .toSet();
    int score(Map<String, dynamic> mentor) {
      final shared =
          [
                ...stringList(mentor['expertise']),
                ...stringList(mentor['experiences']),
              ]
              .where(
                (skill) => skill
                    .toLowerCase()
                    .split(RegExp(r'\W+'))
                    .any(words.contains),
              )
              .length;
      return shared + (mentor['stage'] == controller.user['stage'] ? 2 : 0);
    }

    final mentors =
        asList(controller.state['mentors'])
            .where(
              (m) => m['active'] == true && ((m['capacity'] as num?) ?? 0) > 0,
            )
            .toList()
          ..sort((a, b) => score(b).compareTo(score(a)));
    return RefreshList(
      controller: controller,
      children: [
        const PageIntro(
          'Find a mentor',
          'Compare experience, request a connection, and follow your meeting details.',
        ),
        Text('Your connections', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        if (requests.isEmpty)
          const EmptyCard(
            'No requests yet',
            'Choose a mentor below or ask the program team to find a match.',
          ),
        ...requests.map(
          (request) => ConnectionCard(controller: controller, request: request),
        ),
        const SizedBox(height: 12),
        Text(
          'Available mentors',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 8),
        const Text(
          'Suggestions use your career stage and words shared between your profile and mentor experience.',
        ),
        const SizedBox(height: 16),
        if (mentors.isEmpty)
          const EmptyCard(
            'No mentors available right now',
            'Ask for a match. Program staff can follow up as availability changes.',
          ),
        ...mentors.map((mentor) {
          final existing = pendingRequest(controller, textOf(mentor['id']));
          return ContentCard(
            children: [
              Text(
                textOf(mentor['name']),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 4),
              Text('${textOf(mentor['role'])} · ${textOf(mentor['company'])}'),
              if (mentor['verified'] == true)
                const StatusLabel('Experience reviewed'),
              const SizedBox(height: 12),
              Text(textOf(mentor['story'])),
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: stringList(mentor['expertise'])
                    .map((x) => Chip(label: Text(x)))
                    .toList(),
              ),
              const SizedBox(height: 8),
              Text(
                mentor['stage'] == controller.user['stage']
                    ? 'Supports your career stage: ${textOf(mentor['stage'])}.'
                    : 'Explore support in ${stringList(mentor['expertise']).take(2).join(' and ')}.',
              ),
              const SizedBox(height: 12),
              Text('Availability: ${textOf(mentor['availability'])}'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => requestMentor(context, mentor),
                child: Text(
                  existing == null
                      ? 'Request this mentor'
                      : existing['status'] == 'scheduled'
                      ? 'View connection'
                      : 'Request pending · view details',
                ),
              ),
            ],
          );
        }),
        ContentCard(
          children: [
            Text(
              'Need help choosing?',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            const Text(
              'Describe the support you need and ask program staff to find a mentor.',
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () => requestMentor(context, null),
              child: Text(
                pendingRequest(controller, null) == null
                    ? 'Ask for a match'
                    : 'View pending match request',
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class ConnectionCard extends StatelessWidget {
  const ConnectionCard({
    required this.controller,
    required this.request,
    super.key,
  });
  final AppController controller;
  final Map<String, dynamic> request;
  @override
  Widget build(BuildContext context) {
    // Assigned inactive or full mentors remain available for saved connection names.
    final mentor = itemById(
      asList(controller.state['mentors']),
      request['mentorId'],
    );
    return ContentCard(
      children: [
        Text(
          textOf(mentor?['name'], 'Help finding a mentor'),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        StatusLabel(textOf(request['status'])),
        Text(textOf(request['topic'])),
        const SizedBox(height: 12),
        Text(cadenceLabels[request['cadence']] ?? 'One-time conversation'),
        Text(
          'Next meeting: ${request['status'] == 'scheduled' ? dateLabel(context, request['sessionAt'], time: true) : 'Not scheduled'}',
        ),
        if (request['lastMetAt'] != null)
          Text(
            'Last meeting: ${dateLabel(context, request['lastMetAt'], time: true)}',
          ),
        if (textOf(request['notes']).isNotEmpty) ...[
          const SizedBox(height: 12),
          const Text(
            'Notes and next steps',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          Text(textOf(request['notes'])),
        ],
        const SizedBox(height: 8),
        const Text(
          'Cadence records the plan. Each next meeting is scheduled separately.',
        ),
        if (request['status'] == 'scheduled' &&
            textOf(request['meetingUrl']).isNotEmpty) ...[
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () => openExternal(context, request['meetingUrl']),
            icon: const Icon(Icons.videocam_outlined),
            label: const Text('Join meeting'),
          ),
        ],
      ],
    );
  }
}

class ConnectionPage extends StatelessWidget {
  const ConnectionPage({
    required this.controller,
    required this.requestId,
    super.key,
  });
  final AppController controller;
  final String requestId;
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (context, _) {
      final request = itemById(asList(controller.state['requests']), requestId);
      return Scaffold(
        appBar: AppBar(title: const Text('Your connection')),
        body: RefreshList(
          controller: controller,
          children: [
            if (request == null)
              const EmptyCard(
                'Connection unavailable',
                'Refresh your mentor requests.',
              )
            else
              ConnectionCard(controller: controller, request: request),
          ],
        ),
      );
    },
  );
}

class MentorRequestPage extends StatefulWidget {
  const MentorRequestPage({required this.controller, this.mentor, super.key});
  final AppController controller;
  final Map<String, dynamic>? mentor;
  @override
  State<MentorRequestPage> createState() => _MentorRequestPageState();
}

class _MentorRequestPageState extends State<MentorRequestPage> {
  final form = GlobalKey<FormState>();
  late final topic = TextEditingController(
    text: textOf(widget.controller.user['goal']),
  );
  String cadence = 'one_time';
  String? error;
  bool busy = false;
  @override
  void dispose() {
    topic.dispose();
    super.dispose();
  }

  Future<void> save() async {
    if (!form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.controller.mutate('/api/requests', {
        if (widget.mentor != null) 'mentorId': widget.mentor!['id'],
        'topic': topic.text.trim(),
        'cadence': cadence,
      });
      if (mounted) {
        Navigator.of(context).pop();
        showNotice(
          context,
          'Mentor request saved. Program staff will coordinate the connection.',
        );
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.mentor == null ? 'Ask for a mentor match' : 'Request a mentor',
      ),
    ),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          PageIntro(
            widget.mentor == null
                ? 'Find a match'
                : textOf(widget.mentor!['name']),
            'Your request is saved for program staff to coordinate. It does not directly contact the mentor.',
          ),
          TextFormField(
            controller: topic,
            maxLength: 2000,
            minLines: 4,
            maxLines: 8,
            decoration: const InputDecoration(
              labelText: 'What would you like support with?',
            ),
            validator: (value) => value == null || value.trim().isEmpty
                ? 'Describe the support you need.'
                : null,
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: cadence,
            decoration: const InputDecoration(
              labelText: 'Preferred meeting cadence',
            ),
            items: cadenceLabels.entries
                .map(
                  (e) => DropdownMenuItem(value: e.key, child: Text(e.value)),
                )
                .toList(),
            onChanged: busy
                ? null
                : (value) => setState(() => cadence = value ?? 'one_time'),
          ),
          const SizedBox(height: 12),
          const Text(
            'Cadence is a preference, not a recurring booking. Each next meeting time must be confirmed.',
          ),
          ErrorMessage(error),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: busy ? null : save,
            child: Text(busy ? 'Saving…' : 'Save request'),
          ),
        ],
      ),
    ),
  );
}
