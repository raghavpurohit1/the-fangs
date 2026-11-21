import 'package:flutter/material.dart';

import '../services/app_controller.dart';
import '../services/api_client.dart';
import '../models/data.dart';
import '../widgets/record_form.dart';

class MembershipPage extends StatelessWidget {
  final AppController controller;
  const MembershipPage({super.key, required this.controller});
  List<Map<String, dynamic>> get tiers =>
      asList(asMap(controller.state['settings'])['membershipTiers']);
  Future<void> edit(BuildContext context, [Map<String, dynamic>? plan]) async {
    final original = plan ?? <String, dynamic>{};
    final currentDefault = original['isDefault'] == true;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => RecordFormPage(
          title: plan == null ? 'Add membership plan' : 'Edit membership plan',
          description: currentDefault
              ? 'Prices are informational. Choose another default before archiving this plan.'
              : 'Prices are informational; saving does not charge members. A new default applies to new learners only.',
          initial: {
            'priceAmount': 0,
            'currency': 'USD',
            'billingPeriod': 'free',
            'active': true,
            'isDefault': false,
            ...original,
            'benefits': (original['benefits'] as List? ?? []).join('\n'),
          },
          fields: [
            const FieldSpec('name', 'Plan name', required: true, maxLength: 80),
            const FieldSpec(
              'description',
              'Description',
              required: true,
              lines: 3,
              maxLength: 500,
            ),
            const FieldSpec(
              'benefits',
              'Benefits, one per line',
              lines: 4,
              help: 'Up to 10 benefits, each no longer than 120 characters.',
            ),
            const FieldSpec(
              'billingPeriod',
              'Billing period',
              required: true,
              options: {
                'free': 'Free',
                'monthly': 'Monthly',
                'yearly': 'Yearly',
                'one_time': 'One-time',
              },
            ),
            const FieldSpec(
              'currency',
              'Currency',
              required: true,
              options: {
                'USD': 'USD',
                'CAD': 'CAD',
                'EUR': 'EUR',
                'GBP': 'GBP',
                'AUD': 'AUD',
                'INR': 'INR',
              },
            ),
            const FieldSpec(
              'priceAmount',
              'Price per billing period',
              required: true,
              number: true,
              minimum: 0,
              maximum: 1000000,
              help: 'Use up to two decimals. Free plans are saved with a price of zero.',
            ),
            if (!currentDefault)
              const FieldSpec(
                'active',
                'Active for new assignments',
                toggle: true,
              ),
            if (!currentDefault)
              const FieldSpec(
                'isDefault',
                'Default for new learners',
                toggle: true,
              ),
          ],
          submitLabel: plan == null ? 'Create plan' : 'Save plan',
          onSave: (values) async {
            final benefits = '${values['benefits'] ?? ''}'
                .split('\n')
                .map((s) => s.trim())
                .where((s) => s.isNotEmpty)
                .toList();
            if (benefits.length > 10 || benefits.any((s) => s.length > 120)) {
              throw Exception(
                'Use up to 10 benefits, each no longer than 120 characters.',
              );
            }
            final amount = values['billingPeriod'] == 'free'
                ? 0
                : values['priceAmount'] as num;
            if ((amount * 100 - (amount * 100).round()).abs() > 0.000001) {
              throw Exception('Use up to two decimal places.');
            }
            if (values['billingPeriod'] != 'free' && amount <= 0) {
              throw Exception('Paid plans need a price greater than zero.');
            }
            if (values['isDefault'] == true && values['active'] != true) {
              throw Exception('The default plan must be active.');
            }
            await savePlan(plan == null ? null : '${plan['id']}', {
              for (final key in [
                'name',
                'description',
                'currency',
                'billingPeriod',
                'active',
                'isDefault',
              ])
                key: values[key],
              'priceAmount': amount,
              'benefits': benefits,
              if (plan != null) 'revision': plan['revision'] ?? 1,
            });
          },
        ),
      ),
    );
  }

  Future<void> savePlan(String? id, Map<String, dynamic> body) async {
    try {
      await controller.mutate(
        id == null
            ? '/api/admin/membership-plan'
            : '/api/admin/membership-plan/$id',
        body,
        method: id == null ? 'POST' : 'PUT',
      );
    } on ApiException catch (error) {
      if (error.statusCode != 409) rethrow;
      await controller.refresh();
      throw const ApiException(
        'This plan changed. Close this form and reopen the latest plan before saving.',
        statusCode: 409,
      );
    }
  }

  Future<void> toggle(BuildContext context, Map<String, dynamic> plan) async {
    try {
      await savePlan('${plan['id']}', {
        'active': plan['active'] == false,
        'revision': plan['revision'] ?? 1,
      });
    } catch (error) {
      if (context.mounted) showMessage(context, error);
    }
  }

  Future<void> assign(BuildContext context, String planId) async {
    final users = asList(controller.state['users']);
    if (users.isEmpty) {
      showMessage(context, 'Add a learner before assigning a plan.');
      return;
    }
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => RecordFormPage(
          title: 'Assign membership plan',
          initial: {'membershipTier': planId},
          fields: [
            FieldSpec(
              'userId',
              'Learner',
              required: true,
              options: {for (final u in users) '${u['id']}': '${u['name']}'},
            ),
            FieldSpec(
              'membershipTier',
              'Membership plan',
              required: true,
              options: {
                for (final t in tiers.where((t) => t['active'] != false))
                  '${t['id']}': '${t['name']}',
              },
            ),
          ],
          onSave: (v) => controller.mutate(
            '/api/admin/learner/${v['userId']}',
            {'membershipTier': v['membershipTier']},
            method: 'PUT',
          ),
        ),
      ),
    );
  }

  Future<void> ask(BuildContext context, Map<String, dynamic> tier) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => RecordFormPage(
          title: 'Ask about ${tier['name']}',
          description: 'Send a request to your program team. Staff will review it and update your plan if appropriate.',
          initial: {
            'summary':
                'I would like to learn more about the ${tier['name']} membership plan.',
          },
          fields: const [
            FieldSpec(
              'summary',
              'Your question or request',
              required: true,
              lines: 5,
            ),
          ],
          submitLabel: 'Send request',
          onSave: (v) => controller.mutate('/api/needs', {
            'summary': v['summary'],
            'category': 'community',
            'priority': 'routine',
          }),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (context, _) {
      final admin = controller.isAdmin;
      return Scaffold(
        appBar: AppBar(
          title: const Text('Membership plans'),
          actions: [
            if (admin)
              IconButton(
                onPressed: tiers.length >= 20 ? null : () => edit(context),
                tooltip: 'Add plan',
                icon: const Icon(Icons.add),
              ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () async {
            try {
              await controller.refresh();
            } catch (e) {
              if (context.mounted) showMessage(context, e);
            }
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                admin
                    ? 'Support for every stage'
                    : 'Find the support that fits',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 10),
              const Text(
                'Compare plan prices and benefits. Prices are informational; this app does not collect payments or restrict learning access.',
              ),
              const SizedBox(height: 22),
              for (final t in tiers.where(
                (t) =>
                    admin ||
                    t['active'] != false ||
                    t['id'] ==
                        (controller.user['membershipTier'] ?? 'community'),
              ))
                _plan(context, t, admin),
              if (tiers.isEmpty)
                const EmptyPanel(
                  'Plans unavailable',
                  'Pull down to refresh the current program plans.',
                ),
            ],
          ),
        ),
      );
    },
  );
  Widget _plan(BuildContext context, Map<String, dynamic> t, bool admin) {
    final current =
        !admin && (controller.user['membershipTier'] ?? 'community') == t['id'];
    final members = asList(controller.state['users'])
        .where((u) => (u['membershipTier'] ?? 'community') == t['id'])
        .length;
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: current ? const Color(0xff327255) : const Color(0xffdfe4eb),
          width: current ? 2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 12,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  '${t['name']}',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                if (current) const Chip(label: Text('Your plan')),
                if (t['active'] == false) const Chip(label: Text('Archived')),
                if (admin && t['isDefault'] == true)
                  const Chip(label: Text('Default for new learners')),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              membershipPrice(t),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 10),
            Text('${t['description'] ?? ''}'),
            const SizedBox(height: 18),
            for (final benefit in (t['benefits'] as List? ?? []))
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      size: 20,
                      color: Color(0xff327255),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Text('$benefit')),
                  ],
                ),
              ),
            if (admin)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Text(
                  '$members assigned ${members == 1 ? 'learner' : 'learners'}',
                ),
              ),
            if (admin) ...[
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => edit(context, t),
                  child: const Text('Edit plan'),
                ),
              ),
              TextButton(
                onPressed: t['isDefault'] == true
                    ? null
                    : () => toggle(context, t),
                child: Text(
                  t['active'] == false ? 'Reactivate plan' : 'Archive plan',
                ),
              ),
            ],
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: admin && t['active'] == false
                    ? null
                    : () => admin
                          ? assign(context, '${t['id']}')
                          : ask(context, t),
                child: Text(
                  admin ? 'Assign a learner' : 'Ask the program team',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
