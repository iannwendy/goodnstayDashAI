import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VIEWPORT_SLOTS,
  getEffectiveAllowedOrigins,
  isSameOriginEmbed,
  resolveViewportSandboxPolicy,
  validateViewportEmbedUrl,
} from "../../src/lib/viewportRegistry";

describe("TC-VP-UNIT: BI Viewport Registry, URL Security Guard & Adaptive Sandbox", () => {
  it("TC-VP-UNIT-01: registers coarse-grained overview_analytics and deep_analytics slots", () => {
    assert.equal(VIEWPORT_SLOTS.overview_analytics.slotId, "overview_analytics");
    assert.equal(VIEWPORT_SLOTS.overview_analytics.defaultMinHeightPx, 780);
    assert.equal(VIEWPORT_SLOTS.deep_analytics.slotId, "deep_analytics");
    assert.equal(VIEWPORT_SLOTS.deep_analytics.defaultMinHeightPx, 860);
  });

  it("TC-VP-UNIT-02: blocks dangerous schemes (javascript:, data:, blob:, file:) and untrusted origins", () => {
    const allowed = getEffectiveAllowedOrigins("http://localhost:5182", []);

    for (const badUrl of [
      "javascript:alert(1)",
      "JAVASCRIPT:void(0)",
      "data:text/html,<script>alert(1)</script>",
      "blob:https://example.com/123",
      "file:///etc/passwd",
      "https://evil.untrusted.example/embed",
      "",
      "   ",
    ]) {
      const check = validateViewportEmbedUrl(badUrl, {
        currentOrigin: "http://localhost:5182",
        allowedOrigins: allowed,
        allowExternalHttpsDemo: false,
      });
      assert.equal(check.ok, false, `Expected '${badUrl}' to be rejected`);
    }

    // Even with allowExternalHttpsDemo=true, dangerous schemes and plain external http:// are rejected
    assert.equal(
      validateViewportEmbedUrl("javascript:alert(1)", {
        currentOrigin: "http://localhost:5182",
        allowedOrigins: allowed,
        allowExternalHttpsDemo: true,
      }).ok,
      false,
    );
    assert.equal(
      validateViewportEmbedUrl("http://evil.plain-http.example/bi", {
        currentOrigin: "http://localhost:5182",
        allowedOrigins: allowed,
        allowExternalHttpsDemo: true,
      }).ok,
      false,
    );
  });

  it("TC-VP-UNIT-03: allows localhost BFF cross-origin, relative tunnel paths, and explicit HTTPS demo overrides", () => {
    const allowed = getEffectiveAllowedOrigins("http://localhost:5182", [
      "https://bi.goodnstay.com",
    ]);

    const localCross = validateViewportEmbedUrl(
      "http://127.0.0.1:4000/bi-embed/render?token=abc.def.ghi",
      {
        currentOrigin: "http://localhost:5182",
        allowedOrigins: allowed,
        allowExternalHttpsDemo: false,
      },
    );
    assert.equal(localCross.ok, true);
    assert.equal(localCross.resolvedOrigin, "http://127.0.0.1:4000");

    const tunnelRelative = validateViewportEmbedUrl("/bi-embed/render?token=abc.def.ghi", {
      currentOrigin: "https://demo.tail6930d7.ts.net",
      allowedOrigins: getEffectiveAllowedOrigins("https://demo.tail6930d7.ts.net", []),
      allowExternalHttpsDemo: false,
    });
    assert.equal(tunnelRelative.ok, true);
    assert.equal(tunnelRelative.resolvedOrigin, "https://demo.tail6930d7.ts.net");

    const externalDemo = validateViewportEmbedUrl(
      "https://lookerstudio.google.com/embed/reporting/demo-123",
      {
        currentOrigin: "http://localhost:5182",
        allowedOrigins: allowed,
        allowExternalHttpsDemo: true,
      },
    );
    assert.equal(externalDemo.ok, true);
    assert.equal(externalDemo.usedExternalDemoAllowance, true);
  });

  it("TC-VP-UNIT-04: drops allow-same-origin automatically on same-origin tunnel embeds to prevent sandbox escape", () => {
    // Localhost cross-origin (:5182 -> :4000): safe to include allow-same-origin
    assert.equal(
      isSameOriginEmbed("http://127.0.0.1:4000/bi-embed/render?token=x", "http://localhost:5182"),
      false,
    );
    const crossPolicy = resolveViewportSandboxPolicy(
      "http://127.0.0.1:4000/bi-embed/render?token=x",
      "http://localhost:5182",
    );
    assert.equal(crossPolicy.isSameOrigin, false);
    assert.ok(crossPolicy.sandboxAttr.includes("allow-same-origin"));
    assert.equal(crossPolicy.expectedPostMessageOrigin, "http://127.0.0.1:4000");

    // Tailscale HTTPS tunnel same-origin (/bi-embed/...): MUST drop allow-same-origin
    assert.equal(
      isSameOriginEmbed("/bi-embed/render?token=x", "https://demo.tail6930d7.ts.net"),
      true,
    );
    const samePolicy = resolveViewportSandboxPolicy(
      "/bi-embed/render?token=x",
      "https://demo.tail6930d7.ts.net",
    );
    assert.equal(samePolicy.isSameOrigin, true);
    assert.equal(samePolicy.sandboxAttr.includes("allow-same-origin"), false);
    assert.equal(samePolicy.expectedPostMessageOrigin, "null");
  });
});
