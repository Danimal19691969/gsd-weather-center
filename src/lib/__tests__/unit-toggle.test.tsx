/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnitsProvider, useUnits } from "@/lib/context/UnitsContext";
import { UnitToggle } from "@/components/UnitToggle";
import React from "react";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

beforeEach(() => {
  cleanup();
  localStorageMock.clear();
  vi.clearAllMocks();
});

// Helper to render with context
function renderWithUnits(ui: React.ReactElement) {
  return render(<UnitsProvider>{ui}</UnitsProvider>);
}

// Helper component to read current unit value
function UnitDisplay() {
  const { units } = useUnits();
  return <span data-testid="current-unit">{units}</span>;
}

describe("UnitsContext", () => {
  it("defaults to metric", () => {
    renderWithUnits(<UnitDisplay />);
    expect(screen.getByTestId("current-unit").textContent).toBe("metric");
  });

  it("loads imperial from localStorage", async () => {
    localStorageMock.getItem.mockReturnValueOnce("imperial");
    renderWithUnits(<UnitDisplay />);
    // useEffect runs after render
    await act(async () => {});
    expect(screen.getByTestId("current-unit").textContent).toBe("imperial");
  });

  it("throws when used outside provider", () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<UnitDisplay />)).toThrow(
      "useUnits must be used within UnitsProvider"
    );
    spy.mockRestore();
  });
});

describe("UnitToggle", () => {
  it("renders in the document", () => {
    renderWithUnits(<UnitToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeDefined();
  });

  it("shows °C when in metric mode", () => {
    renderWithUnits(<UnitToggle />);
    const button = screen.getByRole("button");
    expect(button.textContent).toContain("°C");
  });

  it("toggles to imperial on click", async () => {
    const user = userEvent.setup();
    renderWithUnits(
      <>
        <UnitToggle />
        <UnitDisplay />
      </>
    );

    const button = screen.getByRole("button");
    await user.click(button);

    expect(screen.getByTestId("current-unit").textContent).toBe("imperial");
    expect(button.textContent).toContain("°F");
  });

  it("toggles back to metric on second click", async () => {
    const user = userEvent.setup();
    renderWithUnits(
      <>
        <UnitToggle />
        <UnitDisplay />
      </>
    );

    const button = screen.getByRole("button");
    await user.click(button);
    await user.click(button);

    expect(screen.getByTestId("current-unit").textContent).toBe("metric");
    expect(button.textContent).toContain("°C");
  });

  it("persists selection to localStorage", async () => {
    const user = userEvent.setup();
    renderWithUnits(<UnitToggle />);

    await user.click(screen.getByRole("button"));

    expect(localStorageMock.setItem).toHaveBeenCalledWith("gsd-units", "imperial");
  });

  it("is keyboard accessible", async () => {
    const user = userEvent.setup();
    renderWithUnits(
      <>
        <UnitToggle />
        <UnitDisplay />
      </>
    );

    const button = screen.getByRole("button");
    button.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("current-unit").textContent).toBe("imperial");
  });

  it("has an accessible label", () => {
    renderWithUnits(<UnitToggle />);
    const button = screen.getByRole("button");
    // Button should have aria-label for accessibility
    expect(
      button.getAttribute("aria-label") || button.textContent
    ).toBeTruthy();
  });
});
