/**
 * Component/hook tests for AuthProvider and ProtectedRoute.
 * Uses MSW to mock API calls.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AuthProvider, useAuth } from "../../auth/AuthProvider.jsx";
import ProtectedRoute from "../../auth/ProtectedRoute.jsx";

// ── MSW server setup ──────────────────────────────────────────────────────────

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// ── Helpers ───────────────────────────────────────────────────────────────────

function AuthConsumer() {
  const { loading, isLoggedIn, user, userId } = useAuth();
  if (loading) return <div>Loading…</div>;
  if (!isLoggedIn) return <div>Not logged in</div>;
  return (
    <div>
      <div data-testid="name">{user.name}</div>
      <div data-testid="email">{user.email}</div>
      <div data-testid="role">{user.role}</div>
      <div data-testid="userId">{userId}</div>
      <div data-testid="verified">{String(user.verified)}</div>
    </div>
  );
}

function renderWithAuth(ui, { path = "/" } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

// ─── AuthProvider ─────────────────────────────────────────────────────────────

describe("AuthProvider", () => {
  it("shows loading state initially, then resolves to not logged in on 401", async () => {
    server.use(
      http.get("*/auth/me", () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 }))
    );

    renderWithAuth(<AuthConsumer />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Not logged in")).toBeInTheDocument();
    });
  });

  it("populates user data when /auth/me returns a valid user", async () => {
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json({
          loggedIn: true,
          user: {
            id: "user123",
            name: "Alice",
            email: "alice@example.com",
            verified: true,
            role: "user",
          },
        })
      )
    );

    renderWithAuth(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId("name")).toHaveTextContent("Alice");
      expect(screen.getByTestId("email")).toHaveTextContent("alice@example.com");
      expect(screen.getByTestId("role")).toHaveTextContent("user");
      expect(screen.getByTestId("verified")).toHaveTextContent("true");
    });
  });

  it("exposes userId from the user object", async () => {
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json({ user: { id: "abc999", name: "Bob", email: "b@b.com", verified: true } })
      )
    );

    renderWithAuth(<AuthConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId("userId")).toHaveTextContent("abc999");
    });
  });

  it("handles network errors gracefully (treats as not logged in)", async () => {
    server.use(
      http.get("*/auth/me", () => HttpResponse.error())
    );

    renderWithAuth(<AuthConsumer />);
    await waitFor(() => {
      expect(screen.getByText("Not logged in")).toBeInTheDocument();
    });
  });

  it("throws if useAuth is used outside AuthProvider", () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(
        <MemoryRouter>
          <AuthConsumer />
        </MemoryRouter>
      );
    }).toThrow("useAuth must be used inside AuthProvider");
    spy.mockRestore();
  });
});

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

describe("ProtectedRoute", () => {
  it("shows loading indicator while session is being checked", () => {
    // Never resolve — stays in loading state
    server.use(
      http.get("*/auth/me", () => new Promise(() => {}))
    );

    renderWithAuth(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Checking session…")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to /login when user is not logged in", async () => {
    server.use(
      http.get("*/auth/me", () => HttpResponse.json({}, { status: 401 }))
    );

    render(
      <MemoryRouter initialEntries={["/trips"]}>
        <AuthProvider>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });

  it("renders children when user is verified and logged in", async () => {
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json({
          user: { id: "u1", name: "Alice", email: "a@a.com", verified: true, role: "user" },
        })
      )
    );

    renderWithAuth(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  it("blocks access and shows verification message for unverified users", async () => {
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json({
          user: { id: "u2", name: "Bob", email: "b@b.com", verified: false, role: "user" },
        })
      )
    );

    renderWithAuth(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText("Email Not Verified")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });
});
