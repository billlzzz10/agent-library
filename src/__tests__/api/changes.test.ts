import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/prompts/[id]/changes/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findUnique: vi.fn(),
    },
    changeRequest: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("GET /api/prompts/[id]/changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if prompt does not exist", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/changes");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 if prompt is deleted", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author-1",
      isPrivate: false,
      deletedAt: new Date(),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/changes");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 if prompt is private and user is not author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-2" } } as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author-1",
      isPrivate: true,
      deletedAt: null,
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/changes");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return change requests for public prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author-1",
      isPrivate: false,
      deletedAt: null,
    } as any);

    const mockChangeRequests = [
      { id: "cr-1", proposedContent: "Updated content", author: { id: "user-3", username: "contributor" } },
    ];
    vi.mocked(db.changeRequest.findMany).mockResolvedValue(mockChangeRequests as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/changes");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockChangeRequests);
  });

  it("should return change requests for private prompt if user is prompt author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "author-1" } } as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      authorId: "author-1",
      isPrivate: true,
      deletedAt: null,
    } as any);

    const mockChangeRequests = [
      { id: "cr-1", proposedContent: "Updated content", author: { id: "user-3", username: "contributor" } },
    ];
    vi.mocked(db.changeRequest.findMany).mockResolvedValue(mockChangeRequests as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/changes");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockChangeRequests);
  });
});
