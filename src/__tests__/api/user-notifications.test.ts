import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/user/notifications/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    changeRequest: {
      count: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    prompt: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/user/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default response when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      pendingChangeRequests: 0,
      unreadComments: 0,
      commentNotifications: [],
    });
  });

  it("parallelizes database queries and returns formatted notifications when authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    } as any);

    vi.mocked(db.changeRequest.count).mockResolvedValue(3);
    vi.mocked(db.notification.findMany).mockResolvedValue([
      {
        id: "notif-1",
        type: "COMMENT",
        createdAt: new Date("2025-01-01"),
        actor: { id: "actor-1", name: "Actor", username: "actor", avatar: null },
        promptId: "prompt-1",
        userId: "user-1",
        read: false,
      },
    ] as any);

    vi.mocked(db.prompt.findMany).mockResolvedValue([
      { id: "prompt-1", title: "Test Prompt" },
    ] as any);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(db.changeRequest.count).toHaveBeenCalledWith({
      where: {
        status: "PENDING",
        prompt: {
          authorId: "user-1",
        },
      },
    });
    expect(db.notification.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        read: false,
        type: { in: ["COMMENT", "REPLY"] },
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    expect(data.pendingChangeRequests).toBe(3);
    expect(data.unreadComments).toBe(1);
    expect(data.commentNotifications).toHaveLength(1);
    expect(data.commentNotifications[0]).toEqual({
      id: "notif-1",
      type: "COMMENT",
      createdAt: "2025-01-01T00:00:00.000Z",
      actor: { id: "actor-1", name: "Actor", username: "actor", avatar: null },
      promptId: "prompt-1",
      promptTitle: "Test Prompt",
    });
  });
});

describe("POST /api/user/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const req = new Request("http://localhost/api/user/notifications", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("marks specific notifications as read when notificationIds array provided", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);

    vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 2 } as any);

    const req = new Request("http://localhost/api/user/notifications", {
      method: "POST",
      body: JSON.stringify({ notificationIds: ["notif-1", "notif-2"] }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["notif-1", "notif-2"] },
        userId: "user-1",
      },
      data: { read: true },
    });
  });
});
