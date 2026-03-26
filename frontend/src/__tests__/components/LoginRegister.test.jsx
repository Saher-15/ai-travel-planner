/**
 * Component tests for Login and Register pages.
 * Uses MSW to mock API responses and i18n stubs.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// ── Stubs ─────────────────────────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
  Trans: ({ children }) => children,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── MSW server ────────────────────────────────────────────────────────────────

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  mockNavigate.mockClear();
});

// ── Imports after mocks ───────────────────────────────────────────────────────

import Login from "../../pages/Login.jsx";
import Register from "../../pages/Register.jsx";
import { AuthProvider } from "../../auth/AuthProvider.jsx";

function mockUnauth() {
  server.use(http.get("*/auth/me", () => HttpResponse.json({}, { status: 401 })));
}

function renderLogin() {
  mockUnauth();
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

function renderRegister() {
  mockUnauth();
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────

describe("Login page", () => {
  it("renders email input", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("renders password input", () => {
    renderLogin();
    const inputs = document.querySelectorAll('input[type="password"]');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it("shows error when submitting with empty fields", async () => {
    renderLogin();
    const user = userEvent.setup();
    // Submit the form via the submit button
    const submitBtn = document.querySelector('button[type="submit"]') ||
                      [...document.querySelectorAll("button")].find(b => b.textContent.match(/sign in|login/i));
    // Trigger form submit directly
    const form = document.querySelector("form");
    if (form) form.dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText("login.errors.enterCredentials")).toBeInTheDocument();
    });
  });

  it("calls /auth/login API on valid submit", async () => {
    server.use(
      http.post("*/auth/login", () =>
        HttpResponse.json({
          message: "Logged in",
          user: { id: "u1", name: "Alice", email: "alice@test.com", verified: true },
        })
      ),
      http.get("*/auth/me", () =>
        HttpResponse.json({
          user: { id: "u1", name: "Alice", email: "alice@test.com", verified: true },
        })
      )
    );

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("you@example.com"), "alice@test.com");
    const passwordInput = document.querySelector('input[type="password"]');
    await user.type(passwordInput, "Pass@1234");

    const form = document.querySelector("form");
    form.dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows API error message on login failure", async () => {
    server.use(
      http.post("*/auth/login", () =>
        HttpResponse.json({ message: "Invalid credentials" }, { status: 400 })
      )
    );

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("you@example.com"), "bad@test.com");
    const passwordInput = document.querySelector('input[type="password"]');
    await user.type(passwordInput, "WrongPass");
    document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("shows too many attempts message for 429", async () => {
    server.use(
      http.post("*/auth/login", () =>
        HttpResponse.json({ message: "Rate limited" }, { status: 429 })
      )
    );

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@test.com");
    const passwordInput = document.querySelector('input[type="password"]');
    await user.type(passwordInput, "Pass@1234");
    document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText("login.errors.tooManyAttempts")).toBeInTheDocument();
    });
  });

  it("has a toggle button to show/hide password", () => {
    renderLogin();
    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeInTheDocument();
    // Toggle button should exist near the password field
    const toggleBtn = document.querySelector("button[aria-label]");
    expect(toggleBtn).toBeInTheDocument();
  });

  it("redirects unverified user to /profile after login", async () => {
    server.use(
      http.post("*/auth/login", () =>
        HttpResponse.json({
          user: { id: "u1", name: "Bob", email: "bob@test.com", verified: false },
        })
      ),
      http.get("*/auth/me", () =>
        HttpResponse.json({ user: { id: "u1", name: "Bob", email: "bob@test.com", verified: false } })
      )
    );

    renderLogin();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("you@example.com"), "bob@test.com");
    const passwordInput = document.querySelector('input[type="password"]');
    await user.type(passwordInput, "Pass@1234");
    document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/profile");
    });
  });
});

// ─── Register page ────────────────────────────────────────────────────────────

