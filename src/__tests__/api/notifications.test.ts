import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/user/notifications/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

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

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("/api/user/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns default response when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        pendingChangeRequests: 0,
        unreadComments: 0,
        commentNotifications: [],
      });
    });

    it("returns counts and formatted notifications when authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
      vi.mocked(db.changeRequest.count).mockResolvedValue(3);
      vi.mocked(db.notification.findMany).mockResolvedValue([
        {
          id: "notif-1",
          type: "COMMENT",
          createdAt: new Date("2025-01-01"),
          actor: {
            id: "actor-1",
            name: "Jane Doe",
            username: "janedoe",
            avatar: "https://example.com/avatar.png",
          },
          promptId: "prompt-1",
        },
      ] as any);
      vi.mocked(db.prompt.findMany).mockResolvedValue([
        { id: "prompt-1", title: "Awesome Prompt" },
      ] as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pendingChangeRequests).toBe(3);
      expect(data.unreadComments).toBe(1);
      expect(data.commentNotifications).toHaveLength(1);
      expect(data.commentNotifications[0]).toEqual({
        id: "notif-1",
        type: "COMMENT",
        createdAt: "2025-01-01T00:00:00.000Z",
        actor: {
          id: "actor-1",
          name: "Jane Doe",
          username: "janedoe",
          avatar: "https://example.com/avatar.png",
        },
        promptId: "prompt-1",
        promptTitle: "Awesome Prompt",
      });

      // Verify parallel DB queries were initiated
      expect(db.changeRequest.count).toHaveBeenCalledWith({
        where: {
          status: "PENDING",
          prompt: {
            authorId: "user-123",
          },
        },
      });
      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
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
    });

    it("returns default response when db error occurs", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
      vi.mocked(db.changeRequest.count).mockRejectedValue(new Error("DB Connection Error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        pendingChangeRequests: 0,
        unreadComments: 0,
        commentNotifications: [],
      });
    });
  });

  describe("POST", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = new Request("http://localhost:3000/api/user/notifications", {
        method: "POST",
        body: JSON.stringify({ notificationIds: ["notif-1"] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("marks specific notifications as read when notificationIds provided", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 2 } as any);

      const request = new Request("http://localhost:3000/api/user/notifications", {
        method: "POST",
        body: JSON.stringify({ notificationIds: ["notif-1", "notif-2"] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["notif-1", "notif-2"] },
          userId: "user-123",
        },
        data: { read: true },
      });
    });

    it("marks all unread notifications as read when notificationIds omitted", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 5 } as any);

      const request = new Request("http://localhost:3000/api/user/notifications", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          read: false,
        },
        data: { read: true },
      });
    });
  });
});
