import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/media-generate/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

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

vi.mock("@/lib/plugins/media-generators", () => ({
  getMediaGeneratorPlugin: vi.fn(),
  getAvailableModels: vi.fn(),
  isMediaGenerationAvailable: vi.fn(),
}));

describe("POST /api/media-generate SSRF protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validSession = { user: { id: "user-123" } };
  const validUser = {
    id: "user-123",
    generationCreditsRemaining: 10,
    flagged: false,
  };

  it("should block private IPv4 addresses in inputImageUrl", async () => {
    vi.mocked(auth).mockResolvedValue(validSession as any);
    vi.mocked(db.user.findUnique).mockResolvedValue(validUser as any);

    const body = {
      prompt: "test prompt",
      model: "test-model",
      provider: "test-provider",
      type: "image",
      inputImageUrl: "http://127.0.0.1/secret",
    };

    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid input image URL");
  });

  it("should block non-http/https protocols in inputImageUrl", async () => {
    vi.mocked(auth).mockResolvedValue(validSession as any);
    vi.mocked(db.user.findUnique).mockResolvedValue(validUser as any);

    const body = {
      prompt: "test prompt",
      model: "test-model",
      provider: "test-provider",
      type: "image",
      inputImageUrl: "file:///etc/passwd",
    };

    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid input image URL");
  });

  it("should block internal hostnames in inputImageUrl", async () => {
    vi.mocked(auth).mockResolvedValue(validSession as any);
    vi.mocked(db.user.findUnique).mockResolvedValue(validUser as any);

    const body = {
      prompt: "test prompt",
      model: "test-model",
      provider: "test-provider",
      type: "image",
      inputImageUrl: "http://internal-service.local/api",
    };

    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid input image URL");
  });

  it("should allow public URLs in inputImageUrl", async () => {
    vi.mocked(auth).mockResolvedValue(validSession as any);
    vi.mocked(db.user.findUnique).mockResolvedValue(validUser as any);

    const mockPlugin = {
      isEnabled: () => true,
      startGeneration: vi.fn().mockResolvedValue({ taskId: "task-123", socketAccessToken: "token" }),
      getWebSocketUrl: () => "ws://example.com",
    };
    const { getMediaGeneratorPlugin } = await import("@/lib/plugins/media-generators");
    vi.mocked(getMediaGeneratorPlugin).mockReturnValue(mockPlugin as any);

    const body = {
      prompt: "test prompt",
      model: "test-model",
      provider: "test-provider",
      type: "image",
      inputImageUrl: "https://images.unsplash.com/photo-123.jpg",
    };

    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPlugin.startGeneration).toHaveBeenCalledWith(expect.objectContaining({
      inputImageUrl: "https://images.unsplash.com/photo-123.jpg"
    }));
  });
});
