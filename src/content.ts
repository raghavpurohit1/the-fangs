/**
 * NextStep prototype content. Every person, employer, enrollment, request,
 * outcome, and event below is fictional demonstration data.
 * Public resource destinations were reviewed on 2026-11-21 at
 * https://techwomenaz.org/ . Its stated focus includes women at all career
 * stages, mentorship, generative AI, leadership, negotiation, and networking.
 * Courses are original prototype material, not TechWomenAZ-approved curricula.
 * Scarce mentor capacity comes from the project brief, not a website audit.
 */

export interface Question {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}
export interface Lesson extends Question { id: string; title: string; body: string }
export interface Course {
  id: string; title: string; category: string; level: string; minutes: number;
  description: string; skills: string[]; lessons: Lesson[];
  preQuiz: Question[]; postQuiz: Question[]; published: boolean;
}
export interface Mentor {
  id: string; name: string; role: string; company: string; story: string;
  expertise: string[]; experiences: string[]; stage: string;
  availability: string; capacity: number; verified: boolean; active: boolean;
}
export interface Resource {
  id: string; title: string; type: string; description: string;
  url: string; stage: string; active: boolean;
}
export interface Event {
  id: string; title: string; description: string; date: string;
  format: string; url: string; active: boolean;
}
export interface User {
  id: string; username: string; name: string; role: 'admin' | 'learner';
  stage: string; goal: string; story: string; resume: string; grades: string;
  cohort: string; confidence: number; active: boolean; createdAt: string;
}
export interface Enrollment {
  id: string; userId: string; courseId: string; baselineScore: number;
  postScore: number | null; baselineConfidence: number;
  postConfidence: number | null; completedLessons: string[];
  startedAt: string; completedAt: string | null;
}
export interface MentorRequest {
  id: string; userId: string; mentorId: string | null; topic: string;
  status: 'waiting' | 'scheduled' | 'completed'; createdAt: string;
  sessionAt: string | null; meetingUrl: string; notes: string;
}

