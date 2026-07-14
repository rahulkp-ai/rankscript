-- =============================================================================
--   RankScript — Optimized PostgreSQL Schema (DDL)
--   Version: 2.0
--   Target: PostgreSQL 15+
--   Execution order: This file runs FIRST (before seed_data.sql)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS & CONFIGURATION
-- ---------------------------------------------------------------------------

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable crypto functions (for any future hashing needs)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone for the session (all TIMESTAMPTZ columns will use this)
SET timezone = 'UTC';

-- ---------------------------------------------------------------------------
-- 1. CUSTOM ENUM TYPES
--    PostgreSQL-native ENUMs are more efficient than CHECK constraints
--    and provide type safety at the database level.
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'mentor', 'student');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE course_status AS ENUM ('draft', 'pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE lesson_review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. USERS TABLE
--    Central identity table. One row per platform user.
--    Denormalized xp/rank_score/streak_days for fast leaderboard reads
--    (these are also in rank_entries, but kept here for quick user-card loads).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100)  NOT NULL,
    email           VARCHAR(255)  NOT NULL,
    password_hash   VARCHAR(255)  NOT NULL,
    role            user_role     NOT NULL DEFAULT 'student',

    -- Location (used for regional leaderboards)
    country         VARCHAR(100)  DEFAULT 'India',
    state           VARCHAR(100),
    district        VARCHAR(100),

    -- Denormalized ranking fields (synced from rank_entries)
    xp              DOUBLE PRECISION DEFAULT 0.0,
    rank_score      DOUBLE PRECISION DEFAULT 0.0,
    streak_days     INTEGER          DEFAULT 0,

    -- Account status
    is_active       BOOLEAN      DEFAULT TRUE   NOT NULL,
    is_verified     BOOLEAN      DEFAULT FALSE  NOT NULL,
    bio             TEXT,
    avatar_url      VARCHAR(500),

    -- Timestamps (TIMESTAMPTZ for proper timezone handling)
    created_at      TIMESTAMPTZ  DEFAULT NOW()  NOT NULL,
    updated_at      TIMESTAMPTZ  DEFAULT NOW()  NOT NULL,
    last_login      TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_xp_non_negative CHECK (xp >= 0),
    CONSTRAINT ck_users_rank_score_range CHECK (rank_score >= 0 AND rank_score <= 100),
    CONSTRAINT ck_users_streak_non_negative CHECK (streak_days >= 0)
);

-- Index for login lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS ix_users_email_lower ON users (LOWER(email));
-- Index for role-based queries (admin dashboard)
CREATE INDEX IF NOT EXISTS ix_users_role ON users (role);
-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS ix_users_rank_score ON users (rank_score DESC) WHERE role = 'student';
-- Partial index for active users only
CREATE INDEX IF NOT EXISTS ix_users_active ON users (id) WHERE is_active = TRUE;

COMMENT ON TABLE users IS 'Core user identity table — one row per platform account';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash, never store plaintext';
COMMENT ON COLUMN users.rank_score IS 'Denormalized from rank_entries for fast reads; 0-100 scale';
COMMENT ON COLUMN users.streak_days IS 'Consecutive activity days; resets after 1+ day gap';

-- ---------------------------------------------------------------------------
-- 3. COURSES TABLE
--    Courses go through a lifecycle: draft -> pending -> approved/rejected.
--    total_lessons and total_enrolled are denormalized counters.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS courses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id       UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    title           VARCHAR(200)  NOT NULL,
    description     TEXT,
    thumbnail       VARCHAR(500),
    level           course_level  DEFAULT 'beginner',
    tags            JSONB         DEFAULT '[]'::jsonb,  -- structured tags for search

    status          course_status NOT NULL DEFAULT 'draft',
    is_gated        BOOLEAN       DEFAULT FALSE NOT NULL,  -- mentor must approve enrollments

    -- Denormalized counters (maintained by application triggers/logic)
    total_lessons   INTEGER       DEFAULT 0 NOT NULL,
    total_enrolled  INTEGER       DEFAULT 0 NOT NULL,

    -- Admin review tracking
    reviewed_by     UUID          REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    review_notes    TEXT,

    -- Timestamps
    created_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT ck_courses_total_lessons_non_negative CHECK (total_lessons >= 0),
    CONSTRAINT ck_courses_total_enrolled_non_negative CHECK (total_enrolled >= 0)
);

