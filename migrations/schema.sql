PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
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
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS content (
  kind TEXT NOT NULL CHECK(kind IN ('course','mentor','resource','event')),
  id TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  PRIMARY KEY(kind,id)
);
CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE IF NOT EXISTS mentor_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mentor_kind TEXT NOT NULL DEFAULT 'mentor' CHECK(mentor_kind='mentor'),
  mentor_id TEXT NOT NULL UNIQUE,
  FOREIGN KEY(mentor_kind,mentor_id) REFERENCES content(kind,id) ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS requests_user ON mentor_requests(user_id);
CREATE INDEX IF NOT EXISTS enrollment_user ON enrollments(user_id);
CREATE TABLE IF NOT EXISTS program_records (
  kind TEXT NOT NULL CHECK(kind IN ('result','funding')),
  id TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  PRIMARY KEY(kind,id)
);
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL,
  PRIMARY KEY(announcement_id,user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS requests_one_open_per_mentor ON mentor_requests(user_id, COALESCE(mentor_id,'')) WHERE status IN ('waiting','scheduled');
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS program_records_audit_insert AFTER INSERT ON program_records
BEGIN
  INSERT INTO audit_log(id,actor_id,entity_kind,entity_id,action,before_json,after_json,created_at)
  VALUES(lower(hex(randomblob(16))),COALESCE(json_extract(NEW.data,'$.updatedBy'),'system:seed'),NEW.kind,NEW.id,'create',NULL,NEW.data,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER IF NOT EXISTS program_records_audit_update AFTER UPDATE ON program_records
BEGIN
  INSERT INTO audit_log(id,actor_id,entity_kind,entity_id,action,before_json,after_json,created_at)
  VALUES(lower(hex(randomblob(16))),COALESCE(json_extract(NEW.data,'$.updatedBy'),'system'),NEW.kind,NEW.id,CASE WHEN json_extract(NEW.data,'$.active')=0 THEN 'archive' ELSE 'update' END,OLD.data,NEW.data,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
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
CREATE INDEX IF NOT EXISTS communication_jobs_due ON communication_jobs(status,scheduled_at);
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
CREATE INDEX IF NOT EXISTS needs_user ON member_needs(user_id,status);
CREATE TABLE IF NOT EXISTS mentorship_preferences (
  request_id TEXT PRIMARY KEY REFERENCES mentor_requests(id) ON DELETE CASCADE,
  cadence TEXT NOT NULL DEFAULT 'one_time' CHECK(cadence IN ('one_time','weekly','biweekly','monthly')),
  last_met_at TEXT
);
-- Application survey (version 0003).
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_type TEXT NOT NULL DEFAULT 'learner' CHECK(application_type IN ('learner','mentor')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','in_review','follow_up','accepted','declined')),
  data TEXT NOT NULL CHECK(json_valid(data)),
  staff_note TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS applications_user ON applications(user_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS applications_one_active_type ON applications(user_id,application_type)
  WHERE status IN ('submitted','in_review','follow_up');
INSERT OR IGNORE INTO meta(key,value) VALUES('migration-0003-applications',strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- Preserve the course each enrolled learner started; later edits serve new learners.
CREATE TABLE IF NOT EXISTS enrollment_courses (
  enrollment_id TEXT PRIMARY KEY REFERENCES enrollments(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK(json_valid(data))
);
INSERT OR IGNORE INTO enrollment_courses(enrollment_id,data)
SELECT e.id,c.data FROM enrollments e JOIN content c ON c.kind='course' AND c.id=e.course_id;
INSERT OR IGNORE INTO meta(key,value) VALUES('migration-0004-course-snapshots',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TABLE IF NOT EXISTS course_reviews (
 enrollment_id TEXT PRIMARY KEY REFERENCES enrollments(id) ON DELETE CASCADE,
 answers TEXT NOT NULL CHECK(json_valid(answers)),
 evidence_source TEXT NOT NULL DEFAULT 'final' CHECK(evidence_source IN ('final','practice')),
 review TEXT CHECK(review IS NULL OR json_valid(review)),
 review_claim TEXT,
 review_started_at INTEGER,
 course_claim TEXT,
 course_started_at INTEGER
);
CREATE TABLE IF NOT EXISTS personalized_courses (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 source_enrollment_id TEXT NOT NULL UNIQUE REFERENCES enrollments(id) ON DELETE CASCADE,
 data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX IF NOT EXISTS personalized_courses_user ON personalized_courses(user_id);
INSERT OR IGNORE INTO meta(key,value) VALUES('migration-0005-personal-learning',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TABLE IF NOT EXISTS paypal_orders (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 paypal_id TEXT UNIQUE,
 plan_id TEXT NOT NULL,
 amount TEXT NOT NULL,
 currency TEXT NOT NULL,
 billing_period TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','canceled')),
 approval_url TEXT,
 created_at TEXT NOT NULL,
 completed_at TEXT,
 capture_id TEXT UNIQUE,
 expires_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS paypal_pending_user ON paypal_orders(user_id) WHERE status='pending';
INSERT OR IGNORE INTO meta(key,value) VALUES('migration-0006-paypal-sandbox','applied');
