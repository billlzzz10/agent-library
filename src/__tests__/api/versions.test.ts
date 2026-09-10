import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/prompts/[id]/versions/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findFirst: vi.fn(),
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

  it("should return 404 for non-existent or deleted prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/prompts/non-existent/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "non-existent" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 403 for private prompt when accessed by unauthenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      isPrivate: true,
      authorId: "owner-123",
    } as any);

    const request = new Request("http://localhost:3000/api/prompts/private-123/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "private-123" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("forbidden");
  });

  it("should return 403 for private prompt when accessed by non-owner user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      isPrivate: true,
      authorId: "owner-123",
    } as any);

    const request = new Request("http://localhost:3000/api/prompts/private-123/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "private-123" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("forbidden");
  });

  it("should return 200 and versions list for private prompt when accessed by owner", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "owner-123" } } as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      isPrivate: true,
      authorId: "owner-123",
    } as any);
    const mockVersions = [
      { id: "v1", version: 1, content: "Initial content", author: { name: "Owner", username: "owner" } },
    ];
    vi.mocked(db.promptVersion.findMany).mockResolvedValue(mockVersions as any);

    const request = new Request("http://localhost:3000/api/prompts/private-123/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "private-123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockVersions);
  });

  it("should return 200 and versions list for public prompt for any user", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      isPrivate: false,
      authorId: "owner-123",
    } as any);
    const mockVersions = [
      { id: "v1", version: 1, content: "Public content", author: { name: "Owner", username: "owner" } },
    ];
    vi.mocked(db.promptVersion.findMany).mockResolvedValue(mockVersions as any);

    const request = new Request("http://localhost:3000/api/prompts/public-123/versions");
    const response = await GET(request, { params: Promise.resolve({ id: "public-123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockVersions);
  });
});