export const courses: Course[] = [
  {
    id: 'ai-foundations', title: 'AI foundations', category: 'AI essentials',
    level: 'Beginner', minutes: 18, published: true,
    description: 'Understand what generative AI can do, protect the information you share, and check an answer before you use it.',
    skills: ['AI literacy', 'Information privacy', 'Fact checking'],
    lessons: [
      {
        id: 'ai-how', title: '1. Meet your drafting partner',
        body: `Generative AI produces new text, images, or other content using patterns learned during training. A text model predicts and generates a response to your input. It can be useful without knowing whether every statement it produces is true. Fluent writing is not evidence of accuracy.

Start with a small, reviewable task. You might ask for three ways to explain a technical idea, a first draft of an agenda, or practice questions for a topic you are learning. Give it the material it should work from. A request such as “Turn these public workshop notes into a five-point checklist” is easier to inspect than “Tell me everything I need to know about technology.”

Keep ownership of the result. Read the output, correct it, and decide whether it meets your purpose. For a factual claim, a decision affecting another person, or a question outside your expertise, seek appropriate evidence or human review before acting.

Try it: write one task you already do, identify a small part AI could draft, and name the person who would check the result.`,
        question: 'Which is the best first task for someone learning to use generative AI?',
        options: ['Approve a hiring decision without review', 'Draft an agenda from notes you can check', 'Guarantee that a new statistic is correct', 'Replace all human feedback'], answer: 1,
        explanation: 'An agenda draft is a bounded task with source material and a clear human review step. AI-generated content still needs your judgment.',
      },
      {
        id: 'ai-safe', title: '2. Share only what the task needs',
        body: `Before entering information into an AI tool, ask what the task actually requires and whether you have permission to share it. Follow your organization’s rules and use an approved tool for work material. A personal account is not automatically approved for confidential work.

For practice, use invented examples or public information. To improve a résumé bullet, the model usually does not need your home address, phone number, identification numbers, or another person’s private information. To practice a customer-support response, replace names and order details with fictional placeholders. Removing a name alone may not make a distinctive story anonymous.

You can also describe the task at a higher level: “Help me explain how I organized a volunteer event” can be enough to get started. Share only details you are comfortable and authorized to provide. In this prototype, grades are optional context for learning support; they do not determine whether you deserve a mentor.

Try it: take a fictional résumé sentence and remove every detail that is unnecessary for improving its wording.`,
        question: 'You want help writing a support reply. What should you do first?',
        options: ['Paste the customer’s full account history', 'Use a colleague’s personal AI login', 'Use an approved tool and only the necessary permitted details', 'Assume deleting the customer’s name removes every privacy risk'], answer: 2,
        explanation: 'Tool approval, permission, and data minimization work together. A name is not the only detail that can identify someone.',
      },
      {
        id: 'ai-check', title: '3. Check before you trust',
        body: `An AI response can contain invented facts, misleading summaries, or links that do not support its claims. Asking “Are you sure?” is not an independent check: the same system may confidently repeat the mistake.

Use a three-step review. First, mark claims that matter: dates, numbers, quotations, requirements, and recommendations. Second, compare each important claim with an appropriate source, such as the original event page or the document you supplied. Open a cited link and check that its contents actually support the statement. Third, correct or remove anything you cannot support.

For calculations, recompute the result. For a summary, compare it with the original material. For a recommendation, check whether the assumptions fit your situation. The right response to missing evidence may be “I don’t know yet.”

Try it: an AI draft says a workshop is on December 3, but the organizer’s current page says December 5. Use the organizer’s page, correct the draft, and keep the source with your notes.`,
        question: 'An AI answer names a certification requirement you have never heard of. What is the strongest check?',
        options: ['Trust it because the wording is confident', 'Ask the same model to promise it is accurate', 'Count how many paragraphs it wrote', 'Check the certification provider’s current official requirements'], answer: 3,
        explanation: 'The provider’s own requirements are an independent primary source. Confidence and repetition do not establish truth.',
      },
    ],
    preQuiz: [
      { question: 'What does a fluent AI answer tell you?', options: ['Every statement has been verified', 'The system generated plausible language; its claims may still need checking', 'It knows your circumstances perfectly', 'It has permission to act for you'], answer: 1, explanation: 'Fluency is a feature of generation, not a guarantee of correctness or permission.' },
      { question: 'Which input is best for practicing an email rewrite?', options: ['A private employee evaluation', 'An unredacted customer record', 'A made-up email with no confidential details', 'Your account password'], answer: 2, explanation: 'An invented example lets you practice without exposing private or confidential information.' },
      { question: 'An AI tool invents a workshop date. Where should you check?', options: ['The organizer’s current event page', 'The length of the AI response', 'Another unsupported AI answer', 'A guess based on last year'], answer: 0, explanation: 'A current primary source can establish the date; guesses and repetition cannot.' },
      { question: 'Who is responsible for reviewing an AI-written message before sending it?', options: ['Nobody if it sounds polished', 'Only the person who receives it', 'The model alone', 'The person using and sending the message'], answer: 3, explanation: 'You remain responsible for deciding whether the draft is accurate, appropriate, and ready to send.' },
    ],
    postQuiz: [
      { question: 'A generated summary sounds professional but adds a result absent from your notes. What should you do?', options: ['Keep it because it sounds convincing', 'Remove or verify the unsupported result', 'Make the claim more specific', 'Assume training data proves it'], answer: 1, explanation: 'Compare the summary with its source. A polished sentence does not make an added claim factual.' },
      { question: 'You want AI help improving a résumé bullet. Which information is normally unnecessary?', options: ['The action you took', 'The relevant skill', 'Your home address and identification number', 'A result you can substantiate'], answer: 2, explanation: 'The task is about experience and wording. Private identifiers add exposure without helping that task.' },
      { question: 'AI says an application closes Friday. What gives the strongest evidence?', options: ['A confident tone', 'The same statement repeated three times', 'A longer prompt', 'The official application page with the current deadline'], answer: 3, explanation: 'Check the current primary source and confirm it supports the deadline before relying on it.' },
      { question: 'Which workflow uses AI appropriately?', options: ['Provide approved notes, generate a draft, review and correct it', 'Send every output automatically', 'Treat the draft as professional certification', 'Skip review when an answer includes citations'], answer: 0, explanation: 'A bounded task and human review make the output useful while preserving responsibility for the result.' },
    ],
  },
  {
    id: 'practical-prompting', title: 'Practical prompting', category: 'Workplace skills',
    level: 'Beginner', minutes: 20, published: true,
    description: 'Turn a vague request into a useful brief, improve the first draft, and make a repeatable workflow for everyday work.',
    skills: ['Clear prompts', 'Iteration', 'Output evaluation'],
    lessons: [
      {
        id: 'prompt-brief', title: '1. Write a useful brief',
        body: `A useful prompt is a clear brief. Include the task, relevant context, intended audience, constraints, and output format. You do not need special phrases or a complicated persona. You need to explain what a good result looks like.

Instead of “Write something about our workshop,” try: “Using only the notes below, draft a 100-word workshop recap for people new to technology. Explain two ideas in plain language, include one action readers can try, and finish with one question. Do not invent attendance numbers or quotations.” Then provide the approved notes.

The task tells the model what to do. Context gives it material to work from. The audience sets the level of explanation. Constraints establish boundaries. The format makes the result easier to use. If a key detail is missing, ask the model to identify the gap or ask a question rather than invent an answer.

Try it: choose a recurring task and write a five-part brief. Check whether another person could understand the request without guessing.`,
        question: 'Which detail most helps tailor an explanation to a beginner?',
        options: ['Writing the prompt in all capital letters', 'Repeating “be smart”', 'Specifying the audience and what they already know', 'Requesting as many words as possible'], answer: 2,
        explanation: 'The audience and their starting knowledge help set vocabulary, examples, and depth.',
      },
      {
        id: 'prompt-iterate', title: '2. Improve one thing at a time',
        body: `Treat the first response as a draft. Compare it with your brief before asking for changes. Is it accurate? Does it match the audience? Is the next action clear? A specific revision request is more useful than “Make it better.”

Suppose a draft workshop recap uses unexplained technical terms. Say: “Keep the two main ideas and the 100-word limit. Replace ‘inference’ and ‘parameters’ with plain-language explanations for first-time learners. Preserve the factual details from my notes.” You have named the problem and kept the constraints that already work.

If the output invents a fact, remove the fact and return to the source. If the task is too broad, split it: first identify the main points, then draft the message, then review. Do not assume a second draft is automatically more accurate; check it again.

Try it: take a draft you can safely share, identify one weakness, and write a revision request that says what to change and what to keep.`,
        question: 'Your draft is accurate but too technical. Which revision request is most useful?',
        options: ['Make it better somehow', 'Rewrite for first-time learners; explain jargon and preserve the verified facts', 'Add impressive statistics', 'Change everything without checking the source'], answer: 1,
        explanation: 'A targeted request identifies the problem, the audience, and the content that should remain intact.',
      },
      {
        id: 'prompt-evaluate', title: '3. Build a reusable quality check',
        body: `A reusable prompt saves effort only if you can tell whether its output works. Write a short checklist before evaluating drafts. For a meeting summary, it might be: includes decisions, separates open questions, assigns only owners named in the notes, and does not invent deadlines.

Try the prompt on a few different examples, including incomplete notes. Record where it fails and adjust the brief. A good workflow handles missing information explicitly. “Owner not specified” is better than a fabricated name.

Check meaning as well as formatting. A response can use the correct headings while misrepresenting a decision. Keep a human review step for important outputs. You can record time spent or the number of corrections during a small trial, but do not claim time savings or improved outcomes until you have measured them.

Try it: write three checks for your recurring task. Run one sample, mark each check pass or revise, and save the prompt with those checks for next time.`,
        question: 'A summary has the requested headings but assigns a deadline missing from the notes. How should it score?',
        options: ['Perfect, because formatting is correct', 'Perfect if the deadline is plausible', 'Pass if the model says it is confident', 'Needs revision because it introduced unsupported information'], answer: 3,
        explanation: 'Format is only one check. Source fidelity matters, and missing details should remain explicitly unknown.',
      },
    ],
    preQuiz: [
      { question: 'Which prompt is most actionable?', options: ['Be amazing', 'Help with work', 'Using these notes, draft three next steps for a new volunteer; do not invent details', 'Write anything interesting'], answer: 2, explanation: 'It supplies a task, source context, audience, output format, and a meaningful constraint.' },
      { question: 'A requested date is missing from your source notes. What should your prompt ask AI to do?', options: ['Invent a likely date', 'Identify the missing detail or ask for it', 'Copy a date from another organization', 'Hide the uncertainty'], answer: 1, explanation: 'Explicitly identifying missing information prevents a plausible guess from becoming a false fact.' },
      { question: 'What is the most useful response to an overly long first draft?', options: ['Demand a better answer without details', 'Assume it cannot be improved', 'Ask it to add even more examples', 'Specify a shorter length and which main points to preserve'], answer: 3, explanation: 'A targeted revision changes the weak aspect while retaining the parts that already work.' },
      { question: 'How should you evaluate a reusable prompt?', options: ['Try representative examples against a clear quality checklist', 'Use only the easiest example', 'Judge only how confident the output sounds', 'Count headings instead of checking meaning'], answer: 0, explanation: 'Representative cases and explicit criteria expose failures that appearance alone will miss.' },
    ],
    postQuiz: [
      { question: 'You need a workshop invitation. Which brief gives the clearest direction?', options: ['Make a great invitation', 'Write as much as you can', 'Using the supplied event details, write a friendly 80-word invitation for beginners with a registration link', 'Guess what people will like'], answer: 2, explanation: 'The brief defines source material, task, audience, length, tone, and the required next step.' },
      { question: 'Meeting notes name an action but no owner. What should the summary say?', options: ['Assign the most senior person', 'Owner not specified', 'Choose a random attendee', 'Omit the action without explanation'], answer: 1, explanation: 'Represent the missing information honestly rather than inventing responsibility.' },
      { question: 'An explanation uses jargon but has the right facts. What is the best next prompt?', options: ['Simplify the jargon for a first-time learner while keeping the verified facts', 'Make it more impressive', 'Add details from memory', 'Say the same answer with greater confidence'], answer: 0, explanation: 'It requests a specific improvement and protects the accurate content.' },
      { question: 'Which result demonstrates that a summary prompt needs revision?', options: ['It follows the requested format', 'It flags a missing date', 'It accurately separates decisions from questions', 'It repeatedly adds decisions that were not in the notes'], answer: 3, explanation: 'A prompt should preserve source meaning. Unsupported decisions fail a substantive quality check.' },
    ],
  },
  {
    id: 'career-confidence', title: 'Career confidence with AI', category: 'Career growth',
    level: 'All career stages', minutes: 18, published: true,
    description: 'Recognize transferable skills, practice a clear career story, and arrive at mentor office hours with one useful question.',
    skills: ['Career storytelling', 'Interview practice', 'Mentor preparation'],
    lessons: [
      {
        id: 'career-evidence', title: '1. Find the evidence in your experience',
        body: `Useful experience can come from paid work, study, caregiving, volunteering, or community leadership. Start with a real example: what situation did you face, what did you personally do, and what happened? This is the raw material for a credible career story.

For example: “Our volunteer team kept missing handoffs. I created a shared checklist and introduced a weekly update. The next event had a named owner for each task.” That example shows organization and communication without inventing a percentage improvement.

Ask AI to identify possible skills in an approved, anonymized example and explain which actions support each suggestion. Treat those suggestions as a draft to review. A tool should not decide your potential or add accomplishments you did not have. Only include numbers you can substantiate; a concrete qualitative outcome is also useful.

Try it: write one experience using situation, action, and result. Underline your own contribution and name one skill supported by it.`,
        question: 'Which résumé statement is the most credible if you did not measure a numerical outcome?',
        options: ['Increased productivity by 80% because AI suggested it', 'Transformed the entire industry', 'Created a shared checklist so every volunteer task had a named owner', 'Guaranteed perfect team performance'], answer: 2,
        explanation: 'A specific, truthful action and observable result communicate skill without invented measurements.',
      },
      {
        id: 'career-practice', title: '2. Practice without performing perfection',
        body: `AI can be a practice partner for interviews or introductions. Give it a role, the situation, and a feedback checklist. For example: “Act as an interviewer for an entry-level project coordinator role. Ask one question at a time. After my answer, comment on clarity, evidence, and relevance. Do not invent experience for me.”

Answer in your own words. Then revise one thing: make your contribution clearer, choose a more relevant example, or shorten the setup. Read the answer aloud and decide whether it still sounds like you. An impressive script is not useful if you cannot explain the experience behind it.

AI feedback is practice feedback, not a prediction of whether an employer will hire you. Confidence can grow through preparation, and it can also fluctuate as you discover what to learn next. A knowledge-check score and a confidence rating measure different things; neither is your professional worth.

Try it: prepare a 45-second introduction with your current experience, the direction you want to grow, and one relevant example.`,
        question: 'What is the most useful way to interpret AI interview feedback?',
        options: ['A guaranteed hiring decision', 'Practice input to consider against clear criteria and your real experience', 'Proof that every employer agrees', 'A reason to replace your own story with invented achievements'], answer: 1,
        explanation: 'Feedback can help you revise a practice answer. It does not establish hiring outcomes or justify fictional experience.',
      },
      {
        id: 'career-mentor', title: '3. Make limited mentor time count',
        body: `You can make progress while waiting for a mentor. Complete a short lesson, try a small project, and write down where you got stuck. Then prepare a question that a person can answer using their experience.

A focused request might be: “I am moving from operations into project coordination. I have rewritten one résumé example and practiced a 45-second introduction. Could you help me choose which example best demonstrates stakeholder communication?” Share only the context the mentor needs. Grades are optional; the learning question matters more than a ranking.

Group office hours can help several people with a shared question while respecting a mentor’s limited capacity. Availability is not a promise of a one-to-one match. If no slot is open, continue your learning path and save your question for the next session.

After a conversation, write one next action, when you will try it, and what evidence would show progress. “Revise one example by Friday and ask a peer whether my contribution is clear” is more useful than “Be more confident.”

Try it: draft a three-line mentor brief: my goal, what I have tried, and the one question I want help with.`,
        question: 'Which request makes the best use of a short group office-hours session?',
        options: ['Plan my whole career for me', 'Guarantee me a promotion', 'Tell me everything about technology', 'I tried two project examples; which better demonstrates the skill this role needs?'], answer: 3,
        explanation: 'It gives context, shows preparation, and asks one bounded question that can benefit from a mentor’s judgment.',
      },
    ],
    preQuiz: [
      { question: 'Which evidence can support a transferable skill?', options: ['Only a paid job title', 'A real volunteer example showing your action and its result', 'A result invented by an AI tool', 'A skill label with no example'], answer: 1, explanation: 'Skills can be demonstrated in many settings. The action and result make the claim concrete.' },
      { question: 'AI proposes adding an impressive number to your résumé, but you did not measure it. What should you do?', options: ['Use it because it looks professional', 'Increase the number', 'Leave it out and describe a truthful outcome', 'Assume the model measured it'], answer: 2, explanation: 'Only use evidence you can support. A qualitative result is preferable to a fabricated metric.' },
      { question: 'Which mentor question is most focused?', options: ['What should I do with my entire life?', 'Can you guarantee a job?', 'Teach me every skill today', 'Which of these two examples best shows project coordination?'], answer: 3, explanation: 'A specific question with prepared examples makes a short conversation actionable.' },
      { question: 'What does a confidence rating measure in this course?', options: ['Your own current sense of confidence', 'Your guaranteed hiring probability', 'Your entire professional ability', 'An employer’s assessment'], answer: 0, explanation: 'Confidence is self-reported. It is separate from knowledge-check performance and career outcomes.' },
    ],
    postQuiz: [
      { question: 'You coordinated care schedules for your family. How can you assess its relevance to a new role?', options: ['Discard it because it was unpaid', 'Describe your action and result, then connect supported skills to the role', 'Invent a management title', 'Let AI decide your professional worth'], answer: 1, explanation: 'Real responsibilities can demonstrate transferable skills. Describe them accurately without inflating the context.' },
      { question: 'You improved a process but have no before-and-after data. Which wording is most appropriate?', options: ['Reduced costs by 70%', 'Delivered industry-leading efficiency', 'Guaranteed maximum productivity', 'Created a shared tracker that made task ownership visible'], answer: 3, explanation: 'A concrete observable result is useful evidence even when no numerical change was measured.' },
      { question: 'No mentor appointment is currently available. What is a useful next step?', options: ['Stop learning until someone is free', 'Submit the same request repeatedly', 'Complete a relevant lesson and prepare one question for group office hours', 'Assume the program rejected your potential'], answer: 2, explanation: 'Self-paced practice and a focused question preserve momentum while respecting limited mentor capacity.' },
      { question: 'Your knowledge score improves but your confidence stays the same. What can you conclude?', options: ['The two measures can change differently; record both without claiming a career outcome', 'The knowledge result must be false', 'You are guaranteed to get promoted', 'The course changed nothing at all'], answer: 0, explanation: 'Knowledge performance and self-reported confidence are distinct signals. Neither alone proves a job or promotion outcome.' },
    ],
  },
];

