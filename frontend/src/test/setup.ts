import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  // Auth
  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    if (body.email === "test@test.com" && body.password === "password") {
      return HttpResponse.json({
        access_token: "fake-access-token",
        refresh_token: "fake-refresh-token",
        token_type: "bearer",
      });
    }
    return HttpResponse.json(
      { detail: "Invalid email or password" },
      { status: 401 }
    );
  }),

  http.post("/api/auth/register", async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    if (body.email === "existing@test.com") {
      return HttpResponse.json(
        { detail: "Email already registered" },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      id: "new-user-id",
      name: body.name,
      email: body.email,
      role: body.role || "student",
      xp: 0,
      rank_score: 0,
      is_verified: false,
      is_active: true,
      state: null,
      district: null,
      country: null,
      avatar_url: null,
      created_at: "2024-01-01T00:00:00Z",
    });
  }),

  http.get("/api/users/me", ({ request }) => {
    const auth = request.headers.get("Authorization");
    if (auth === "Bearer fake-access-token") {
      return HttpResponse.json({
        id: "user-123",
        name: "Test User",
        email: "test@test.com",
        role: "student",
        xp: 100,
        rank_score: 50.5,
        is_verified: true,
        is_active: true,
        state: null,
        district: null,
        country: null,
        avatar_url: null,
        created_at: "2024-01-01T00:00:00Z",
      });
    }
    return HttpResponse.json(
      { detail: "Not authenticated" },
      { status: 401 }
    );
  }),

  http.post("/api/auth/refresh", async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    if (body.refresh_token === "fake-refresh-token") {
      return HttpResponse.json({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        token_type: "bearer",
      });
    }
    return HttpResponse.json(
      { detail: "Invalid refresh token" },
      { status: 401 }
    );
  }),

  // Courses
  http.get("/api/courses", () => {
    return HttpResponse.json({
      courses: [
        {
          id: "course-1",
          mentor_id: "mentor-1",
          title: "Python Basics",
          description: "Learn Python",
          thumbnail: null,
          level: "beginner",
          tags: "python",
          status: "approved",
          is_gated: false,
          total_lessons: 10,
          total_enrolled: 5,
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
    });
  }),

  http.get("/api/courses/:id", ({ params }) => {
    if (params.id === "course-1") {
      return HttpResponse.json({
        id: "course-1",
        mentor_id: "mentor-1",
        title: "Python Basics",
        description: "Learn Python",
        thumbnail: null,
        level: "beginner",
        tags: "python",
        status: "approved",
        is_gated: false,
        total_lessons: 10,
        total_enrolled: 5,
        created_at: "2024-01-01T00:00:00Z",
      });
    }
    return HttpResponse.json(
      { detail: "Course not found" },
      { status: 404 }
    );
  }),

  http.get("/api/courses/:id/lessons", ({ request }) => {
    const auth = request.headers.get("Authorization");
    if (!auth) {
      return HttpResponse.json(
        { detail: "Not authenticated" },
        { status: 401 }
      );
    }
    return HttpResponse.json([
      {
        id: "lesson-1",
        course_id: "course-1",
        title: "Intro to Python",
        description: "First lesson",
        youtube_url: "https://youtube.com/watch?v=abc",
        youtube_id: "abc",
        duration: 600,
        order: 1,
        module: "Module 1",
        is_free: true,
        review_status: "approved",
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);
  }),
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
