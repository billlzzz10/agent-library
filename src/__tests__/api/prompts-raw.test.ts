import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/prompts/[id]/raw/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("GET /api/prompts/[id]/raw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 for non-existent prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/prompts/p123.prompt.md");
    const response = await GET(request, { params: Promise.resolve({ id: "p123.prompt.md" }) });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Prompt not found");
  });

  it("should return 404 for private prompt when user is unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "p123",
      title: "Private Prompt",
      description: "Desc",
      content: "Secret content",
      type: "TEXT",
      isPrivate: true,
      authorId: "author123",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/p123.prompt.md");
    const response = await GET(request, { params: Promise.resolve({ id: "p123.prompt.md" }) });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Prompt not found");
  });

  it("should return 404 for private prompt when requested by non-author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other_user" } } as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "p123",
      title: "Private Prompt",
      description: "Desc",
      content: "Secret content",
      type: "TEXT",
      isPrivate: true,
      authorId: "author123",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/p123.prompt.md");
    const response = await GET(request, { params: Promise.resolve({ id: "p123.prompt.md" }) });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Prompt not found");
  });

  it("should return 200 for private prompt when requested by prompt author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "author123" } } as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "p123",
      title: "Private Prompt",
      description: "Desc",
      content: "Secret content",
      type: "TEXT",
      isPrivate: true,
      authorId: "author123",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/p123.prompt.md");
    const response = await GET(request, { params: Promise.resolve({ id: "p123.prompt.md" }) });

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Private Prompt");
    expect(text).toContain("Secret content");
  });

  it("should return 200 for public prompt when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "p123",
      title: "Public Prompt",
      description: "Desc",
      content: "Public content",
      type: "TEXT",
      isPrivate: false,
      authorId: "author123",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/p123.prompt.md");
    const response = await GET(request, { params: Promise.resolve({ id: "p123.prompt.md" }) });

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Public Prompt");
  });
});