// Capacity is the sample number of remaining seats in the availability described.
// None of these fictional people has undergone professional verification.
export const mentors: Mentor[] = [
  {
    id: 'mentor-maya', name: 'Maya Chen', role: 'Product operations lead',
    company: 'Mesa Loop · fictional company',
    story: 'Fictional mentor profile. I moved from hospitality operations into technology and learned to tell a clear story about the skills I already had. I help career changers turn real experience into a practical next step.',
    expertise: ['Career transitions', 'Project coordination', 'Career storytelling'],
    experiences: ['Changed careers', 'Worked while learning', 'Nontraditional tech path'],
    stage: 'Career transition', availability: 'Demo group office hours · 2 seats · career-change questions',
    capacity: 2, verified: false, active: true,
  },
  {
    id: 'mentor-ana', name: 'Ana Rivera', role: 'AI learning facilitator',
    company: 'Desert Spark Learning · fictional company',
    story: 'Fictional mentor profile. I started as a community educator before building AI workshops for beginners. Bring a prompt you have tried and one question; we will work through it together in a small group.',
    expertise: ['AI foundations', 'Prompting', 'Learning design'],
    experiences: ['Started outside engineering', 'Community educator', 'Learned through practice'],
    stage: 'Building skills', availability: 'Demo group office hours · 6 seats · bring one prompt',
    capacity: 6, verified: false, active: true,
  },
  {
    id: 'mentor-priya', name: 'Priya Desai', role: 'Engineering manager',
    company: 'Copper Cloud · fictional company',
    story: 'Fictional mentor profile. Returning after a career break helped me rethink how I learn and ask for support. I now coach new team leads on feedback, delegation, and communicating their impact.',
    expertise: ['Leadership', 'Returning to work', 'Feedback'],
    experiences: ['Returned after a career break', 'First-time manager', 'Caregiving responsibilities'],
    stage: 'Growing as a leader', availability: 'Demo availability full · join the next leadership group',
    capacity: 0, verified: false, active: true,
  },
  {
    id: 'mentor-jordan', name: 'Jordan Williams', role: 'Software developer',
    company: 'Sonoran Systems · fictional company',
    story: 'Fictional mentor profile. I entered tech through community college while working part time. I enjoy helping people explore roles, choose a manageable first project, and explain what they learned.',
    expertise: ['Exploring tech roles', 'First projects', 'Interview practice'],
    experiences: ['Community college', 'First-generation graduate', 'Worked while studying'],
    stage: 'Exploring tech', availability: 'Demo group office hours · 4 seats · first-project questions',
    capacity: 4, verified: false, active: true,
  },
];

