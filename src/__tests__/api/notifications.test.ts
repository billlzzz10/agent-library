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
    it("should return default response if unauthenticated", async () => {
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

    it("should return default response on auth error", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth failed"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        pendingChangeRequests: 0,
        unreadComments: 0,
        commentNotifications: [],
      });
    });

    it("should fetch pending change requests and comment notifications in parallel", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as any);
      vi.mocked(db.changeRequest.count).mockResolvedValue(3);

      const mockNotifications = [
        {
          id: "notif1",
          type: "COMMENT",
          createdAt: new Date("2025-01-01"),
          actor: { id: "actor1", name: "Alice", username: "alice", avatar: null },
          promptId: "prompt1",
        },
      ];
      vi.mocked(db.notification.findMany).mockResolvedValue(mockNotifications as any);
      vi.mocked(db.prompt.findMany).mockResolvedValue([
        { id: "prompt1", title: "Test Prompt" },
      ] as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(db.changeRequest.count).toHaveBeenCalledWith({
        where: {
          status: "PENDING",
          prompt: { authorId: "user1" },
        },
      });
      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          read: false,
          type: { in: ["COMMENT", "REPLY"] },
        },
        include: {
          actor: {
            select: { id: true, name: true, username: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      expect(data.pendingChangeRequests).toBe(3);
      expect(data.unreadComments).toBe(1);
      expect(data.commentNotifications[0].promptTitle).toBe("Test Prompt");
    });

    it("should handle database error gracefully", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as any);
      vi.mocked(db.changeRequest.count).mockRejectedValue(new Error("DB error"));

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
    it("should return 401 if unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = new Request("http://localhost:3000/api/user/notifications", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should mark specific notifications as read if notificationIds provided", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as any);
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 2 } as any);

      const request = new Request("http://localhost:3000/api/user/notifications", {
        method: "POST",
        body: JSON.stringify({ notificationIds: ["n1", "n2"] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["n1", "n2"] },
          userId: "user1",
        },
        data: { read: true },
      });
    });

    it("should mark all notifications as read if no notificationIds provided", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as any);
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
          userId: "user1",
          read: false,
        },
        data: { read: true },
      });
    });

    it("should return 500 on database error during mark read", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as any);
      vi.mocked(db.notification.updateMany).mockRejectedValue(new Error("DB error"));

      const request = new Request("http://localhost:3000/api/user/notifications", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
