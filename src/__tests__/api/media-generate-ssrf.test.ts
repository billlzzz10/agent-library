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
}));

// Mock dns/promises for SSRF DNS resolution control
vi.mock("dns/promises", () => {
  const lookupFn = async (hostname: string) => {
    if (hostname === "localhost" || hostname === "loopback") {
      return { address: "127.0.0.1" };
    }
    if (hostname === "private.local") {
      return { address: "10.0.0.5" };
    }
    if (hostname === "example.com" || hostname === "google.com") {
      return { address: "93.184.216.34" }; // Public IP
    }
    throw new Error("ENOTFOUND");
  };

  return {
    default: {
      lookup: lookupFn,
    },
    lookup: lookupFn,
  };
});

describe("POST /api/media-generate - SSRF Protection", () => {
  const validUser = {
    id: "user123",
    generationCreditsRemaining: 10,
    flagged: false,
  };

  const mockPlugin = {
    isEnabled: vi.fn().mockReturnValue(true),
    startGeneration: vi.fn().mockResolvedValue({
      taskId: "task-123",
      socketAccessToken: "token-123",
    }),
    getWebSocketUrl: vi.fn().mockReturnValue("wss://example.com/socket"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: "user123" } } as any);
    vi.mocked(db.user.findUnique).mockResolvedValue(validUser as any);
    vi.mocked(getMediaGeneratorPlugin).mockReturnValue(mockPlugin as any);
  });

  const makeRequest = (body: any) => {
    return new Request("http://localhost:3000/api/media-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  it("should block request if inputImageUrl resolves to a private IP (e.g. localhost)", async () => {
    const req = makeRequest({
      prompt: "A beautiful scenery",
      model: "model-1",
      provider: "provider-1",
      type: "image",
      inputImageUrl: "http://localhost/private-image.jpg",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Access to restricted IP address 127.0.0.1");
    expect(mockPlugin.startGeneration).not.toHaveBeenCalled();
  });

  it("should block request if inputImageUrl resolves to private range via custom DNS (e.g. private.local)", async () => {
    const req = makeRequest({
      prompt: "A beautiful scenery",
      model: "model-1",
      provider: "provider-1",
      type: "image",
      inputImageUrl: "http://private.local/image.jpg",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Access to restricted IP address 10.0.0.5");
    expect(mockPlugin.startGeneration).not.toHaveBeenCalled();
  });

  it("should block request if inputImageUrl uses invalid protocol (e.g. ftp)", async () => {
    const req = makeRequest({
      prompt: "A beautiful scenery",
      model: "model-1",
      provider: "provider-1",
      type: "image",
      inputImageUrl: "ftp://example.com/image.jpg",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Only http and https are allowed");
    expect(mockPlugin.startGeneration).not.toHaveBeenCalled();
  });

  it("should allow request if inputImageUrl resolves to public IP", async () => {
    const req = makeRequest({
      prompt: "A beautiful scenery",
      model: "model-1",
      provider: "provider-1",
      type: "image",
      inputImageUrl: "https://example.com/image.jpg",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPlugin.startGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        inputImageUrl: "https://example.com/image.jpg",
      })
    );
  });

  it("should allow request if inputImageUrl is not provided", async () => {
    const req = makeRequest({
      prompt: "A beautiful scenery",
      model: "model-1",
      provider: "provider-1",
      type: "image",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPlugin.startGeneration).toHaveBeenCalled();
  });
});
