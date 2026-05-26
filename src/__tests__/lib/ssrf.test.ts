import { describe, it, expect } from 'vitest';
import { isPrivateUrl } from '@/lib/ssrf';

describe('isPrivateUrl', () => {
  it('should block localhost and loopback', () => {
    expect(isPrivateUrl('http://localhost')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.2')).toBe(true);
    expect(isPrivateUrl('http://127.255.255.255')).toBe(true);
    expect(isPrivateUrl('http://[::1]')).toBe(true);
    expect(isPrivateUrl('http://0.0.0.0')).toBe(true);
  });

  it('should block RFC1918 private ranges', () => {
    // 10.0.0.0/8
    expect(isPrivateUrl('http://10.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://10.255.255.254')).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl('http://172.16.0.1')).toBe(true);
    expect(isPrivateUrl('http://172.31.255.254')).toBe(true);

    // 192.168.0.0/16
    expect(isPrivateUrl('http://192.168.0.1')).toBe(true);
    expect(isPrivateUrl('http://192.168.255.254')).toBe(true);
  });

  it('should block link-local and other reserved ranges', () => {
    expect(isPrivateUrl('http://169.254.0.1')).toBe(true);
    expect(isPrivateUrl('http://100.64.0.1')).toBe(true); // CGNAT
    expect(isPrivateUrl('http://198.18.0.1')).toBe(true); // Benchmarking
    expect(isPrivateUrl('http://224.0.0.1')).toBe(true); // Multicast
  });

  it('should block internal hostnames', () => {
    expect(isPrivateUrl('http://test.local')).toBe(true);
    expect(isPrivateUrl('http://api.internal')).toBe(true);
    expect(isPrivateUrl('http://dev.localhost')).toBe(true);
    expect(isPrivateUrl('http://local')).toBe(true);
    expect(isPrivateUrl('http://internal')).toBe(true);
  });

  it('should block various IP formats (normalized by Node URL)', () => {
    expect(isPrivateUrl('http://0177.0.0.1')).toBe(true); // Octal
    expect(isPrivateUrl('http://0x7f.0x0.0x0.0x1')).toBe(true); // Hex
    expect(isPrivateUrl('http://2130706433')).toBe(true); // Decimal
    expect(isPrivateUrl('http://[::ffff:127.0.0.1]')).toBe(true); // IPv4-mapped loopback
  });

  it('should block IPv6 private ranges', () => {
    expect(isPrivateUrl('http://[::]')).toBe(true);
    expect(isPrivateUrl('http://[fe80::1]')).toBe(true);
    expect(isPrivateUrl('http://[fc00::1]')).toBe(true);
    expect(isPrivateUrl('http://[fd00::1]')).toBe(true);
  });

  it('should allow public URLs', () => {
    expect(isPrivateUrl('https://google.com')).toBe(false);
    expect(isPrivateUrl('https://github.com/bl1nk-bot')).toBe(false);
    expect(isPrivateUrl('https://8.8.8.8')).toBe(false);
    expect(isPrivateUrl('https://1.1.1.1')).toBe(false);
  });

  it('should handle invalid URLs safely', () => {
    expect(isPrivateUrl('not-a-url')).toBe(true);
    expect(isPrivateUrl('')).toBe(true);
    // @ts-expect-error testing null
    expect(isPrivateUrl(null)).toBe(true);
  });
});
