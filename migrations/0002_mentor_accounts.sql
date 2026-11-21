-- Run as a single D1 migration/transaction after backing up the database.
-- D1 keeps ON DELETE CASCADE active even while foreign keys are deferred.
-- Snapshot every dependent table, drop dependents first, and restore all rows.
-- https://developers.cloudflare.com/d1/sql-api/sql-statements/#pragma-defer_foreign_keys--onoff
PRAGMA defer_foreign_keys = ON;

-- This rebuild predates application records. Abort BEFORE dropping any table
-- if version 0003 is present, rather than cascade-deleting newer records.
CREATE TABLE IF NOT EXISTS _mentor_v2_order_guard (
  safe INTEGER CONSTRAINT application_migration_already_applied CHECK(safe=1)
);
INSERT INTO _mentor_v2_order_guard(safe)
  SELECT CASE WHEN EXISTS(SELECT 1 FROM meta WHERE key='migration-0003-applications') THEN 0 ELSE 1 END;
DROP TABLE _mentor_v2_order_guard;

CREATE TABLE IF NOT EXISTS mentor_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mentor_kind TEXT NOT NULL DEFAULT 'mentor' CHECK(mentor_kind='mentor'),
  mentor_id TEXT NOT NULL UNIQUE,
  FOREIGN KEY(mentor_kind,mentor_id) REFERENCES content(kind,id) ON DELETE CASCADE
);

CREATE TABLE _mentor_v2_users AS SELECT * FROM users;

CREATE TABLE _mentor_v2_sessions AS SELECT * FROM sessions;

CREATE TABLE _mentor_v2_enrollments AS SELECT * FROM enrollments;

CREATE TABLE _mentor_v2_lesson_completions AS SELECT * FROM lesson_completions;

CREATE TABLE _mentor_v2_mentor_requests AS SELECT * FROM mentor_requests;

CREATE TABLE _mentor_v2_announcement_reads AS SELECT * FROM announcement_reads;

CREATE TABLE _mentor_v2_communication_jobs AS SELECT * FROM communication_jobs;

CREATE TABLE _mentor_v2_communication_batches AS SELECT * FROM communication_batches;

CREATE TABLE _mentor_v2_communication_batch_jobs AS SELECT * FROM communication_batch_jobs;

CREATE TABLE _mentor_v2_member_needs AS SELECT * FROM member_needs;

CREATE TABLE _mentor_v2_mentorship_preferences AS SELECT * FROM mentorship_preferences;

CREATE TABLE _mentor_v2_mentor_accounts AS SELECT * FROM mentor_accounts;

DROP TABLE mentor_accounts;

DROP TABLE mentorship_preferences;

DROP TABLE member_needs;

DROP TABLE communication_batch_jobs;

DROP TABLE communication_batches;

DROP TABLE communication_jobs;

DROP TABLE announcement_reads;

DROP TABLE mentor_requests;

DROP TABLE lesson_completions;

DROP TABLE enrollments;

DROP TABLE sessions;

DROP TABLE users;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','learner','mentor')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  data TEXT NOT NULL CHECK(json_valid(data))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  baseline_score REAL NOT NULL CHECK(baseline_score BETWEEN 0 AND 100),
  post_score REAL CHECK(post_score BETWEEN 0 AND 100),
  baseline_confidence INTEGER NOT NULL CHECK(baseline_confidence BETWEEN 1 AND 5),
  post_confidence INTEGER CHECK(post_confidence BETWEEN 1 AND 5),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(user_id,course_id)
);

CREATE TABLE IF NOT EXISTS lesson_completions (
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY(enrollment_id,lesson_id)
);

CREATE TABLE IF NOT EXISTS mentor_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id TEXT,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','scheduled','completed')),
  created_at TEXT NOT NULL,
  session_at TEXT,
  meeting_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL,
  PRIMARY KEY(announcement_id,user_id)
);

