import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/prompts/[id]/versions/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

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
    $transaction: vi.fn((promises) => Promise.all(promises)),
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

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 if prompt is soft deleted", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "p1",
      isPrivate: false,
      authorId: "u1",
      deletedAt: new Date(),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 403 if prompt is private and user is not the author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u2" } } as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "p1",
      isPrivate: true,
      authorId: "u1",
      deletedAt: null,
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("forbidden");
  });

  it("should return versions for public prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "p1",
      isPrivate: false,
      authorId: "u1",
      deletedAt: null,
    } as any);
    vi.mocked(db.promptVersion.findMany).mockResolvedValue([
      { id: "v1", version: 1, content: "Test" },
    ] as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });

  it("should return versions for private prompt if user is author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "p1",
      isPrivate: true,
      authorId: "u1",
      deletedAt: null,
    } as any);
    vi.mocked(db.promptVersion.findMany).mockResolvedValue([
      { id: "v1", version: 1, content: "Test" },
    ] as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/p1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });
});