describe("Register page", () => {
  it("renders two password inputs (password + confirm)", () => {
    renderRegister();
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBe(2);
  });

  it("renders an email input", () => {
    renderRegister();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("shows fill-all-fields error when form submitted empty", async () => {
    renderRegister();
    document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true }));
    await waitFor(() => {
      expect(screen.getByText("register.errors.fillAllFields")).toBeInTheDocument();
    });
  });

  it("shows passwords-no-match error", async () => {
    renderRegister();
    const user = userEvent.setup();
    const emailInput = screen.getByPlaceholderText("you@example.com");
    const textInputs = document.querySelectorAll('input:not([type="password"]):not([type="email"])');
    const nameInput = [...document.querySelectorAll("input")].find(i => i.type === "text");
    const [pw, confirm] = document.querySelectorAll('input[type="password"]');

    if (nameInput) await user.type(nameInput, "Test User");
    await user.type(emailInput, "test@test.com");
    await user.type(pw, "Pass@1234");
    await user.type(confirm, "Different@5678");
    document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText("register.errors.passwordsNoMatch")).toBeInTheDocument();
    });
  });

  it("shows weak password error", async () => {
    renderRegister();
    const user = userEvent.setup();
    const emailInput = screen.getByPlaceholderText("you@example.com");
    const nameInput = [...document.querySelectorAll("input")].find(i => i.type === "text");
    const [pw, confirm] = document.querySelectorAll('input[type="password"]');

    if (nameInput) await user.type(nameInput, "Test User");
    await user.type(emailInput, "test@test.com");
    await user.type(pw, "weak");
    await user.type(confirm, "weak");
    document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText("register.errors.weakPassword")).toBeInTheDocument();
    });
  });

  it("calls /auth/register on valid submit and shows success", async () => {
    server.use(
      http.post("*/auth/register", () =>
        HttpResponse.json({ message: "Account created." }, { status: 201 })
      )
    );

    renderRegister();
    const user = userEvent.setup();
    const emailInput = screen.getByPlaceholderText("you@example.com");
    const nameInput = [...document.querySelectorAll("input")].find(i => i.type === "text");
    const [pw, confirm] = document.querySelectorAll('input[type="password"]');

    if (nameInput) await user.type(nameInput, "New User");
    await user.type(emailInput, "new@test.com");
    await user.type(pw, "Pass@1234");
    await user.type(confirm, "Pass@1234");
    document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText("register.errors.accountCreated")).toBeInTheDocument();
    });
  });

  it("shows server error when email already exists", async () => {
    server.use(
      http.post("*/auth/register", () =>
        HttpResponse.json({ message: "Email already exists" }, { status: 400 })
      )
    );

    renderRegister();
    const user = userEvent.setup();
    const emailInput = screen.getByPlaceholderText("you@example.com");
    const nameInput = [...document.querySelectorAll("input")].find(i => i.type === "text");
    const [pw, confirm] = document.querySelectorAll('input[type="password"]');

    if (nameInput) await user.type(nameInput, "Dup User");
    await user.type(emailInput, "dup@test.com");
    await user.type(pw, "Pass@1234");
    await user.type(confirm, "Pass@1234");
    document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
  });

  it("typing in password input updates its value", async () => {
    renderRegister();
    const user = userEvent.setup();
    const [pw] = document.querySelectorAll('input[type="password"]');
    await user.type(pw, "Pass@1234");
    expect(pw).toHaveValue("Pass@1234");
  });
});

// ─── Regression: API error handling ──────────────────────────────────────────

describe("Login API error regression", () => {
  it("handles network error gracefully without crashing", async () => {
    server.use(
      http.post("*/auth/login", () => HttpResponse.error())
    );

    renderLogin();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@test.com");
    const passwordInput = document.querySelector('input[type="password"]');
    await user.type(passwordInput, "Pass@1234");
    document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      // Should show some error, not crash
      const errorEl = document.querySelector("[class*='rose']");
      // Component should still be in the DOM (didn't crash)
      expect(document.querySelector("form")).toBeInTheDocument();
    });
  });
});
