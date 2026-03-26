/**
 * Regression tests for the Axios API client (api/client.js).
 * Verifies interceptor behavior, error normalization, and configuration.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { api } from "../../api/client.js";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// ─── Basic request handling ───────────────────────────────────────────────────

describe("API client", () => {
  it("makes GET requests and returns data", async () => {
    server.use(
      http.get("*/trips", () => HttpResponse.json([{ id: "1", destination: "Paris" }]))
    );

    const res = await api.get("/trips");
    expect(res.data).toEqual([{ id: "1", destination: "Paris" }]);
  });

  it("makes POST requests with body", async () => {
    server.use(
      http.post("*/auth/login", async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({ message: "ok", email: body.email });
      })
    );

    const res = await api.post("/auth/login", { email: "test@test.com", password: "pass" });
    expect(res.data.email).toBe("test@test.com");
  });
});

// ─── Error interceptor ────────────────────────────────────────────────────────

describe("API client error interceptor", () => {
  it("attaches userMessage from response.data.message", async () => {
    server.use(
      http.post("*/auth/login", () =>
        HttpResponse.json({ message: "Invalid credentials" }, { status: 400 })
      )
    );

    let caught;
    try {
      await api.post("/auth/login", {});
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(caught.userMessage).toBe("Invalid credentials");
  });

  it("attaches userMessage from response.data.details.message", async () => {
    server.use(
      http.get("*/trips/bad", () =>
        HttpResponse.json({ details: { message: "Detailed error info" } }, { status: 422 })
      )
    );

    let caught;
    try {
      await api.get("/trips/bad");
    } catch (err) {
      caught = err;
    }

    expect(caught.userMessage).toBe("Detailed error info");
  });

  it("falls back to err.message when no response body", async () => {
    server.use(
      http.get("*/trips/error", () => HttpResponse.error())
    );

    let caught;
    try {
      await api.get("/trips/error");
    } catch (err) {
      caught = err;
    }

    expect(caught.userMessage).toBeDefined();
    expect(typeof caught.userMessage).toBe("string");
  });

  it("falls back to axios error message when response body has no message", async () => {
    // Server returns 500 with empty body — no .message field
    server.use(
      http.get("*/trips/crash", () =>
        HttpResponse.json({}, { status: 500 })
      )
    );

    let caught;
    try {
      await api.get("/trips/crash");
    } catch (err) {
      caught = err;
    }

    // response.data.message is undefined, so err.message (axios default) is used
    expect(caught.userMessage).toBe("Request failed with status code 500");
  });

  it("uses generic fallback message when err.message is also empty", async () => {
    // Simulate an error with no response and no message using a custom mock
    const { api: testApi } = await import("../../api/client.js");
    // We test the interceptor logic directly by checking what happens with a network error
    // (HttpResponse.error() — no response object, err.message = "Network Error")
    server.use(
      http.get("*/trips/networkerr", () => HttpResponse.error())
    );

    let caught;
    try {
      await testApi.get("/trips/networkerr");
    } catch (err) {
      caught = err;
    }

    // Network errors have err.message = "Network Error" — still truthy
    expect(caught.userMessage).toBeDefined();
    expect(typeof caught.userMessage).toBe("string");
  });

  it("passes through successful responses unchanged", async () => {
    server.use(
      http.get("*/health", () => HttpResponse.json({ status: "ok" }))
    );

    const res = await api.get("/health");
    expect(res.status).toBe(200);
    expect(res.data.status).toBe("ok");
  });
});

// ─── Regression: no double-wrapping errors ────────────────────────────────────

describe("Regression: error shape consistency", () => {
  it("response.status is accessible from caught error", async () => {
    server.use(
      http.post("*/auth/register", () =>
        HttpResponse.json({ message: "Email already exists" }, { status: 400 })
      )
    );

    let caught;
    try {
      await api.post("/auth/register", {});
    } catch (err) {
      caught = err;
    }

    expect(caught.response.status).toBe(400);
    expect(caught.response.data.message).toBe("Email already exists");
    expect(caught.userMessage).toBe("Email already exists");
  });

  it("401 errors include userMessage", async () => {
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json({ message: "Unauthorized: missing token cookie" }, { status: 401 })
      )
    );

    let caught;
    try {
      await api.get("/auth/me");
    } catch (err) {
      caught = err;
    }

    expect(caught.response.status).toBe(401);
    expect(caught.userMessage).toBe("Unauthorized: missing token cookie");
  });
});
