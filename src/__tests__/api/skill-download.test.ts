import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/prompts/[id]/skill/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findFirst: vi.fn(),
    },
  },
}));

describe("GET /api/prompts/[id]/skill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 when skill prompt is not found", async () => {
    vi.mocked(db.prompt.findFirst).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/prompts/123/skill");
    const response = await GET(request, { params: Promise.resolve({ id: "123" }) });

    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toBe("Skill not found");
  });

  it("should sanitize unsafe characters in prompt slug for Content-Disposition header", async () => {
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "123",
      slug: 'my-slug"\r\nHeader: injected',
      title: "My Skill",
      description: "Description",
      content: "Skill content",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/123/skill");
    const response = await GET(request, { params: Promise.resolve({ id: "123" }) });

    expect(response.status).toBe(200);
    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toBe('attachment; filename="my-slug___Header: injected.skill"');
    expect(disposition).not.toContain("\r");
    expect(disposition).not.toContain("\n");
  });
});
