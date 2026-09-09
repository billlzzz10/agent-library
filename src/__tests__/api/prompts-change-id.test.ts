import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/prompts/[id]/changes/[changeId]/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    changeRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    promptVersion: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("GET /api/prompts/[id]/changes/[changeId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if change request does not exist", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.changeRequest.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/prompts/p1/changes/c1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "p1", changeId: "c1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 if change request belongs to a different prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.changeRequest.findUnique).mockResolvedValue({
      id: "c1",
      promptId: "p2",
      prompt: {
        id: "p2",
        title: "P2 Title",
        content: "P2 Content",
        isPrivate: false,
        authorId: "user2",
        deletedAt: null,
      },
    } as any);

    const request = new Request("http://localhost:3000/api/prompts/p1/changes/c1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "p1", changeId: "c1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 if the prompt is soft-deleted", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.changeRequest.findUnique).mockResolvedValue({
      id: "c1",
      promptId: "p1",
      prompt: {
        id: "p1",
        title: "P1 Title",
        content: "P1 Content",
        isPrivate: false,
        authorId: "user1",
        deletedAt: new Date(),
      },
    } as any);

    const request = new Request("http://localhost:3000/api/prompts/p1/changes/c1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "p1", changeId: "c1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 for private prompt if user is unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.changeRequest.findUnique).mockResolvedValue({
      id: "c1",
      promptId: "p1",
      prompt: {
        id: "p1",
        title: "P1 Title",
        content: "P1 Content",
        isPrivate: true,
        authorId: "user1",
        deletedAt: null,
      },
    } as any);

    const request = new Request("http://localhost:3000/api/prompts/p1/changes/c1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "p1", changeId: "c1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 404 for private prompt if logged-in user is not the prompt author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user2" } } as any);
    vi.mocked(db.changeRequest.findUnique).mockResolvedValue({
      id: "c1",
      promptId: "p1",
      prompt: {
        id: "p1",
        title: "P1 Title",
        content: "P1 Content",
        isPrivate: true,
        authorId: "user1",
        deletedAt: null,
      },
    } as any);

    const request = new Request("http://localhost:3000/api/prompts/p1/changes/c1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "p1", changeId: "c1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return change request for private prompt if user is prompt author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as any);
    vi.mocked(db.changeRequest.findUnique).mockResolvedValue({
      id: "c1",
      promptId: "p1",
      prompt: {
        id: "p1",
        title: "P1 Title",
        content: "P1 Content",
        isPrivate: true,
        authorId: "user1",
        deletedAt: null,
      },
    } as any);

    const request = new Request("http://localhost:3000/api/prompts/p1/changes/c1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "p1", changeId: "c1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("c1");
  });

  it("should return change request for public prompt to any user", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.changeRequest.findUnique).mockResolvedValue({
      id: "c1",
      promptId: "p1",
      prompt: {
        id: "p1",
        title: "P1 Title",
        content: "P1 Content",
        isPrivate: false,
        authorId: "user1",
        deletedAt: null,
      },
    } as any);

    const request = new Request("http://localhost:3000/api/prompts/p1/changes/c1");
    const response = await GET(request, {
      params: Promise.resolve({ id: "p1", changeId: "c1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("c1");
  });
});
