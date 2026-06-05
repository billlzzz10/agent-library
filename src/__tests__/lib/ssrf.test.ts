import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should return false for valid public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://api.github.com/users/octocat")).toBe(false);
    expect(isPrivateUrl("http://example.com/image.jpg")).toBe(false);
    expect(isPrivateUrl("https://prompts.chat")).toBe(false);
  });

  it("should return true for localhost and loopback", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://localhost:3000")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1:8080")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://[::]")).toBe(true);
  });

  it("should return true for private IPv4 ranges", () => {
    // 10.0.0.0/8
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);

    // 192.168.0.0/16
    expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);

    // 169.254.0.0/16 (Link-local)
    expect(isPrivateUrl("http://169.254.0.1")).toBe(true);
  });

  it("should return true for internal hostnames", () => {
    expect(isPrivateUrl("http://my-service.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
  });

  it("should return true for IPv6 private/link-local ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::]")).toBe(true);
  });

  it("should return true for invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });

  it("should return false for empty or null input", () => {
    expect(isPrivateUrl("")).toBe(false);
    // @ts-ignore
    expect(isPrivateUrl(null)).toBe(false);
  });
});
