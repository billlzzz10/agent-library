import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { wiroGeneratorPlugin } from "@/lib/plugins/media-generators/wiro";

describe("wiroGeneratorPlugin SSRF Protection", () => {
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
    vi.restoreAllMocks();
  });

  it("blocks startGeneration when inputImageUrl targets a private IP address", async () => {
    await expect(
      wiroGeneratorPlugin.startGeneration({
        prompt: "test prompt",
        model: "test-model",
        type: "image",
        inputImageUrl: "http://127.0.0.1/secret.png",
      })
    ).rejects.toThrow(/Access to restricted IP address/);
  });

  it("blocks startGeneration when inputImageUrl targets localhost", async () => {
    await expect(
      wiroGeneratorPlugin.startGeneration({
        prompt: "test prompt",
        model: "test-model",
        type: "image",
        inputImageUrl: "http://localhost:3000/admin",
      })
    ).rejects.toThrow();
  });
});
