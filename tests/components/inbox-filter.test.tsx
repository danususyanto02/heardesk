// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InboxFilter } from "@/components/inbox-filter";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => navigation.params,
  usePathname: () => "/inbox",
}));
beforeEach(() => {
  navigation.params = new URLSearchParams("company=x&q=checkout&page=3&pageSize=50&type=ISSUE");
  navigation.replace.mockClear();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 200,
    bottom: 244,
    left: 290,
    right: 380,
    width: 90,
    height: 44,
    x: 290,
    y: 200,
    toJSON: () => ({}),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function open() {
  render(<InboxFilter websites={[{ id: 7, name: "Shop" }]} />);
  fireEvent.click(screen.getByRole("button", { name: "Filter (1)" }));
}

it("applies draft filters while preserving search, Company and page size", () => {
  open();
  fireEvent.click(screen.getByRole("radio", { name: "Shop" }));
  fireEvent.click(screen.getByRole("button", { name: "Terapkan" }));
  expect(navigation.replace).toHaveBeenCalledWith(
    "/inbox?company=x&q=checkout&pageSize=50&type=ISSUE&siteId=7",
    { scroll: false },
  );
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("resets filter keys without clearing search or Company", () => {
  open();
  fireEvent.click(screen.getByRole("button", { name: "Reset filter" }));
  expect(navigation.replace).toHaveBeenCalledWith("/inbox?company=x&q=checkout&pageSize=50", {
    scroll: false,
  });
});

it("dismisses with Escape and restores trigger focus without committing drafts", () => {
  open();
  fireEvent.click(screen.getByRole("radio", { name: "Shop" }));
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Filter (1)" }));
  expect(navigation.replace).not.toHaveBeenCalled();
});

it("dismisses when focus or pointer leaves the panel and trigger", () => {
  open();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Filter (1)" }));
  fireEvent.focusIn(document.body);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("positions the panel inside a narrow viewport", () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 200,
    bottom: 244,
    left: 290,
    right: 380,
    width: 90,
    height: 44,
    x: 290,
    y: 200,
    toJSON: () => ({}),
  });
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  try {
    open();
    const panel = screen.getByRole("dialog");
    expect(panel.style.left).toBe("38px");
    expect(panel.style.top).toBe("252px");
  } finally {
    vi.unstubAllGlobals();
  }
});
