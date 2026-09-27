import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { wiroGeneratorPlugin } from "@/lib/plugins/media-generators/wiro";

// Mock dns/promises lookup
vi.mock("dns/promises", () => ({
  lookup: vi.fn().mockImplementation(async (hostname: string) => {
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return { address: "127.0.0.1", family: 4 };
    }
    if (hostname === "internal.service.local") {
      return { address: "10.0.0.5", family: 4 };
    }
    return { address: "93.184.216.34", family: 4 };
  }),
  default: {
    lookup: vi.fn().mockImplementation(async (hostname: string) => {
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return { address: "127.0.0.1", family: 4 };
      }
      if (hostname === "internal.service.local") {
        return { address: "10.0.0.5", family: 4 };
      }
      return { address: "93.184.216.34", family: 4 };
    }),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("wiroGeneratorPlugin.startGeneration SSRF Protection", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      WIRO_API_KEY: "test_api_key",
      WIRO_IMAGE_MODELS: "google/nano-banana",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should reject inputImageUrl targeting localhost IP", async () => {
    await expect(
      wiroGeneratorPlugin.startGeneration({
        prompt: "A test prompt",
        model: "google/nano-banana",
        type: "image",
        inputImageUrl: "http://127.0.0.1/secret",
      })
    ).rejects.toThrow(/Access to restricted IP address/);
  });

  it("should reject inputImageUrl targeting private IP ranges (10.0.0.0/8)", async () => {
    await expect(
      wiroGeneratorPlugin.startGeneration({
        prompt: "A test prompt",
        model: "google/nano-banana",
        type: "image",
        inputImageUrl: "http://10.0.0.1/admin",
      })
    ).rejects.toThrow(/Access to restricted IP address/);
  });

  it("should reject inputImageUrl targeting disallowed schemes (ftp)", async () => {
    await expect(
      wiroGeneratorPlugin.startGeneration({
        prompt: "A test prompt",
        model: "google/nano-banana",
        type: "image",
        inputImageUrl: "ftp://example.com/image.png",
      })
    ).rejects.toThrow(/Only http and https are allowed/);
  });

  it("should allow valid public inputImageUrl and call fetch", async () => {
    // Mock response for image fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(["test image content"], { type: "image/jpeg" }),
    });

    // Mock response for Wiro API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: true,
        taskid: "task-123",
        socketaccesstoken: "token-abc",
      }),
    });

    const result = await wiroGeneratorPlugin.startGeneration({
      prompt: "A test prompt",
      model: "google/nano-banana",
      type: "image",
      inputImageUrl: "https://example.com/image.jpg",
    });

    expect(result).toEqual({
      taskId: "task-123",
      socketAccessToken: "token-abc",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/image.jpg"
    );
  });
});
