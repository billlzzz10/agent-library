import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/media-generate/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

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

// Mock the plugin registry
vi.mock("@/lib/plugins/media-generators", () => ({
    getMediaGeneratorPlugin: vi.fn(),
    getAvailableModels: vi.fn().mockReturnValue([]),
    isMediaGenerationAvailable: vi.fn().mockReturnValue(true),
}));

import { getMediaGeneratorPlugin } from "@/lib/plugins/media-generators";

describe("Media Generation SSRF Protection", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock for successful generation
    vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123", role: "USER" },
        expires: "",
    });

    vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "user-123",
        generationCreditsRemaining: 10,
        flagged: false,
    } as any);

    vi.mocked(db.user.update).mockResolvedValue({} as any);

    vi.mocked(getMediaGeneratorPlugin).mockReturnValue({
        id: "fal",
        name: "Fal.ai",
        isEnabled: () => true,
        isConfigured: () => true,
        startGeneration: vi.fn().mockResolvedValue({ taskId: "task-123", socketAccessToken: "token-123" }),
        getWebSocketUrl: () => "ws://example.com",
    } as any);
  });

  it("should block private URLs in inputImageUrl", async () => {
    const request = new NextRequest("http://localhost/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "A beautiful landscape",
        model: "flux-pro",
        provider: "fal",
        type: "image",
        inputImageUrl: "http://127.0.0.1/admin",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("private/internal network");
  });

  it("should allow public URLs in inputImageUrl", async () => {
    const request = new NextRequest("http://localhost/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "A beautiful landscape",
        model: "flux-pro",
        provider: "fal",
        type: "image",
        inputImageUrl: "https://images.unsplash.com/photo-1234567",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
