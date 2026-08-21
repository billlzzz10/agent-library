import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/prompts/[id]/versions/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    promptVersion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
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

  it("should return 404 if prompt does not exist or is deleted", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/prompts/non-existent/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "non-existent" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 403 for private prompt when user is unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "prompt-1",
      isPrivate: true,
      authorId: "owner-id",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("forbidden");
  });

  it("should return 403 for private prompt when user is not author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "prompt-1",
      isPrivate: true,
      authorId: "owner-id",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("forbidden");
  });

  it("should return 200 and versions for public prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "prompt-1",
      isPrivate: false,
      authorId: "owner-id",
    } as any);

    const mockVersions = [
      { id: "v2", version: 2, content: "V2 content", author: { name: "Owner", username: "owner" } },
      { id: "v1", version: 1, content: "V1 content", author: { name: "Owner", username: "owner" } },
    ];
    vi.mocked(db.promptVersion.findMany).mockResolvedValue(mockVersions as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].version).toBe(2);
  });

  it("should return 200 and versions for private prompt when requested by author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "owner-id" } } as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "prompt-1",
      isPrivate: true,
      authorId: "owner-id",
    } as any);

    const mockVersions = [
      { id: "v1", version: 1, content: "V1 content", author: { name: "Owner", username: "owner" } },
    ];
    vi.mocked(db.promptVersion.findMany).mockResolvedValue(mockVersions as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });
});
