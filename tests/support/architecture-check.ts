import { createRequire } from "node:module";
import path from "node:path";

type AstNode = { type: string; value?: unknown; source?: AstNode; argument?: AstNode; callee?: AstNode & { name?: string }; arguments?: AstNode[]; [key: string]: unknown };
const require = createRequire(import.meta.url);
const { parseSync } = require("next/dist/compiled/babel/core") as {
  parseSync(source: string, options: object): AstNode;
};

export function architectureViolations(file: string, source: string, root: string): string[] {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const layer = relative.split("/")[2];
  const violations: string[] = [];
  const ast = parseSync(source, { babelrc: false, configFile: false, filename: file, parserOpts: { plugins: ["typescript", "jsx"], createImportExpressions: true } });
  function check(value: unknown) {
    if (typeof value !== "string") { violations.push(`${relative}: computed import`); return; }
    const target = value.startsWith("@/") ? path.resolve(root, value.slice(2)) : value.startsWith(".") ? path.resolve(path.dirname(file), value) : null;
    const targetPath = target && path.relative(root, target).replaceAll("\\", "/");
    const allowed = targetPath && !targetPath.startsWith("../") && (layer === "domain"
      ? /^modules\/[^/]+\/domain\//.test(targetPath)
      : /^modules\/[^/]+\/(domain|application)\//.test(targetPath));
    if (!allowed) violations.push(`${relative}: forbidden dependency ${value}`);
  }
  function visit(node: AstNode) {
    if (["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(node.type) && node.source) check(node.source.value);
    if (node.type === "TSImportType") check(node.argument?.value);
    if (node.type === "ImportExpression") check(node.source?.value);
    if (node.type === "CallExpression" && (node.callee?.type === "Import" || (node.callee?.type === "Identifier" && node.callee.name === "require"))) check(node.arguments?.[0]?.value);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) for (const child of value) { if (child && typeof child === "object" && typeof child.type === "string") visit(child); }
      else if (value && typeof value === "object" && "type" in value && typeof value.type === "string") visit(value as AstNode);
    }
  }
  visit(ast);
  return violations;
}