// Anchors match the public site's navigation; external membership form was
// verified from the public Become a member link, not submitted by this app.
export const resources: Resource[] = [
  { id: 'resource-community', title: 'Meet the TechWomenAZ community', type: 'Community', description: 'Explore the organization’s mission and support for women across career stages.', url: 'https://techwomenaz.org/#about', stage: 'All career stages', active: true },
  { id: 'resource-events', title: 'Official workshops and events', type: 'Events', description: 'Check the official site for announced opportunities. This prototype does not create or confirm TechWomenAZ events.', url: 'https://techwomenaz.org/#events', stage: 'All career stages', active: true },
  { id: 'resource-involved', title: 'Ways to get involved', type: 'Community', description: 'Explore membership and ways to support the TechWomenAZ community through its official site.', url: 'https://techwomenaz.org/#get-involved', stage: 'All career stages', active: true },
  { id: 'resource-membership', title: 'Official membership interest form', type: 'Membership', description: 'Open the membership form linked from TechWomenAZ. Registration here is separate from a NextStep account.', url: 'https://forms.gle/qVG6HHXMBRN1axN96', stage: 'All career stages', active: true },
  { id: 'resource-contact', title: 'Contact TechWomenAZ', type: 'Contact', description: 'Find official contact information for community questions, volunteering, or partnership conversations.', url: 'https://techwomenaz.org/#contact', stage: 'All career stages', active: true },
];

