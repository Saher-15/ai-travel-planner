/**
 * Component tests for UI.jsx primitive components:
 * Card, CardHeader, CardBody, Button, Input, Select, Badge, Alert.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  Badge,
  Alert,
} from "../../components/UI.jsx";

// ─── Card ─────────────────────────────────────────────────────────────────────

describe("Card", () => {
  it("renders children", () => {
    render(<Card><p>Content</p></Card>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("applies additional className", () => {
    const { container } = render(<Card className="test-class">x</Card>);
    expect(container.firstChild).toHaveClass("test-class");
  });
});

// ─── CardHeader ───────────────────────────────────────────────────────────────

describe("CardHeader", () => {
  it("renders title", () => {
    render(<CardHeader title="My Title" />);
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<CardHeader title="T" subtitle="My subtitle" />);
    expect(screen.getByText("My subtitle")).toBeInTheDocument();
  });

  it("does not render subtitle element when not provided", () => {
    render(<CardHeader title="T" />);
    expect(screen.queryByText(/subtitle/)).toBeNull();
  });

  it("renders right slot content", () => {
    render(<CardHeader title="T" right={<button>Action</button>} />);
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("does not render right slot when not provided", () => {
    const { container } = render(<CardHeader title="T" />);
    // The right div should not be in the DOM
    const rightDivs = container.querySelectorAll(".shrink-0");
    expect(rightDivs).toHaveLength(0);
  });
});

// ─── CardBody ─────────────────────────────────────────────────────────────────

describe("CardBody", () => {
  it("renders children", () => {
    render(<CardBody><span>Body content</span></CardBody>);
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<CardBody className="custom">x</CardBody>);
    expect(container.firstChild).toHaveClass("custom");
  });
});

// ─── Button ───────────────────────────────────────────────────────────────────

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("defaults to type='button' to prevent form submission", () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("calls onClick handler", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders all variants without crashing", () => {
    const variants = ["primary", "secondary", "ghost", "danger"];
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole("button", { name: variant })).toBeInTheDocument();
      unmount();
    }
  });

  it("applies extra className", () => {
    render(<Button className="extra-class">Btn</Button>);
    expect(screen.getByRole("button")).toHaveClass("extra-class");
  });

  it("passes through HTML attributes", () => {
    render(<Button aria-label="close button">X</Button>);
    expect(screen.getByRole("button", { name: "close button" })).toBeInTheDocument();
  });
});

// ─── Input ────────────────────────────────────────────────────────────────────

describe("Input", () => {
  it("renders with label", () => {
    render(<Input label="Email" type="email" />);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders without label", () => {
    render(<Input type="text" placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("renders hint text when provided", () => {
    render(<Input label="Password" hint="Must be 8+ characters" />);
    expect(screen.getByText("Must be 8+ characters")).toBeInTheDocument();
  });

  it("fires onChange events", () => {
    const onChange = vi.fn();
    render(<Input label="Name" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Alice" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ─── Select ───────────────────────────────────────────────────────────────────

describe("Select", () => {
  it("renders children options", () => {
    render(
      <Select label="Budget">
        <option value="low">Low</option>
        <option value="mid">Mid</option>
        <option value="high">High</option>
      </Select>
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<Select label="Pace"><option>Relaxed</option></Select>);
    expect(screen.getByText("Pace")).toBeInTheDocument();
  });
});

// ─── Badge ────────────────────────────────────────────────────────────────────

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>3 days</Badge>);
    expect(screen.getByText("3 days")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Badge className="my-badge">text</Badge>);
    expect(container.firstChild).toHaveClass("my-badge");
  });
});

// ─── Alert ────────────────────────────────────────────────────────────────────

describe("Alert", () => {
  it("renders children text", () => {
    render(<Alert>Something went wrong</Alert>);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders all types without crashing", () => {
    const types = ["info", "success", "error", "warning"];
    for (const type of types) {
      const { unmount } = render(<Alert type={type}>{type} message</Alert>);
      expect(screen.getByText(`${type} message`)).toBeInTheDocument();
      unmount();
    }
  });

  it("defaults to info type", () => {
    const { container } = render(<Alert>Default</Alert>);
    expect(container.firstChild.className).toMatch(/blue/);
  });

  it("error type has rose styling", () => {
    const { container } = render(<Alert type="error">Error</Alert>);
    expect(container.firstChild.className).toMatch(/rose/);
  });
});