-- Index for listing approved courses (public catalog)
CREATE INDEX IF NOT EXISTS ix_courses_status ON courses (status) WHERE status = 'approved';
-- Index for mentor's course list
CREATE INDEX IF NOT EXISTS ix_courses_mentor_id ON courses (mentor_id);
-- Index for pending course review queue
CREATE INDEX IF NOT EXISTS ix_courses_pending ON courses (created_at) WHERE status = 'pending';
-- GIN index on tags for JSONB containment queries (@>)
CREATE INDEX IF NOT EXISTS ix_courses_tags ON courses USING GIN (tags);

COMMENT ON TABLE courses IS 'Learning courses created by mentors; status lifecycle: draft->pending->approved/rejected';
COMMENT ON COLUMN courses.tags IS 'JSONB array of tag strings for search/filtering, e.g. ["python", "beginner"]';
COMMENT ON COLUMN courses.is_gated IS 'When true, mentor must manually approve each enrollment';

-- ---------------------------------------------------------------------------
-- 4. LESSONS TABLE
--    Ordered video lessons within a course.
--    YouTube video IDs are extracted for embedding.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lessons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    title           VARCHAR(200)  NOT NULL,
    description     TEXT,
    youtube_url     VARCHAR(500)  NOT NULL,
    youtube_id      VARCHAR(50),
    duration        INTEGER       DEFAULT 0 NOT NULL,  -- seconds
    "order"         INTEGER       DEFAULT 0 NOT NULL,   -- position in course
    module          VARCHAR(100),                        -- chapter/grouping name
    is_free         BOOLEAN       DEFAULT FALSE NOT NULL, -- preview without enrollment

    -- Admin review (video alignment check)
    review_status   lesson_review_status NOT NULL DEFAULT 'pending',
    reviewed_by     UUID          REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    review_feedback TEXT,

    created_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT ck_lessons_duration_non_negative CHECK (duration >= 0),
    CONSTRAINT ck_lessons_order_non_negative CHECK ("order" >= 0)
);

-- Index for loading lessons in course order
CREATE INDEX IF NOT EXISTS ix_lessons_course_id_order ON lessons (course_id, "order");
-- Index for admin review queue
CREATE INDEX IF NOT EXISTS ix_lessons_review_status ON lessons (review_status) WHERE review_status = 'pending';

COMMENT ON TABLE lessons IS 'Ordered video lessons within a course; linked to YouTube';
COMMENT ON COLUMN lessons."order" IS 'Display position within course (1-based)';
COMMENT ON COLUMN lessons.is_free IS 'Allow preview without enrollment';

-- ---------------------------------------------------------------------------
-- 5. ENROLLMENTS TABLE
--    Junction table: which student is enrolled in which course.
--    Each (student, course) pair is unique.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS enrollments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id       UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    -- Progress tracking
    progress        DOUBLE PRECISION DEFAULT 0.0 NOT NULL,  -- 0.0 to 100.0
    lessons_done    INTEGER       DEFAULT 0 NOT NULL,
    last_lesson_id  UUID,  -- FK to lessons; NULL if not started

    -- Approval & completion
    is_approved     BOOLEAN       DEFAULT FALSE NOT NULL,
    is_completed    BOOLEAN       DEFAULT FALSE NOT NULL,
    completed_at    TIMESTAMPTZ,

    -- Timestamps
    enrolled_at     TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT uq_enrollment_student_course UNIQUE (student_id, course_id),
    CONSTRAINT ck_enrollment_progress_range CHECK (progress >= 0 AND progress <= 100),
    CONSTRAINT ck_enrollment_lessons_non_negative CHECK (lessons_done >= 0)
);

