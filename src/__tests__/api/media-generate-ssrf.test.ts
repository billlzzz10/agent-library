import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/media-generate/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMediaGeneratorPlugin } from "@/lib/plugins/media-generators";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: vi.fn(), update: vi.fn() } } }));
vi.mock("@/lib/plugins/media-generators", () => ({
  getMediaGeneratorPlugin: vi.fn(),
  getAvailableModels: vi.fn(),
  isMediaGenerationAvailable: vi.fn(),
}));

describe("POST /api/media-generate SSRF Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(db.user.findUnique).mockResolvedValue({ credits: 10, flagged: false } as any);
    vi.mocked(getMediaGeneratorPlugin).mockReturnValue({
      isEnabled: () => true,
      startGeneration: vi.fn().mockResolvedValue({ taskId: "t1" }),
      getWebSocketUrl: () => "ws://",
    } as any);
  });

  const testSsrf = async (url: string, expectedStatus: number) => {
    const req = new Request("http://l:3/api/media-generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "p", model: "m", provider: "pv", type: "image", inputImageUrl: url }),
    });
    const res = await POST(req);
    expect(res.status, `Status for ${url}`).toBe(expectedStatus);
  };

  it("blocks private/internal URLs", async () => {
    const urls = ["http://localhost", "http://127.0.0.1", "http://169.254.169.254", "http://[::1]"];
    for (const url of urls) await testSsrf(url, 400);
  });

  it("blocks internal hostnames", async () => {
    const urls = ["http://server.local", "http://database.internal", "http://my.localhost"];
    for (const url of urls) await testSsrf(url, 400);
  });

  it("allows public URLs", async () => {
    await testSsrf("https://images.unsplash.com/photo.jpg", 200);
  });
});
