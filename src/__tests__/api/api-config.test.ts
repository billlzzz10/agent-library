import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/prompts/[id]/api-config/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findFirst: vi.fn(),
    },
    apiConfig: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("GET /api/prompts/[id]/api-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request("http://localhost:3000/api/prompts/prompt-1/api-config");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if prompt not found or user is not author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-2" } } as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/prompts/prompt-1/api-config");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Prompt not found or unauthorized");
    expect(db.prompt.findFirst).toHaveBeenCalledWith({
      where: { id: "prompt-1", authorId: "user-2", deletedAt: null },
    });
  });

  it("should return 200 and configs if user is author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "author-1" } } as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "prompt-1",
      authorId: "author-1",
    } as any);

    const mockConfigs = [
      { id: "config-1", name: "Test Config", baseUrl: "https://api.example.com" },
    ];
    vi.mocked(db.apiConfig.findMany).mockResolvedValue(mockConfigs as any);

    const request = new Request("http://localhost:3000/api/prompts/prompt-1/api-config");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockConfigs);
  });
});
