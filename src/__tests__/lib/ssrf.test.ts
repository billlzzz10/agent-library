import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/webhook";

describe("isPrivateUrl", () => {
  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("http://example.com/image.jpg")).toBe(false);
    expect(isPrivateUrl("https://api.github.com/users/octocat")).toBe(false);
  });

  it("should block loopback addresses", () => {
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.1.1")).toBe(true);
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
  });

  it("should block private IP ranges", () => {
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
  });

  it("should block link-local addresses", () => {
    expect(isPrivateUrl("http://169.254.169.254")).toBe(true);
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://server.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
  });

  it("should block malformed URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("http://")).toBe(true);
  });

  // Current implementation gaps to be fixed:
  it("should block IPv4-mapped IPv6 loopback", () => {
    // This currently might pass if not handled
    expect(isPrivateUrl("http://[::ffff:127.0.0.1]")).toBe(true);
  });

  it("should block benchmarking ranges", () => {
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
  });

  it("should block FQDN bypasses", () => {
    expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
    expect(isPrivateUrl("http://localhost.")).toBe(true);
  });

  it("should block non-http/https protocols", () => {
    expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
    expect(isPrivateUrl("gopher://localhost")).toBe(true);
    expect(isPrivateUrl("ftp://example.com")).toBe(true);
  });
});
