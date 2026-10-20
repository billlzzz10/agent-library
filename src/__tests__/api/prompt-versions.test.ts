import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/prompts/[id]/versions/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findUnique: vi.fn(),
    },
    promptVersion: {
      findMany: vi.fn(),
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

  it("should return 404 if prompt is not found", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/prompts/missing/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "missing" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 if prompt is soft-deleted", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "user1",
      isPrivate: false,
      deletedAt: new Date(),
    } as never);

    const request = new Request("http://localhost:3000/api/prompts/deleted/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "deleted" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 if prompt is private and user is not the author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author1",
      isPrivate: true,
      deletedAt: null,
    } as never);

    const request = new Request("http://localhost:3000/api/prompts/private1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "private1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 if prompt is private and user is unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author1",
      isPrivate: true,
      deletedAt: null,
    } as never);

    const request = new Request("http://localhost:3000/api/prompts/private1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "private1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return versions for public prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author1",
      isPrivate: false,
      deletedAt: null,
    } as never);

    const mockVersions = [
      { id: "v1", version: 1, content: "V1 content", author: { name: "Author", username: "author" } },
    ];
    vi.mocked(db.promptVersion.findMany).mockResolvedValue(mockVersions as never);

    const request = new Request("http://localhost:3000/api/prompts/public1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "public1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("v1");
  });

  it("should return versions for private prompt if requested by author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "author1" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author1",
      isPrivate: true,
      deletedAt: null,
    } as never);

    const mockVersions = [
      { id: "v1", version: 1, content: "V1 content", author: { name: "Author", username: "author" } },
    ];
    vi.mocked(db.promptVersion.findMany).mockResolvedValue(mockVersions as never);

    const request = new Request("http://localhost:3000/api/prompts/private1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "private1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });
});
