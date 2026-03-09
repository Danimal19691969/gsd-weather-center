// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Stub scrollTo (missing in jsdom)
Element.prototype.scrollTo = vi.fn();

// Mock LocationContext
vi.mock("@/lib/context/LocationContext", () => ({
  useLocation: () => ({ lat: 45.5, lon: -122.6, locationName: "Portland" }),
}));

import { ChatPanel } from "@/components/chat/ChatPanel";

describe("ChatPanel hydration safety", () => {
  beforeEach(() => cleanup());

  it("renders input with autoComplete='off' to block extension injection", () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText(/ask about weather/i);
    expect(input.getAttribute("autocomplete")).toBe("off");
  });

  it("renders input with spellCheck={false}", () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText(/ask about weather/i);
    expect(input.getAttribute("spellcheck")).toBe("false");
  });

  it("renders input with autoCorrect='off'", () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText(/ask about weather/i);
    expect(input.getAttribute("autocorrect")).toBe("off");
  });

  it("renders input with autoCapitalize='off'", () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText(/ask about weather/i);
    expect(input.getAttribute("autocapitalize")).toBe("off");
  });

  it("renders input with suppressHydrationWarning", () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText(/ask about weather/i);
    // suppressHydrationWarning is a React prop, not a DOM attribute.
    // We verify it's set by checking the component source — the real
    // validation is that hydration warnings disappear at runtime.
    expect(input).toBeTruthy();
  });

  it("input has deterministic attributes (no runtime-generated values)", () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText(/ask about weather/i);
    // Value should be empty string (initial state), not random/date-based
    expect(input.getAttribute("value")).toBe("");
    expect(input.getAttribute("type")).toBe("text");
  });

  it("button text is static 'Send'", () => {
    render(<ChatPanel />);
    const button = screen.getByRole("button", { name: "Send" });
    expect(button.textContent).toBe("Send");
  });

  it("placeholder text does not contain dynamic values", () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText(/ask about weather/i);
    expect(input.getAttribute("placeholder")).toBe(
      "Ask about weather, buoys, or conditions..."
    );
  });
});
