import 'package:flutter/material.dart';

import '../../models/data.dart';
import '../../services/app_controller.dart';
import 'learner_ui.dart';

void openCourse(BuildContext context, AppController controller, String id) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => CoursePage(controller: controller, courseId: id),
    ),
  );
}

class CoursesTab extends StatelessWidget {
  const CoursesTab({required this.controller, super.key});
  final AppController controller;
  @override
  Widget build(BuildContext context) {
    final courses = asList(controller.state['courses'])
        .where((course) => course['published'] == true)
        .toList();
    return RefreshList(
      controller: controller,
      children: [
        const PageIntro(
          'Learn',
          'Choose a course, complete short lessons, and compare your starting and final assessments.',
        ),
        if (courses.isEmpty)
          const EmptyCard(
            'No courses published yet',
            'Your program team will add courses here. You can ask about learning options in Get help.',
          ),
        ...courses.map(
          (course) => CourseCard(controller: controller, course: course),
        ),
      ],
    );
  }
}

class CourseCard extends StatelessWidget {
  const CourseCard({required this.controller, required this.course, super.key});
  final AppController controller;
  final Map<String, dynamic> course;
  @override
  Widget build(BuildContext context) {
    final id = textOf(course['id']);
    final enrollment = courseEnrollment(controller, id);
    final lessons = asList(course['lessons']);
    final completed = stringList(enrollment?['completedLessons']).length;
    final finished = enrollment?['completedAt'] != null;
    return ContentCard(
      children: [
        Text(
          textOf(course['title']),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 8),
        Text(textOf(course['description'])),
        const SizedBox(height: 12),
        Text(
          '${textOf(course['level'])} · ${textOf(course['minutes'])} min · ${lessons.length} lessons',
        ),
        if (enrollment != null) ...[
          const SizedBox(height: 16),
          LinearProgressIndicator(
            value: finished
                ? 1
                : lessons.isEmpty
                ? 0
                : completed / lessons.length,
          ),
          const SizedBox(height: 6),
          Text(
            finished
                ? 'Course completed'
                : '$completed of ${lessons.length} lessons completed',
          ),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () => openCourse(context, controller, id),
          child: Text(
            finished
                ? 'View results'
                : enrollment == null
                ? 'Start course'
                : 'Continue learning',
          ),
        ),
      ],
    );
  }
}

class CoursePage extends StatefulWidget {
  const CoursePage({
    required this.controller,
    required this.courseId,
    super.key,
  });
  final AppController controller;
  final String courseId;
  @override
  State<CoursePage> createState() => _CoursePageState();
}

class _CoursePageState extends State<CoursePage> {
  int? lessonIndex;
  int? answer;
  bool finalAssessment = false;
  bool reviewing = false;
  bool busy = false;
  String? error;
  Map<String, dynamic>? feedback;

