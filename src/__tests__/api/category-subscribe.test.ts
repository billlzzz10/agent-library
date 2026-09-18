import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, DELETE } from "@/app/api/categories/[id]/subscribe/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  db: {
    category: {
      findUnique: vi.fn(),
    },
    categorySubscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("POST /api/categories/[id]/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const request = new NextRequest("http://localhost:3000/api/categories/cat1/subscribe", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "cat1" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("unauthorized");
  });

  it("should return 404 for non-existent category", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.category.findUnique).mockResolvedValue(null);
    vi.mocked(db.categorySubscription.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/categories/cat1/subscribe", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "cat1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("not_found");
  });

  it("should return 400 if already subscribed", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.category.findUnique).mockResolvedValue({ id: "cat1" } as never);
    vi.mocked(db.categorySubscription.findUnique).mockResolvedValue({ id: "sub1" } as never);

    const request = new NextRequest("http://localhost:3000/api/categories/cat1/subscribe", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "cat1" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("already_subscribed");
  });

  it("should create subscription successfully when valid", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.category.findUnique).mockResolvedValue({ id: "cat1" } as never);
    vi.mocked(db.categorySubscription.findUnique).mockResolvedValue(null);
    vi.mocked(db.categorySubscription.create).mockResolvedValue({
      category: { id: "cat1", name: "Coding", slug: "coding" },
    } as never);

    const request = new NextRequest("http://localhost:3000/api/categories/cat1/subscribe", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "cat1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscribed).toBe(true);
    expect(data.category).toEqual({ id: "cat1", name: "Coding", slug: "coding" });
    expect(db.categorySubscription.create).toHaveBeenCalledWith({
      data: {
        userId: "user1",
        categoryId: "cat1",
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  });
});

describe("DELETE /api/categories/[id]/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const request = new NextRequest("http://localhost:3000/api/categories/cat1/subscribe", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "cat1" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("unauthorized");
  });

  it("should unsubscribe successfully", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.categorySubscription.deleteMany).mockResolvedValue({ count: 1 } as never);

    const request = new NextRequest("http://localhost:3000/api/categories/cat1/subscribe", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "cat1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscribed).toBe(false);
    expect(db.categorySubscription.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user1",
        categoryId: "cat1",
      },
    });
  });
});
