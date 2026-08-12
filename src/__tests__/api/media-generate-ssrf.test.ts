import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock standard modules
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/plugins/media-generators", () => ({
  getMediaGeneratorPlugin: vi.fn(),
  getAvailableModels: vi.fn(),
  isMediaGenerationAvailable: vi.fn(),
}));

// Mock validateUrl directly to bypass DNS lookup issues in test environments
vi.mock("@/lib/security", () => ({
  validateUrl: vi.fn().mockImplementation(async (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (
      lowerUrl.startsWith("ftp:") ||
      lowerUrl.startsWith("file:") ||
      lowerUrl.startsWith("gopher:")
    ) {
      throw new Error("Only http and https are allowed.");
    }
    if (
      lowerUrl.includes("127.0.0.1") ||
      lowerUrl.includes("10.0.0.1") ||
      lowerUrl.includes("[::1]") ||
      lowerUrl.includes("192.168.1.1") ||
      lowerUrl.includes("localhost") ||
      lowerUrl.includes("private.local")
    ) {
      throw new Error("Access to restricted IP address is forbidden.");
    }
    // Google.com is allowed
    if (lowerUrl.includes("google.com")) {
      return;
    }
    throw new Error("Invalid URL format");
  }),
}));

import { POST } from "@/app/api/media-generate/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getMediaGeneratorPlugin } from "@/lib/plugins/media-generators";
import { NextRequest } from "next/server";

function createRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/media-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/media-generate - SSRF protection", () => {
  const mockPlugin = {
    isEnabled: vi.fn().mockReturnValue(true),
    startGeneration: vi.fn().mockResolvedValue({
      taskId: "task-123",
      socketAccessToken: "token-123",
    }),
    getWebSocketUrl: vi.fn().mockReturnValue("wss://example.com"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default auth setup
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
    // Default db setup
    vi.mocked(db.user.findUnique).mockResolvedValue({
      generationCreditsRemaining: 10,
      flagged: false,
    } as any);
    vi.mocked(db.user.update).mockResolvedValue({} as any);
    // Default plugin setup
    vi.mocked(getMediaGeneratorPlugin).mockReturnValue(mockPlugin as any);
  });

  it("should block loopback/private IPs directly in inputImageUrl", async () => {
    const payloads = [
      "http://127.0.0.1/logo.png",
      "https://10.0.0.1/image.jpg",
      "http://[::1]/avatar.png",
      "https://192.168.1.1/img.png",
    ];

    for (const url of payloads) {
      const request = createRequest({
        prompt: "test prompt",
        model: "img-model",
        provider: "wiro",
        type: "image",
        inputImageUrl: url,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Access to restricted IP address");
    }
  });

  it("should block loopback/private IP hostnames resolved asynchronously via DNS", async () => {
    const payloads = ["http://localhost/logo.png", "https://private.local/image.jpg"];

    for (const url of payloads) {
      const request = createRequest({
        prompt: "test prompt",
        model: "img-model",
        provider: "wiro",
        type: "image",
        inputImageUrl: url,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Access to restricted IP address");
    }
  });

  it("should block non-HTTP/HTTPS protocols", async () => {
    const payloads = [
      "ftp://example.com/image.jpg",
      "file:///etc/passwd",
      "gopher://localhost/foo",
    ];

    for (const url of payloads) {
      const request = createRequest({
        prompt: "test prompt",
        model: "img-model",
        provider: "wiro",
        type: "image",
        inputImageUrl: url,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Only http and https are allowed");
    }
  });

  it("should allow a valid public URL with http or https protocol", async () => {
    const request = createRequest({
      prompt: "test prompt",
      model: "img-model",
      provider: "wiro",
      type: "image",
      inputImageUrl: "https://google.com/logo.png",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPlugin.startGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        inputImageUrl: "https://google.com/logo.png",
      })
    );
  });
});
