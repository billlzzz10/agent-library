import { describe, it, expect } from 'vitest';
import { isPrivateUrl } from '../../lib/security';

describe('isPrivateUrl', () => {
  it('should block localhost and loopback IPv4', () => {
    expect(isPrivateUrl('http://localhost')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.2')).toBe(true);
    expect(isPrivateUrl('http://127.255.255.255')).toBe(true);
  });

  it('should block private IPv4 ranges (RFC 1918)', () => {
    expect(isPrivateUrl('http://10.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://172.16.0.1')).toBe(true);
    expect(isPrivateUrl('http://172.31.255.255')).toBe(true);
    expect(isPrivateUrl('http://192.168.1.1')).toBe(true);
  });

  it('should block link-local and carrier-grade NAT', () => {
    expect(isPrivateUrl('http://169.254.169.254')).toBe(true);
    expect(isPrivateUrl('http://100.64.0.1')).toBe(true);
    expect(isPrivateUrl('http://100.127.255.255')).toBe(true);
  });

  it('should block benchmarking and multicast', () => {
    expect(isPrivateUrl('http://198.18.0.1')).toBe(true);
    expect(isPrivateUrl('http://224.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://240.0.0.1')).toBe(true);
  });

  it('should block internal hostnames', () => {
    expect(isPrivateUrl('http://server.local')).toBe(true);
    expect(isPrivateUrl('http://database.internal')).toBe(true);
    expect(isPrivateUrl('http://test.localhost')).toBe(true);
    expect(isPrivateUrl('http://internal')).toBe(true);
  });

  it('should block loopback and private IPv6', () => {
    expect(isPrivateUrl('http://[::1]')).toBe(true);
    expect(isPrivateUrl('http://[::]')).toBe(true);
    expect(isPrivateUrl('http://[fe80::1]')).toBe(true);
    expect(isPrivateUrl('http://[fc00::1]')).toBe(true);
    expect(isPrivateUrl('http://[fd00::1]')).toBe(true);
    expect(isPrivateUrl('http://[ff02::1]')).toBe(true);
  });

  it('should block IPv4-mapped IPv6 addresses', () => {
    expect(isPrivateUrl('http://[::ffff:127.0.0.1]')).toBe(true);
    expect(isPrivateUrl('http://[::ffff:10.0.0.1]')).toBe(true);
    // Hex-encoded loopback in IPv6 (127.0.0.1 is 7f.00.00.01)
    expect(isPrivateUrl('http://[::ffff:7f00:1]')).toBe(true);
  });

  it('should allow public URLs', () => {
    expect(isPrivateUrl('https://google.com')).toBe(false);
    expect(isPrivateUrl('https://github.com/bl1nk-bot')).toBe(false);
    expect(isPrivateUrl('http://8.8.8.8')).toBe(false);
    expect(isPrivateUrl('https://prompts.chat')).toBe(false);
  });

  it('should handle invalid URLs by blocking them', () => {
    expect(isPrivateUrl('not-a-url')).toBe(true);
    expect(isPrivateUrl('')).toBe(true);
  });
});
