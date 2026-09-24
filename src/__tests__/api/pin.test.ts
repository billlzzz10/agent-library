import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, DELETE } from "@/app/api/prompts/[id]/pin/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findUnique: vi.fn(),
    },
    pinnedPrompt: {
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("POST /api/prompts/[id]/pin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/123/pin", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 for non-existent prompt", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue(null);
    vi.mocked(db.pinnedPrompt.findUnique).mockResolvedValue(null);
    vi.mocked(db.pinnedPrompt.count).mockResolvedValue(0);

    const request = new NextRequest("http://localhost:3000/api/prompts/123/pin", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Prompt not found");
  });

  it("should return 403 if user is not prompt author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({ authorId: "other_user", isPrivate: false } as never);
    vi.mocked(db.pinnedPrompt.findUnique).mockResolvedValue(null);
    vi.mocked(db.pinnedPrompt.count).mockResolvedValue(0);

    const request = new NextRequest("http://localhost:3000/api/prompts/123/pin", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You can only pin your own prompts");
  });

  it("should return 400 if prompt is already pinned", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({ authorId: "user1", isPrivate: false } as never);
    vi.mocked(db.pinnedPrompt.findUnique).mockResolvedValue({ id: "pin1" } as never);
    vi.mocked(db.pinnedPrompt.count).mockResolvedValue(1);

    const request = new NextRequest("http://localhost:3000/api/prompts/123/pin", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Prompt already pinned");
  });

  it("should return 400 if user reached pin limit", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({ authorId: "user1", isPrivate: false } as never);
    vi.mocked(db.pinnedPrompt.findUnique).mockResolvedValue(null);
    vi.mocked(db.pinnedPrompt.count).mockResolvedValue(3);

    const request = new NextRequest("http://localhost:3000/api/prompts/123/pin", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("You can only pin up to 3 prompts");
  });

  it("should create pin successfully", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({ authorId: "user1", isPrivate: false } as never);
    vi.mocked(db.pinnedPrompt.findUnique).mockResolvedValue(null);
    vi.mocked(db.pinnedPrompt.count).mockResolvedValue(1);
    vi.mocked(db.pinnedPrompt.aggregate).mockResolvedValue({ _max: { order: 0 } } as never);
    vi.mocked(db.pinnedPrompt.create).mockResolvedValue({} as never);

    const request = new NextRequest("http://localhost:3000/api/prompts/123/pin", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pinned).toBe(true);
    expect(db.pinnedPrompt.create).toHaveBeenCalledWith({
      data: {
        userId: "user1",
        promptId: "123",
        order: 1,
      },
    });
  });
});

describe("DELETE /api/prompts/[id]/pin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/123/pin", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should remove pin successfully", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.pinnedPrompt.deleteMany).mockResolvedValue({ count: 1 } as never);

    const request = new NextRequest("http://localhost:3000/api/prompts/123/pin", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pinned).toBe(false);
    expect(db.pinnedPrompt.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user1",
        promptId: "123",
      },
    });
  });
});
