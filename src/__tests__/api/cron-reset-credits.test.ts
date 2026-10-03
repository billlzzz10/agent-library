import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST, GET } from "@/app/api/cron/reset-credits/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    $executeRaw: vi.fn(),
  },
}));

describe("POST /api/cron/reset-credits", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return 500 if CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const request = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Cron secret not configured");
  });

  it("should return 401 if authorization header is missing", async () => {
    process.env.CRON_SECRET = "super-secret-key-123";

    const request = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if secret does not match", async () => {
    process.env.CRON_SECRET = "super-secret-key-123";

    const request = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
      headers: {
        authorization: "Bearer wrong-secret-key-456",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if secret length does not match", async () => {
    process.env.CRON_SECRET = "super-secret-key-123";

    const request = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
      headers: {
        authorization: "Bearer short",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should succeed and reset credits when valid secret is provided", async () => {
    process.env.CRON_SECRET = "super-secret-key-123";
    vi.mocked(db.$executeRaw).mockResolvedValue(10);

    const request = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
      headers: {
        authorization: "Bearer super-secret-key-123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.usersUpdated).toBe(10);
  });

  it("should support GET request forwarding to POST", async () => {
    process.env.CRON_SECRET = "super-secret-key-123";
    vi.mocked(db.$executeRaw).mockResolvedValue(5);

    const request = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "GET",
      headers: {
        authorization: "Bearer super-secret-key-123",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
