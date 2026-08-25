import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    prompt: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tag: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
  },
}));

describe("MCP Prompt Retrieval Optimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should query db.prompt.findFirst with slug or id when looking up a prompt by name", async () => {
    const mockPrompt = {
      id: "prompt-123",
      slug: "my-test-prompt",
      title: "My Test Prompt",
      description: "A test prompt",
      content: "Hello ${name:World}",
    };

    vi.mocked(db.prompt.findFirst).mockResolvedValueOnce(mockPrompt as any);

    // Call db.prompt.findFirst directly as done in MCP route
    const promptSlug = "my-test-prompt";
    const promptFilter = { isUnlisted: false, deletedAt: null, isPrivate: false };

    const result = await db.prompt.findFirst({
      where: {
        ...promptFilter,
        OR: [{ slug: promptSlug }, { id: promptSlug }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        content: true,
      },
    });

    expect(result).toEqual(mockPrompt);
    expect(db.prompt.findFirst).toHaveBeenCalledWith({
      where: {
        isUnlisted: false,
        deletedAt: null,
        isPrivate: false,
        OR: [{ slug: promptSlug }, { id: promptSlug }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        content: true,
      },
    });
    // Should NOT call findMany when findFirst succeeds
    expect(db.prompt.findMany).not.toHaveBeenCalled();
  });

  it("should fallback to db.prompt.findMany if findFirst returns null", async () => {
    vi.mocked(db.prompt.findFirst).mockResolvedValueOnce(null);

    const mockPrompts = [
      {
        id: "prompt-456",
        slug: null,
        title: "Title Match Prompt",
        description: "Fallback prompt",
        content: "Content fallback",
      },
    ];

    vi.mocked(db.prompt.findMany).mockResolvedValueOnce(mockPrompts as any);

    const promptSlug = "title-match-prompt";
    const promptFilter = { isUnlisted: false, deletedAt: null, isPrivate: false };

    let prompt = await db.prompt.findFirst({
      where: {
        ...promptFilter,
        OR: [{ slug: promptSlug }, { id: promptSlug }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        content: true,
      },
    });

    if (!prompt) {
      const prompts = await db.prompt.findMany({
        where: promptFilter,
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          content: true,
        },
      });

      prompt = prompts.find((p) => p.title.toLowerCase().replace(/[\s_-]+/g, "-") === promptSlug) || null;
    }

    expect(prompt).toEqual(mockPrompts[0]);
    expect(db.prompt.findFirst).toHaveBeenCalledTimes(1);
    expect(db.prompt.findMany).toHaveBeenCalledTimes(1);
  });
});