export const seedEpoch = Date.now();
const now = seedEpoch;
const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(now - days * day).toISOString();
const ahead = (days: number) => new Date(now + days * day).toISOString();

export const events: Event[] = [
  { id: 'event-demo-prompt', title: 'Demo: bring one prompt', description: 'Fictional group office hours for practicing a useful work prompt. No real event or booking exists; this demonstrates how a small group can share mentor time.', date: ahead(4), format: 'Demo · online group office hours', url: '', active: true },
  { id: 'event-demo-story', title: 'Demo: your next career chapter', description: 'Fictional small-group practice for a 45-second career introduction. Bring one example and one question. Check the official site for real community events.', date: ahead(8), format: 'Demo · online peer practice', url: '', active: true },
];

export const settings = {
  programName: 'NextStep',
  description: 'A prototype learning companion for the TechWomenAZ community. Build skills at your pace, see your progress, and make limited mentor time count.',
  weeklyGoal: 2,
  contactUrl: 'https://techwomenaz.org/#contact',
};

export const demoUsers: User[] = [
  { id: 'learner-demo', username: 'learner', name: 'Alex Morgan', role: 'learner', stage: 'Exploring tech', goal: 'Explore how AI can help me take my next career step.', story: '', resume: '', grades: '', cohort: 'Self-paced learners', confidence: 2, active: true, createdAt: ago(0) },
  { id: 'learner-sofia', username: 'sofia.demo', name: 'Sofia Martinez', role: 'learner', stage: 'Career transition', goal: 'Move from hospitality operations into project coordination.', story: 'Fictional learner. I coordinate busy shifts and train new team members. I want to explain how that experience transfers to technology teams.', resume: 'Shift coordinator; staff training; scheduling; volunteer event logistics.', grades: '', cohort: 'Career changers', confidence: 3, active: true, createdAt: ago(35) },
  { id: 'learner-nia', username: 'nia.demo', name: 'Nia Brooks', role: 'learner', stage: 'Exploring tech', goal: 'Choose a first technology project while finishing community college.', story: 'Fictional learner. I am a first-generation college student working part time and exploring roles beyond software engineering.', resume: 'Peer study-group organizer; part-time retail work; introductory computing.', grades: 'Optional context: introductory computing completed; interested in more practice.', cohort: 'New to tech', confidence: 3, active: true, createdAt: ago(29) },
  { id: 'learner-leila', username: 'leila.demo', name: 'Leila Hassan', role: 'learner', stage: 'Building skills', goal: 'Use AI to prepare clearer workshop materials for a nonprofit.', story: 'Fictional learner. I run community workshops and want a repeatable way to draft accessible materials without sharing participant information.', resume: 'Community program coordinator; workshop facilitation; volunteer onboarding.', grades: '', cohort: 'AI at work', confidence: 4, active: true, createdAt: ago(28) },
  { id: 'learner-grace', username: 'grace.demo', name: 'Grace Park', role: 'learner', stage: 'Growing as a leader', goal: 'Give clearer feedback as a new team lead.', story: 'Fictional learner. I recently moved into a leadership role and want to practice concise communication while staying grounded in real examples.', resume: 'Quality analyst; team onboarding; first-time team lead.', grades: '', cohort: 'Leadership circle', confidence: 3, active: true, createdAt: ago(32) },
  { id: 'learner-elena', username: 'elena.demo', name: 'Elena Torres', role: 'learner', stage: 'Career transition', goal: 'Return to a technology-adjacent role after a caregiving break.', story: 'Fictional learner. I am rebuilding a learning routine in short sessions and want to reconnect with my professional strengths.', resume: 'Former operations analyst; spreadsheet reporting; community volunteer coordination.', grades: '', cohort: 'Career changers', confidence: 3, active: true, createdAt: ago(24) },
  { id: 'learner-samira', username: 'samira.demo', name: 'Samira Patel', role: 'learner', stage: 'Building skills', goal: 'Develop a reliable AI workflow for my small business.', story: 'Fictional learner. I run a small design business and want to draft clearer project briefs while checking every client-facing claim.', resume: 'Small-business owner; client communication; project planning.', grades: '', cohort: 'AI at work', confidence: 3, active: true, createdAt: ago(25) },
  { id: 'learner-robin', username: 'robin.demo', name: 'Robin Ellis', role: 'learner', stage: 'Growing as a leader', goal: 'Prepare a focused question about growing a volunteer team.', story: 'Fictional learner. I lead a volunteer group and am exploring ways to make learning opportunities more accessible.', resume: 'Volunteer lead; community partnerships; event coordination.', grades: '', cohort: 'Leadership circle', confidence: 2, active: true, createdAt: ago(52) },
];

