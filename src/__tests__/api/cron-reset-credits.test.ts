import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/cron/reset-credits/route";
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
    const req = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Cron secret not configured");
  });

  it("should return 401 if authorization header is missing or invalid", async () => {
    process.env.CRON_SECRET = "super-secret-token";

    const reqMissing = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
    });
    const resMissing = await POST(reqMissing);
    expect(resMissing.status).toBe(401);

    const reqInvalid = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
      headers: { authorization: "Bearer wrong-token" },
    });
    const resInvalid = await POST(reqInvalid);
    expect(resInvalid.status).toBe(401);
  });

  it("should reset credits and return 200 if valid authorization header is provided", async () => {
    process.env.CRON_SECRET = "super-secret-token";
    vi.mocked(db.$executeRaw).mockResolvedValueOnce(42);

    const req = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
      headers: { authorization: "Bearer super-secret-token" },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.usersUpdated).toBe(42);
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("should return 500 if database execution fails", async () => {
    process.env.CRON_SECRET = "super-secret-token";
    vi.mocked(db.$executeRaw).mockRejectedValueOnce(new Error("DB error"));

    const req = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
      headers: { authorization: "Bearer super-secret-token" },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to reset credits");
  });

  it("GET endpoint should delegate to POST handler", async () => {
    process.env.CRON_SECRET = "super-secret-token";
    vi.mocked(db.$executeRaw).mockResolvedValueOnce(10);

    const req = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "GET",
      headers: { authorization: "Bearer super-secret-token" },
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.usersUpdated).toBe(10);
  });
});
