-- Add the learner application survey without changing existing accounts or data.
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
