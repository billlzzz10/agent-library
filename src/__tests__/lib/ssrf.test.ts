import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/security";

describe("isPrivateUrl", () => {
  it("should block loopback addresses", () => {
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
  });

  it("should block private IPv4 ranges (RFC 1918)", () => {
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://192.168.1.1")).toBe(true);
  });

  it("should block CGNAT and benchmarking ranges", () => {
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true); // CGNAT
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true); // Benchmarking
    expect(isPrivateUrl("http://169.254.0.1")).toBe(true); // Link-local
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://myservice.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
  });

  it("should block private/reserved IPv6 ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::]")).toBe(true);
  });

  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://github.com/favicon.ico")).toBe(false);
    expect(isPrivateUrl("http://1.1.1.1")).toBe(false);
    expect(isPrivateUrl("https://8.8.8.8")).toBe(false);
  });

  it("should block invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
  });
});
