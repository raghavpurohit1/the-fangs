import 'package:flutter/material.dart';

import '../models/data.dart';
import '../services/app_controller.dart';
import '../widgets/record_form.dart';
import 'admin_applications_page.dart';
import 'membership_page.dart';

const stages = careerStageOptions;
const cadence = {
  'one_time': 'One-time conversation',
  'weekly': 'Weekly',
  'biweekly': 'Every two weeks',
  'monthly': 'Monthly',
};

class AdminWorkspace extends StatefulWidget {
  final AppController controller;
  const AdminWorkspace({super.key, required this.controller});
  @override
  State<AdminWorkspace> createState() => _AdminWorkspaceState();
}

class _AdminWorkspaceState extends State<AdminWorkspace> {
  int tab = 0;
  AppController get c => widget.controller;
  List<Map<String, dynamic>> records(String key) => asList(c.state[key]);
  Map<String, String> get tierOptions => {
    for (final t in asList(asMap(c.state['settings'])['membershipTiers']))
      '${t['id']}': '${t['name']}',
  };
  void open(Widget page) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => page));
  Future<void> refresh() async {
    try {
      await c.refresh();
    } catch (e) {
      if (mounted) showMessage(context, e);
    }
  }

  void form(
    String title,
    List<FieldSpec> fields,
    Map<String, dynamic> initial,
    Future<void> Function(Map<String, dynamic>) save, {
    String? description,
  }) => open(
    RecordFormPage(
      title: title,
      fields: fields,
      initial: initial,
      onSave: save,
      description: description,
    ),
  );
  String learnerName(dynamic id) {
    for (final u in records('users')) {
      if (u['id'] == id) return '${u['name']}';
    }
    return 'Learner';
  }

  Widget tile(
    String title,
    String subtitle,
    IconData icon,
    VoidCallback action,
  ) => Card(
    child: ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      leading: Icon(icon, color: const Color(0xffb8402a)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: action,
    ),
  );
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: c,
    builder: (context, _) => Scaffold(
      appBar: AppBar(
        title: Text(
          ['Program home', 'People', 'Membership plans', 'Program tools'][tab],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: refresh,
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            tooltip: 'Sign out',
            onPressed: () async {
              try {
                await c.signOut();
              } catch (e) {
                if (context.mounted) showMessage(context, e);
              }
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: refresh,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: tab == 0
              ? home()
              : tab == 1
              ? people()
              : tools(),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (value) {
          if (value == 2) {
            open(MembershipPage(controller: c));
            return;
          }
          setState(() => tab = value);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'People',
          ),
          NavigationDestination(
            icon: Icon(Icons.workspace_premium_outlined),
            label: 'Plans',
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            label: 'More',
          ),
        ],
      ),
    ),
  );
  List<Widget> home() => [
    Text(
      'Hello, ${'${c.user['name'] ?? 'Admin'}'.split(' ').first}',
      style: Theme.of(context).textTheme.headlineMedium,
    ),
    const SizedBox(height: 8),
    const Text('Keep your program connected and see what needs attention.'),
    const SizedBox(height: 20),
    if (c.state['demo'] == true)
      const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'Public review workspace · email and SMS delivery are disabled.',
          ),
        ),
      ),
    Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        metric('Learners', '${records('users').length}'),
        metric(
          'Waiting requests',
          '${records('requests').where((r) => r['status'] == 'waiting').length}',
        ),
        metric(
          'Open needs',
          '${records('needs').where((n) => n['status'] != 'resolved').length}',
        ),
      ],
    ),
    const SizedBox(height: 24),
    tile(
      'Applications',
      '${records('applications').where((a) => a['status'] == 'submitted').length} new · review learner goals and support needs.',
      Icons.assignment_outlined,
      () => open(AdminApplicationsPage(controller: c)),
    ),
    tile(
      'Membership plans',
      'Edit benefits and assign learners.',
      Icons.workspace_premium_outlined,
      () => open(MembershipPage(controller: c)),
    ),
    tile(
      'Mentor meetings',
      'Match learners and update meeting details.',
      Icons.video_call_outlined,
      meetings,
    ),
    tile(
      'Member needs',
      'Respond to questions and missed needs.',
      Icons.favorite_outline,
      needs,
    ),
    tile(
      'Program results',
      'View recorded learning progress.',
      Icons.bar_chart,
      () => open(MetricsPage(controller: c)),
    ),
  ];
  Widget metric(String name, String value) => SizedBox(
    width: 155,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: Theme.of(context).textTheme.headlineMedium),
            Text(name),
          ],
        ),
      ),
    ),
  );
  List<Widget> people() => [
    tile(
      'Applications',
      'Read surveys and respond to new learners.',
      Icons.assignment_outlined,
      () => open(AdminApplicationsPage(controller: c)),
    ),
    tile(
      'Learners',
      'Profiles, cohorts, and membership plans.',
      Icons.people_outline,
      learners,
    ),
    tile(
      'Mentors',
      'Professional profiles and mentor logins.',
      Icons.handshake_outlined,
      mentors,
    ),
    tile(
      'Membership plans',
      'Prices, benefits, defaults, and assignments.',
      Icons.workspace_premium_outlined,
      () => open(MembershipPage(controller: c)),
    ),
    tile(
      'Mentor meetings',
      'Assignments, cadence, and meeting links.',
      Icons.calendar_month_outlined,
      meetings,
    ),
  ];
  List<Widget> tools() => [
    tile(
      'Member needs',
      'Review requests and send a staff response.',
      Icons.favorite_outline,
      needs,
    ),
    tile(
      'Announcements',
      'Publish in-app program updates.',
      Icons.campaign_outlined,
      announcements,
    ),
    tile(
      'Courses',
      'Review and edit your learning paths.',
      Icons.menu_book_outlined,
      courses,
    ),
    tile(
      'Events and resources',
      'Keep community information current.',
      Icons.event_outlined,
      community,
    ),
    tile(
      'Workshop results',
      'Record attendance and before/after scores.',
      Icons.fact_check_outlined,
      results,
    ),
    tile(
      'Funding',
      'Track grants, sponsorships, and receipts.',
      Icons.savings_outlined,
      funding,
    ),
    tile(
      'Impact metrics',
      'Course completion and paired score changes.',
      Icons.bar_chart,
      () => open(MetricsPage(controller: c)),
    ),
    tile(
      'AI settings',
      'Choose the model and configure a key.',
      Icons.auto_awesome_outlined,
      aiSettings,
    ),
    tile(
      'Program settings',
      'Program description and contact page.',
      Icons.settings_outlined,
      programSettings,
    ),
    tile(
      'Change password',
      'Update your administrator password.',
      Icons.lock_outline,
      password,
    ),
    tile(
      'AI program agent',
      'Ask the agent to prepare and apply program changes.',
      Icons.auto_awesome,
      () => openWebLink(context, 'https://nextstep-techwomenaz.pages.dev/#agent'),
    ),
    tile(
      'Course builder and learner preview',
      'Describe a course, edit lessons and quizzes, and practice as a learner.',
      Icons.school_outlined,
      () => openWebLink(context, 'https://nextstep-techwomenaz.pages.dev/#courses'),
    ),
    tile(
      'Advanced web tools',
      'CSV imports, exports, and email/SMS queue.',
      Icons.open_in_browser,
      () => openWebLink(
        context,
        'https://nextstep-techwomenaz.pages.dev/#communications',
      ),
    ),
  ];
  void list(
    String title,
    String key,
    Widget Function(Map<String, dynamic>) build, {
    VoidCallback? add,
    String empty = 'No records yet.',
  }) => open(
    AdminRecordsPage(
      controller: c,
      title: title,
      source: key,
      recordBuilder: build,
      onAdd: add,
      emptyMessage: empty,
    ),
  );
  Widget record(
    String title,
    String detail,
    VoidCallback? edit, {
    List<Widget> actions = const [],
  }) => Card(
    child: Padding(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              if (edit != null)
                IconButton(
                  tooltip: 'Edit $title',
                  onPressed: edit,
                  icon: const Icon(Icons.edit_outlined),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(detail),
          ...actions,
        ],
      ),
    ),
  );
  void learners() => list(
    'Learners',
    'users',
    (u) => record(
      '${u['name']}',
      '${u['stage']}\n${u['cohort'] ?? ''}\nPlan: ${tierOptions[u['membershipTier'] ?? 'community'] ?? 'Community'}',
      () => editLearner(u),
    ),
    add: () => editLearner({}),
    empty: 'Learners can create accounts in the app. You can also add participant records.',
  );
  void editLearner(Map<String, dynamic> u) => form(
    u.isEmpty ? 'Add learner record' : 'Edit learner',
    [
      const FieldSpec('name', 'Full name', required: true),
      const FieldSpec('stage', 'Career stage', required: true, options: stages),
      const FieldSpec('cohort', 'Cohort'),
      FieldSpec(
        'membershipTier',
        'Membership plan',
        required: true,
        options: {
          for (final t in asList(asMap(c.state['settings'])['membershipTiers']))
            if (t['active'] != false ||
                t['id'] == (u['membershipTier'] ?? 'community'))
              '${t['id']}':
                  '${t['name']}${t['active'] == false ? ' (archived)' : ''}',
        },
      ),
      const FieldSpec('goal', 'Goal', lines: 3),
      const FieldSpec('story', 'Story', lines: 3),
      const FieldSpec('resume', 'Résumé and experience', lines: 3),
      const FieldSpec('grades', 'Coursework (optional)', lines: 2),
      const FieldSpec('email', 'Email'),
      const FieldSpec('phone', 'Phone'),
      const FieldSpec(
        'emailOptIn',
        'Member agreed to receive email',
        toggle: true,
      ),
      const FieldSpec(
        'smsOptIn',
        'Member agreed to receive text messages',
        toggle: true,
      ),
      const FieldSpec('active', 'Active participant', toggle: true),
    ],
    {
      'stage': 'Exploring tech',
      'membershipTier':
          asList(asMap(c.state['settings'])['membershipTiers'])
              .where((t) => t['isDefault'] == true)
              .firstOrNull?['id'] ??
          'community',
      'active': true,
      ...u,
    },
    (v) async {
      final body = {
        for (final key in [
          'name',
          'stage',
          'cohort',
          'membershipTier',
          'goal',
          'story',
          'resume',
          'grades',
          'email',
          'phone',
          'emailOptIn',
          'smsOptIn',
          'active',
        ])
          key: v[key] ?? (key.endsWith('OptIn') ? false : ''),
      };
      await c.mutate(
        u.isEmpty ? '/api/admin/learner' : '/api/admin/learner/${u['id']}',
        body,
        method: u.isEmpty ? 'POST' : 'PUT',
      );
    },
    description: u.isEmpty
        ? 'This creates a participant record. To create a learner login, use Create learner account on the sign-in screen.'
        : null,
  );
  void mentors() => list('Mentors', 'mentors', (m) {
    final accounts = records('mentorAccounts')
        .where((a) => a['mentorId'] == m['id']);
    return record(
      '${m['name']}',
      '${m['role']} · ${m['company']}\n${m['availability']}\n${m['active'] == true ? 'Active' : 'Inactive'} · ${m['capacity']} scheduled slots',
      () => editMentor(m),
      actions: [
        const SizedBox(height: 12),
        accounts.isEmpty
            ? OutlinedButton(
                onPressed: () => mentorLogin(m),
                child: const Text('Create mentor login'),
              )
            : Text('Login: ${accounts.first['username']}'),
      ],
    );
  }, add: () => editMentor({}));
  void editMentor(Map<String, dynamic> m) => form(
    m.isEmpty ? 'Add mentor' : 'Edit mentor',
    const [
      FieldSpec('name', 'Full name', required: true),
      FieldSpec('role', 'Professional role', required: true),
      FieldSpec('company', 'Organization', required: true),
      FieldSpec('story', 'Professional story', required: true, lines: 4),
      FieldSpec('expertise', 'Expertise (comma separated)'),
      FieldSpec('experiences', 'Shared experiences (comma separated)'),
      FieldSpec('stage', 'Career stage', required: true, options: stages),
      FieldSpec('availability', 'Availability', required: true),
      FieldSpec(
        'capacity',
        'Scheduled meeting capacity',
        number: true,
        required: true,
        integer: true,
        minimum: 0,
        maximum: 100,
        help: 'Maximum concurrent scheduled requests. Meeting cadence does not create recurring bookings.',
      ),
      FieldSpec('verified', 'Professional experience reviewed', toggle: true),
      FieldSpec('active', 'Visible in directory', toggle: true),
    ],
    {
      'stage': 'Exploring tech',
      'capacity': 2,
      'active': true,
      'verified': false,
      ...m,
      'expertise': (m['expertise'] as List? ?? []).join(', '),
      'experiences': (m['experiences'] as List? ?? []).join(', '),
    },
    (v) async {
      final body = {
        ...v,
        'expertise': split(v['expertise']),
        'experiences': split(v['experiences']),
      };
      if (m.isEmpty) {
        body['id'] = 'mentor-${DateTime.now().microsecondsSinceEpoch}';
      }
      await c.mutate('/api/admin/mentor', body);
    },
  );
  List<String> split(dynamic value) => '$value'
      .split(',')
      .map((s) => s.trim())
      .where((s) => s.isNotEmpty)
      .toList();
  void mentorLogin(Map<String, dynamic> m) => form(
    'Create mentor login',
    const [
      FieldSpec('username', 'Username', required: true),
      FieldSpec(
        'password',
        'Initial password',
        required: true,
        secret: true,
        help: 'At least 14 characters. Share it directly with the mentor.',
      ),
    ],
    {},
    (v) async {
      await c.mutate('/api/admin/mentors/${m['id']}/account', v);
    },
    description: 'No invitation is sent automatically.',
  );
  void meetings() => list(
    'Mentor meetings',
    'requests',
    (r) => record(
      learnerName(r['userId']),
      '${r['topic']}\nStatus: ${r['status']}\n${cadence[r['cadence']] ?? 'One-time conversation'}\nNext: ${localDate(r['sessionAt'])}',
      () => editMeeting(r),
      actions: [
        if ('${r['meetingUrl'] ?? ''}'.isNotEmpty)
          TextButton(
            onPressed: () => openWebLink(context, '${r['meetingUrl']}'),
            child: const Text('Join meeting'),
          ),
      ],
    ),
  );
  void editMeeting(Map<String, dynamic> r) => form(
    'Update mentor meeting',
    [
      FieldSpec(
        'mentorId',
        'Mentor',
        options: {
          '': 'Not assigned',
          for (final m in records('mentors')) '${m['id']}': '${m['name']}',
        },
      ),
      const FieldSpec(
        'status',
        'Status',
        required: true,
        options: {
          'waiting': 'Waiting to schedule',
          'scheduled': 'Scheduled',
          'completed': 'Completed',
        },
      ),
      const FieldSpec(
        'sessionAt',
        'Next meeting',
        dateTime: true,
        help: 'Tap to choose a date and your local time.',
      ),
      const FieldSpec(
        'cadence',
        'Meeting cadence',
        required: true,
        options: cadence,
      ),
      const FieldSpec('lastMetAt', 'Last meeting', dateTime: true),
      const FieldSpec('meetingUrl', 'HTTPS meeting link'),
      const FieldSpec('notes', 'Notes and next steps', lines: 4),
    ],
    r,
    (v) async {
      await c.mutate('/api/admin/request/${r['id']}', {
        for (final k in [
          'mentorId',
          'status',
          'sessionAt',
          'cadence',
          'lastMetAt',
          'meetingUrl',
          'notes',
        ])
          k: v[k],
      }, method: 'PUT');
    },
  );
  void needs() => list(
    'Member needs',
    'needs',
    (n) => record(
      learnerName(n['userId']),
      '${n['summary']}\n${n['category']} · ${n['priority']} · ${n['status']}\n${n['adminNote'] ?? ''}',
      () => form(
        'Respond to member',
        const [
          FieldSpec(
            'status',
            'Status',
            required: true,
            options: {
              'open': 'Open',
              'in_progress': 'In progress',
              'resolved': 'Resolved',
            },
          ),
          FieldSpec('adminNote', 'Response visible to the member', lines: 5),
        ],
        n,
        (v) async {
          await c.mutate('/api/admin/need/${n['id']}', {
            'status': v['status'],
            'adminNote': v['adminNote'],
          }, method: 'PUT');
        },
        description: '${n['summary']}',
      ),
    ),
  );
  void announcements() => list(
    'Announcements',
    'announcements',
    (a) => record(
      '${a['title']}',
      '${a['body']}\nAudience: ${a['cohort']} · ${a['active'] == true ? 'Published' : 'Hidden'}',
      () => editAnnouncement(a),
    ),
    add: () => editAnnouncement({}),
  );
  void editAnnouncement(Map<String, dynamic> a) => form(
    a.isEmpty ? 'New announcement' : 'Edit announcement',
    [
      const FieldSpec('title', 'Title', required: true),
      const FieldSpec('body', 'Message', required: true, lines: 6),
      FieldSpec(
        'cohort',
        'Audience',
        required: true,
        options: {
          'all': 'Everyone',
          for (final u in records('users'))
            if ('${u['cohort'] ?? ''}'.isNotEmpty)
              '${u['cohort']}': '${u['cohort']}',
        },
      ),
      const FieldSpec('active', 'Publish in member messages', toggle: true),
    ],
    {'cohort': 'all', 'active': true, ...a},
    (v) async {
      await c.mutate('/api/admin/announcement', {
        for (final k in ['id', 'title', 'body', 'cohort', 'active', 'revision'])
          if (v.containsKey(k)) k: v[k],
      });
    },
    description: 'Published announcements appear inside the app. This does not send email or SMS.',
  );
  void funding() => list(
    'Funding',
    'funding',
    (f) => record(
      '${f['opportunity']}',
      '${f['organization']}\n\$${f['amount']} · ${f['status']}\n${f['notes'] ?? ''}',
      () => editFunding(f),
    ),
    add: () => editFunding({}),
  );
  void editFunding(Map<String, dynamic> f) => form(
    f.isEmpty ? 'Add funding opportunity' : 'Edit funding opportunity',
    const [
      FieldSpec('organization', 'Organization', required: true),
      FieldSpec('opportunity', 'Opportunity', required: true),
      FieldSpec(
        'amount',
        'Amount (USD)',
        required: true,
        number: true,
        minimum: 0,
        maximum: 1000000000,
      ),
      FieldSpec(
        'status',
        'Status',
        required: true,
        options: {
          'prospect': 'Prospect',
          'applied': 'Applied',
          'committed': 'Committed',
          'received': 'Received',
          'declined': 'Declined',
        },
      ),
      FieldSpec('deadline', 'Deadline', dateOnly: true),
      FieldSpec('notes', 'Notes and next steps', lines: 4),
      FieldSpec('active', 'Active record', toggle: true),
    ],
    {'amount': 0, 'status': 'prospect', 'active': true, ...f},
    (v) async {
      await c.mutate('/api/admin/funding', v);
    },
  );
  void results() => list(
    'Workshop results',
    'programResults',
    (r) => record(
      '${r['program']}',
      '${learnerName(r['userId'])} · ${r['attendance']}\nBefore: ${r['beforeScore'] ?? '—'} · After: ${r['afterScore'] ?? '—'}\n${localDate(r['date'])}',
      () => editResult(r),
    ),
    add: () => editResult({}),
  );
  void editResult(Map<String, dynamic> r) {
    if (records('users').isEmpty) {
      showMessage(context, 'Add a learner before recording results.');
      return;
    }
    form(
      r.isEmpty ? 'Record workshop result' : 'Edit workshop result',
      [
        FieldSpec(
          'userId',
          'Learner',
          required: true,
          options: {
            for (final u in records('users')) '${u['id']}': '${u['name']}',
          },
        ),
        const FieldSpec('program', 'Workshop or program', required: true),
        const FieldSpec('date', 'Date', required: true, dateOnly: true),
        const FieldSpec(
          'attendance',
          'Attendance',
          required: true,
          options: {
            'attended': 'Attended',
            'registered': 'Registered',
            'absent': 'Absent',
          },
        ),
        const FieldSpec('beforeScore', 'Before score (0–100, optional)'),
        const FieldSpec('afterScore', 'After score (0–100, optional)'),
        const FieldSpec('notes', 'Notes', lines: 4),
      ],
      {
        'date': DateTime.now().toIso8601String().split('T').first,
        'attendance': 'attended',
        'active': true,
        ...r,
      },
      (v) async {
        for (final key in ['beforeScore', 'afterScore']) {
          final raw = '${v[key] ?? ''}';
          if (raw.isNotEmpty && num.tryParse(raw) == null) {
            throw Exception('Enter a number for $key.');
          }
          v[key] = raw.isEmpty ? null : num.parse(raw);
        }
        await c.mutate('/api/admin/result', v);
      },
    );
  }

  void courses() => list(
    'Courses',
    'courses',
    (course) => record(
      '${course['title']}',
      '${course['description']}\n${asList(course['lessons']).length} lessons · ${course['published'] == true ? 'Published' : 'Draft'}',
      () => form(
        'Edit course details',
        const [
          FieldSpec('title', 'Title', required: true),
          FieldSpec('description', 'Description', required: true, lines: 4),
          FieldSpec('category', 'Category', required: true),
          FieldSpec('level', 'Level', required: true),
          FieldSpec(
            'minutes',
            'Estimated minutes',
            number: true,
            required: true,
            integer: true,
            minimum: 1,
            maximum: 600,
          ),
          FieldSpec('skills', 'Skills (comma separated)'),
          FieldSpec('published', 'Published for learners', toggle: true),
        ],
        {...course, 'skills': (course['skills'] as List? ?? []).join(', ')},
        (v) async {
          await c.mutate('/api/admin/course', {
            ...v,
            'skills': split(v['skills']),
          });
        },
        description: 'Course lessons and assessments stay unchanged. Use the website for the full lesson editor.',
      ),
    ),
  );
  void community() => open(
    Scaffold(
      appBar: AppBar(title: const Text('Events and resources')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          tile(
            'Events',
            'Meeting and workshop information.',
            Icons.event,
            () => list(
              'Events',
              'events',
              (e) => record(
                '${e['title']}',
                '${e['description']}\n${localDate(e['date'])}',
                () => editContent('event', e),
              ),
              add: () => editContent('event', {}),
            ),
          ),
          tile(
            'Resources',
            'Useful links for the community.',
            Icons.link,
            () => list(
              'Resources',
              'resources',
              (r) => record(
                '${r['title']}',
                '${r['description']}',
                () => editContent('resource', r),
                actions: [
                  TextButton(
                    onPressed: () => openWebLink(context, '${r['url']}'),
                    child: const Text('Open resource'),
                  ),
                ],
              ),
              add: () => editContent('resource', {}),
            ),
          ),
        ],
      ),
    ),
  );
  void editContent(String kind, Map<String, dynamic> r) => form(
    r.isEmpty ? 'Add $kind' : 'Edit $kind',
    [
      const FieldSpec('title', 'Title', required: true),
      const FieldSpec('description', 'Description', required: true, lines: 4),
      if (kind == 'event') ...const [
        FieldSpec('date', 'Date and time', dateTime: true, required: true),
        FieldSpec('format', 'Format', required: true),
      ] else ...[
        const FieldSpec('type', 'Type', required: true),
        FieldSpec(
          'stage',
          'Career stage',
          required: true,
          options: {
            'All career stages': 'All career stages',
            ...stages,
            if (r['stage'] is String)
              r['stage'] as String: r['stage'] as String,
          },
        ),
      ],
      FieldSpec('url', 'HTTPS link', required: kind == 'resource'),
      const FieldSpec('active', 'Visible to members', toggle: true),
    ],
    {
      'stage': 'Exploring tech',
      'type': 'Article',
      'format': 'Online',
      'active': true,
      ...r,
    },
    (v) async {
      await c.mutate('/api/admin/$kind', {
        ...v,
        'id': r['id'] ?? '$kind-${DateTime.now().microsecondsSinceEpoch}',
      });
    },
  );
  void aiSettings() {
    final a = asMap(c.state['aiSettings']);
    form(
      'AI model and API key',
      [
        const FieldSpec(
          'model',
          'Exact model ID',
          required: true,
          help: 'Choose a model available to your OpenAI API account that supports Responses and structured outputs.',
        ),
        if (a['storageAvailable'] == true)
          const FieldSpec(
            'apiKey',
            'New API key',
            secret: true,
            help: 'Leave blank to keep the current key. It is encrypted by the server.',
          ),
        if (a['keySource'] == 'saved')
          const FieldSpec('removeApiKey', 'Remove saved key', toggle: true),
      ],
      {'model': a['model']},
      (v) async {
        if (v['removeApiKey'] == true && '${v['apiKey'] ?? ''}'.isNotEmpty) {
          throw Exception('Choose either a new key or removal.');
        }
        await c.mutate('/api/admin/ai-settings', v, method: 'PUT');
      },
      description:
          '${a['keyConfigured'] == true ? 'A key is configured.' : 'No live AI key is configured; prepared guidance is available.'} Change the shared review password before adding a paid key.',
    );
  }

  void programSettings() => form(
    'Program settings',
    const [
      FieldSpec('programName', 'Program name', required: true),
      FieldSpec('description', 'Program description', required: true, lines: 4),
      FieldSpec(
        'weeklyGoal',
        'Suggested weekly lessons',
        required: true,
        number: true,
        integer: true,
        minimum: 1,
        maximum: 20,
      ),
      FieldSpec('contactUrl', 'HTTPS contact page'),
    ],
    asMap(c.state['settings']),
    (v) async {
      await c.mutate('/api/admin/settings', {
        for (final k in [
          'programName',
          'description',
          'weeklyGoal',
          'contactUrl',
        ])
          k: v[k],
      }, method: 'PUT');
    },
  );
  void password() => form(
    'Change administrator password',
    const [
      FieldSpec(
        'currentPassword',
        'Current password',
        required: true,
        secret: true,
      ),
      FieldSpec(
        'newPassword',
        'New password',
        required: true,
        secret: true,
        help: 'Use a unique, strong passphrase.',
      ),
    ],
    {},
    (v) async {
      await c.mutate('/api/admin/password', v);
    },
  );
}