  Future<void> checkLesson(Map<String, dynamic> lesson) async {
    if (answer == null) {
      setState(() => error = 'Choose an answer first.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
      final course = itemById(
        asList(widget.controller.state['courses']),
        widget.courseId,
      );
      lessonIndex = asList(course?['lessons'])
          .indexWhere((item) => item['id'] == lesson['id']);
    });
    try {
      final result = await widget.controller.mutate('/api/lesson/complete', {
        'courseId': widget.courseId,
        'lessonId': lesson['id'],
        'answer': answer,
      });
      if (mounted) setState(() => feedback = result);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) {
      final course = itemById(
        asList(widget.controller.state['courses']),
        widget.courseId,
      );
      if (course == null || course['published'] != true) {
        return Scaffold(
          appBar: AppBar(title: const Text('Course')),
          body: const Padding(
            padding: EdgeInsets.all(20),
            child: EmptyCard(
              'Course unavailable',
              'Return to Learn and choose another course.',
            ),
          ),
        );
      }
      final enrollment = courseEnrollment(widget.controller, widget.courseId);
      final lessons = asList(course['lessons']);
      final done = stringList(enrollment?['completedLessons']);
      final allDone =
          enrollment != null && lessons.every((l) => done.contains(l['id']));
      final complete = enrollment?['completedAt'] != null;
      int index =
          lessonIndex ?? lessons.indexWhere((l) => !done.contains(l['id']));
      if (index < 0 || index >= lessons.length) index = 0;
      final lesson = lessons.isEmpty ? null : lessons[index];
      return Scaffold(
        appBar: AppBar(title: Text(textOf(course['title']))),
        body: RefreshList(
          controller: widget.controller,
          children: [
            PageIntro(textOf(course['title']), textOf(course['description'])),
            if (enrollment == null)
              AssessmentForm(
                key: const ValueKey('baseline'),
                title: 'Starting assessment',
                description: 'This records your starting point. Your first answers are saved for comparison with the final assessment.',
                questions: asList(course['preQuiz']),
                onSubmit: (answers, confidence) async {
                  await widget.controller.mutate('/api/enroll', {
                    'courseId': widget.courseId,
                    'answers': answers,
                    'confidence': confidence,
                  });
                  if (mounted) {
                    setState(() {
                      lessonIndex = 0;
                      answer = null;
                    });
                  }
                },
              )
            else if (complete && !reviewing)
              CourseResults(
                course: course,
                enrollment: enrollment,
                onReview: () => setState(() {
                  reviewing = true;
                  lessonIndex = 0;
                }),
              )
            else if (finalAssessment && allDone && !complete)
              AssessmentForm(
                key: const ValueKey('final'),
                title: 'Final assessment',
                description: 'Use what you have learned. Your first final result is saved beside your starting assessment.',
                questions: asList(course['postQuiz']),
                onSubmit: (answers, confidence) async {
                  await widget.controller.mutate('/api/course/complete', {
                    'courseId': widget.courseId,
                    'answers': answers,
                    'confidence': confidence,
                  });
                  if (mounted) setState(() => finalAssessment = false);
                },
              )
            else if (lesson == null)
              const EmptyCard(
                'No lessons available',
                'Your program team can update this course.',
              )
            else ...[
              DropdownButtonFormField<int>(
                key: ValueKey('lesson-$index-${widget.courseId}'),
                initialValue: index,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Course lesson'),
                items: [
                  for (var i = 0; i < lessons.length; i++)
                    DropdownMenuItem(
                      value: i,
                      child: Text(
                        '${i + 1}. ${textOf(lessons[i]['title'])}${done.contains(lessons[i]['id']) ? ' · Done' : ''}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: busy
                    ? null
                    : (value) => setState(() {
                        lessonIndex = value;
                        answer = null;
                        feedback = null;
                        error = null;
                      }),
              ),
              const SizedBox(height: 20),
              ContentCard(
                children: [
                  Text(
                    'Lesson ${index + 1} of ${lessons.length}',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    textOf(lesson['title']),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 16),
                  SelectableText(textOf(lesson['body'])),
                ],
              ),
              ContentCard(
                children: [
                  Text(
                    'Check your understanding',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  QuestionChoices(
                    question: lesson,
                    selected: answer,
                    enabled: !busy,
                    onChanged: (value) => setState(() => answer = value),
                  ),
                  ErrorMessage(error),
                  FilledButton(
                    onPressed: busy ? null : () => checkLesson(lesson),
                    child: Text(busy ? 'Checking…' : 'Check answer'),
                  ),
                  if (feedback != null) ...[
                    const SizedBox(height: 16),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        '${feedback!['correct'] == true ? 'Correct.' : 'Try again.'} ${textOf(feedback!['explanation'])}',
                      ),
                    ),
                  ],
                  if (done.contains(lesson['id'])) ...[
                    const SizedBox(height: 12),
                    const Text('Lesson completed'),
                    if (index + 1 < lessons.length)
                      OutlinedButton(
                        onPressed: () => setState(() {
                          lessonIndex = index + 1;
                          answer = null;
                          feedback = null;
                          error = null;
                        }),
                        child: const Text('Next lesson'),
                      ),
                  ],
                ],
              ),
              LessonGuide(
                key: ValueKey(lesson['id']),
                controller: widget.controller,
                courseId: widget.courseId,
                lessonId: textOf(lesson['id']),
              ),
              if (allDone)
                FilledButton(
                  onPressed: () => setState(() {
                    finalAssessment = !complete;
                    reviewing = false;
                  }),
                  child: Text(
                    complete ? 'View saved results' : 'Take final assessment',
                  ),
                ),
            ],
          ],
        ),
      );
    },
  );
}

class QuestionChoices extends StatelessWidget {
  const QuestionChoices({
    required this.question,
    required this.selected,
    required this.onChanged,
    this.enabled = true,
    super.key,
  });
  final Map<String, dynamic> question;
  final int? selected;
  final ValueChanged<int?> onChanged;
  final bool enabled;
  @override
  Widget build(BuildContext context) {
    final options = stringList(question['options']);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          textOf(question['question']),
          style: Theme.of(context).textTheme.titleMedium,
        ),
        RadioGroup<int>(
          groupValue: selected,
          onChanged: enabled ? onChanged : (_) {},
          child: Column(
            children: [
              for (var i = 0; i < options.length; i++)
                RadioListTile<int>(
                  value: i,
                  title: Text(options[i]),
                  enabled: enabled,
                  contentPadding: EdgeInsets.zero,
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class AssessmentForm extends StatefulWidget {
  const AssessmentForm({
    required this.title,
    required this.description,
    required this.questions,
    required this.onSubmit,
    super.key,
  });
  final String title;
  final String description;
  final List<Map<String, dynamic>> questions;
  final Future<void> Function(List<int>, int) onSubmit;
  @override
  State<AssessmentForm> createState() => _AssessmentFormState();
}

class _AssessmentFormState extends State<AssessmentForm> {
  final answers = <int, int>{};
  int confidence = 3;
  bool busy = false;
  String? error;
  Future<void> submit() async {
    if (answers.length != widget.questions.length || widget.questions.isEmpty) {
      setState(() => error = 'Answer every question before saving.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.onSubmit(
        List.generate(widget.questions.length, (i) => answers[i]!),
        confidence,
      );
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => ContentCard(
    children: [
      Text(widget.title, style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 8),
      Text(widget.description),
      const SizedBox(height: 20),
      for (var i = 0; i < widget.questions.length; i++) ...[
        QuestionChoices(
          question: widget.questions[i],
          selected: answers[i],
          enabled: !busy,
          onChanged: (value) {
            if (value != null) setState(() => answers[i] = value);
          },
        ),
        const Divider(height: 32),
      ],
      DropdownButtonFormField<int>(
        isExpanded: true,
        initialValue: confidence,
        decoration: const InputDecoration(
          labelText: 'Confidence with this topic',
        ),
        items: const [
          DropdownMenuItem(value: 1, child: Text('1 · Just starting')),
          DropdownMenuItem(value: 2, child: Text('2 · A little familiar')),
          DropdownMenuItem(value: 3, child: Text('3 · Somewhat confident')),
          DropdownMenuItem(value: 4, child: Text('4 · Confident')),
          DropdownMenuItem(value: 5, child: Text('5 · Very confident')),
        ],
        onChanged: busy
            ? null
            : (value) => setState(() => confidence = value ?? 3),
      ),
      ErrorMessage(error),
      const SizedBox(height: 16),
      FilledButton(
        onPressed: busy ? null : submit,
        child: Text(busy ? 'Saving…' : 'Save assessment'),
      ),
    ],
  );
}

class CourseResults extends StatelessWidget {
  const CourseResults({
    required this.course,
    required this.enrollment,
    required this.onReview,
    super.key,
  });
  final Map<String, dynamic> course;
  final Map<String, dynamic> enrollment;
  final VoidCallback onReview;
  @override
  Widget build(BuildContext context) {
    final before = (enrollment['baselineScore'] as num?)?.toDouble() ?? 0;
    final after = (enrollment['postScore'] as num?)?.toDouble() ?? 0;
    final difference = after - before;
    return ContentCard(
      children: [
        const Icon(Icons.task_alt, size: 48),
        const SizedBox(height: 16),
        Text(
          'Course completed',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Starting assessment'),
          trailing: Text('${before.round()}%'),
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Final assessment'),
          trailing: Text('${after.round()}%'),
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Recorded change'),
          trailing: Text(
            '${difference >= 0 ? '+' : ''}${difference.round()} pp',
          ),
        ),
        Text(
          'Confidence: ${textOf(enrollment['baselineConfidence'])}/5 → ${textOf(enrollment['postConfidence'])}/5',
        ),
        const SizedBox(height: 12),
        Text('Completed ${dateLabel(context, enrollment['completedAt'])}'),
        const SizedBox(height: 12),
        const Text(
          'This compares your two recorded assessments. It shows a change in results, not proof that the course alone caused it.',
        ),
        const SizedBox(height: 16),
        OutlinedButton(
          onPressed: onReview,
          child: const Text('Review lessons'),
        ),
      ],
    );
  }
}

class LessonGuide extends StatefulWidget {
  const LessonGuide({
    required this.controller,
    required this.courseId,
    required this.lessonId,
    super.key,
  });
  final AppController controller;
  final String courseId;
  final String lessonId;
  @override
  State<LessonGuide> createState() => _LessonGuideState();
}

class _LessonGuideState extends State<LessonGuide> {
  final question = TextEditingController();
  bool busy = false;
  String? error;
  Map<String, dynamic>? response;
  @override
  void dispose() {
    question.dispose();
    super.dispose();
  }

  Future<void> ask() async {
    if (question.text.trim().isEmpty) {
      setState(() => error = 'Enter a question about this lesson.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await widget.controller.api.post('/api/feedback', {
        'courseId': widget.courseId,
        'lessonId': widget.lessonId,
        'question': question.text.trim(),
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
      Text('Lesson guide', style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 8),
      Text(
        widget.controller.state['aiAvailable'] == true
            ? 'Ask for another explanation. AI can make mistakes; check important details.'
            : 'Prepared course guidance is available. Live AI is not connected.',
      ),
      const SizedBox(height: 16),
      TextField(
        controller: question,
        maxLength: 2000,
        minLines: 2,
        maxLines: 5,
        decoration: const InputDecoration(labelText: 'Your question'),
        enabled: !busy,
      ),
      ErrorMessage(error),
      OutlinedButton(
        onPressed: busy ? null : ask,
        child: Text(busy ? 'Finding guidance…' : 'Get guidance'),
      ),
      if (response != null) ...[
        const Divider(height: 32),
        Text(
          response!['mode'] == 'live-ai'
              ? 'AI-generated guidance'
              : 'Prepared course guidance',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        SelectableText(textOf(response!['text'])),
      ],
    ],
  );
}
