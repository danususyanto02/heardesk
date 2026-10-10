// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

const listeners: { type: string; listener: EventListenerOrEventListenerObject }[] = [];
const originalAdd = window.addEventListener.bind(window);
afterEach(() => {
  for (const { type, listener } of listeners.splice(0)) {
    window.removeEventListener(type, listener);
  }
  window.addEventListener = originalAdd;
  delete (window as Window & { __ureportMounted?: boolean }).__ureportMounted;
  document.body.innerHTML = "";
});

async function mount(key = "test-key") {
  const script = document.createElement("script");
  script.src = "https://feedback.example.test/widget.js";
  script.dataset.site = key;
  document.body.append(script);
  Object.defineProperty(document, "currentScript", { configurable: true, value: script });
  window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject) => {
    listeners.push({ type, listener });
    originalAdd(type, listener);
  }) as typeof window.addEventListener;
  vi.resetModules();
  const widgetModule = "../../public/widget.js";
  await import(widgetModule);
  return document.querySelector("iframe")!;
}

function message(
  frame: HTMLIFrameElement,
  data: unknown,
  origin = "https://feedback.example.test",
  source: MessageEventSource | null = frame.contentWindow,
) {
  window.dispatchEvent(new MessageEvent("message", { data, origin, source }));
}

it("does not mount for missing or oversized widget keys", async () => {
  await mount("");
  expect(document.querySelector("iframe")).toBeNull();
  await mount("x".repeat(129));
  expect(document.querySelector("iframe")).toBeNull();
});

it("avoids host ID collisions and exposes a single widget only after trusted readiness", async () => {
  document.body.innerHTML = '<div id="ureport-feedback-1"></div>';
  const frame = await mount();
  expect(frame.id).toBe("ureport-feedback-2");
  const button = document.querySelector("button")!;
  expect(button.hidden).toBe(true);
  message(frame, { type: "ureport:ready", label: "Untrusted" }, "https://evil.example.test");
  message(frame, { type: "ureport:ready" }, undefined, window);
  message(frame, null);
  expect(button.hidden).toBe(true);
  message(frame, { type: "ureport:ready", label: "Report issue", position: "left" });
  expect(button.hidden).toBe(false);
  expect(button.textContent).toBe("Report issue");
  expect(button.style.left).toBe("20px");
  expect(button.getAttribute("aria-controls")).toBe(frame.id);
  await mount();
  expect(document.querySelectorAll("iframe")).toHaveLength(1);
});

it("opens, closes on Escape and trusted requests, and restores host focus", async () => {
  const frame = await mount();
  const button = document.querySelector("button")!;
  message(frame, { type: "ureport:ready", label: "x".repeat(41) });
  expect(button.textContent).toBe("Beri masukan");
  button.focus();
  button.click();
  expect(button.getAttribute("aria-expanded")).toBe("true");
  expect(frame.parentElement!.hidden).toBe(false);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(frame.parentElement!.hidden).toBe(true);
  expect(document.activeElement).toBe(button);
  button.click();
  message(frame, { type: "ureport:close" });
  expect(button.getAttribute("aria-expanded")).toBe("false");
});
