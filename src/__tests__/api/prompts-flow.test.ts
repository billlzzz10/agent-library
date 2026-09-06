import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/prompts/[id]/flow/route";
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

describe("GET /api/prompts/[id]/flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 for non-existent prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/prompts/non-existent/flow");
    const response = await GET(request as never, { params: Promise.resolve({ id: "non-existent" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Prompt not found");
  });

  it("should return 404 when unauthorized user accesses private prompt flow", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as never);
    vi.mocked(db.prompt.findUnique).mockResolvedValue({
      id: "private-prompt",
      title: "Private Prompt",
      slug: "private-prompt",
      isPrivate: true,
      authorId: "owner-id",
    } as never);

    const request = new Request("http://localhost:3000/api/prompts/private-prompt/flow");
    const response = await GET(request as never, { params: Promise.resolve({ id: "private-prompt" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Prompt not found");
  });

  it("should return flow graph for public prompt", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.mocked(db.prompt.findUnique)
      .mockResolvedValueOnce({
        id: "public-prompt",
        title: "Public Prompt",
        slug: "public-prompt",
        isPrivate: false,
        authorId: "author-1",
      } as never)
      .mockResolvedValueOnce({
        id: "public-prompt",
        title: "Public Prompt",
        slug: "public-prompt",
        description: "Desc",
        content: "Content",
        type: "PROMPT",
        isPrivate: false,
        authorId: "author-1",
        author: { username: "author1", avatar: null },
      } as never);

    vi.mocked(db.promptConnection.findMany).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/prompts/public-prompt/flow");
    const response = await GET(request as never, { params: Promise.resolve({ id: "public-prompt" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentPromptId).toBe("public-prompt");
    expect(data.nodes.length).toBe(1);
    expect(data.nodes[0].id).toBe("public-prompt");
  });

  it("should allow owner to view private prompt flow", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "owner-id" } } as never);
    vi.mocked(db.prompt.findUnique)
      .mockResolvedValueOnce({
        id: "private-prompt",
        title: "Private Prompt",
        slug: "private-prompt",
        isPrivate: true,
        authorId: "owner-id",
      } as never)
      .mockResolvedValueOnce({
        id: "private-prompt",
        title: "Private Prompt",
        slug: "private-prompt",
        description: "Desc",
        content: "Content",
        type: "PROMPT",
        isPrivate: true,
        authorId: "owner-id",
        author: { username: "owner", avatar: null },
      } as never);

    vi.mocked(db.promptConnection.findMany).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/prompts/private-prompt/flow");
    const response = await GET(request as never, { params: Promise.resolve({ id: "private-prompt" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentPromptId).toBe("private-prompt");
    expect(data.nodes.length).toBe(1);
  });
});
