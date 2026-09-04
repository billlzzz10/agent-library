import { describe, expect, it } from "vitest";
import {
  AI_MODELS,
  getModelInfo,
  getModelsByProvider,
  isValidModelSlug,
  validateBestWithMCP,
  validateBestWithModels,
} from "@/lib/works-best-with";

describe("works-best-with lib", () => {
  it("should retrieve model info by slug", () => {
    expect(getModelInfo("gpt-4o")).toEqual({ name: "GPT-4o", provider: "OpenAI" });
    expect(getModelInfo("non-existent-slug")).toBeNull();
  });

  it("should validate model slugs", () => {
    expect(isValidModelSlug("gpt-4o")).toBe(true);
    expect(isValidModelSlug("invalid-model")).toBe(false);
  });

  it("should group models by provider and cache the result", () => {
    const res1 = getModelsByProvider();
    const res2 = getModelsByProvider();

    expect(res1).toBe(res2); // Reference equality checks memoization
    expect(res1["OpenAI"]).toContainEqual({ slug: "gpt-4o", name: "GPT-4o" });
    expect(res1["Anthropic"]).toContainEqual({ slug: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" });
  });

  it("should validate bestWithModels", () => {
    expect(validateBestWithModels(["gpt-4o", "claude-3-5-sonnet"]).valid).toBe(true);
    expect(validateBestWithModels(["gpt-4o", "claude-3-5-sonnet", "gemini-3", "o3"]).valid).toBe(false);
    expect(validateBestWithModels(["invalid-model"]).valid).toBe(false);
  });

  it("should validate bestWithMCP", () => {
    expect(validateBestWithMCP(null).valid).toBe(true);
    expect(validateBestWithMCP({ command: "npx" }).valid).toBe(true);
    expect(validateBestWithMCP({ command: "npx", tools: ["search"] }).valid).toBe(true);
    expect(validateBestWithMCP({ command: 123 }).valid).toBe(false);
    expect(validateBestWithMCP("invalid").valid).toBe(false);
  });
});
