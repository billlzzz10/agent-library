import { describe, it, expect } from 'vitest';
import { isPrivateUrl } from '../../lib/security';

describe('isPrivateUrl', () => {
  it('should allow public URLs', () => {
    expect(isPrivateUrl('https://google.com')).toBe(false);
    expect(isPrivateUrl('https://example.com/image.jpg')).toBe(false);
    expect(isPrivateUrl('http://1.1.1.1')).toBe(false);
    expect(isPrivateUrl('https://8.8.8.8/test')).toBe(false);
  });

  it('should block loopback addresses', () => {
    expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.2')).toBe(true);
    expect(isPrivateUrl('http://127.255.255.255')).toBe(true);
    expect(isPrivateUrl('http://localhost')).toBe(true);
    expect(isPrivateUrl('http://[::1]')).toBe(true);
  });

  it('should block private IPv4 ranges (RFC 1918)', () => {
    // 10.0.0.0/8
    expect(isPrivateUrl('http://10.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://10.255.255.255')).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl('http://172.16.0.1')).toBe(true);
    expect(isPrivateUrl('http://172.31.255.255')).toBe(true);
    expect(isPrivateUrl('http://172.15.255.255')).toBe(false);
    expect(isPrivateUrl('http://172.32.0.0')).toBe(false);

    // 192.168.0.0/16
    expect(isPrivateUrl('http://192.168.0.1')).toBe(true);
    expect(isPrivateUrl('http://192.168.255.255')).toBe(true);
  });

  it('should block other reserved IPv4 ranges', () => {
    // 169.254.0.0/16 (Link-local)
    expect(isPrivateUrl('http://169.254.1.1')).toBe(true);

    // 0.0.0.0/8
    expect(isPrivateUrl('http://0.0.0.0')).toBe(true);
    expect(isPrivateUrl('http://0.255.255.255')).toBe(true);

    // 100.64.0.0/10 (CGNAT)
    expect(isPrivateUrl('http://100.64.0.1')).toBe(true);
    expect(isPrivateUrl('http://100.127.255.255')).toBe(true);

    // 198.18.0.0/15 (Benchmarking)
    expect(isPrivateUrl('http://198.18.0.1')).toBe(true);
    expect(isPrivateUrl('http://198.19.255.255')).toBe(true);

    // Test-nets
    expect(isPrivateUrl('http://192.0.2.1')).toBe(true);
    expect(isPrivateUrl('http://198.51.100.1')).toBe(true);
    expect(isPrivateUrl('http://203.0.113.1')).toBe(true);
  });

  it('should block internal hostnames', () => {
    expect(isPrivateUrl('http://api.local')).toBe(true);
    expect(isPrivateUrl('http://service.internal')).toBe(true);
    expect(isPrivateUrl('http://database.localhost')).toBe(true);
  });

  it('should block private/reserved IPv6 ranges', () => {
    expect(isPrivateUrl('http://[fe80::1]')).toBe(true); // Link-local
    expect(isPrivateUrl('http://[fc00::1]')).toBe(true); // Unique local
    expect(isPrivateUrl('http://[fd00::1]')).toBe(true); // Unique local
  });

  it('should block IPv4-mapped IPv6 addresses', () => {
    expect(isPrivateUrl('http://[::ffff:127.0.0.1]')).toBe(true);
    expect(isPrivateUrl('http://[::ffff:10.0.0.1]')).toBe(true);
    expect(isPrivateUrl('http://[::ffff:7f00:1]')).toBe(true); // 127.0.0.1
    expect(isPrivateUrl('http://[::ffff:a00:1]')).toBe(true); // 10.0.0.1
  });

  it('should handle malformed URLs and non-http(s) protocols', () => {
    expect(isPrivateUrl('not-a-url')).toBe(true);
    expect(isPrivateUrl('ftp://example.com')).toBe(true);
    expect(isPrivateUrl('file:///etc/passwd')).toBe(true);
    expect(isPrivateUrl('javascript:alert(1)')).toBe(true);
  });

  it('should handle trailing dots in hostnames', () => {
    expect(isPrivateUrl('http://127.0.0.1.')).toBe(true);
    expect(isPrivateUrl('https://google.com.')).toBe(false);
  });
});
