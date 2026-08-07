import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/media-generate/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMediaGeneratorPlugin } from "@/lib/plugins/media-generators";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/plugins/media-generators", () => ({
  getMediaGeneratorPlugin: vi.fn(),
  getAvailableModels: vi.fn(),
  isMediaGenerationAvailable: vi.fn(),
}));

describe("POST /api/media-generate SSRF Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
    },
  };

  const mockUser = {
    id: "user-123",
    generationCreditsRemaining: 10,
    flagged: false,
  };

  const mockPlugin = {
    isEnabled: vi.fn().mockReturnValue(true),
    startGeneration: vi.fn().mockResolvedValue({
      taskId: "task-123",
      socketAccessToken: "token-123",
    }),
    getWebSocketUrl: vi.fn().mockReturnValue("wss://example.com"),
  };

  it("should block private URLs for inputImageUrl", async () => {
    vi.mocked(auth).mockResolvedValue(validSession as any);
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(getMediaGeneratorPlugin).mockReturnValue(mockPlugin as any);

    const privateUrls = [
      "http://localhost:3000/admin",
      "http://127.0.0.1/sensitive",
      "http://169.254.169.254/latest/meta-data/",
      "http://192.168.1.1/router-config",
    ];

    for (const url of privateUrls) {
      const request = new Request("http://localhost:3000/api/media-generate", {
        method: "POST",
        body: JSON.stringify({
          prompt: "test prompt",
          model: "test-model",
          provider: "test-provider",
          type: "image",
          inputImageUrl: url,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // If the fix is NOT implemented, it might return 200 or fall through to plugin
      // We expect it to return 400 or 403 once we add validation
      expect(response.status, `URL ${url} should be blocked`).toBe(400);
      expect(data.error).toMatch(/restricted|private|invalid/i);
    }
  });

  it("should allow public URLs for inputImageUrl", async () => {
    vi.mocked(auth).mockResolvedValue(validSession as any);
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(getMediaGeneratorPlugin).mockReturnValue(mockPlugin as any);

    const publicUrl = "https://images.unsplash.com/photo-123.jpg";
    const request = new Request("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "test prompt",
        model: "test-model",
        provider: "test-provider",
        type: "image",
        inputImageUrl: publicUrl,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
