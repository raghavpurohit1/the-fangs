import 'package:flutter/material.dart';

import '../../models/data.dart';
import '../../services/app_controller.dart';
import '../membership_page.dart';
import 'application_page.dart';
import 'courses.dart';
import 'learner_ui.dart';
import 'mentors.dart';
import 'messages_support.dart';
import 'profile.dart';

class LearnerWorkspace extends StatefulWidget {
  const LearnerWorkspace({required this.controller, super.key});
  final AppController controller;
  @override
  State<LearnerWorkspace> createState() => _LearnerWorkspaceState();
}

class _LearnerWorkspaceState extends State<LearnerWorkspace> {
  int selected = 0;
  bool refreshing = false;
  bool signingOut = false;
  void openPage(Widget page) =>
      Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
  void select(int index) {
    if (index == 3) {
      openPage(MembershipPage(controller: widget.controller));
    } else {
      setState(() => selected = index);
    }
  }

  Future<void> refresh() async {
    setState(() => refreshing = true);
    await refreshLearner(context, widget.controller);
    if (mounted) setState(() => refreshing = false);
  }

  Future<void> signOut() async {
    setState(() => signingOut = true);
    try {
      await widget.controller.signOut();
    } catch (error) {
      if (mounted) showNotice(context, error.toString());
    } finally {
      if (mounted) setState(() => signingOut = false);
    }
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) => Scaffold(
      appBar: AppBar(
        title: Text(['Home', 'Learn', 'Mentors', 'Plans', 'More'][selected]),
        actions: [
          IconButton(
            onPressed: refreshing ? null : refresh,
            tooltip: 'Refresh',
            icon: refreshing
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
          ),
          IconButton(
            onPressed: signingOut ? null : signOut,
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: switch (selected) {
        1 => CoursesTab(controller: widget.controller),
        2 => MentorsTab(controller: widget.controller),
        4 => MoreTab(controller: widget.controller),
        _ => LearnerHome(controller: widget.controller, onSelect: select),
      },
      bottomNavigationBar: NavigationBar(
        selectedIndex: selected,
        onDestinationSelected: select,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'Learn',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'Mentors',
          ),
          NavigationDestination(
            icon: Icon(Icons.card_membership_outlined),
            label: 'Plans',
          ),
          NavigationDestination(icon: Icon(Icons.more_horiz), label: 'More'),
        ],
      ),
    ),
  );
}

