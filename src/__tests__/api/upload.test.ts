import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/upload/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/plugins/registry", () => ({
  getStoragePlugin: vi.fn(),
}));

vi.mock("sharp", () => {
  return {
    default: vi.fn().mockReturnValue({
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-compressed-image")),
    }),
  };
});

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ENABLED_STORAGE;
  });

  it("returns 401 when unauthorized", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/upload", { method: "POST" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when storage mode is url", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user1", email: "test@example.com" },
      expires: "1",
    });
    process.env.ENABLED_STORAGE = "url";

    const req = new NextRequest("http://localhost:3000/api/upload", { method: "POST" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("File upload is not enabled. Using URL storage mode.");
  });

  it("uploads successfully using configured storage plugin with cryptographically secure random filename", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user1", email: "test@example.com" },
      expires: "1",
    });
    process.env.ENABLED_STORAGE = "s3";

    const mockPlugin = {
      id: "s3",
      name: "S3",
      isConfigured: () => true,
      upload: vi.fn().mockImplementation(async (buffer, options) => {
        expect(options.filename).toMatch(/^prompt-media-\d+-[0-9a-f]{8}\.jpg$/);
        return { url: `https://storage.example.com/${options.filename}`, size: buffer.length };
      }),
      delete: vi.fn(),
    };

    const { getStoragePlugin } = await import("@/lib/plugins/registry");
    vi.mocked(getStoragePlugin).mockReturnValue(mockPlugin as any);

    const fakeFile = {
      type: "image/jpeg",
      size: 100,
      arrayBuffer: async () => new ArrayBuffer(100),
    };

    const req = {
      formData: async () => ({
        get: (name: string) => (name === "file" ? fakeFile : null),
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toMatch(/^https:\/\/storage\.example\.com\/prompt-media-\d+-[0-9a-f]{8}\.jpg$/);
  });
});