-- Index for student's enrollment list
CREATE INDEX IF NOT EXISTS ix_enrollments_student_id ON enrollments (student_id);
-- Index for course enrollment count queries
CREATE INDEX IF NOT EXISTS ix_enrollments_course_id ON enrollments (course_id);
-- Index for finding completed enrollments
CREATE INDEX IF NOT EXISTS ix_enrollments_completed ON enrollments (student_id) WHERE is_completed = TRUE;

COMMENT ON TABLE enrollments IS 'Junction table tracking student progress in courses';
COMMENT ON COLUMN enrollments.progress IS 'Completion percentage 0.0-100.0';
COMMENT ON COLUMN enrollments.is_approved IS 'For gated courses, mentor must approve; auto-approved otherwise';

-- ---------------------------------------------------------------------------
-- 6. QUIZZES TABLE
--    Assessments within a course. Auto-graded.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quizzes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    mentor_id       UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    title           VARCHAR(200)  NOT NULL,
    description     TEXT,
    time_limit      INTEGER       DEFAULT 0 NOT NULL,    -- 0 = unlimited
    pass_score      DOUBLE PRECISION DEFAULT 50.0 NOT NULL, -- percentage to pass
    max_attempts    INTEGER       DEFAULT 3 NOT NULL,    -- 0 = unlimited
    is_active       BOOLEAN       DEFAULT TRUE NOT NULL,
    randomize       BOOLEAN       DEFAULT FALSE NOT NULL,

    created_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT ck_quizzes_time_limit_non_negative CHECK (time_limit >= 0),
    CONSTRAINT ck_quizzes_pass_score_range CHECK (pass_score >= 0 AND pass_score <= 100),
    CONSTRAINT ck_quizzes_max_attempts_non_negative CHECK (max_attempts >= 0)
);

CREATE INDEX IF NOT EXISTS ix_quizzes_course_id ON quizzes (course_id);
CREATE INDEX IF NOT EXISTS ix_quizzes_active ON quizzes (course_id) WHERE is_active = TRUE;

COMMENT ON TABLE quizzes IS 'Auto-graded assessments with multiple-choice questions';
COMMENT ON COLUMN quizzes.time_limit IS 'Seconds allowed; 0 means no time limit';
COMMENT ON COLUMN quizzes.max_attempts IS 'Max submissions per student; 0 means unlimited';

-- ---------------------------------------------------------------------------
-- 7. QUESTIONS TABLE
--    Individual questions within a quiz. Multiple choice (a/b/c/d).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id         UUID          NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,

    text            TEXT          NOT NULL,
    option_a        VARCHAR(500)  NOT NULL,
    option_b        VARCHAR(500)  NOT NULL,
    option_c        VARCHAR(500),
    option_d        VARCHAR(500),
    correct_option  VARCHAR(1)    NOT NULL,
    explanation     TEXT,          -- shown after attempt
    points          INTEGER       DEFAULT 1 NOT NULL,
    "order"         INTEGER       DEFAULT 0 NOT NULL,

    created_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT ck_questions_correct_option CHECK (correct_option IN ('a', 'b', 'c', 'd')),
    CONSTRAINT ck_questions_points_positive CHECK (points >= 1),
    CONSTRAINT ck_questions_order_non_negative CHECK ("order" >= 0)
);

CREATE INDEX IF NOT EXISTS ix_questions_quiz_id_order ON questions (quiz_id, "order");

COMMENT ON TABLE questions IS 'Multiple-choice questions within a quiz';
COMMENT ON COLUMN questions.correct_option IS 'Valid values: a, b, c, d';
COMMENT ON COLUMN questions.explanation IS 'Displayed to student after quiz attempt';

