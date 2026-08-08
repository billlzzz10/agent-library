import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/media-generate/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

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

vi.mock("@/lib/plugins/media-generators", () => {
  const mockPlugin = {
    isEnabled: vi.fn().mockReturnValue(true),
    startGeneration: vi.fn().mockResolvedValue({
      taskId: "task-123",
      socketAccessToken: "token-123",
    }),
    getWebSocketUrl: vi.fn().mockReturnValue("wss://example.com"),
  };
  return {
    getMediaGeneratorPlugin: vi.fn().mockReturnValue(mockPlugin),
    getAvailableModels: vi.fn().mockReturnValue([]),
    isMediaGenerationAvailable: vi.fn().mockReturnValue(true),
  };
});

describe("POST /api/media-generate SSRF Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default authenticated user mock
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as never);

    // Default db.user.findUnique mock
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user-123",
      generationCreditsRemaining: 10,
      flagged: false,
    } as never);
  });

  it("should allow public URLs for inputImageUrl", async () => {
    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "A beautiful cat",
        model: "stable-diffusion",
        provider: "fal",
        type: "image",
        inputImageUrl: "https://images.unsplash.com/photo-12345.jpg",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.taskId).toBe("task-123");
  });

  it("should block private/restricted URLs for inputImageUrl and return 400", async () => {
    const privateUrls = [
      "http://localhost/image.png",
      "http://127.0.0.1/cat.jpg",
      "http://[::1]/test.jpg",
      "http://169.254.169.254/latest/meta-data/",
      "https://[::ffff:7f00:1]/bypass.jpg",
      "http://10.0.0.1/private.png",
      "http://192.168.1.50/private.png",
    ];

    for (const url of privateUrls) {
      const request = new NextRequest("http://localhost:3000/api/media-generate", {
        method: "POST",
        body: JSON.stringify({
          prompt: "A beautiful cat",
          model: "stable-diffusion",
          provider: "fal",
          type: "image",
          inputImageUrl: url,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("forbidden");
    }
  });

  it("should block malformed URLs for inputImageUrl and return 400", async () => {
    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "A beautiful cat",
        model: "stable-diffusion",
        provider: "fal",
        type: "image",
        inputImageUrl: "not-a-valid-url",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid URL format");
  });
});