String localDate(dynamic value) {
  final d = DateTime.tryParse('$value');
  if (d == null) return 'Not scheduled';
  if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch('$value')) {
    return '${d.month}/${d.day}/${d.year}';
  }
  final local = d.toLocal();
  return '${local.month}/${local.day}/${local.year} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

class AdminRecordsPage extends StatelessWidget {
  final AppController controller;
  final String title, source, emptyMessage;
  final Widget Function(Map<String, dynamic>) recordBuilder;
  final VoidCallback? onAdd;
  const AdminRecordsPage({
    super.key,
    required this.controller,
    required this.title,
    required this.source,
    required this.recordBuilder,
    this.onAdd,
    this.emptyMessage = 'No records yet.',
  });
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (context, _) => Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          if (onAdd != null)
            IconButton(
              tooltip: 'Add',
              onPressed: onAdd,
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
          padding: const EdgeInsets.all(20),
          children: [
            if (onAdd != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: FilledButton.icon(
                  onPressed: onAdd,
                  icon: const Icon(Icons.add),
                  label: const Text('Add new'),
                ),
              ),
            if (asList(controller.state[source]).isEmpty)
              EmptyPanel('Nothing here yet', emptyMessage),
            ...asList(controller.state[source]).map(recordBuilder),
          ],
        ),
      ),
    ),
  );
}