const allLessons = (courseId: string) => courses.find(course => course.id === courseId)!.lessons.map(lesson => lesson.id);

// Paired quiz scores are fictional and use the four-question 0/25/50/75/100 scale.
// They illustrate recorded change, not causal impact, real nonprofit outcomes,
// or assessment equivalence established by a validation study.
export const demoEnrollments: Enrollment[] = [
  { id: 'enroll-sofia-foundations', userId: 'learner-sofia', courseId: 'ai-foundations', baselineScore: 25, postScore: 75, baselineConfidence: 2, postConfidence: 3, completedLessons: allLessons('ai-foundations'), startedAt: ago(22), completedAt: ago(18) },
  { id: 'enroll-nia-foundations', userId: 'learner-nia', courseId: 'ai-foundations', baselineScore: 50, postScore: 75, baselineConfidence: 2, postConfidence: 3, completedLessons: allLessons('ai-foundations'), startedAt: ago(20), completedAt: ago(16) },
  { id: 'enroll-leila-prompting', userId: 'learner-leila', courseId: 'practical-prompting', baselineScore: 50, postScore: 100, baselineConfidence: 2, postConfidence: 4, completedLessons: allLessons('practical-prompting'), startedAt: ago(19), completedAt: ago(14) },
  { id: 'enroll-grace-career', userId: 'learner-grace', courseId: 'career-confidence', baselineScore: 75, postScore: 75, baselineConfidence: 3, postConfidence: 3, completedLessons: allLessons('career-confidence'), startedAt: ago(17), completedAt: ago(11) },
  { id: 'enroll-elena-career', userId: 'learner-elena', courseId: 'career-confidence', baselineScore: 25, postScore: 50, baselineConfidence: 1, postConfidence: 3, completedLessons: allLessons('career-confidence'), startedAt: ago(16), completedAt: ago(9) },
  { id: 'enroll-samira-prompting', userId: 'learner-samira', courseId: 'practical-prompting', baselineScore: 50, postScore: 75, baselineConfidence: 3, postConfidence: 3, completedLessons: allLessons('practical-prompting'), startedAt: ago(14), completedAt: ago(7) },
  { id: 'enroll-sofia-career', userId: 'learner-sofia', courseId: 'career-confidence', baselineScore: 50, postScore: null, baselineConfidence: 3, postConfidence: null, completedLessons: ['career-evidence'], startedAt: ago(5), completedAt: null },
  { id: 'enroll-nia-prompting', userId: 'learner-nia', courseId: 'practical-prompting', baselineScore: 25, postScore: null, baselineConfidence: 2, postConfidence: null, completedLessons: ['prompt-brief', 'prompt-iterate'], startedAt: ago(6), completedAt: null },
  { id: 'enroll-elena-foundations', userId: 'learner-elena', courseId: 'ai-foundations', baselineScore: 25, postScore: null, baselineConfidence: 2, postConfidence: null, completedLessons: ['ai-how'], startedAt: ago(4), completedAt: null },
  { id: 'enroll-leila-career', userId: 'learner-leila', courseId: 'career-confidence', baselineScore: 50, postScore: null, baselineConfidence: 3, postConfidence: null, completedLessons: [], startedAt: ago(2), completedAt: null },
  { id: 'enroll-robin-foundations', userId: 'learner-robin', courseId: 'ai-foundations', baselineScore: 50, postScore: null, baselineConfidence: 2, postConfidence: null, completedLessons: ['ai-how'], startedAt: ago(40), completedAt: null },
];

