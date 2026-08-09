import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/media-generate/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
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

vi.mock("@/lib/plugins/media-generators", () => ({
  getMediaGeneratorPlugin: vi.fn(),
  getAvailableModels: vi.fn(),
  isMediaGenerationAvailable: vi.fn(),
}));

describe("POST /api/media-generate SSRF protection", () => {
  const mockPlugin = {
    isEnabled: vi.fn().mockReturnValue(true),
    startGeneration: vi.fn().mockResolvedValue({
      taskId: "task-123",
      socketAccessToken: "token-123",
    }),
    getWebSocketUrl: vi.fn().mockReturnValue("ws://mock-socket"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user-1",
      generationCreditsRemaining: 5,
      flagged: false,
    } as any);
    vi.mocked(db.user.update).mockResolvedValue({} as any);
    vi.mocked(getMediaGeneratorPlugin).mockReturnValue(mockPlugin as any);
  });

  it("should allow a public inputImageUrl", async () => {
    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "Generate a beautiful landscape",
        model: "standard",
        provider: "mock-provider",
        type: "IMAGE",
        inputImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.taskId).toBe("task-123");
  });

  it("should block a private inputImageUrl (SSRF protection)", async () => {
    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "Generate a beautiful landscape",
        model: "standard",
        provider: "mock-provider",
        type: "IMAGE",
        inputImageUrl: "http://127.0.0.1/admin/secrets",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Access to restricted IP address 127.0.0.1 is forbidden");
  });

  it("should block a benchmarking range inputImageUrl", async () => {
    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "Generate a beautiful landscape",
        model: "standard",
        provider: "mock-provider",
        type: "IMAGE",
        inputImageUrl: "http://198.18.0.1/benchmark",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Access to restricted IP address 198.18.0.1 is forbidden");
  });

  it("should block a dotted IPv4-mapped IPv6 inputImageUrl (normalized by Node to hex form)", async () => {
    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "Generate a beautiful landscape",
        model: "standard",
        provider: "mock-provider",
        type: "IMAGE",
        inputImageUrl: "http://[::ffff:127.0.0.1]/secret",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Access to restricted IP address ::ffff:7f00:1 is forbidden");
  });

  it("should block a hex IPv4-mapped IPv6 inputImageUrl", async () => {
    const request = new NextRequest("http://localhost:3000/api/media-generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "Generate a beautiful landscape",
        model: "standard",
        provider: "mock-provider",
        type: "IMAGE",
        inputImageUrl: "http://[::ffff:7f00:1]/secret",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Access to restricted IP address ::ffff:7f00:1 is forbidden");
  });
});
