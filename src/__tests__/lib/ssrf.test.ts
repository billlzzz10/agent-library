import { describe, it, expect, vi, beforeEach } from "vitest";
import { isPrivateUrl } from "@/lib/webhook";
import { wiroGeneratorPlugin } from "@/lib/plugins/media-generators/wiro";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("isPrivateUrl", () => {
  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://example.com")).toBe(false);
    expect(isPrivateUrl("https://google.com/search")).toBe(false);
    expect(isPrivateUrl("https://api.github.com/repos")).toBe(false);
    expect(isPrivateUrl("https://8.8.8.8")).toBe(false);
  });

  it("should block localhost and loopback", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://localhost:3000")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1:8080")).toBe(true);
    expect(isPrivateUrl("http://127.0.5.1")).toBe(true);
  });

  it("should block private IPv4 ranges", () => {
    // 10.0.0.0/8
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);

    // 192.168.0.0/16
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.255.255")).toBe(true);
  });

  it("should block link-local and other reserved IPv4", () => {
    expect(isPrivateUrl("http://169.254.169.254")).toBe(true); // AWS metadata
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true);
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://myserver.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
  });

  it("should block private/loopback IPv6", () => {
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::]")).toBe(true);
  });

  it("should block invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });
});

describe("wiroGeneratorPlugin SSRF protection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.WIRO_API_KEY = "test-key";
    process.env.WIRO_IMAGE_MODELS = "test-model";
  });

  it("should block private URLs in startGeneration", async () => {
    const request = {
      prompt: "test",
      model: "test-model",
      type: "image" as const,
      inputImageUrl: "http://127.0.0.1/secret",
    };

    await expect(wiroGeneratorPlugin.startGeneration(request)).rejects.toThrow(
      "Invalid inputImageUrl: URL targets a private/internal network"
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should allow public URLs in startGeneration", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(["test"], { type: "image/jpeg" })),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ result: true, taskid: "123", socketaccesstoken: "abc" }),
    });

    const request = {
      prompt: "test",
      model: "test-model",
      type: "image" as const,
      inputImageUrl: "https://example.com/image.jpg",
    };

    const result = await wiroGeneratorPlugin.startGeneration(request);

    expect(result.taskId).toBe("123");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // First call should be to fetch the image
    expect(mockFetch).toHaveBeenNthCalledWith(1, "https://example.com/image.jpg");
  });
});
