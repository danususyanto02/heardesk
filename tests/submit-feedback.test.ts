import { expect, it } from "vitest";
import {
  submitVisitorFeedback,
  type VisitorFeedbackPorts,
} from "@/modules/feedback/application/submit-visitor-feedback";

const input = {
  siteKey: "key",
  submissionId: "retry",
  fingerprint: "hash",
  type: "ISSUE" as const,
  message: "broken button",
};

const reservation = {
  id: "held",
  companyId: "x",
  siteId: 1,
  submissionId: "retry",
  period: "2026-10",
  expiresAt: "2026-10-06T00:00:00Z",
};

it("rejects a missing widget before reserving capacity", async () => {
  await expect(
    submitVisitorFeedback(input, null, {
      resolve: async () => null,
      reserve: async () => {
        throw new Error("Should not reserve");
      },
      stage: async () => {
        throw new Error("Should not stage");
      },
      persist: async () => {
        throw new Error("Should not persist");
      },
      discard: async () => {
        throw new Error("Should not discard");
      },
      release: async () => {
        throw new Error("Should not release");
      },
    }),
  ).rejects.toMatchObject({ code: "WIDGET_NOT_FOUND" });
});

it.each([false, true])(
  "releases reservations while retaining only committed images (duplicate=%s)",
  async (duplicate) => {
    const events: string[] = [];
    const staged = {
      id: "image",
      key: "image.webp",
      size: 10,
      mime: "image/webp",
      filename: "image.webp",
    };
    const ports: VisitorFeedbackPorts = {
      resolve: async () => ({ companyId: "x", siteId: 1 }),
      reserve: async () => reservation,
      stage: async () => staged,
      persist: async (_company, _reservation, value, image) => {
        expect(value).toBe(input);
        expect(image).toBe(staged);
        events.push("persist");
        return { duplicate };
      },
      discard: async () => {
        events.push("discard");
      },
      release: async () => {
        events.push("release");
      },
    };
    expect(await submitVisitorFeedback(input, new Uint8Array([1]), ports)).toEqual({ duplicate });
    expect(events).toEqual(duplicate ? ["persist", "discard", "release"] : ["persist", "release"]);
  },
);

it("discards a staged image and releases admission when persistence fails", async () => {
  const events: string[] = [];
  await expect(
    submitVisitorFeedback(input, new Uint8Array([1]), {
      resolve: async () => ({ companyId: "x", siteId: 1 }),
      reserve: async () => reservation,
      stage: async () => ({
        id: "image",
        key: "image.webp",
        size: 10,
        mime: "image/webp",
        filename: "image.webp",
      }),
      persist: async () => {
        throw new Error("Persistence failed");
      },
      discard: async () => {
        events.push("discard");
      },
      release: async () => {
        events.push("release");
      },
    }),
  ).rejects.toThrow("Persistence failed");
  expect(events).toEqual(["discard", "release"]);
});

it("accepts feedback without staging an attachment", async () => {
  let persisted = false;
  const result = await submitVisitorFeedback(input, null, {
    resolve: async () => ({ companyId: "x", siteId: 1 }),
    reserve: async () => reservation,
    stage: async () => {
      throw new Error("No image supplied");
    },
    persist: async (_company, _reservation, _input, image) => {
      expect(image).toBeNull();
      persisted = true;
      return { duplicate: false };
    },
    discard: async () => {
      throw new Error("No image staged");
    },
    release: async () => {},
  });
  expect(result).toEqual({ duplicate: false });
  expect(persisted).toBe(true);
});
it("committed duplicate returns before image staging and accounting", async () => {
  const ports: VisitorFeedbackPorts = {
    resolve: async () => ({ companyId: "x", siteId: 1 }),
    reserve: async () => ({ duplicate: true }),
    stage: async () => {
      throw new Error("Must not stage a duplicate");
    },
    persist: async () => {
      throw new Error("Must not persist a duplicate");
    },
    discard: async () => {
      throw new Error("Must not discard a duplicate");
    },
    release: async () => {
      throw new Error("Must not charge a duplicate");
    },
  };
  expect(await submitVisitorFeedback(input, new Uint8Array([1]), ports)).toEqual({
    duplicate: true,
  });
});
it("image failure releases report reservation without pretending report persisted", async () => {
  const released: string[] = [];
  const ports: VisitorFeedbackPorts = {
    resolve: async () => ({ companyId: "x", siteId: 1 }),
    reserve: async () => ({
      id: "held",
      companyId: "x",
      siteId: 1,
      submissionId: "retry",
      period: "2026-10",
      expiresAt: "2026-10-06T00:00:00Z",
    }),
    stage: async () => {
      throw new Error("Image invalid");
    },
    persist: async () => {
      throw new Error("Must not persist invalid image");
    },
    discard: async () => {},
    release: async (_company, reservation) => {
      released.push(reservation.id);
    },
  };
  await expect(submitVisitorFeedback(input, new Uint8Array([1]), ports)).rejects.toThrow(
    "Image invalid",
  );
  expect(released).toEqual(["held"]);
});
