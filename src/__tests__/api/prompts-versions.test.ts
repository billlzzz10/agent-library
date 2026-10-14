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

  it("should return 404 for non-existent or soft-deleted prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/prompts/non-existent/versions");
    const response = await GET(request as any, { params: Promise.resolve({ id: "non-existent" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 for private prompt accessed by unauthenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      isPrivate: true,
      authorId: "author123",
    } as any);

    const request = new Request("http://localhost:3000/api/prompts/private123/versions");
    const response = await GET(request as any, { params: Promise.resolve({ id: "private123" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 for private prompt accessed by different user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      isPrivate: true,
      authorId: "author123",
    } as any);

    const request = new Request("http://localhost:3000/api/prompts/private123/versions");
    const response = await GET(request as any, { params: Promise.resolve({ id: "private123" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 200 and versions for public prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      isPrivate: false,
      authorId: "author123",
    } as any);

    const mockVersions = [
      { id: "v2", version: 2, content: "v2 content", author: { name: "Author", username: "author" } },
      { id: "v1", version: 1, content: "v1 content", author: { name: "Author", username: "author" } },
    ];
    vi.mocked(db.promptVersion.findMany).mockResolvedValue(mockVersions as any);

    const request = new Request("http://localhost:3000/api/prompts/public123/versions");
    const response = await GET(request as any, { params: Promise.resolve({ id: "public123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
  });

  it("should return 200 and versions for private prompt accessed by author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "author123" } } as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      isPrivate: true,
      authorId: "author123",
    } as any);

    const mockVersions = [
      { id: "v1", version: 1, content: "v1 content", author: { name: "Author", username: "author" } },
    ];
    vi.mocked(db.promptVersion.findMany).mockResolvedValue(mockVersions as any);

    const request = new Request("http://localhost:3000/api/prompts/private123/versions");
    const response = await GET(request as any, { params: Promise.resolve({ id: "private123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });
});
