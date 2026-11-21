import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/data.dart';
import '../../services/app_controller.dart';

const cadenceLabels = {
  'one_time': 'One-time conversation',
  'weekly': 'Weekly',
  'biweekly': 'Every two weeks',
  'monthly': 'Monthly',
};
List<String> stringList(dynamic value) =>
    value is List ? value.map((item) => item.toString()).toList() : <String>[];
String textOf(dynamic value, [String fallback = '']) =>
    value == null || value.toString().isEmpty ? fallback : value.toString();
Map<String, dynamic>? itemById(List<Map<String, dynamic>> items, dynamic id) {
  for (final item in items) {
    if (item['id'] == id) return item;
  }
  return null;
}

Map<String, dynamic>? courseEnrollment(AppController controller, String id) {
  for (final entry in asList(controller.state['enrollments'])) {
    if (entry['courseId'] == id && entry['userId'] == controller.user['id']) {
      return entry;
    }
  }
  return null;
}

String dateLabel(BuildContext context, dynamic value, {bool time = false}) {
  final date = DateTime.tryParse(textOf(value))?.toLocal();
  if (date == null) return 'Not scheduled';
  final labels = MaterialLocalizations.of(context);
  final day = labels.formatMediumDate(date);
  return time ? '$day · ${TimeOfDay.fromDateTime(date).format(context)}' : day;
}

void showNotice(BuildContext context, String message) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}

Future<void> refreshLearner(
  BuildContext context,
  AppController controller,
) async {
  try {
    await controller.refresh();
  } catch (error) {
    if (context.mounted) showNotice(context, error.toString());
  }
}

Future<void> openExternal(BuildContext context, dynamic value) async {
  final uri = Uri.tryParse(textOf(value));
  if (uri == null ||
      !['https', 'http'].contains(uri.scheme) ||
      uri.host.isEmpty) {
    showNotice(context, 'This link is not available.');
    return;
  }
  try {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) &&
        context.mounted) {
      showNotice(context, 'The link could not be opened.');
    }
  } catch (_) {
    if (context.mounted) showNotice(context, 'The link could not be opened.');
  }
}

class PageIntro extends StatelessWidget {
  const PageIntro(this.title, this.description, {super.key});
  final String title;
  final String description;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        Text(description),
      ],
    ),
  );
}

class ContentCard extends StatelessWidget {
  const ContentCard({required this.children, this.color, super.key});
  final List<Widget> children;
  final Color? color;
  @override
  Widget build(BuildContext context) => Card(
    color: color,
    margin: const EdgeInsets.only(bottom: 16),
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    ),
  );
}

class EmptyCard extends StatelessWidget {
  const EmptyCard(this.title, this.description, {this.action, super.key});
  final String title;
  final String description;
  final Widget? action;
  @override
  Widget build(BuildContext context) => ContentCard(
    children: [
      Text(title, style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      Text(description),
      if (action != null) ...[const SizedBox(height: 16), action!],
    ],
  );
}

class ErrorMessage extends StatelessWidget {
  const ErrorMessage(this.message, {super.key});
  final String? message;
  @override
  Widget build(BuildContext context) => message == null
      ? const SizedBox.shrink()
      : Semantics(
          liveRegion: true,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              message!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        );
}

class StatusLabel extends StatelessWidget {
  const StatusLabel(this.value, {super.key});
  final String value;
  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerLeft,
    child: Chip(
      label: Text(switch (value) {
        'in_progress' => 'In progress',
        'waiting' => 'Waiting to schedule',
        'scheduled' => 'Scheduled',
        'completed' => 'Completed',
        'open' => 'Open',
        'resolved' => 'Resolved',
        _ => value,
      }),
    ),
  );
}

class RefreshList extends StatelessWidget {
  const RefreshList({
    required this.controller,
    required this.children,
    super.key,
  });
  final AppController controller;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: () => refreshLearner(context, controller),
    child: ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      physics: const AlwaysScrollableScrollPhysics(),
      children: children,
    ),
  );
}
