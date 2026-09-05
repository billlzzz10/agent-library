import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/prompts/[id]/versions/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    promptVersion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("GET /api/prompts/[id]/versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if prompt does not exist", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/prompts/123/versions");
    const response = await GET(request as any, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 if prompt is soft-deleted", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author1",
      isPrivate: false,
      deletedAt: new Date(),
    } as never);

    const request = new Request("http://localhost:3000/api/prompts/123/versions");
    const response = await GET(request as any, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 403 for private prompt when requested by non-author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author1",
      isPrivate: true,
      deletedAt: null,
    } as never);

    const request = new Request("http://localhost:3000/api/prompts/123/versions");
    const response = await GET(request as any, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("forbidden");
  });

  it("should return versions for private prompt when requested by author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "author1" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author1",
      isPrivate: true,
      deletedAt: null,
    } as never);
    vi.mocked(db.promptVersion.findMany).mockResolvedValue([
      { id: "v1", version: 1, content: "v1 content" },
    ] as never);

    const request = new Request("http://localhost:3000/api/prompts/123/versions");
    const response = await GET(request as any, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("v1");
  });

  it("should return versions for public prompt when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author1",
      isPrivate: false,
      deletedAt: null,
    } as never);
    vi.mocked(db.promptVersion.findMany).mockResolvedValue([
      { id: "v1", version: 1, content: "v1 content" },
    ] as never);

    const request = new Request("http://localhost:3000/api/prompts/123/versions");
    const response = await GET(request as any, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });
});
