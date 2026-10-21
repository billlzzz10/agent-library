import { describe, expect, it } from "vitest";

describe("Book Demo Route Security", () => {
  it("ensures user-supplied system prompt overrides are prohibited and default system prompts are defined", () => {
    // Read the book demo route file to verify systemPrompt parameter is removed
    const fs = require("fs");
    const path = require("path");
    const routeCode = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/book/demo/route.ts"),
      "utf-8"
    );

    // Verify systemPrompt is not accepted in RequestBody interface
    expect(routeCode.includes("systemPrompt?: string")).toBe(false);
    // Verify SYSTEM_PROMPTS[type] is directly used without override fallback
    expect(routeCode.includes('{ role: "system", content: SYSTEM_PROMPTS[type] }')).toBe(true);
  });
});
