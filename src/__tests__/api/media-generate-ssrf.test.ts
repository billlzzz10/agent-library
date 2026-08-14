import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/media-generate/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateUrl } from "@/lib/security";
import { getMediaGeneratorPlugin } from "@/lib/plugins/media-generators";

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

vi.mock("@/lib/security", () => ({
  validateUrl: vi.fn(),
}));

vi.mock("@/lib/plugins/media-generators", () => ({
  getMediaGeneratorPlugin: vi.fn(),
  getAvailableModels: vi.fn(),
  isMediaGenerationAvailable: vi.fn(),
}));

describe("POST /api/media-generate - SSRF Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "A beautiful scenery",
        model: "model-1",
        provider: "wiro",
        type: "image",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should accept valid prompt and parameters with NO inputImageUrl", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      generationCreditsRemaining: 10,
      flagged: false,
    } as never);

    const mockPlugin = {
      isEnabled: vi.fn().mockReturnValue(true),
      startGeneration: vi.fn().mockResolvedValue({
        taskId: "task-123",
        socketAccessToken: "token-123",
      }),
      getWebSocketUrl: vi.fn().mockReturnValue("wss://example.com"),
    };
    vi.mocked(getMediaGeneratorPlugin).mockReturnValue(mockPlugin as any);

    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "A beautiful scenery",
        model: "model-1",
        provider: "wiro",
        type: "image",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.taskId).toBe("task-123");
    expect(validateUrl).not.toHaveBeenCalled();
  });

  it("should accept and allow a valid public URL as inputImageUrl", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      generationCreditsRemaining: 10,
      flagged: false,
    } as never);
    vi.mocked(validateUrl).mockResolvedValue(undefined); // Resolves successfully

    const mockPlugin = {
      isEnabled: vi.fn().mockReturnValue(true),
      startGeneration: vi.fn().mockResolvedValue({
        taskId: "task-123",
        socketAccessToken: "token-123",
      }),
      getWebSocketUrl: vi.fn().mockReturnValue("wss://example.com"),
    };
    vi.mocked(getMediaGeneratorPlugin).mockReturnValue(mockPlugin as any);

    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "A beautiful scenery with image reference",
        model: "model-1",
        provider: "wiro",
        type: "image",
        inputImageUrl: "https://images.unsplash.com/photo-12345.jpg",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(validateUrl).toHaveBeenCalledWith("https://images.unsplash.com/photo-12345.jpg");
  });

  it("should block and return 400 if inputImageUrl resolves to a private or restricted IP", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      generationCreditsRemaining: 10,
      flagged: false,
    } as never);
    vi.mocked(validateUrl).mockRejectedValue(
      new Error("Access to restricted IP address 127.0.0.1 is forbidden.")
    );

    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "Exploit attempt",
        model: "model-1",
        provider: "wiro",
        type: "image",
        inputImageUrl: "http://127.0.0.1:3000/admin/sensitive",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Access to restricted IP address 127.0.0.1 is forbidden.");
    expect(getMediaGeneratorPlugin).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
