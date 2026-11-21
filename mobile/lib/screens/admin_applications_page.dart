import 'package:flutter/material.dart';

import '../models/data.dart';
import '../services/app_controller.dart';
import '../widgets/record_form.dart';

const applicationStatuses = <String, String>{
  'submitted': 'Submitted',
  'in_review': 'In review',
  'follow_up': 'Needs follow-up',
  'accepted': 'Accepted',
  'declined': 'Declined',
};

class AdminApplicationsPage extends StatefulWidget {
  final AppController controller;
  const AdminApplicationsPage({super.key, required this.controller});
  @override
  State<AdminApplicationsPage> createState() => _AdminApplicationsPageState();
}

class _AdminApplicationsPageState extends State<AdminApplicationsPage> {
  String filter = 'all';
  AppController get c => widget.controller;
  String name(dynamic userId) {
    for (final u in asList(c.state['users'])) {
      if (u['id'] == userId) return '${u['name']}';
    }
    return 'Applicant';
  }

  Future<void> refresh() async {
    try {
      await c.refresh();
    } catch (e) {
      if (mounted) showMessage(context, e);
    }
  }

  void review(Map<String, dynamic> application) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => RecordFormPage(
        title: 'Review ${name(application['userId'])}',
        description: 'Your response is visible to the applicant. Membership plans are assigned separately.',
        initial: {
          'status': application['status'],
          'staffNote': application['staffNote'] ?? '',
        },
        fields: const [
          FieldSpec(
            'status',
            'Application status',
            required: true,
            options: applicationStatuses,
          ),
          FieldSpec('staffNote', 'Response to applicant', lines: 5),
        ],
        submitLabel: 'Save review',
        onSave: (values) async {
          await c.mutate('/api/admin/application/${application['id']}', {
            ...values,
            'revision': application['revision'],
          }, method: 'PUT');
        },
      ),
    ),
  );
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: c,
    builder: (context, _) {
      final applications = asList(c.state['applications'])
          .where((a) => filter == 'all' || a['status'] == filter)
          .toList();
      return Scaffold(
        appBar: AppBar(
          title: const Text('Applications'),
          actions: [
            IconButton(
              onPressed: refresh,
              tooltip: 'Refresh',
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: refresh,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const Text(
                'Read each person’s goals and support needs, then record a clear next step.',
              ),
              const SizedBox(height: 18),
              DropdownButtonFormField<String>(
                initialValue: filter,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Show applications',
                ),
                items: {'all': 'All statuses', ...applicationStatuses}.entries
                    .map(
                      (e) =>
                          DropdownMenuItem(value: e.key, child: Text(e.value)),
                    )
                    .toList(),
                onChanged: (v) => setState(() => filter = v ?? 'all'),
              ),
              const SizedBox(height: 20),
              if (applications.isEmpty)
                const EmptyPanel(
                  'No applications in this view',
                  'New submissions will appear here when learners complete their application survey.',
                ),
              for (final a in applications)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name(a['userId']),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: [
                            Chip(
                              label: Text(
                                applicationStatuses[a['status']] ?? 'Submitted',
                              ),
                            ),
                            Chip(
                              label: Text(
                                a['applicationType'] == 'mentor'
                                    ? 'Mentor volunteer'
                                    : 'Learner application',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        label('Goals', a['goals']),
                        ExpansionTile(
                          tilePadding: EdgeInsets.zero,
                          title: const Text('Read full application'),
                          children: [
                            label(
                              'Interests',
                              (a['interests'] as List? ?? []).join(', '),
                            ),
                            label('Experience', a['experience']),
                            label('Availability', a['availability']),
                            label('Support needs', a['supportNeeds']),
                            label('Latest staff response', a['staffNote']),
                          ],
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () => review(a),
                            child: const Text('Review application'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
    },
  );
  Widget label(String title, dynamic value) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: SizedBox(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('${value ?? ''}'.isEmpty ? 'Not provided' : '$value'),
        ],
      ),
    ),
  );
}