-- ---------------------------------------------------------------------------
-- 8. QUIZ_ATTEMPTS TABLE
--    Records each student's attempt at a quiz.
--    answers stored as JSONB for structured querying.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id         UUID          NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    answers         JSONB         NOT NULL DEFAULT '{}'::jsonb,  -- {"question_id": "a", ...}
    score           DOUBLE PRECISION DEFAULT 0.0 NOT NULL,       -- percentage 0-100
    total_points    INTEGER       DEFAULT 0 NOT NULL,
    earned_points   INTEGER       DEFAULT 0 NOT NULL,
    passed          BOOLEAN       DEFAULT FALSE NOT NULL,
    time_taken      INTEGER       DEFAULT 0 NOT NULL,  -- seconds

    started_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
    submitted_at    TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT ck_quiz_attempts_score_range CHECK (score >= 0 AND score <= 100),
    CONSTRAINT ck_quiz_attempts_points_non_negative CHECK (total_points >= 0 AND earned_points >= 0),
    CONSTRAINT ck_quiz_attempts_time_non_negative CHECK (time_taken >= 0)
);

-- Index for student's attempts on a specific quiz
CREATE INDEX IF NOT EXISTS ix_quiz_attempts_quiz_student ON quiz_attempts (quiz_id, student_id);
-- Index for student's all attempts
CREATE INDEX IF NOT EXISTS ix_quiz_attempts_student ON quiz_attempts (student_id);
-- GIN index on answers for JSONB queries
CREATE INDEX IF NOT EXISTS ix_quiz_attempts_answers ON quiz_attempts USING GIN (answers);

COMMENT ON TABLE quiz_attempts IS 'Auto-graded quiz submissions; one row per attempt';
COMMENT ON COLUMN quiz_attempts.answers IS 'JSONB map: {question_uuid: "a"|"b"|"c"|"d", ...}';

-- ---------------------------------------------------------------------------
-- 9. ASSIGNMENTS TABLE
--    Manually graded work within a course.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    mentor_id       UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    title           VARCHAR(200)  NOT NULL,
    description     TEXT,
    instructions    TEXT,
    max_score       DOUBLE PRECISION DEFAULT 100.0 NOT NULL,
    passing_score   DOUBLE PRECISION DEFAULT 50.0 NOT NULL,
    deadline        TIMESTAMPTZ,
    late_penalty    DOUBLE PRECISION DEFAULT 10.0 NOT NULL,  -- % per day
    allow_late      BOOLEAN       DEFAULT TRUE NOT NULL,
    is_active       BOOLEAN       DEFAULT TRUE NOT NULL,

    created_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT ck_assignments_max_score_positive CHECK (max_score > 0),
    CONSTRAINT ck_assignments_passing_score_range CHECK (passing_score >= 0 AND passing_score <= max_score),
    CONSTRAINT ck_assignments_late_penalty_range CHECK (late_penalty >= 0 AND late_penalty <= 100)
);

CREATE INDEX IF NOT EXISTS ix_assignments_course_id ON assignments (course_id);
CREATE INDEX IF NOT EXISTS ix_assignments_active ON assignments (course_id) WHERE is_active = TRUE;

COMMENT ON TABLE assignments IS 'Manually graded coursework with optional deadlines';
COMMENT ON COLUMN assignments.late_penalty IS 'Percentage points deducted per day late';

-- ---------------------------------------------------------------------------
-- 10. SUBMISSIONS TABLE
--    Student submissions for assignments. Graded by mentor.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id   UUID          NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    content         TEXT,          -- text answer
    file_url        VARCHAR(500),  -- uploaded file URL
    file_name       VARCHAR(200),

    -- Grading
    score           DOUBLE PRECISION,  -- NULL until graded
    feedback        TEXT,
    is_graded       BOOLEAN       DEFAULT FALSE NOT NULL,
    is_late         BOOLEAN       DEFAULT FALSE NOT NULL,
    late_days       DOUBLE PRECISION DEFAULT 0.0 NOT NULL,

    submitted_at    TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
    graded_at       TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT uq_submission_assignment_student UNIQUE (assignment_id, student_id),
    CONSTRAINT ck_submissions_score_non_negative CHECK (score IS NULL OR score >= 0),
    CONSTRAINT ck_submissions_late_days_non_negative CHECK (late_days >= 0)
);

