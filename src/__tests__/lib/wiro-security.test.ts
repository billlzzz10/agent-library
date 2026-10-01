import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { wiroGeneratorPlugin } from "@/lib/plugins/media-generators/wiro";

describe("Wiro Media Generator Security", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WIRO_API_KEY: "test-key",
      WIRO_IMAGE_MODELS: "test-model",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects inputImageUrl targeting private IP addresses (SSRF prevention)", async () => {
    const request = {
      prompt: "Test prompt",
      model: "test-model",
      type: "image" as const,
      inputImageUrl: "http://127.0.0.1/secret.png",
    };

    await expect(wiroGeneratorPlugin.startGeneration(request)).rejects.toThrow(
      /restricted IP address/i
    );
  });

  it("rejects inputImageUrl with non-HTTP/HTTPS protocol", async () => {
    const request = {
      prompt: "Test prompt",
      model: "test-model",
      type: "image" as const,
      inputImageUrl: "file:///etc/passwd",
    };

    await expect(wiroGeneratorPlugin.startGeneration(request)).rejects.toThrow(
      /Invalid protocol/i
    );
  });
});
