import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const srcDir = path.join(projectRoot, "src");

const loaderSource = `
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const SRC_DIR = ${JSON.stringify(srcDir)};

function resolveCandidate(basePath) {
  const candidates = [
    basePath,
    basePath + ".ts",
    basePath + ".tsx",
    basePath + ".js",
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return pathToFileURL(c).href;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const sub = specifier.slice(2);
    const hit = resolveCandidate(path.join(SRC_DIR, sub));
    if (hit) {
      return { url: hit, shortCircuit: true };
    }
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file://")
  ) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const hit = resolveCandidate(path.resolve(parentDir, specifier));
    if (hit) {
      return { url: hit, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
`;

register(
  `data:text/javascript;base64,${Buffer.from(loaderSource).toString("base64")}`,
  pathToFileURL(projectRoot + "/"),
);
