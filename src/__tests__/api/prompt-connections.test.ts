import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE, PATCH } from "@/app/api/prompts/[id]/connections/[connectionId]/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  db: {
    promptConnection: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("DELETE /api/prompts/[id]/connections/[connectionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt1/connections/conn1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "prompt1", connectionId: "conn1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if connection for private prompt belongs to another user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1", role: "USER" } } as any);
    vi.mocked(db.promptConnection.findUnique).mockResolvedValue({
      id: "conn1",
      sourceId: "prompt1",
      targetId: "prompt2",
      source: { authorId: "otherUser", isPrivate: true },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt1/connections/conn1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "prompt1", connectionId: "conn1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Connection not found");
  });

  it("should return 403 if public prompt connection belongs to another user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1", role: "USER" } } as any);
    vi.mocked(db.promptConnection.findUnique).mockResolvedValue({
      id: "conn1",
      sourceId: "prompt1",
      targetId: "prompt2",
      source: { authorId: "otherUser", isPrivate: false },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt1/connections/conn1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "prompt1", connectionId: "conn1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You can only delete connections from your own prompts");
  });

  it("should delete connection successfully for author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1", role: "USER" } } as any);
    vi.mocked(db.promptConnection.findUnique).mockResolvedValue({
      id: "conn1",
      sourceId: "prompt1",
      targetId: "prompt2",
      source: { authorId: "user1", isPrivate: true },
    } as any);
    vi.mocked(db.promptConnection.delete).mockResolvedValue({} as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt1/connections/conn1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "prompt1", connectionId: "conn1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(db.promptConnection.delete).toHaveBeenCalledWith({ where: { id: "conn1" } });
  });
});

describe("PATCH /api/prompts/[id]/connections/[connectionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if connection for private prompt belongs to another user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1", role: "USER" } } as any);
    vi.mocked(db.promptConnection.findUnique).mockResolvedValue({
      id: "conn1",
      sourceId: "prompt1",
      targetId: "prompt2",
      source: { authorId: "otherUser", isPrivate: true },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt1/connections/conn1", {
      method: "PATCH",
      body: JSON.stringify({ label: "Updated Label" }),
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "prompt1", connectionId: "conn1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Connection not found");
  });

  it("should update connection successfully for author", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1", role: "USER" } } as any);
    vi.mocked(db.promptConnection.findUnique).mockResolvedValue({
      id: "conn1",
      sourceId: "prompt1",
      targetId: "prompt2",
      source: { authorId: "user1", isPrivate: true },
    } as any);
    vi.mocked(db.promptConnection.update).mockResolvedValue({
      id: "conn1",
      label: "Updated Label",
      order: 0,
      target: { id: "prompt2", title: "Target Prompt", slug: "target-prompt" },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt1/connections/conn1", {
      method: "PATCH",
      body: JSON.stringify({ label: "Updated Label" }),
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "prompt1", connectionId: "conn1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.label).toBe("Updated Label");
  });
});
