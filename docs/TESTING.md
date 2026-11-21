# Try NextStep with separate accounts

Open [the website](https://nextstep-techwomenaz.pages.dev). This guide is for testing the website with fictional people. The four accounts below are shared test accounts, so another tester may have already saved progress, notes, or requests. Passwords are supplied separately by the project owner and are deliberately absent from this repository.

| Username | Role | Starting setup |
| --- | --- | --- |
| `test.learner.a` | Learner | Interested in Python; a test meeting is assigned to test mentor A. |
| `test.learner.b` | Learner | Interested in web development; a pending request is assigned to test mentor B. |
| `test.mentor.a` | Mentor | Fictional Python mentor with learner A's request. |
| `test.mentor.b` | Mentor | Fictional web mentor with learner B's request. |

Both learners belong to the **Website test accounts** cohort. A welcome announcement is targeted to that cohort. Administrators use their own existing account; these four accounts do not have administrator permissions. Mentor profiles are fictional test fixtures, not claims of real professional credentials or an available mentoring service.

## Open people side by side

Two ordinary tabs in the same browser share the same login cookie. Signing into a different account in one tab changes the session used by the other tab. Use separate browser profiles, different browsers, or one normal window and one private window.

For a learner/mentor test, sign in as `test.learner.a` in the first browser profile and `test.mentor.a` in the second. For a learner/staff test, use the learner in one profile and your administrator account in another. To have all four test accounts open at once, use four independent browser profiles or browser sessions. Multiple private windows in the same browser often share one private session; opening another private window alone is not reliable isolation.

Check the name and navigation after each sign-in. Keep each window labeled by role. When one person saves a change, refresh the other person's page to read the saved result. These pages do not offer a live messaging feed or automatic cross-window updates.

## What “chat” means here

There are three different ways to ask for help:

| Feature | Where to find it | What happens |
| --- | --- | --- |
| Learner planning assistant | Floating **Ask NextStep** button, or **Get help** | A question produces a learning plan with suggested next steps. It does not contact a person or change records. Each plan request should include its own context. |
| Lesson guidance | **Learn → open a course → a lesson → A little extra guidance** | **Get guidance** explains the current lesson. The answer identifies live AI or prepared course guidance. |
| Administrator agent | Floating **Ask NextStep** button, or **AI agent** | A chat can answer program questions and prepare supported changes. Most writes require reviewing the proposal and typing **apply**. |

**Direct learner-to-mentor chat is not implemented.** The two people can see shared meeting notes and scheduling updates. Learner-to-staff communication uses support requests and staff responses; announcements are another separate feature. Mentor accounts do not have the learner planning assistant or administrator agent.

## 1. Try the two learner assistants

1. Sign in as learner A and click **Ask NextStep**.
2. Enter: “I am learning Python loops. Suggest a small practice task and a course I can use.” Choose **Create my plan**.
3. Check that the answer and suggested course are relevant to Python. A suggested course button should open that course. The answer should not say that it sent a message or changed a record.
4. Close the assistant, open **Learn**, and search for `Python`. Open **Python for Everyday Problem Solving** if it is included in the current plan.
5. Complete the starting assessment to reach the lessons. Under **A little extra guidance**, ask: “Explain this lesson with one short example,” then choose **Get guidance**.

Read the answer's mode label. A saved API key does not guarantee every request succeeds; prepared guidance is a fallback, not evidence of a live AI response. If AI help is excluded by the learner's plan, the interface should explain the restriction. Testers can ask the administrator to review the assignment rather than changing shared plan settings themselves.

Repeat with learner B and a web development question. Learner B should have their own profile and course progress. Neither learner should receive administrator controls or another learner's saved results.

## 2. Schedule a meeting and share notes

1. In learner A's window, open **Find a mentor → Your connections**. Find the existing test request to test mentor A (it may already be scheduled from the walkthrough). There is no need to create a duplicate request.
2. In mentor A's window, open **My mentees** and choose **Update meeting** for learner A.
3. Choose **Scheduled**, enter a future date/time, choose the intended cadence, and add a note such as “Test: bring one question about Python loops.” Save the meeting.
4. Refresh learner A's page. Confirm that the status, next meeting time, cadence, and note match what the mentor saved. Times are displayed in each browser's local time zone.
5. If you have a real test video room, add its HTTPS URL and check **Join meeting** from both accounts. NextStep opens the external meeting service; it does not create or host the call. Leave the link empty if you do not have a room to test.
6. Open mentor B separately. Learner A's request and background should not appear there. Mentor B should see learner B's assigned request instead.

After an actual test meeting, the mentor can record a past meeting time, mark it **Completed**, and save a next-step note. A future meeting should not be accepted as completed. Cadence is a recorded plan; it does not automatically create recurring bookings or calendar invitations.

Staff can see the same request under **Mentors** and coordinate it there. Mentor accounts can update only their assigned requests, and cannot reassign them to another mentor.

## 3. Send a support request and receive a staff response

1. As learner A, open **Get help → Share a need**. Choose a category and priority, and enter “Test: please help me choose my next Python practice task.” Save it.
2. As an administrator, open **Member needs**, find this learner's test request, and choose **Update & respond**.
3. Add a response such as “Test response: finish the loops exercise, then bring one question to your mentor.” Set the status to **In progress** and save.
4. Refresh learner A's **Get help** page. The response and new status should be visible under that request.
5. Open learner B's **Get help** page. Learner A's request and response should be absent. The mentor workspace should not expose this support request either.

A support request has a summary and a staff response, not a threaded conversation. To report a different issue, create another clearly labeled test request. Staff can mark the original **Resolved** when the test is done.

## 4. Read the welcome announcement

1. Open **Messages** as learner A and read the welcome update for **Website test accounts**. Use its read acknowledgment button.
2. As an administrator, open **Messages** and refresh. The announcement's read count should include learner A once.
3. Open **Messages** as learner B. Learner A's acknowledgment should not mark the message read for learner B. Acknowledge it from B and check the updated count as staff.

These accounts are shared, so an earlier tester may already have acknowledged the welcome update. If you need a fresh check, staff can publish a clearly labeled test announcement targeted only to **Website test accounts**, then archive it when finished. Do not broadcast test announcements to everyone. Editing an announcement changes its revision and requires a fresh acknowledgment of the new text.

Mentor accounts do not have the announcements workspace. Announcement counts are acknowledgments in the website, not email delivery or proof that a person understood the message.

## 5. Check the administrator chat and formatting

Use the administrator's own browser session for this check.

1. Open **Ask NextStep** or **AI agent**.
2. Ask: “Show the membership plans in a Markdown table with name, price, and course access. Do not change any records.” The response should display a table rather than raw Markdown characters.
3. Ask a related follow-up such as “Which of those includes AI help?” Close and reopen the assistant, then ask another related question. Its recent saved conversation should still provide context.
4. For a write test, ask for a new in-app announcement titled “Website test accounts: agent check,” with a short fictional body, targeted only to the **Website test accounts** cohort.
5. Expand **See exact changes**. Verify the action, text, and cohort. Type **cancel** if anything is wrong. Type **apply** only for the intended test announcement.
6. Check the saved announcement in **Messages** and from a test learner's account. The agent should report the actual outcome. Archive the test announcement after checking it.

Do not apply an unrelated pending proposal left by another tester. Direct, unambiguous course-archive requests apply immediately, so they are unsuitable for a harmless chat-formatting check. Use a read-only question or a clearly labeled test announcement instead. The agent cannot change API keys, reveal passwords, send email/SMS, or take payments.

## 6. Check progress and access

Use **Learn** to complete a course, including its starting assessment, every lesson's knowledge check, and its final assessment. Refresh and sign in again: saved progress and the original completed score should remain. Course results identify concepts needing practice; when available, the optional personalized follow-up is private to that learner.

As staff, filter results to **Website test accounts** when examining test outcomes. These fictional activities are not evidence of real participant impact. Course assessments remain separate from manually entered program results.

To examine plan restrictions without changing real assignments, use **Membership plans → Try this plan as a learner**. The preview should show locked courses and disabled plan benefits. A preview does not create an account, send a request, or record actual learning progress. Existing enrollments can remain available after access changes, so use an unstarted course when testing a new-course lock.

## Privacy and session checks

- Learner A and learner B should see only their own applications, support requests, enrollments, results, and payment history.
- Mentor A should see assigned learner A's goal, stage, story, and résumé highlights. Grades, contact details, applications, support requests, funding, and other learners' records should remain unavailable.
- Refreshing an account should retain its own role. A learner or mentor should never gain administrator actions by changing a URL hash.
- Signing out one independent browser session should not sign out an unrelated account in another browser profile.
- Changing an account password signs out that account's other sessions. Coordinate with the owner before changing a shared test password, or other testers will lose access.
- Staff deactivation blocks the account immediately. Reactivation requires a fresh sign-in; old sessions should not revive.

Use fictional content in these shared accounts. Do not add private personal information, real credentials, or someone else's records. Shared account passwords belong in the owner's separate test handout, not in issues, commits, screenshots, or this guide.

## What this test does not establish

The public Pages review does not send external email/SMS and has no scheduled delivery worker. Drafts, queues, and prepared reminders do not establish delivery. A full provider delivery test requires separate configuration and authorized test recipients.

PayPal is configured for test payments with no real-money charge or automatic renewal. This guide does not claim that buyer checkout, live payments, refunds, or production payment operations have been verified. Membership assignments and previews can be tested without making a purchase.

External video services, model-provider availability, and network conditions also need their own checks. Passing these website workflows is useful evidence, not a claim that every possible failure or production security requirement has been audited.

For a bug report, record the account username, page, action, expected result, actual result, and approximate time. Include a screenshot if useful, keeping passwords and private information out of it. The [full user guide](USER_GUIDE.md) and [README](../README.md) cover the broader program workflows.
