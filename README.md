# RankScript

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/rahulkp-ai/rankscript)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://rankscript.vercel.app)

_A competitive learning platform where students battle for top spots on district, state, and national leaderboards — while mentors guide the way._

[Live Demo](https://rankscript.vercel.app/auth/login) • [Features](#features) • [Architecture](#system-architecture) • [Quick Start](#quick-start) • [API Reference](#api-reference) • [Deployment](#deployment-zero-cost-stack)

</div>

---

## Live Demo

|                           |                                                                              |
| ------------------------- | ---------------------------------------------------------------------------- |
| **Frontend**              | [rankscript.vercel.app](https://rankscript.vercel.app)                       |
| **Login**                 | [rankscript.vercel.app/auth/login](https://rankscript.vercel.app/auth/login) |
| **Backend API (Swagger)** | `https://<your-render-service>.onrender.com/docs`                            |

> Hosted entirely on free tiers (Vercel + Render + Neon + Upstash). The backend spins down after 15 minutes of inactivity — if a page feels slow on first load, that's the free-tier API waking up (10–30s), not a bug.

---

## About The Project

RankScript is a full-stack competitive learning platform built for students and mentors. Students enroll in courses, complete video lessons, submit assignments, take quizzes, and earn rank scores that place them on district, state, and national leaderboards. Mentors create and manage courses, while admins oversee the entire platform through an approval workflow.

**Why RankScript?**

- Traditional LMS platforms lack competitive motivation — RankScript adds gamified leaderboards
- Regional ranking (district/state/national) enables localized competition
- Weighted scoring combines multiple learning signals into a single rank score
- Role-based access separates student, mentor, and admin concerns

---

## Features

- **Role-Based Access** — Three roles: Student, Mentor, Admin with distinct permissions
- **Course Management** — Mentors create courses with status lifecycle (draft → pending → approved/rejected)
- **Video Lessons** — YouTube-integrated lessons with ordering, modules, and free previews
- **Auto-Graded Quizzes** — Multiple-choice quizzes with time limits, attempt caps, and instant scoring
- **Assignments & Submissions** — Manually graded coursework with deadlines and late penalties
- **Competitive Leaderboards** — District, state, and national rankings with materialized view caching
- **Rank Scoring** — Weighted formula: `Quiz(40%) + Assignment(30%) + Completion(15%) + Streak(15%)`
- **XP & Streaks** — Experience points and consecutive activity day tracking
- **Admin Approval Workflows** — Course review queues, enrollment gating, and audit logging
- **Analytics Dashboard** — Platform-wide statistics for admins
- **JWT Authentication** — Access/refresh token flow with bcrypt password hashing
- **Docker-Ready** — Full containerized setup with Docker Compose

---

## System Architecture

### High-level component architecture

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Browser["Browser<br/>(Student / Mentor / Admin)"]
    end

    subgraph Frontend["Frontend — Next.js 14 App Router"]
        Pages["Pages<br/>(admin / mentor / student / auth)"]
        Components["Components<br/>(course, quiz, ranking, analytics)"]
        AuthCtx["AuthContext + useAuth hook"]
        Services["Service layer<br/>(axios, one file per API domain)"]
        Rewrite["next.config.js<br/>/api/* rewrite proxy"]
    end

    subgraph Backend["Backend — FastAPI"]
        Routes["10 Routers<br/>(auth, users, courses, lessons,<br/>enrollments, quizzes, assignments,<br/>ranking, analytics, admin)"]
        Deps["deps.py<br/>JWT auth + role guards"]
        ServicesB["9 Services<br/>(business logic layer)"]
        Models["11 SQLAlchemy Models"]
    end

    subgraph Data["Data Layer"]
        Postgres[("PostgreSQL 15<br/>11 tables + mv_leaderboard")]
        Redis[("Redis 7<br/>cache")]
    end

    Browser -->|HTTPS| Pages
    Pages --> Components
    Pages --> AuthCtx
    Components --> Services
    Services --> Rewrite
    Rewrite -->|proxied request| Routes
    Routes --> Deps
    Deps --> ServicesB
    ServicesB --> Models
    Models -->|SQLAlchemy ORM| Postgres
    ServicesB -.->|cache reads/writes| Redis

    style Client fill:#1e293b,color:#fff
    style Frontend fill:#0f172a,color:#fff
    style Backend fill:#052e16,color:#fff
    style Data fill:#1e1b4b,color:#fff
```

### Layered backend design

Every domain (users, courses, lessons, enrollments, quizzes, assignments, ranking, analytics, admin) follows the same strict layering — routes never touch the database directly:

```mermaid
flowchart LR
    A["Route<br/>(HTTP + validation)"] --> B["Service<br/>(business logic)"]
    B --> C["Model<br/>(SQLAlchemy ORM)"]
    C --> D[("PostgreSQL")]
    E["Schema<br/>(Pydantic in/out)"] -.validates.-> A
    E -.validates.-> B
```

---

## Data Flow

### Request lifecycle (production)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant V as Vercel (Next.js server)
    participant R as Render (FastAPI backend)
    participant N as Neon (PostgreSQL)
    participant UP as Upstash (Redis)

    U->>V: GET rankscript.vercel.app
    V-->>U: Rendered page (SSR/CSR)
    U->>V: fetch /api/courses
    V->>R: proxy to GET /courses
    R->>R: JWT validation (deps.py)
    R->>N: SELECT ... FROM courses
    N-->>R: rows
    R->>UP: cache leaderboard reads (if applicable)
    UP-->>R: cached value or miss
    R-->>V: JSON response
    V-->>U: JSON response (same-origin, no CORS)
```

### Ranking / leaderboard pipeline

The core differentiator of RankScript — how raw activity becomes a leaderboard position:

```mermaid
flowchart TD
    QA["quiz_attempts<br/>(scored on submit)"] --> W1["Quiz Score x 40%"]
    SUB["submissions<br/>(graded by mentor)"] --> W2["Assignment Score x 30%"]
    ENR["enrollments<br/>(lesson progress %)"] --> W3["Completion Score x 15%"]
    ACT["daily activity log"] --> W4["Streak Score x 15%"]

    W1 --> SUM["ranking_service.calculate_rank_score()"]
    W2 --> SUM
    W3 --> SUM
    W4 --> SUM

    SUM --> RE[("rank_entries<br/>source of truth")]
    RE --> MV[("mv_leaderboard<br/>materialized view")]
    MV --> API1["GET /ranking/leaderboard"]
    MV --> API2["GET /ranking/leaderboard/state/:state"]
    MV --> API3["GET /ranking/leaderboard/district/:district"]
    MV --> API4["GET /ranking/my-rank"]
```

### Authentication flow (JWT access/refresh)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend

    U->>F: Submit login form
    F->>B: POST /auth/login
    B->>B: Verify password (bcrypt)
    B-->>F: access_token (30 min) + refresh_token (7 days)
    F->>F: Store tokens (AuthContext)
    F->>B: Authenticated requests (Authorization: Bearer access_token)
    B->>B: deps.get_current_user() validates JWT + role
    Note over F,B: When access_token expires
    F->>B: POST /auth/refresh (refresh_token)
    B-->>F: new access_token
```

---

## Database Schema (Entity Relationship)

```mermaid
erDiagram
    USERS ||--o{ COURSES : "creates (mentor)"
    USERS ||--o{ ENROLLMENTS : "enrolls"
    USERS ||--o{ QUIZ_ATTEMPTS : "attempts"
    USERS ||--o{ SUBMISSIONS : "submits"
    USERS ||--o{ RANK_ENTRIES : "has"
    USERS ||--o{ AUDIT_LOGS : "performs (admin)"

    COURSES ||--o{ LESSONS : "contains"
    COURSES ||--o{ ENROLLMENTS : "has"
    COURSES ||--o{ QUIZZES : "has"
    COURSES ||--o{ ASSIGNMENTS : "has"

    QUIZZES ||--o{ QUESTIONS : "contains"
    QUIZZES ||--o{ QUIZ_ATTEMPTS : "recorded in"

    ASSIGNMENTS ||--o{ SUBMISSIONS : "receives"

    USERS {
        uuid id PK
        string role
        string email
        int xp
        int streak_days
    }
    COURSES {
        uuid id PK
        uuid mentor_id FK
        string status
    }
    RANK_ENTRIES {
        uuid id PK
        uuid user_id FK
        float rank_score
        string district
        string state
    }
```

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/rahulkp-ai/rankscript.git
   cd rankscript
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set secure values for:
   - `POSTGRES_PASSWORD`
   - `SECRET_KEY` — generate with: `python3 -c "import secrets; print(secrets.token_urlsafe(64))"`

3. **Start all services**

   ```bash
   docker-compose up --build
   ```

4. **Access the application**

   | Service            | URL                        |
   | ------------------ | -------------------------- |
   | Frontend           | http://localhost:3000      |
   | Backend API        | http://localhost:8000      |
   | API Docs (Swagger) | http://localhost:8000/docs |
   | pgAdmin (optional) | http://localhost:5050      |

   Start pgAdmin with: `docker-compose --profile tools up`

### Local Development (without Docker)

**Backend:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Ensure PostgreSQL and Redis are running, then:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

**Database:**

```bash
# Run schema + seed data against a local PostgreSQL instance
psql -U postgres -d rankscript -f database/00_schema.sql
psql -U postgres -d rankscript -f database/seed_data.sql
```

---

## Deployment (Zero-Cost Stack)

RankScript's production deployment runs entirely on free tiers:

```mermaid
graph LR
    GH["GitHub<br/>(source + Actions CI)"] -->|auto-deploy on push| VC["Vercel<br/>(Next.js frontend)"]
    GH -->|auto-deploy on push| RD["Render<br/>(FastAPI backend, Docker)"]
    RD --> NE[("Neon<br/>PostgreSQL 15")]
    RD --> UP[("Upstash<br/>Redis")]
    VC -->|proxy /api/*| RD

    style GH fill:#24292e,color:#fff
    style VC fill:#000,color:#fff
    style RD fill:#46e3b7,color:#000
    style NE fill:#00e599,color:#000
    style UP fill:#00e9a3,color:#000
```

| Component | Service                        | Free tier                                      |
| --------- | ------------------------------ | ---------------------------------------------- |
| Frontend  | [Vercel](https://vercel.com)   | No sleep, instant cold start                   |
| Backend   | [Render](https://render.com)   | Docker web service, sleeps after 15 min idle   |
| Database  | [Neon](https://neon.tech)      | Serverless Postgres 15, autosuspends when idle |
| Cache     | [Upstash](https://upstash.com) | Redis, 10,000 commands/day                     |
| CI        | GitHub Actions                 | Free for public repos                          |

Full step-by-step deployment instructions live in [`deploy/DEPLOY_GUIDE.md`](deploy/DEPLOY_GUIDE.md).

---

## Usage

### Ranking Formula

Rank scores are computed as a weighted sum of component scores (each 0–100):

```
rank_score = (quiz_score × 0.40) + (assignment_score × 0.30) + (completion_score × 0.15) + (streak_score × 0.15)
```

### CLI Commands

```bash
# Start all services
docker-compose up --build

# Force clean rebuild (removes images and volumes)
./rebuild.sh

# Run backend tests
cd backend && pytest

# Run frontend tests
cd frontend && npm test

# Lint frontend
cd frontend && npm run lint

# Build frontend for production
cd frontend && npm run build
```

---

## Configuration

| Variable                      | Description                 | Default                 | Required |
| ----------------------------- | --------------------------- | ----------------------- | -------- |
| `POSTGRES_USER`               | Database username           | `postgres`              | Yes      |
| `POSTGRES_PASSWORD`           | Database password           | —                       | Yes      |
| `POSTGRES_DB`                 | Database name               | `rankscript`            | Yes      |
| `DATABASE_URL`                | Full connection string      | —                       | Yes      |
| `REDIS_URL`                   | Redis connection URL        | `redis://redis:6379/0`  | No       |
| `SECRET_KEY`                  | JWT signing key             | —                       | Yes      |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL            | `30`                    | No       |
| `REFRESH_TOKEN_EXPIRE_DAYS`   | Refresh token TTL           | `7`                     | No       |
| `ENVIRONMENT`                 | Runtime environment         | `production`            | No       |
| `DEBUG`                       | Enable debug mode           | `False`                 | No       |
| `ALLOWED_ORIGINS`             | CORS allowed origins        | —                       | Yes      |
| `NEXT_PUBLIC_API_URL`         | Frontend API URL (dev only) | `http://localhost:8000` | No       |

See [`.env.example`](.env.example) for the full list.

---

## API Reference

All endpoints are served under `http://localhost:8000` (local) or your deployed Render URL. Interactive docs at `/docs`.

### Auth

| Method | Endpoint         | Description              |
| ------ | ---------------- | ------------------------ |
| POST   | `/auth/register` | Register a new user      |
| POST   | `/auth/login`    | Login and receive tokens |
| POST   | `/auth/refresh`  | Refresh access token     |

### Courses

| Method | Endpoint       | Description              |
| ------ | -------------- | ------------------------ |
| GET    | `/courses/`    | List approved courses    |
| POST   | `/courses/`    | Create a course (mentor) |
| GET    | `/courses/:id` | Get course details       |
| PUT    | `/courses/:id` | Update a course (mentor) |

### Lessons

| Method | Endpoint              | Description               |
| ------ | --------------------- | ------------------------- |
| GET    | `/lessons/course/:id` | List lessons for a course |
| POST   | `/lessons/`           | Add a lesson (mentor)     |
| PUT    | `/lessons/:id`        | Update a lesson (mentor)  |

### Enrollments

| Method | Endpoint                    | Description        |
| ------ | --------------------------- | ------------------ |
| POST   | `/enrollments/`             | Enroll in a course |
| GET    | `/enrollments/my`           | Get my enrollments |
| PUT    | `/enrollments/:id/progress` | Update progress    |

### Quizzes

| Method | Endpoint               | Description               |
| ------ | ---------------------- | ------------------------- |
| GET    | `/quizzes/course/:id`  | List quizzes for a course |
| POST   | `/quizzes/`            | Create a quiz (mentor)    |
| POST   | `/quizzes/:id/attempt` | Submit quiz attempt       |

### Assignments

| Method | Endpoint                  | Description                   |
| ------ | ------------------------- | ----------------------------- |
| GET    | `/assignments/course/:id` | List assignments for a course |
| POST   | `/assignments/`           | Create an assignment (mentor) |
| POST   | `/assignments/:id/submit` | Submit assignment             |
| PUT    | `/submissions/:id/grade`  | Grade a submission (mentor)   |

### Ranking & Leaderboards

| Method | Endpoint                                  | Description             |
| ------ | ----------------------------------------- | ----------------------- |
| GET    | `/ranking/leaderboard`                    | Global leaderboard      |
| GET    | `/ranking/leaderboard/state/:state`       | State leaderboard       |
| GET    | `/ranking/leaderboard/district/:district` | District leaderboard    |
| GET    | `/ranking/my-rank`                        | Get current user's rank |

### Admin

| Method | Endpoint                     | Description                   |
| ------ | ---------------------------- | ----------------------------- |
| GET    | `/admin/courses/pending`     | List pending course approvals |
| PUT    | `/admin/courses/:id/approve` | Approve a course              |
| PUT    | `/admin/courses/:id/reject`  | Reject a course               |
| GET    | `/admin/users`               | List all users                |
| GET    | `/admin/analytics`           | Platform analytics            |

---

## Project Structure

```
rankscript/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/         # API route handlers (10 routers)
│   │   │   └── deps.py         # Dependency injection (auth, DB session)
│   │   ├── core/               # Settings, config
│   │   ├── db/                 # Database session, base model
│   │   ├── models/             # SQLAlchemy ORM models (11 models)
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic layer (9 services)
│   │   └── main.py             # FastAPI app entry point
│   ├── tests/                  # pytest test suite (266 tests)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── admin/          # Admin dashboard, approvals, leaderboard
│   │   │   ├── auth/           # Login, register
│   │   │   ├── courses/        # Course catalog & detail
│   │   │   ├── dashboard/      # User dashboard
│   │   │   ├── leaderboard/    # Leaderboard views
│   │   │   ├── mentor/         # Mentor course & dashboard
│   │   │   └── student/        # Student dashboard
│   │   ├── components/         # Reusable UI components
│   │   ├── context/            # React context (auth, etc.)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                # Utilities, axios instance
│   │   ├── services/            # API service layer (10 services)
│   │   └── test/               # Vitest test setup
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── next.config.js
├── database/
│   ├── 00_schema.sql           # PostgreSQL DDL (11 tables, triggers, views)
│   └── seed_data.sql           # Seed data
├── redis/
│   └── redis.conf              # Redis configuration
├── deploy/                     # Zero-cost deployment configs and guide
│   ├── render.yaml
│   ├── next.config.js
│   ├── DEPLOY_GUIDE.md
│   └── ...
├── docker-compose.yml          # 5 services: backend, frontend, db, redis, pgadmin
├── rebuild.sh                  # Clean rebuild script
├── .env.example                # Environment variable template
└── .gitignore
```

---

## Tech Stack

| Layer              | Technology                                                           |
| ------------------ | -------------------------------------------------------------------- |
| **Backend**        | Python 3.11, FastAPI, SQLAlchemy                                     |
| **Frontend**       | Next.js 14, React 18, TypeScript, Tailwind CSS                       |
| **Database**       | PostgreSQL 15 (Neon in production)                                   |
| **Cache**          | Redis 7 (Upstash in production)                                      |
| **Auth**           | JWT (python-jose), bcrypt                                            |
| **Testing**        | pytest, pytest-asyncio (backend); Vitest, Testing Library (frontend) |
| **Infrastructure** | Docker, Docker Compose (local) · Render + Vercel (production)        |
| **Storage**        | S3-compatible (boto3) for file uploads                               |

---

## Database Schema

**11 tables** with UUID primary keys, foreign key constraints, and auto-update triggers:

| Table           | Purpose                                                            |
| --------------- | ------------------------------------------------------------------ |
| `users`         | User accounts (student/mentor/admin) with denormalized rank fields |
| `courses`       | Mentor-created courses with status lifecycle                       |
| `lessons`       | YouTube video lessons with ordering and review workflow            |
| `enrollments`   | Student-course junction with progress tracking                     |
| `quizzes`       | Auto-graded assessments with time limits                           |
| `questions`     | Multiple-choice questions (a/b/c/d)                                |
| `quiz_attempts` | Student quiz submissions with JSONB answers                        |
| `assignments`   | Manually graded coursework with deadlines                          |
| `submissions`   | Student assignment submissions with grading                        |
| `rank_entries`  | Per-student ranking data (source of truth)                         |
| `audit_logs`    | Immutable admin action log                                         |

Plus a materialized view (`mv_leaderboard`) for fast leaderboard pagination.

---

## Roadmap

- [x] Core backend API with 30+ endpoints
- [x] PostgreSQL schema with triggers and constraints
- [x] Role-based authentication (student, mentor, admin)
- [x] Course and lesson management
- [x] Quiz and assignment system
- [x] Regional leaderboards (district, state, national)
- [x] Admin approval workflows
- [x] Docker containerization
- [x] Zero-cost production deployment (Vercel + Render + Neon + Upstash)
- [x] CI/CD pipeline
- [ ] Email notifications (fastapi-mail integration)
- [ ] Google OAuth
- [ ] Real-time leaderboard updates (WebSockets)
- [ ] Mobile responsive improvements

---

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

We follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Contact

**RAHUL KP**

- GitHub: [@rahulkp-ai](https://github.com/rahulkp-ai)
- Project Link: [github.com/rahulkp-ai/rankscript](https://github.com/rahulkp-ai/rankscript)
- Live Demo: [rankscript.vercel.app](https://rankscript.vercel.app)
