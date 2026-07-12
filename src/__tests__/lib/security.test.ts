import { describe, it, expect } from 'vitest';
import { isPrivateUrl } from '../../lib/security';

describe('isPrivateUrl', () => {
  it('should block localhost and loopback', () => {
    expect(isPrivateUrl('http://localhost')).toBe(true);
    expect(isPrivateUrl('http://localhost:3000')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.2')).toBe(true);
    expect(isPrivateUrl('http://127.255.255.255')).toBe(true);
    expect(isPrivateUrl('http://[::1]')).toBe(true);
  });

  it('should block private IPv4 ranges', () => {
    // 10.0.0.0/8
    expect(isPrivateUrl('http://10.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://10.255.255.255')).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateUrl('http://172.16.0.1')).toBe(true);
    expect(isPrivateUrl('http://172.31.255.255')).toBe(true);

    // 192.168.0.0/16
    expect(isPrivateUrl('http://192.168.0.1')).toBe(true);
    expect(isPrivateUrl('http://192.168.255.255')).toBe(true);
  });

  it('should block link-local and reserved ranges', () => {
    expect(isPrivateUrl('')).toBe(true); // AWS Metadata
    expect(isPrivateUrl('')).toBe(true);
    expect(isPrivateUrl('')).toBe(true); // CGNAT
    expect(isPrivateUrl('')).toBe(true); // CGNAT
    expect(isPrivateUrl('')).toBe(true);
    expect(isPrivateUrl('')).toBe(true);
  });

  it('should block internal hostnames', () => {
    expect(isPrivateUrl('http://something.local')).toBe(true);
    expect(isPrivateUrl('http://hostname.internal')).toBe(true);
    expect(isPrivateUrl('http://test.localhost')).toBe(true);
  });

  it('should block IPv6 private ranges', () => {
    expect(isPrivateUrl('http://[fe80::1]')).toBe(true);
    expect(isPrivateUrl('http://[fc00::1]')).toBe(true);
    expect(isPrivateUrl('http://[fd00::1]')).toBe(true);
  });

  it('should allow public URLs', () => {
    expect(isPrivateUrl('https://google.com')).toBe(false);
    expect(isPrivateUrl('https://github.com/test')).toBe(false);
    expect(isPrivateUrl('http://1.1.1.1')).toBe(false);
    expect(isPrivateUrl('http://8.8.8.8')).toBe(false);
  });

  it('should handle trailing dots in hostnames', () => {
    expect(isPrivateUrl('http://localhost.')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1.')).toBe(true);
    expect(isPrivateUrl('https://google.com.')).toBe(false);
  });

  it('should return true for invalid URLs', () => {
    expect(isPrivateUrl('not-a-url')).toBe(true);
    expect(isPrivateUrl('http://')).toBe(true);
  });
});
