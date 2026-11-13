import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const cachedHeadlessShell = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell",
);

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5182",
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: {
    baseURL: "http://localhost:5182",
    headless: true,
    viewport: { width: 1440, height: 900 },
    ...(fs.existsSync(cachedHeadlessShell)
      ? { launchOptions: { executablePath: cachedHeadlessShell } }
      : {}),
  },
});
