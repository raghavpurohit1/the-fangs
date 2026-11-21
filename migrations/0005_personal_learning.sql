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
