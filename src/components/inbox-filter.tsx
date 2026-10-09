"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Funnel, X } from "@phosphor-icons/react";
import { types, statuses, typeLabels, statusLabels } from "@/lib/validation";
export function InboxFilter({
  websites,
}: Readonly<{ websites: readonly { id: number; name: string }[] }>) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ siteId: "", type: "", status: "" });
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 500 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const count =
    Number(!!params.get("siteId")) + Number(!!params.get("type")) + Number(!!params.get("status"));
  function close(restoreFocus: unknown = true) {
    setOpen(false);
    if (restoreFocus !== false) {
      trigger.current?.focus();
    }
  }
  useEffect(() => {
    if (!open) {
      return;
    }
    function place() {
      const box = trigger.current?.getBoundingClientRect();
      if (!box) {
        return;
      }
      if (box.bottom <= 0 || box.top >= innerHeight) {
        close(false);
        return;
      }
      const width = Math.min(340, innerWidth - 24);
      const height = Math.min(580, innerHeight - 24);
      const below = innerHeight - box.bottom - 12;
      const top = Math.max(
        12,
        Math.min(
          innerHeight - 172,
          below >= Math.min(height, 240) ? box.bottom + 8 : box.top - height - 8,
        ),
      );
      setPosition({
        left: Math.max(12, Math.min(innerWidth - width - 12, box.right - width)),
        top,
        maxHeight: Math.max(160, innerHeight - top - 12),
      });
    }
    place();
    panel.current?.focus();
    const outside = (event: PointerEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      ) {
        close(false);
      }
    };
    const focus = (event: FocusEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      ) {
        close(false);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (
        event.key === "Tab" &&
        event.shiftKey &&
        document.activeElement === panel.current
      ) {
        event.preventDefault();
        close();
      } else if (event.key === "Tab" && document.activeElement === trigger.current) {
        event.preventDefault();
        panel.current?.querySelector<HTMLElement>("button,input")?.focus();
      }
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focus);
    document.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  function apply(reset = false) {
    const next = new URLSearchParams(params);
    for (const key of ["siteId", "type", "status"] as const) {
      const value = reset ? "" : draft[key];
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    next.delete("page");
    router.replace(pathname + "?" + next.toString(), { scroll: false });
    close();
  }
  const groups = [
    {
      key: "siteId" as const,
      label: "Website",
      options: [
        { value: "", label: "Semua website" },
        ...websites.map((site) => ({ value: String(site.id), label: site.name })),
      ],
    },
    {
      key: "type" as const,
      label: "Jenis",
      options: [
        { value: "", label: "Semua jenis" },
        ...types.map((type) => ({ value: type, label: typeLabels[type] })),
      ],
    },
    {
      key: "status" as const,
      label: "Status",
      options: [
        { value: "", label: "Semua status" },
        ...statuses.map((status) => ({ value: status, label: statusLabels[status] })),
      ],
    },
  ];
  return (
    <>
      <button
        ref={trigger}
        className="btn"
        aria-expanded={open}
        aria-controls="inbox-filter-popover"
        aria-haspopup="dialog"
        onClick={() => {
          if (open) {
            close();
          } else {
            setDraft({
              siteId: params.get("siteId") ?? "",
              type: params.get("type") ?? "",
              status: params.get("status") ?? "",
            });
            setOpen(true);
          }
        }}
      >
        <Funnel size={18} aria-hidden />
        Filter{count ? ` (${count})` : ""}
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id="inbox-filter-popover"
            className="inbox-filter-popover"
            role="dialog"
            aria-label="Filter feedback"
            tabIndex={-1}
            style={{ top: position.top, left: position.left, maxHeight: position.maxHeight }}
          >
            <header>
              <h2>Filter feedback</h2>
              <button
                type="button"
                className="btn quiet icon-btn"
                aria-label="Tutup filter"
                onClick={close}
              >
                <X size={18} aria-hidden />
              </button>
            </header>
            <div className="filter-list-scroll">
              {groups.map((group) => (
                <fieldset key={group.key}>
                  <legend>{group.label}</legend>
                  <div className="filter-list-group">
                    {group.options.map((option) => (
                      <label
                        key={option.value}
                        className={draft[group.key] === option.value ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name={`filter-${group.key}`}
                          value={option.value}
                          checked={draft[group.key] === option.value}
                          onChange={() =>
                            setDraft((current) => ({ ...current, [group.key]: option.value }))
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <footer>
              <button className="btn" onClick={() => apply(true)}>
                Reset filter
              </button>
              <button className="btn primary" onClick={() => apply()}>
                Terapkan
              </button>
            </footer>
          </div>,
          document.body,
        )}
    </>
  );
}
