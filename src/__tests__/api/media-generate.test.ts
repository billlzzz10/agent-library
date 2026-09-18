import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/media-generate/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateUrl } from "@/lib/security";
import { NextRequest } from "next/server";

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
  getMediaGeneratorPlugin: vi.fn().mockReturnValue({
    isEnabled: () => true,
    getWebSocketUrl: () => "wss://example.com",
    startGeneration: vi.fn().mockResolvedValue({
      taskId: "task-123",
      socketAccessToken: "token-123",
    }),
  }),
  getAvailableModels: vi.fn().mockReturnValue([]),
  isMediaGenerationAvailable: vi.fn().mockReturnValue(true),
}));

describe("POST /api/media-generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const req = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "A cat",
        model: "model-1",
        provider: "provider-1",
        type: "image",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 when inputImageUrl fails URL validation (SSRF check)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as any);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user1",
      generationCreditsRemaining: 10,
      flagged: false,
    } as any);
    vi.mocked(validateUrl).mockRejectedValue(new Error("Access to restricted IP address 127.0.0.1 is forbidden."));

    const req = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "A cat",
        model: "model-1",
        provider: "provider-1",
        type: "image",
        inputImageUrl: "http://127.0.0.1/secret.png",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Access to restricted IP address 127.0.0.1 is forbidden.");
    expect(validateUrl).toHaveBeenCalledWith("http://127.0.0.1/secret.png");
  });

  it("should proceed when inputImageUrl is valid", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as any);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user1",
      generationCreditsRemaining: 10,
      flagged: false,
    } as any);
    vi.mocked(validateUrl).mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "A cat",
        model: "model-1",
        provider: "provider-1",
        type: "image",
        inputImageUrl: "https://example.com/valid.png",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(validateUrl).toHaveBeenCalledWith("https://example.com/valid.png");
  });
});
