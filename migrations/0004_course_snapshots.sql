-- Preserve the course each enrolled learner started; later edits serve new learners.
CREATE TABLE IF NOT EXISTS enrollment_courses (
  enrollment_id TEXT PRIMARY KEY REFERENCES enrollments(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK(json_valid(data))
);
INSERT OR IGNORE INTO enrollment_courses(enrollment_id,data)
SELECT e.id,c.data FROM enrollments e JOIN content c ON c.kind='course' AND c.id=e.course_id;
INSERT OR IGNORE INTO meta(key,value) VALUES('migration-0004-course-snapshots',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
