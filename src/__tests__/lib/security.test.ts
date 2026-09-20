import { describe, expect, it, vi } from "vitest";
import { isPrivateIP, validateUrl } from "@/lib/security";

vi.mock("dns/promises", () => {
  const lookupFn = vi.fn(async (hostname: string) => {
    if (hostname === "localhost") return { address: "127.0.0.1" };
    if (hostname === "internal.service") return { address: "10.0.0.5" };
    if (hostname === "example.com") return { address: "93.184.216.34" };
    if (hostname === "carrier-nat.com") return { address: "100.64.0.1" };
    throw new Error("ENOTFOUND");
  });

  return {
    lookup: lookupFn,
    default: { lookup: lookupFn },
  };
});

describe("isPrivateIP", () => {
  it("detects private IPv4 addresses", () => {
    expect(isPrivateIP("10.0.0.1")).toBe(true);
    expect(isPrivateIP("172.16.0.1")).toBe(true);
    expect(isPrivateIP("172.31.255.255")).toBe(true);
    expect(isPrivateIP("192.168.1.100")).toBe(true);
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("169.254.1.1")).toBe(true);
    expect(isPrivateIP("0.0.0.0")).toBe(true);
  });

  it("detects carrier-grade NAT, test-net, benchmarking, and multicast ranges", () => {
    expect(isPrivateIP("100.64.0.1")).toBe(true);
    expect(isPrivateIP("192.0.2.1")).toBe(true);
    expect(isPrivateIP("198.51.100.1")).toBe(true);
    expect(isPrivateIP("203.0.113.1")).toBe(true);
    expect(isPrivateIP("198.18.0.1")).toBe(true);
    expect(isPrivateIP("224.0.0.1")).toBe(true);
    expect(isPrivateIP("240.0.0.1")).toBe(true);
  });

  it("detects private and loopback IPv6 addresses", () => {
    expect(isPrivateIP("::1")).toBe(true);
    expect(isPrivateIP("[::1]")).toBe(true);
    expect(isPrivateIP("::")).toBe(true);
    expect(isPrivateIP("fe80::1")).toBe(true);
    expect(isPrivateIP("fc00::1")).toBe(true);
    expect(isPrivateIP("fd00::1")).toBe(true);
    expect(isPrivateIP("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows public IP addresses", () => {
    expect(isPrivateIP("93.184.216.34")).toBe(false);
    expect(isPrivateIP("1.1.1.1")).toBe(false);
  });
});

describe("validateUrl", () => {
  it("rejects non-http/https protocols", async () => {
    await expect(validateUrl("file:///etc/passwd")).rejects.toThrow("Invalid protocol");
    await expect(validateUrl("gopher://example.com")).rejects.toThrow("Invalid protocol");
  });

  it("rejects bracketed IPv6 loopback and private literals", async () => {
    await expect(validateUrl("http://[::1]/path")).rejects.toThrow("restricted IP");
    await expect(validateUrl("http://[fe80::1]/path")).rejects.toThrow("restricted IP");
  });

  it("rejects private IPv4 literals and carrier-grade NAT", async () => {
    await expect(validateUrl("http://127.0.0.1/api")).rejects.toThrow("restricted IP");
    await expect(validateUrl("http://10.0.0.1/admin")).rejects.toThrow("restricted IP");
    await expect(validateUrl("http://100.64.1.1/internal")).rejects.toThrow("restricted IP");
  });

  it("rejects hostnames resolving to private IPs", async () => {
    await expect(validateUrl("http://localhost/test")).rejects.toThrow("restricted IP");
    await expect(validateUrl("http://internal.service/test")).rejects.toThrow("restricted IP");
    await expect(validateUrl("http://carrier-nat.com/test")).rejects.toThrow("restricted IP");
  });

  it("allows valid public URLs", async () => {
    await expect(validateUrl("https://example.com/api")).resolves.not.toThrow();
  });
});
