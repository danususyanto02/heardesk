import { createRequire } from "node:module";
import path from "node:path";

type AstNode = {
  type: string;
  value?: unknown;
  source?: AstNode;
  argument?: AstNode;
  callee?: AstNode & { name?: string };
  arguments?: AstNode[];
  [key: string]: unknown;
};
const require = createRequire(import.meta.url);
const { parseSync } = require("next/dist/compiled/babel/core") as {
  parseSync(source: string, options: object): AstNode;
};

function isAstNode(value: unknown): value is AstNode {
  return (
    typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
  );
}

function visitAst(node: AstNode, inspect: (node: AstNode) => void) {
  inspect(node);
  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (isAstNode(child)) {
        visitAst(child, inspect);
      }
    }
  }
}

function importTarget(value: string, file: string, root: string): string | null {
  if (value.startsWith("@/")) {
    return path.resolve(root, value.slice(2));
  }
  if (value.startsWith(".")) {
    return path.resolve(path.dirname(file), value);
  }
  return null;
}

function isImportCall(node: AstNode): boolean {
  return (
    node.type === "CallExpression" &&
    (node.callee?.type === "Import" ||
      (node.callee?.type === "Identifier" && node.callee.name === "require"))
  );
}

function inspectImports(node: AstNode, check: (value: unknown) => void) {
  if (
    ["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(node.type) &&
    node.source
  ) {
    check(node.source.value);
  }
  if (node.type === "TSImportType") {
    check(node.argument?.value);
  }
  if (node.type === "ImportExpression") {
    check(node.source?.value);
  }
  if (isImportCall(node)) {
    check(node.arguments?.[0]?.value);
  }
}

export function architectureViolations(file: string, source: string, root: string): string[] {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const layer = relative.split("/")[2];
  const violations: string[] = [];
  const ast = parseSync(source, {
    babelrc: false,
    configFile: false,
    filename: file,
    parserOpts: { plugins: ["typescript", "jsx"], createImportExpressions: true },
  });
  function check(value: unknown) {
    if (typeof value !== "string") {
      violations.push(`${relative}: computed import`);
      return;
    }
    const target = importTarget(value, file, root);
    const targetPath = target && path.relative(root, target).replaceAll("\\", "/");
    const allowed =
      targetPath &&
      !targetPath.startsWith("../") &&
      (layer === "domain"
        ? /^modules\/[^/]+\/domain\//.test(targetPath)
        : /^modules\/[^/]+\/(domain|application)\//.test(targetPath));
    if (!allowed) {
      violations.push(`${relative}: forbidden dependency ${value}`);
    }
  }
  visitAst(ast, (node) => inspectImports(node, check));
  return violations;
}
