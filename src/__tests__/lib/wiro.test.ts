import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { wiroGeneratorPlugin } from "@/lib/plugins/media-generators/wiro";

describe("wiroGeneratorPlugin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      WIRO_API_KEY: "test_key",
      WIRO_IMAGE_MODELS: "google/nano-banana",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should reject inputImageUrl targeting restricted private IP address (SSRF prevention)", async () => {
    const request = {
      prompt: "A test prompt",
      model: "google/nano-banana",
      type: "image" as const,
      inputImageUrl: "http://127.0.0.1/secret.png",
    };

    await expect(wiroGeneratorPlugin.startGeneration(request)).rejects.toThrow(
      /Access to restricted IP address/i
    );
  });

  it("should reject inputImageUrl with invalid protocol (SSRF prevention)", async () => {
    const request = {
      prompt: "A test prompt",
      model: "google/nano-banana",
      type: "image" as const,
      inputImageUrl: "file:///etc/passwd",
    };

    await expect(wiroGeneratorPlugin.startGeneration(request)).rejects.toThrow(
      /Invalid protocol/i
    );
  });
});
