import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
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
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
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
    vi.mocked(db.prompt.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 if prompt is soft-deleted", async () => {
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "user1",
      isPrivate: false,
      deletedAt: new Date(),
    } as never);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 403 if prompt is private and user is not authenticated", async () => {
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "user1",
      isPrivate: true,
      deletedAt: null,
    } as never);
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("forbidden");
  });

  it("should return 403 if prompt is private and user is not the author", async () => {
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "user1",
      isPrivate: true,
      deletedAt: null,
    } as never);
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as never);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("forbidden");
  });

  it("should return versions if prompt is private and user is the author", async () => {
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "user1",
      isPrivate: true,
      deletedAt: null,
    } as never);
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);

    const mockVersions = [{ id: "v1", version: 1, content: "Test content" }];
    vi.mocked(db.promptVersion.findMany).mockResolvedValue(mockVersions as never);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockVersions);
  });

  it("should return versions for public prompt without authentication", async () => {
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "user1",
      isPrivate: false,
      deletedAt: null,
    } as never);

    const mockVersions = [{ id: "v1", version: 1, content: "Public version" }];
    vi.mocked(db.promptVersion.findMany).mockResolvedValue(mockVersions as never);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockVersions);
  });
});

describe("POST /api/prompts/[id]/versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions", {
      method: "POST",
      body: JSON.stringify({ content: "New content" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("unauthorized");
  });

  it("should return 404 if prompt is soft-deleted", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "user1",
      content: "Old content",
      deletedAt: new Date(),
    } as never);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions", {
      method: "POST",
      body: JSON.stringify({ content: "New content" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });
});
