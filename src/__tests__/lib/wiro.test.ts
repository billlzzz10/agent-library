import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { wiroGeneratorPlugin } from "@/lib/plugins/media-generators/wiro";

describe("wiroGeneratorPlugin - SSRF Prevention", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WIRO_API_KEY: "test-key",
      WIRO_IMAGE_MODELS: "google/nano-banana",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should reject inputImageUrl targeting localhost / 127.0.0.1 with SSRF error", async () => {
    await expect(
      wiroGeneratorPlugin.startGeneration({
        prompt: "A test prompt",
        type: "image",
        model: "google/nano-banana",
        inputImageUrl: "http://127.0.0.1/admin/secret.png",
      })
    ).rejects.toThrow(/forbidden|restricted/i);
  });

  it("should reject inputImageUrl with invalid non-http/https protocol", async () => {
    await expect(
      wiroGeneratorPlugin.startGeneration({
        prompt: "A test prompt",
        type: "image",
        model: "google/nano-banana",
        inputImageUrl: "file:///etc/passwd",
      })
    ).rejects.toThrow(/protocol|http/i);
  });
});
