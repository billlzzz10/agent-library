import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should block non-http/https protocols", () => {
    expect(isPrivateUrl("file:///etc/passwd")).toBe(true);
    expect(isPrivateUrl("gopher://localhost")).toBe(true);
    expect(isPrivateUrl("ftp://1.1.1.1")).toBe(true);
    expect(isPrivateUrl("php://filter/read=convert.base64-encode/resource=index.php")).toBe(true);
    expect(isPrivateUrl("data:text/plain;base64,SGVsbG8=")).toBe(true);
  });

  it("should block loopback addresses", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("https://localhost:8080")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.2")).toBe(true);
    expect(isPrivateUrl("http://127.1")).toBe(true); // Shortened notation might be handled by URL parser
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://[0:0:0:0:0:0:0:1]")).toBe(true);
  });

  it("should block private IPv4 ranges (RFC 1918)", () => {
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.254")).toBe(true);
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.254")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.255.254")).toBe(true);
  });

  it("should block CGNAT range", () => {
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    expect(isPrivateUrl("http://100.127.255.254")).toBe(true);
  });

  it("should block link-local addresses", () => {
    expect(isPrivateUrl("http://169.254.169.254")).toBe(true);
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
  });

  it("should block documentation and reserved ranges", () => {
    expect(isPrivateUrl("http://192.0.2.1")).toBe(true); // TEST-NET-1
    expect(isPrivateUrl("http://198.51.100.1")).toBe(true); // TEST-NET-2
    expect(isPrivateUrl("http://203.0.113.1")).toBe(true); // TEST-NET-3
    expect(isPrivateUrl("http://240.0.0.1")).toBe(true); // Reserved
    expect(isPrivateUrl("http://[2001:db8::1]")).toBe(true); // IPv6 Documentation
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://myapi.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://service.localhost")).toBe(true);
  });

  it("should block multicast addresses", () => {
    expect(isPrivateUrl("http://224.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://[ff02::1]")).toBe(true);
  });

  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("http://example.com/path?query=1")).toBe(false);
    expect(isPrivateUrl("https://github.com/prompts-chat")).toBe(false);
    expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
    expect(isPrivateUrl("http://8.8.8.8")).toBe(false);
  });

  it("should handle trailing dots correctly", () => {
    expect(isPrivateUrl("https://google.com.")).toBe(false);
    expect(isPrivateUrl("http://localhost.")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1.")).toBe(true);
  });

  it("should be secure by default on invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
    expect(isPrivateUrl("")).toBe(true);
  });
});