export const demoRequests: MentorRequest[] = [
  { id: 'request-sofia', userId: 'learner-sofia', mentorId: 'mentor-maya', topic: 'Group office hours: which of my operations examples best shows project coordination?', status: 'waiting', createdAt: ago(6), sessionAt: null, meetingUrl: '', notes: 'Fictional request. Learner has completed AI foundations and prepared one career example.' },
  { id: 'request-grace', userId: 'learner-grace', mentorId: 'mentor-priya', topic: 'Next leadership group: how can I make feedback more specific?', status: 'waiting', createdAt: ago(9), sessionAt: null, meetingUrl: '', notes: 'Fictional request. Preferred mentor currently has no open seats; learner can continue self-paced study.' },
  { id: 'request-robin', userId: 'learner-robin', mentorId: null, topic: 'Any group office hours about planning learning opportunities for volunteers.', status: 'waiting', createdAt: ago(3), sessionAt: null, meetingUrl: '', notes: 'Fictional request. Open to a group with a relevant topic.' },
  { id: 'request-nia', userId: 'learner-nia', mentorId: 'mentor-jordan', topic: 'First-project group: choose a small project I can finish alongside work.', status: 'scheduled', createdAt: ago(8), sessionAt: ahead(3), meetingUrl: '', notes: 'Simulated scheduling only. No invitation has been sent and no live video room is attached.' },
  { id: 'request-leila', userId: 'learner-leila', mentorId: 'mentor-ana', topic: 'Prompt practice group: review a workshop recap prompt and its quality checklist.', status: 'scheduled', createdAt: ago(4), sessionAt: ahead(4), meetingUrl: '', notes: 'Simulated scheduling only. No invitation has been sent and no live video room is attached.' },
  { id: 'request-elena', userId: 'learner-elena', mentorId: 'mentor-maya', topic: 'Career-story group: practice an introduction after a career break.', status: 'completed', createdAt: ago(18), sessionAt: ago(8), meetingUrl: '', notes: 'Fictional completed session. Next action: revise one real example and practice the introduction with a peer.' },
  { id: 'request-samira', userId: 'learner-samira', mentorId: 'mentor-ana', topic: 'Prompt practice group: identify missing context in a project brief.', status: 'completed', createdAt: ago(16), sessionAt: ago(6), meetingUrl: '', notes: 'Fictional completed session. Next action: try the prompt on two invented client briefs and record corrections.' },
];

