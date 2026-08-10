import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/media-generate/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// Mock dependencies
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

// Mock dns/promises cleanly with both named and default exports
vi.mock("dns/promises", () => {
  const lookup = vi.fn(async (hostname: string) => {
    if (hostname === "localhost" || hostname === "localhost.") {
      return { address: "127.0.0.1" };
    }
    if (hostname === "internal.example.com") {
      return { address: "10.0.0.1" };
    }
    if (hostname === "malicious.com" || hostname === "malicious.com.") {
      return { address: "127.0.0.1" };
    }
    if (hostname === "google.com") {
      return { address: "142.250.190.46" };
    }
    throw new Error("ENOTFOUND");
  });

  return {
    lookup,
    default: {
      lookup,
    },
  };
});

// Mock plugins so startGeneration doesn't actually trigger external API calls
vi.mock("@/lib/plugins/media-generators", () => ({
  getMediaGeneratorPlugin: vi.fn().mockReturnValue({
    isEnabled: () => true,
    startGeneration: vi.fn().mockResolvedValue({
      taskId: "task-123",
      socketAccessToken: "token-123",
    }),
    getWebSocketUrl: () => "wss://socket.example.com",
  }),
  getAvailableModels: () => [],
  isMediaGenerationAvailable: () => true,
}));

function createRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/media-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/media-generate - SSRF Protection on inputImageUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Authenticated user session
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);

    // Active, non-flagged user with credits
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user-123",
      generationCreditsRemaining: 10,
      dailyGenerationLimit: 10,
      flagged: false,
    } as any);
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = createRequest({
      prompt: "Generate an image",
      model: "google/nano-banana",
      provider: "wiro",
      type: "image",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should allow request without inputImageUrl", async () => {
    const request = createRequest({
      prompt: "Generate an image",
      model: "google/nano-banana",
      provider: "wiro",
      type: "image",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.taskId).toBe("task-123");
  });

  it("should allow request with public inputImageUrl", async () => {
    const request = createRequest({
      prompt: "Generate an image",
      model: "google/nano-banana",
      provider: "wiro",
      type: "image",
      inputImageUrl: "https://google.com/image.jpg",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should reject request with local/private inputImageUrl IP literal", async () => {
    const privateUrls = [
      "http://127.0.0.1/image.jpg",
      "http://10.0.0.1/image.jpg",
      "http://172.16.0.1/image.jpg",
      "http://192.168.1.1/image.jpg",
      "http://169.254.169.254/image.jpg",
    ];

    for (const url of privateUrls) {
      const request = createRequest({
        prompt: "Generate an image",
        model: "google/nano-banana",
        provider: "wiro",
        type: "image",
        inputImageUrl: url,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("forbidden");
    }
  });

  it("should reject request with hostnames resolving to private/local IPs", async () => {
    const privateHostnames = [
      "http://localhost/image.jpg",
      "http://internal.example.com/image.jpg",
      "http://malicious.com/image.jpg",
    ];

    for (const url of privateHostnames) {
      const request = createRequest({
        prompt: "Generate an image",
        model: "google/nano-banana",
        provider: "wiro",
        type: "image",
        inputImageUrl: url,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("forbidden");
    }
  });

  it("should reject request with invalid protocol for inputImageUrl", async () => {
    const request = createRequest({
      prompt: "Generate an image",
      model: "google/nano-banana",
      provider: "wiro",
      type: "image",
      inputImageUrl: "ftp://google.com/image.jpg",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Only http and https are allowed");
  });
});