CREATE INDEX IF NOT EXISTS ix_submissions_assignment ON submissions (assignment_id);
CREATE INDEX IF NOT EXISTS ix_submissions_student ON submissions (student_id);
-- Index for mentor grading queue
CREATE INDEX IF NOT EXISTS ix_submissions_ungraded ON submissions (assignment_id, submitted_at)
    WHERE is_graded = FALSE;

COMMENT ON TABLE submissions IS 'Student assignment submissions; one per (assignment, student) pair';
COMMENT ON COLUMN submissions.score IS 'NULL until mentor grades; then 0 to max_score';

-- ---------------------------------------------------------------------------
-- 11. RANK_ENTRIES TABLE
--    One row per student. Stores computed ranking components.
--    This is the source of truth for ranking; users table is denormalized copy.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rank_entries (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Component scores (each 0-100)
    quiz_score        DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    assignment_score  DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    exam_score        DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    completion_score  DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    streak_score      DOUBLE PRECISION DEFAULT 0.0 NOT NULL,

    -- Computed weighted score
    rank_score        DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    xp                DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    streak_days       INTEGER       DEFAULT 0 NOT NULL,
    last_active       TIMESTAMPTZ,

    -- Location snapshot (copied from users at creation)
    country           VARCHAR(100)  DEFAULT 'India',
    state             VARCHAR(100),
    district          VARCHAR(100),

    created_at        TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
    updated_at        TIMESTAMPTZ   DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT uq_rank_entries_user_id UNIQUE (user_id),
    CONSTRAINT ck_rank_entries_scores_range CHECK (
        quiz_score >= 0 AND quiz_score <= 100 AND
        assignment_score >= 0 AND assignment_score <= 100 AND
        exam_score >= 0 AND exam_score <= 100 AND
        completion_score >= 0 AND completion_score <= 100 AND
        streak_score >= 0 AND streak_score <= 100
    ),
    CONSTRAINT ck_rank_entries_rank_score_range CHECK (rank_score >= 0 AND rank_score <= 100),
    CONSTRAINT ck_rank_entries_xp_non_negative CHECK (xp >= 0),
    CONSTRAINT ck_rank_entries_streak_non_negative CHECK (streak_days >= 0)
);

-- Index for global leaderboard (descending rank)
CREATE INDEX IF NOT EXISTS ix_rank_entries_rank_score ON rank_entries (rank_score DESC);
-- Index for state leaderboard
CREATE INDEX IF NOT EXISTS ix_rank_entries_state ON rank_entries (state, rank_score DESC);
-- Index for district leaderboard
CREATE INDEX IF NOT EXISTS ix_rank_entries_district ON rank_entries (district, rank_score DESC);

COMMENT ON TABLE rank_entries IS 'Per-student ranking data; one row per student; source of truth for leaderboards';
COMMENT ON COLUMN rank_entries.rank_score IS 'Weighted: quiz*0.30 + assignment*0.20 + exam*0.30 + completion*0.10 + streak*0.10';

