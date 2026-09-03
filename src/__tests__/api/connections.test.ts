import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/prompts/[id]/connections/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findUnique: vi.fn(),
    },
    promptConnection: {
      findMany: vi.fn(),
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

  it("should return 404 for non-existent prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/prompts/non-existent/connections");
    const response = await GET(request, { params: Promise.resolve({ id: "non-existent" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Prompt not found");
  });

  it("should return 404 for private prompt when requested by unauthorized user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "private-prompt-1",
      isPrivate: true,
      authorId: "owner-user",
    } as never);

    const request = new Request(
      "http://localhost:3000/api/prompts/private-prompt-1/connections"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "private-prompt-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Prompt not found");
    expect(db.promptConnection.findMany).not.toHaveBeenCalled();
  });

  it("should return 404 for private prompt when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "private-prompt-1",
      isPrivate: true,
      authorId: "owner-user",
    } as never);

    const request = new Request(
      "http://localhost:3000/api/prompts/private-prompt-1/connections"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "private-prompt-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Prompt not found");
    expect(db.promptConnection.findMany).not.toHaveBeenCalled();
  });

  it("should return connections for public prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "public-prompt-1",
      isPrivate: false,
      authorId: "owner-user",
    } as never);
    vi.mocked(db.promptConnection.findMany)
      .mockResolvedValueOnce([
        {
          id: "conn-1",
          sourceId: "public-prompt-1",
          targetId: "public-prompt-2",
          label: "next",
          order: 0,
          target: {
            id: "public-prompt-2",
            title: "Target Prompt",
            slug: "target-prompt",
            isPrivate: false,
            authorId: "owner-user",
          },
        },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const request = new Request("http://localhost:3000/api/prompts/public-prompt-1/connections");
    const response = await GET(request, {
      params: Promise.resolve({ id: "public-prompt-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.outgoing).toHaveLength(1);
    expect(data.incoming).toHaveLength(0);
  });

  it("should return connections for private prompt when requested by author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "owner-user" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "private-prompt-1",
      isPrivate: true,
      authorId: "owner-user",
    } as never);
    vi.mocked(db.promptConnection.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request = new Request(
      "http://localhost:3000/api/prompts/private-prompt-1/connections"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "private-prompt-1" }),
    });

    expect(response.status).toBe(200);
  });
});
