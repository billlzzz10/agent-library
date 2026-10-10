import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/prompts/[id]/connections/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findUnique: vi.fn(),
    },
    promptConnection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("GET /api/prompts/[id]/connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 when prompt does not exist", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue(null);
    vi.mocked(db.promptConnection.findMany).mockResolvedValue([]);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/connections");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Prompt not found");
  });

  it("should return incoming and outgoing connections filtered by visibility", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "prompt-1",
      isPrivate: false,
      authorId: "user-1",
    } as any);

    const mockOutgoing = [
      {
        id: "conn-1",
        sourceId: "prompt-1",
        targetId: "prompt-2",
        label: "next",
        target: { id: "prompt-2", title: "P2", slug: "p2", isPrivate: false, authorId: "user-2" },
      },
      {
        id: "conn-2",
        sourceId: "prompt-1",
        targetId: "prompt-3",
        label: "next",
        target: { id: "prompt-3", title: "P3", slug: "p3", isPrivate: true, authorId: "user-3" },
      },
    ];

    const mockIncoming = [
      {
        id: "conn-3",
        sourceId: "prompt-4",
        targetId: "prompt-1",
        label: "parent",
        source: { id: "prompt-4", title: "P4", slug: "p4", isPrivate: true, authorId: "user-1" },
      },
    ];

    vi.mocked(db.promptConnection.findMany)
      .mockResolvedValueOnce(mockOutgoing as any)
      .mockResolvedValueOnce(mockIncoming as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/connections");
    const response = await GET(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.outgoing.length).toBe(1);
    expect(data.outgoing[0].id).toBe("conn-1");
    expect(data.incoming.length).toBe(1);
    expect(data.incoming[0].id).toBe("conn-3");
  });
});

describe("POST /api/prompts/[id]/connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/connections", {
      method: "POST",
      body: JSON.stringify({ targetId: "prompt-2", label: "next" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when connecting prompt to itself", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", role: "USER" } } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/connections", {
      method: "POST",
      body: JSON.stringify({ targetId: "prompt-1", label: "next" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Cannot connect a prompt to itself");
  });

  it("should return 404 if source prompt is missing", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", role: "USER" } } as any);
    vi.mocked(db.prompt.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "prompt-2", title: "Target", authorId: "user-1" } as any);
    vi.mocked(db.promptConnection.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/connections", {
      method: "POST",
      body: JSON.stringify({ targetId: "prompt-2", label: "next" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Source prompt not found");
  });

  it("should return 400 if connection already exists", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", role: "USER" } } as any);
    vi.mocked(db.prompt.findUnique)
      .mockResolvedValueOnce({ id: "prompt-1", authorId: "user-1" } as any)
      .mockResolvedValueOnce({ id: "prompt-2", title: "Target", authorId: "user-1" } as any);
    vi.mocked(db.promptConnection.findUnique).mockResolvedValue({ id: "conn-existing" } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/connections", {
      method: "POST",
      body: JSON.stringify({ targetId: "prompt-2", label: "next" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Connection already exists");
  });

  it("should create connection successfully", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", role: "USER" } } as any);
    vi.mocked(db.prompt.findUnique)
      .mockResolvedValueOnce({ id: "prompt-1", authorId: "user-1" } as any)
      .mockResolvedValueOnce({ id: "prompt-2", title: "Target", authorId: "user-1" } as any);
    vi.mocked(db.promptConnection.findUnique).mockResolvedValue(null);
    vi.mocked(db.promptConnection.findFirst).mockResolvedValue({ order: 2 } as any);
    vi.mocked(db.promptConnection.create).mockResolvedValue({
      id: "conn-new",
      sourceId: "prompt-1",
      targetId: "prompt-2",
      label: "next",
      order: 3,
      target: { id: "prompt-2", title: "Target", slug: "target" },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/connections", {
      method: "POST",
      body: JSON.stringify({ targetId: "prompt-2", label: "next" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "prompt-1" }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("conn-new");
    expect(data.order).toBe(3);
  });
});