class LearnerHome extends StatelessWidget {
  const LearnerHome({
    required this.controller,
    required this.onSelect,
    super.key,
  });
  final AppController controller;
  final ValueChanged<int> onSelect;
  void push(BuildContext context, Widget page) =>
      Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
  @override
  Widget build(BuildContext context) {
    final user = controller.user;
    final courses = asList(controller.state['courses'])
        .where((c) => c['published'] == true)
        .toList();
    final enrollments = asList(controller.state['enrollments'])
        .where((e) => e['userId'] == user['id'])
        .toList();
    final next =
        courses.where((c) {
          final e = courseEnrollment(controller, textOf(c['id']));
          return e != null && e['completedAt'] == null;
        }).firstOrNull ??
        courses
            .where((c) => courseEnrollment(controller, textOf(c['id'])) == null)
            .firstOrNull ??
        courses.firstOrNull;
    final requests =
        asList(controller.state['requests'])
            .where(
              (r) => r['userId'] == user['id'] && r['status'] == 'scheduled',
            )
            .toList()
          ..sort(
            (a, b) => textOf(a['sessionAt']).compareTo(textOf(b['sessionAt'])),
          );
    final plan = itemById(
      asList(asMap(controller.state['settings'])['membershipTiers']),
      user['membershipTier'] ?? 'community',
    );
    final announcements = asList(controller.state['announcements'])
        .where((a) => a['active'] == true);
    final unread = announcements
        .where(
          (a) =>
              !stringList(controller.state['announcementReads'])
                  .contains(a['id']),
        )
        .length;
    final lessonsDone = enrollments.fold<int>(
      0,
      (count, e) => count + stringList(e['completedLessons']).length,
    );
    final events = asList(controller.state['events'])
        .where((e) => e['active'] == true)
        .toList();
    final resources = asList(controller.state['resources'])
        .where((r) => r['active'] == true)
        .toList();
    return RefreshList(
      controller: controller,
      children: [
        PageIntro(
          'Hello, ${textOf(user['name'], 'learner').split(' ').first}',
          'Choose what you want to do next.',
        ),
        ContentCard(
          children: [
            FilledButton.icon(
              onPressed: () => next == null
                  ? onSelect(1)
                  : openCourse(context, controller, textOf(next['id'])),
              icon: const Icon(Icons.menu_book_outlined),
              label: Text(
                next == null ? 'Browse courses' : 'Continue learning',
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => onSelect(2),
              icon: const Icon(Icons.people_outline),
              label: const Text('Find a mentor'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () =>
                  push(context, SupportPage(controller: controller)),
              icon: const Icon(Icons.help_outline),
              label: const Text('Get help'),
            ),
          ],
        ),
        ContentCard(
          children: [
            Text(
              'Application survey',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            const Text(
              'Share your goals and interests with the program team, then follow your review.',
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () =>
                  push(context, ApplicationPage(controller: controller)),
              child: const Text('Open applications'),
            ),
          ],
        ),
        ContentCard(
          children: [
            Text(
              'Your membership plan',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              '${textOf(plan?['name'], 'Community')} · ${membershipPrice(plan)}',
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => onSelect(3),
              child: const Text('View membership plans'),
            ),
          ],
        ),
        Text(
          'Your next meeting',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        if (requests.isEmpty)
          EmptyCard(
            'No meeting scheduled',
            'Review your mentor connections or request a match.',
            action: TextButton(
              onPressed: () => onSelect(2),
              child: const Text('View connections'),
            ),
          )
        else
          ConnectionCard(controller: controller, request: requests.first),
        if (next != null) ...[
          Text('Your learning', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          CourseCard(controller: controller, course: next),
        ],
        ContentCard(
          children: [
            Text(
              'Your progress',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Text('$lessonsDone lessons completed'),
            Text(
              '${enrollments.where((e) => e['completedAt'] != null).length} of ${enrollments.length} started courses completed',
            ),
            const SizedBox(height: 16),
            Text('$unread unread program update${unread == 1 ? '' : 's'}'),
            OutlinedButton(
              onPressed: () =>
                  push(context, MessagesPage(controller: controller)),
              child: const Text('Read messages'),
            ),
          ],
        ),
        if (events.isNotEmpty || resources.isNotEmpty) ...[
          Text(
            'Events and resources',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          ...events.map(
            (event) => ContentCard(
              children: [
                Text(
                  textOf(event['title']),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(textOf(event['description'])),
                const SizedBox(height: 8),
                Text(
                  '${dateLabel(context, event['date'])} · ${textOf(event['format'])}',
                ),
                if (textOf(event['url']).isNotEmpty)
                  TextButton(
                    onPressed: () => openExternal(context, event['url']),
                    child: const Text('Open event page'),
                  ),
              ],
            ),
          ),
          ...resources.map(
            (resource) => ContentCard(
              children: [
                Text(
                  textOf(resource['title']),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(textOf(resource['description'])),
                if (textOf(resource['url']).isNotEmpty)
                  TextButton(
                    onPressed: () => openExternal(context, resource['url']),
                    child: const Text('Open resource'),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class MoreTab extends StatelessWidget {
  const MoreTab({required this.controller, super.key});
  final AppController controller;
  void push(BuildContext context, Widget page) =>
      Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
  @override
  Widget build(BuildContext context) => RefreshList(
    controller: controller,
    children: [
      PageIntro(
        textOf(controller.user['name']),
        'Messages, support, and your learning profile.',
      ),
      Card(
        child: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.assignment_outlined),
              title: const Text('Application survey'),
              subtitle: const Text('Apply and follow your review'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () =>
                  push(context, ApplicationPage(controller: controller)),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.mail_outline),
              title: const Text('Messages'),
              subtitle: const Text('Read program updates'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => push(context, MessagesPage(controller: controller)),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.help_outline),
              title: const Text('Get help'),
              subtitle: const Text('Ask the assistant or your program team'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => push(context, SupportPage(controller: controller)),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: const Text('My profile'),
              subtitle: const Text(
                'Goals, experience, and contact preferences',
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => push(context, ProfilePage(controller: controller)),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.card_membership_outlined),
              title: const Text('Membership plans'),
              subtitle: const Text('Compare the free starter plans'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () =>
                  push(context, MembershipPage(controller: controller)),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      TextButton.icon(
        onPressed: () => openExternal(context, 'https://techwomenaz.org/'),
        icon: const Icon(Icons.open_in_new),
        label: const Text('Official TechWomenAZ website'),
      ),
      const SizedBox(height: 12),
      const Text(
        'NextStep is a companion app, separate from the official TechWomenAZ website.',
      ),
    ],
  );
}
