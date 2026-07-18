import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loginUser, registerUser, getMe, refreshToken } from "./authService";
import Cookies from "js-cookie";

describe("authService", () => {
  describe("loginUser", () => {
    it("returns tokens on successful login", async () => {
      const result = await loginUser({
        email: "test@test.com",
        password: "password",
      });
      expect(result).toEqual({
        access_token: "fake-access-token",
        refresh_token: "fake-refresh-token",
        token_type: "bearer",
      });
    });

    it("throws on invalid credentials", async () => {
      await expect(
        loginUser({ email: "wrong@test.com", password: "wrong" })
      ).rejects.toThrow();
    });
  });

  describe("registerUser", () => {
    it("returns user profile on successful registration", async () => {
      const result = await registerUser({
        name: "New User",
        email: "new@test.com",
        password: "password123",
      });
      expect(result.email).toBe("new@test.com");
      expect(result.name).toBe("New User");
      expect(result.id).toBe("new-user-id");
    });

    it("throws on duplicate email", async () => {
      await expect(
        registerUser({
          name: "Dup",
          email: "existing@test.com",
          password: "password123",
        })
      ).rejects.toThrow();
    });
  });

  describe("getMe", () => {
    beforeEach(() => {
      Cookies.set("access_token", "fake-access-token");
    });

    afterEach(() => {
      Cookies.remove("access_token");
    });

    it("returns user profile with valid token", async () => {
      const result = await getMe();
      expect(result.email).toBe("test@test.com");
      expect(result.role).toBe("student");
      expect(result.xp).toBe(100);
    });

    it("throws on invalid token", async () => {
      Cookies.set("access_token", "bad-token");
      await expect(getMe()).rejects.toThrow();
    });
  });

  describe("refreshToken", () => {
    it("returns new tokens on valid refresh", async () => {
      const result = await refreshToken("fake-refresh-token");
      expect(result.access_token).toBe("new-access-token");
      expect(result.refresh_token).toBe("new-refresh-token");
    });

    it("throws on invalid refresh token", async () => {
      await expect(refreshToken("bad-refresh")).rejects.toThrow();
    });
  });
});