export interface ProgramResult {
  id: string; userId: string; program: string; date: string;
  beforeScore: number | null; afterScore: number | null;
  confidenceBefore: number | null; confidenceAfter: number | null;
  attendance: 'attended' | 'registered' | 'absent'; notes: string; active: boolean;
}
export interface Funding {
  id: string; organization: string; opportunity: string; amount: number;
  status: 'prospect' | 'applied' | 'committed' | 'received' | 'declined';
  deadline: string; notes: string; active: boolean;
}

// These workshop records are separate from self-paced course enrollments.
// Missing before/after data stays null rather than being reported as zero.
export const programResults: ProgramResult[] = [
  { id: 'program-result-leila', userId: 'learner-leila', program: 'Demo workshop: practical AI at work', date: ago(12), beforeScore: 50, afterScore: 75, confidenceBefore: 2, confidenceAfter: 3, attendance: 'attended', notes: 'Fictional workshop record for demonstrating centralized result entry. Scores come from an illustrative four-question check.', active: true },
  { id: 'program-result-samira', userId: 'learner-samira', program: 'Demo workshop: practical AI at work', date: ago(12), beforeScore: 75, afterScore: 75, confidenceBefore: 3, confidenceAfter: 3, attendance: 'attended', notes: 'Fictional workshop record. No score change in this example; a completed activity does not guarantee improvement.', active: true },
  { id: 'program-result-grace', userId: 'learner-grace', program: 'Demo workshop: a clearer leadership story', date: ago(5), beforeScore: null, afterScore: 75, confidenceBefore: null, confidenceAfter: 3, attendance: 'attended', notes: 'Fictional workshop record. Baseline was not collected; exclude this record from paired-change calculations.', active: true },
  { id: 'program-result-robin', userId: 'learner-robin', program: 'Demo workshop: a clearer leadership story', date: ago(5), beforeScore: null, afterScore: null, confidenceBefore: null, confidenceAfter: null, attendance: 'absent', notes: 'Fictional workshop record. Registered but did not attend; no assessment result is available.', active: true },
];

// These are fictional funding pipeline examples, not actual grant opportunities,
// applications, commitments, donations, or reported TechWomenAZ finances.
export const funding: Funding[] = [
  { id: 'funding-demo-community', organization: 'Demo: Desert Community Fund', opportunity: 'Demo: digital confidence workshop grant', amount: 5000, status: 'prospect', deadline: ahead(30).slice(0, 10), notes: 'Fictional prospect. Illustrates tracking a potential funding source, next step, and deadline in one place. No application or outreach has occurred.', active: true },
  { id: 'funding-demo-skills', organization: 'Demo: Valley Skills Foundation', opportunity: 'Demo: self-paced learning pilot support', amount: 2500, status: 'applied', deadline: ahead(14).slice(0, 10), notes: 'Fictional application status. Illustrates a pipeline item awaiting a decision; this amount is not available funding and no real application exists.', active: true },
  { id: 'funding-demo-partner', organization: 'Demo: Copper Horizon Partners', opportunity: 'Demo: community office-hours sponsorship', amount: 1000, status: 'committed', deadline: ahead(21).slice(0, 10), notes: 'Fictional commitment for demonstration only. Not received income, not a real sponsor, and not a TechWomenAZ financial record.', active: true },
];
