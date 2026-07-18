import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getCourses, getCourse, getLessons } from "./courseService";
import Cookies from "js-cookie";

describe("courseService", () => {
  beforeEach(() => {
    Cookies.set("access_token", "fake-access-token");
  });

  afterEach(() => {
    Cookies.remove("access_token");
  });

  describe("getCourses", () => {
    it("returns list of courses", async () => {
      const result = await getCourses();
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0].title).toBe("Python Basics");
      expect(result.total).toBe(1);
    });
  });

  describe("getCourse", () => {
    it("returns a single course by ID", async () => {
      const result = await getCourse("course-1");
      expect(result.id).toBe("course-1");
      expect(result.title).toBe("Python Basics");
      expect(result.level).toBe("beginner");
    });

    it("throws on non-existent course", async () => {
      await expect(getCourse("nonexistent")).rejects.toThrow();
    });
  });

  describe("getLessons", () => {
    it("returns lessons for a course", async () => {
      const result = await getLessons("course-1");
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Intro to Python");
      expect(result[0].order).toBe(1);
    });
  });
});
