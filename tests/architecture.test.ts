import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { architectureViolations } from "./support/architecture-check";

describe("Clean Architecture imports", () => {
  const root = path.resolve("src");
  const file = path.join(root, "modules/feedback/application/submit.ts");
  for (const source of [
    'import { db } from "@/server/db";',
    'export { x } from "../infrastructure/repository";',
    'type Row = import("@/generated/prisma/client").Feedback;',
    'const auth = require("better-auth");',
    'const image = await import("sharp");',
    'import type { ZodType } from "zod";',
    'import { getServices } from "@/server/composition/company-services";',
    'import { x } from "../../identity/infrastructure/auth";',
  ]) {
    it(`rejects forbidden edge: ${source}`, () => expect(architectureViolations(file, source, root)).not.toHaveLength(0));
  }
  it("allows pure cross-module domain ports and ignores strings/comments", () => {
    const source = 'import type { Actor } from "../../identity/domain/session"; const example = "require(\\\"sharp\\\")"; // import x from "next"';
    expect(architectureViolations(file, source, root)).toEqual([]);
  });
  it("rejects unresolved external aliases and computed imports", () => {
    expect(architectureViolations(file, 'import x from "custom/db";', root)).not.toHaveLength(0);
    expect(architectureViolations(file, 'await import(moduleName);', root)).not.toHaveLength(0);
  });
  it("domain cannot depend on application even by a same-module relative import", () => {
    expect(architectureViolations(path.join(root, "modules/companies/domain/access.ts"), 'import { authorize } from "../application/authorize-company";', root)).not.toHaveLength(0);
  });
  it("enforces boundaries on every actual domain/application file", () => {
    const violations: string[] = [];
    function visit(directory: string) {
      for (const item of readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, item.name);
        if (item.isDirectory()) visit(full);
        else if (/\.[cm]?tsx?$/.test(item.name) && /[\\/](domain|application)[\\/]/.test(full)) violations.push(...architectureViolations(full, readFileSync(full, "utf8"), root));
      }
    }
    visit(path.join(root, "modules"));
    expect(violations).toEqual([]);
  });
});
