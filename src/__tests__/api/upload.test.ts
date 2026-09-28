import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/upload/route";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getStoragePlugin } from "@/lib/plugins/registry";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/plugins/registry", () => ({
  getStoragePlugin: vi.fn(),
}));

vi.mock("sharp", () => {
  return {
    default: vi.fn(() => ({
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from("compressed-image-data")),
    })),
  };
});

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ENABLED_STORAGE;
  });

  it("should return 401 when unauthorized", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when ENABLED_STORAGE is url", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", role: "USER" },
    } as any);
    process.env.ENABLED_STORAGE = "url";

    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("File upload is not enabled");
  });

  it("should generate cryptographically secure hex filename on successful image upload", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", role: "USER" },
    } as any);
    process.env.ENABLED_STORAGE = "s3";

    const mockUpload = vi.fn().mockResolvedValue({
      url: "https://example.com/prompt-media/test.jpg",
      size: 100,
    });

    vi.mocked(getStoragePlugin).mockReturnValue({
      id: "s3",
      name: "S3",
      isConfigured: () => true,
      upload: mockUpload,
      delete: vi.fn(),
    });

    const mockFile = {
      type: "image/png",
      size: 100,
      arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-image-content")),
    } as unknown as File;

    const formData = {
      get: vi.fn().mockReturnValue(mockFile),
    } as unknown as FormData;

    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
    });
    vi.spyOn(req, "formData").mockResolvedValue(formData);

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://example.com/prompt-media/test.jpg");
    expect(mockUpload).toHaveBeenCalledOnce();

    const uploadOptions = mockUpload.mock.calls[0][1];
    // Verify filename uses 8 hex characters (from 4 random bytes)
    expect(uploadOptions.filename).toMatch(/^prompt-media-\d+-[a-f0-9]{8}\.jpg$/);
  });
});
