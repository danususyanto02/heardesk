// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Landing } from "@/components/landing";
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