CREATE TABLE IF NOT EXISTS communication_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL CHECK(channel IN ('email','sms')),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','sent','failed','unconfigured','unknown','canceled')),
  scheduled_at TEXT,
  created_at TEXT NOT NULL,
  attempted_at TEXT,
  sent_at TEXT,
  provider_id TEXT,
  error TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS communication_batches (
  request_key TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES users(id),
  payload_hash TEXT NOT NULL,
  nonce TEXT NOT NULL,
  skipped_json TEXT NOT NULL CHECK(json_valid(skipped_json)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS communication_batch_jobs (
  request_key TEXT NOT NULL REFERENCES communication_batches(request_key) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK(channel IN ('email','sms')),
  job_id TEXT NOT NULL UNIQUE REFERENCES communication_jobs(id) ON DELETE CASCADE,
  PRIMARY KEY(request_key,user_id,channel)
);

CREATE TABLE IF NOT EXISTS member_needs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN ('mentoring','learning','career','community','accessibility','other')),
  summary TEXT NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('routine','soon')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  admin_note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS mentorship_preferences (
  request_id TEXT PRIMARY KEY REFERENCES mentor_requests(id) ON DELETE CASCADE,
  cadence TEXT NOT NULL DEFAULT 'one_time' CHECK(cadence IN ('one_time','weekly','biweekly','monthly')),
  last_met_at TEXT
);

CREATE TABLE IF NOT EXISTS mentor_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mentor_kind TEXT NOT NULL DEFAULT 'mentor' CHECK(mentor_kind='mentor'),
  mentor_id TEXT NOT NULL UNIQUE,
  FOREIGN KEY(mentor_kind,mentor_id) REFERENCES content(kind,id) ON DELETE CASCADE
);

INSERT INTO users SELECT * FROM _mentor_v2_users;

INSERT INTO sessions SELECT * FROM _mentor_v2_sessions;

INSERT INTO enrollments SELECT * FROM _mentor_v2_enrollments;

INSERT INTO lesson_completions SELECT * FROM _mentor_v2_lesson_completions;

INSERT INTO mentor_requests SELECT * FROM _mentor_v2_mentor_requests;

INSERT INTO announcement_reads SELECT * FROM _mentor_v2_announcement_reads;

INSERT INTO communication_jobs SELECT * FROM _mentor_v2_communication_jobs;

INSERT INTO communication_batches SELECT * FROM _mentor_v2_communication_batches;

INSERT INTO communication_batch_jobs SELECT * FROM _mentor_v2_communication_batch_jobs;

INSERT INTO member_needs SELECT * FROM _mentor_v2_member_needs;

INSERT INTO mentorship_preferences SELECT * FROM _mentor_v2_mentorship_preferences;

INSERT INTO mentor_accounts SELECT * FROM _mentor_v2_mentor_accounts;

CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE INDEX IF NOT EXISTS requests_user ON mentor_requests(user_id);

CREATE INDEX IF NOT EXISTS enrollment_user ON enrollments(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS requests_one_open_per_mentor ON mentor_requests(user_id, COALESCE(mentor_id,'')) WHERE status IN ('waiting','scheduled');

CREATE INDEX IF NOT EXISTS communication_jobs_due ON communication_jobs(status,scheduled_at);

CREATE INDEX IF NOT EXISTS needs_user ON member_needs(user_id,status);

DROP TABLE _mentor_v2_mentor_accounts;

DROP TABLE _mentor_v2_mentorship_preferences;

DROP TABLE _mentor_v2_member_needs;

DROP TABLE _mentor_v2_communication_batch_jobs;

DROP TABLE _mentor_v2_communication_batches;

DROP TABLE _mentor_v2_communication_jobs;

DROP TABLE _mentor_v2_announcement_reads;

DROP TABLE _mentor_v2_mentor_requests;

DROP TABLE _mentor_v2_lesson_completions;

DROP TABLE _mentor_v2_enrollments;

DROP TABLE _mentor_v2_sessions;

DROP TABLE _mentor_v2_users;

INSERT OR REPLACE INTO meta(key,value) VALUES('migration-0002-mentor-accounts',strftime('%Y-%m-%dT%H:%M:%fZ','now'));

PRAGMA foreign_key_check;
