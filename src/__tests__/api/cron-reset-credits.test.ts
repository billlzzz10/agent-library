import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/cron/reset-credits/route";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    $executeRaw: vi.fn(),
  },
}));

describe("Cron Reset Credits Endpoint Security & Logic", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return 500 if CRON_SECRET environment variable is missing", async () => {
    delete process.env.CRON_SECRET;

    const request = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
      headers: { authorization: "Bearer some_secret" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Cron secret not configured");
  });

  it("should return 401 if authorization header is missing or empty", async () => {
    process.env.CRON_SECRET = "super_secret_cron_token_123";

    const request = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("should return 401 if provided secret does not match CRON_SECRET", async () => {
    process.env.CRON_SECRET = "super_secret_cron_token_123";

    const request = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
      headers: { authorization: "Bearer invalid_secret_token" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("should succeed and execute DB credit reset query when valid secret is provided", async () => {
    process.env.CRON_SECRET = "super_secret_cron_token_123";
    vi.mocked(db.$executeRaw).mockResolvedValue(10 as any);

    const request = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "POST",
      headers: { authorization: "Bearer super_secret_cron_token_123" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.usersUpdated).toBe(10);
    expect(db.$executeRaw).toHaveBeenCalled();
  });

  it("should handle GET requests in the same way as POST", async () => {
    process.env.CRON_SECRET = "super_secret_cron_token_123";
    vi.mocked(db.$executeRaw).mockResolvedValue(5 as any);

    const request = new NextRequest("http://localhost/api/cron/reset-credits", {
      method: "GET",
      headers: { authorization: "Bearer super_secret_cron_token_123" },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.usersUpdated).toBe(5);
  });
});
