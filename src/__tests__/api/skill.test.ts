import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/prompts/[id]/skill/route";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

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

  it("should return 404 if skill not found", async () => {
    vi.mocked(db.prompt.findFirst).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/prompts/unknown/skill");
    const response = await GET(req, { params: Promise.resolve({ id: "unknown" }) });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Skill not found");
  });

  it("should return zip file and sanitize double quotes and control characters in filename header", async () => {
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "skill-1",
      slug: 'my-skill-"injected"\r\nHeader: bad',
      title: 'My Skill "Injected"',
      description: "Test description",
      content: "Skill content",
    } as never);

    const req = new NextRequest("http://localhost:3000/api/prompts/skill-1/skill");
    const response = await GET(req, { params: Promise.resolve({ id: "skill-1" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/octet-stream");

    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).not.toBeNull();
    expect(disposition).toContain('filename="my-skill-_injected___Header: bad.skill"');
    expect(disposition).not.toContain("\r");
    expect(disposition).not.toContain("\n");
    expect(disposition).not.toContain('"injected"');
  });

  it("should fallback to sanitized title if slug is missing", async () => {
    vi.mocked(db.prompt.findFirst).mockResolvedValue({
      id: "skill-2",
      slug: null,
      title: "My Special Skill!",
      description: "Test description",
      content: "Skill content",
    } as never);

    const req = new NextRequest("http://localhost:3000/api/prompts/skill-2/skill");
    const response = await GET(req, { params: Promise.resolve({ id: "skill-2" }) });

    expect(response.status).toBe(200);
    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain('filename="my-special-skill.skill"');
  });
});