class MetricsPage extends StatefulWidget {
  final AppController controller;
  const MetricsPage({super.key, required this.controller});
  @override
  State<MetricsPage> createState() => _MetricsPageState();
}

class _MetricsPageState extends State<MetricsPage> {
  Map<String, dynamic>? metrics;
  String? error;
  String cohort = 'all';
  int loadSequence = 0;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final sequence = ++loadSequence;
    try {
      final m = await widget.controller.api.get(
        '/api/metrics?cohort=${Uri.encodeQueryComponent(cohort)}',
      );
      if (mounted && sequence == loadSequence) {
        setState(() {
          metrics = m;
          error = null;
        });
      }
    } catch (e) {
      if (mounted && sequence == loadSequence) {
        setState(() => error = e.toString());
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Impact metrics'),
      actions: [
        IconButton(
          onPressed: load,
          tooltip: 'Refresh',
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: metrics == null
        ? Center(
            child: error != null
                ? Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(error!),
                      TextButton(onPressed: load, child: const Text('Retry')),
                    ],
                  )
                : const CircularProgressIndicator(),
          )
        : ListView(
            padding: const EdgeInsets.all(20),
            children: [
              DropdownButtonFormField<String>(
                initialValue: cohort,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Cohort'),
                items: [
                  const DropdownMenuItem(
                    value: 'all',
                    child: Text('All cohorts'),
                  ),
                  for (final value in {
                    if (cohort != 'all') cohort,
                    ...(metrics!['cohorts'] as List? ?? []).map((v) => '$v'),
                  }.where((v) => v != 'all'))
                    DropdownMenuItem(
                      value: value,
                      child: Text(value, overflow: TextOverflow.ellipsis),
                    ),
                ],
                onChanged: (v) {
                  cohort = v ?? 'all';
                  load();
                },
              ),
              const SizedBox(height: 20),
              if (error != null) Text(error!),
              for (final row in <String, String>{
                'Learners': '${metrics!['learnerCount']}',
                'Completed courses': '${metrics!['completedCount']}',
                'Completion rate': '${metrics!['completionRate']}%',
                'Paired assessment records': '${metrics!['pairedCount']}',
                'Average score change': metrics!['scoreChange'] == null
                    ? 'No paired results'
                    : '${(metrics!['scoreChange'] as num).toStringAsFixed(1)} percentage points',
                'Waiting mentor requests': '${metrics!['waitingRequests']}',
                'Completed mentor sessions': '${metrics!['completedSessions']}',
              }.entries)
                Card(
                  child: ListTile(
                    title: Text(row.key),
                    subtitle: Text(
                      row.value,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                ),
              const Text(
                'Assessment change compares the same learner’s before and after scores. These are observed results, not proof of program impact.',
              ),
              const SizedBox(height: 20),
              for (final course in asList(metrics!['courseBreakdown']))
                Card(
                  child: ListTile(
                    title: Text('${course['title']}'),
                    subtitle: Text(
                      '${course['enrolled']} enrolled · ${course['completed']} completed',
                    ),
                  ),
                ),
            ],
          ),
  );
}
