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

  it("should return 404 for non-existent prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/prompts/123/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 for soft-deleted prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author1",
      isPrivate: false,
      deletedAt: new Date(),
    } as never);

    const request = new Request("http://localhost:3000/api/prompts/123/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 when unauthorized user requests private prompt versions", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "owner",
      isPrivate: true,
      deletedAt: null,
    } as never);

    const request = new Request("http://localhost:3000/api/prompts/123/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return versions when author requests private prompt versions", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "owner" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "owner",
      isPrivate: true,
      deletedAt: null,
    } as never);
    vi.mocked(db.promptVersion.findMany).mockResolvedValue([
      { id: "v1", version: 1, content: "test" },
    ] as never);

    const request = new Request("http://localhost:3000/api/prompts/123/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });

  it("should return versions for public prompt when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "owner",
      isPrivate: false,
      deletedAt: null,
    } as never);
    vi.mocked(db.promptVersion.findMany).mockResolvedValue([
      { id: "v1", version: 1, content: "test" },
    ] as never);

    const request = new Request("http://localhost:3000/api/prompts/123/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });
});