-- ---------------------------------------------------------------------------
-- 12. AUTO-UPDATE TRIGGER FOR updated_at
--    Automatically sets updated_at on every UPDATE.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['users', 'courses', 'lessons', 'enrollments', 'quizzes', 'assignments', 'rank_entries']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', tbl, tbl);
        EXECUTE format('
            CREATE TRIGGER trg_%s_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION fn_update_timestamp()
        ', tbl, tbl);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 13. TRIGGER: Sync enrollment count on courses
--    Maintains courses.total_enrolled when enrollments change.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_sync_course_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE courses SET total_enrolled = total_enrolled + 1 WHERE id = NEW.course_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE courses SET total_enrolled = GREATEST(0, total_enrolled - 1) WHERE id = OLD.course_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enrollment_count ON enrollments;
CREATE TRIGGER trg_enrollment_count
AFTER INSERT OR DELETE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION fn_sync_course_enrollment_count();

-- ---------------------------------------------------------------------------
-- 14. TRIGGER: Sync lesson count on courses
--    Maintains courses.total_lessons when lessons change.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_sync_course_lesson_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE courses SET total_lessons = total_lessons + 1 WHERE id = NEW.course_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE courses SET total_lessons = GREATEST(0, total_lessons - 1) WHERE id = OLD.course_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lesson_count ON lessons;
CREATE TRIGGER trg_lesson_count
AFTER INSERT OR DELETE ON lessons
FOR EACH ROW
EXECUTE FUNCTION fn_sync_course_lesson_count();

-- ---------------------------------------------------------------------------
-- 15. ROLE-BASED ACCESS CONTROL (Application-level roles)
--    These GRANTs assume the application connects as 'rankscript_app'.
--    Adjust as needed for your deployment.
-- ---------------------------------------------------------------------------

-- Create application role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rankscript_app') THEN
        CREATE ROLE rankscript_app NOLOGIN;
    END IF;
END $$;

-- Grant table privileges to application role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rankscript_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rankscript_app;

-- Grant future table privileges (for migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rankscript_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO rankscript_app;

-- Read-only role for analytics/reporting
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rankscript_readonly') THEN
        CREATE ROLE rankscript_readonly NOLOGIN;
    END IF;
END $$;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO rankscript_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO rankscript_readonly;

-- ---------------------------------------------------------------------------
-- 16. MATERIALIZED VIEW: Leaderboard Cache
--     Pre-computed leaderboard for fast pagination.
--     Refresh periodically or after ranking updates.
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leaderboard AS
SELECT
    re.user_id,
    u.name,
    u.avatar_url,
    re.rank_score,
    re.xp,
    re.streak_days,
    re.state,
    re.district,
    re.quiz_score,
    re.assignment_score,
    re.completion_score,
    ROW_NUMBER() OVER (ORDER BY re.rank_score DESC, re.xp DESC) AS global_rank
FROM rank_entries re
JOIN users u ON u.id = re.user_id
WHERE u.role = 'student' AND u.is_active = TRUE
ORDER BY re.rank_score DESC, re.xp DESC;

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS ix_mv_leaderboard_user_id ON mv_leaderboard (user_id);
CREATE INDEX IF NOT EXISTS ix_mv_leaderboard_global_rank ON mv_leaderboard (global_rank);

COMMENT ON MATERIALIZED VIEW mv_leaderboard IS 'Cached leaderboard; refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leaderboard';

-- ---------------------------------------------------------------------------
-- 17. AUDIT LOGS TABLE
--     Permanent record of admin actions. target_user_id is SET NULL on user
--     deletion so the audit trail is preserved even after user removal.
--     target_name / target_email / details JSON preserve forensic context.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id        UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action          VARCHAR(50) NOT NULL,
    -- SET NULL on user delete: preserves the audit row while allowing deletion
    target_user_id  UUID        REFERENCES users(id) ON DELETE SET NULL,
    target_name     VARCHAR(100),
    target_email    VARCHAR(255),
    target_role     VARCHAR(20),
    details         TEXT,                   -- JSON string with extra forensic info
    reference_id    VARCHAR(50) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_audit_logs_reference_id UNIQUE (reference_id)
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_admin_id   ON audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at DESC);
-- Partial index for looking up actions by type quickly
CREATE INDEX IF NOT EXISTS ix_audit_logs_action     ON audit_logs (action);

COMMENT ON TABLE  audit_logs                   IS 'Immutable admin action log — rows are never deleted';
COMMENT ON COLUMN audit_logs.target_user_id    IS 'NULL after user deletion; see target_name/email for identity';
COMMENT ON COLUMN audit_logs.reference_id      IS 'Human-readable unique audit ref, e.g. AUD-20260101120000-AB12CD34';

-- ---------------------------------------------------------------------------
-- SCHEMA VERSION TRACKING
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    applied_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO schema_migrations (version, name)
VALUES (1, 'initial_schema_v2')
ON CONFLICT (version) DO NOTHING;

INSERT INTO schema_migrations (version, name)
VALUES (2, 'add_audit_logs_table')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
