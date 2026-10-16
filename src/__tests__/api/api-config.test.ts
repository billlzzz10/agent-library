import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/prompts/[id]/api-config/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

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

  it("should return 404 for non-existent prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/prompts/prompt-123/api-config");
    const res = await GET(req, { params: Promise.resolve({ id: "prompt-123" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Prompt not found");
  });

  it("should return 404 for private prompt when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      authorId: "author-1",
      isPrivate: true,
    } as any);

    const req = new NextRequest("http://localhost:3000/api/prompts/prompt-123/api-config");
    const res = await GET(req, { params: Promise.resolve({ id: "prompt-123" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Prompt not found");
  });

  it("should return 404 for private prompt when user is not the author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-2" } } as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      authorId: "author-1",
      isPrivate: true,
    } as any);

    const req = new NextRequest("http://localhost:3000/api/prompts/prompt-123/api-config");
    const res = await GET(req, { params: Promise.resolve({ id: "prompt-123" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Prompt not found");
  });

  it("should return api configs for private prompt when user is the author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "author-1" } } as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      authorId: "author-1",
      isPrivate: true,
    } as any);

    const mockConfigs = [
      { id: "cfg-1", name: "Integration 1", baseUrl: "https://api.example.com", method: "GET" },
    ];
    vi.mocked(db.apiConfig.findMany).mockResolvedValue(mockConfigs as any);

    const req = new NextRequest("http://localhost:3000/api/prompts/prompt-123/api-config");
    const res = await GET(req, { params: Promise.resolve({ id: "prompt-123" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(mockConfigs);
  });

  it("should return api configs for public prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      authorId: "author-1",
      isPrivate: false,
    } as any);

    const mockConfigs = [
      { id: "cfg-1", name: "Public Integration", baseUrl: "https://api.example.com", method: "GET" },
    ];
    vi.mocked(db.apiConfig.findMany).mockResolvedValue(mockConfigs as any);

    const req = new NextRequest("http://localhost:3000/api/prompts/prompt-123/api-config");
    const res = await GET(req, { params: Promise.resolve({ id: "prompt-123" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(mockConfigs);
  });
});
