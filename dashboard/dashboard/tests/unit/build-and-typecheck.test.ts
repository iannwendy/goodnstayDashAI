import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PROJECT_ROOT } from "../helpers/seed-loader";

describe("TC-BUILD: TypeScript Compilation & Zero Type-Error Gate", () => {
  it("TC-BUILD-01: tsc --noEmit passes with 0 type errors across src/", () => {
    const tscBin = path.join(PROJECT_ROOT, "node_modules", ".bin", "tsc");
    let stdout = "";
    try {
      stdout = execFileSync(tscBin, ["--noEmit", "--pretty", "false"], {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      assert.fail(
        `TypeScript compilation failed:\n${e.stdout || ""}\n${e.stderr || e.message || ""}`,
      );
    }
    assert.equal(stdout.trim(), "");
  });
});
