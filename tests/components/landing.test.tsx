// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Landing } from "@/components/landing";
vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      media: query,
      matches: query === "(prefers-reduced-motion: reduce)",
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
});
vi.mock("next/link", () => ({
  default: ({
    children,
    prefetch: _prefetch,
    ...props
  }: React.ComponentProps<"a"> & { prefetch?: boolean }) => <a {...props}>{children}</a>,
}));
afterEach(cleanup);
it.each([
  [{ installed: false }, "Set up HearDesk", "/setup"],
  [{ installed: true }, "Sign in", "/login"],
  [{ installed: true, signupEnabled: true }, "Create account", "/signup"],
  [{ installed: true, authenticated: true }, "Open dashboard", "/dashboard"],
])("uses session-aware landing destinations", (props, label, destination) => {
  render(<Landing {...props} />);
  expect(screen.getAllByRole("link", { name: label })[0].getAttribute("href")).toBe(destination);
});

it("keeps page context and internal notes paired with the selected demo report", () => {
  render(<Landing installed />);
  const preview = screen.getByRole("region", { name: "Demo report detail" });
  expect(within(preview).getByText("store.example.test/checkout")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /Add a dark mode option/ }));

  expect(within(preview).getByRole("heading", { name: "Add a dark mode option" })).toBeTruthy();
  expect(within(preview).getByText("app.example.test/settings")).toBeTruthy();
  expect(within(preview).getByText("Include this request in the next design review.")).toBeTruthy();
  expect(within(preview).queryByText("store.example.test/checkout")).toBeNull();
});
