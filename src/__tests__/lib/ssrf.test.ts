import { describe, it, expect } from "vitest";
import { isPrivateUrl } from "@/lib/webhook";

describe("isPrivateUrl", () => {
  it("should allow public URLs", () => {
    expect(isPrivateUrl("https://google.com")).toBe(false);
    expect(isPrivateUrl("https://prompts.chat")).toBe(false);
    expect(isPrivateUrl("https://github.com/abc")).toBe(false);
  });

  it("should block localhost and variations", () => {
    expect(isPrivateUrl("http://localhost")).toBe(true);
    expect(isPrivateUrl("http://localhost:3000")).toBe(true);
    expect(isPrivateUrl("http://127.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://127.0.1.1")).toBe(true);
    expect(isPrivateUrl("http://0.0.0.0")).toBe(true);
    expect(isPrivateUrl("http://[::1]")).toBe(true);
    expect(isPrivateUrl("http://[::]")).toBe(true);
  });

  it("should block private IPv4 ranges", () => {
    // 10.0.0.0/8
    expect(isPrivateUrl("http://10.0.0.1")).toBe(true);
    expect(isPrivateUrl("http://10.255.255.255")).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl("http://172.16.0.1")).toBe(true);
    expect(isPrivateUrl("http://172.31.255.255")).toBe(true);
    expect(isPrivateUrl("http://172.32.0.1")).toBe(false);

    // 192.168.0.0/16
    expect(isPrivateUrl("http://192.168.0.1")).toBe(true);
    expect(isPrivateUrl("http://192.168.255.255")).toBe(true);

    // 169.254.0.0/16 (Link-local)
    expect(isPrivateUrl("http://169.254.169.254")).toBe(true);
  });

  it("should block internal hostnames", () => {
    expect(isPrivateUrl("http://server.local")).toBe(true);
    expect(isPrivateUrl("http://database.internal")).toBe(true);
    expect(isPrivateUrl("http://test.localhost")).toBe(true);
  });

  it("should block IPv6 private ranges", () => {
    expect(isPrivateUrl("http://[fe80::1]")).toBe(true);
    expect(isPrivateUrl("http://[fc00::]")).toBe(true);
    expect(isPrivateUrl("http://[fd00::]")).toBe(true);
  });

  it("should block reserved ranges to be added", () => {
    // CGNAT 100.64.0.0/10
    expect(isPrivateUrl("http://100.64.0.1")).toBe(true);
    // Benchmarking 198.18.0.0/15
    expect(isPrivateUrl("http://198.18.0.1")).toBe(true);
  });

  it("should block alternative IP formats", () => {
    // Decimal/Dword: http://2130706433 -> 127.0.0.1
    expect(isPrivateUrl("http://2130706433")).toBe(true);
    // Octal: http://0177.0.0.1 -> 127.0.0.1
    expect(isPrivateUrl("http://0177.0.0.1")).toBe(true);
    // Hex: http://0x7f.0.0.1 -> 127.0.0.1
    expect(isPrivateUrl("http://0x7f.0.0.1")).toBe(true);
    // Compressed: http://127.1 -> 127.0.0.1
    expect(isPrivateUrl("http://127.1")).toBe(true);
  });

  it("should handle invalid URLs", () => {
    expect(isPrivateUrl("not-a-url")).toBe(true);
  });
});
