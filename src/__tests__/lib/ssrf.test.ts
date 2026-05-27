import { describe, it, expect } from 'vitest';
import { isPrivateUrl } from '../../lib/ssrf';

describe('isPrivateUrl', () => {
  it('should block localhost and loopback addresses', () => {
    expect(isPrivateUrl('http://localhost')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.2')).toBe(true);
    expect(isPrivateUrl('http://[::1]')).toBe(true);
  });

  it('should block private IPv4 ranges', () => {
    expect(isPrivateUrl('http://10.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://172.16.0.1')).toBe(true);
    expect(isPrivateUrl('http://172.31.255.255')).toBe(true);
    expect(isPrivateUrl('http://192.168.1.1')).toBe(true);
  });

  it('should block internal and local hostnames', () => {
    expect(isPrivateUrl('http://myserver.local')).toBe(true);
    expect(isPrivateUrl('http://api.internal')).toBe(true);
    expect(isPrivateUrl('http://test.localhost')).toBe(true);
  });

  it('should block link-local and reserved addresses', () => {
    expect(isPrivateUrl('http://169.254.169.254')).toBe(true);
    expect(isPrivateUrl('http://0.0.0.0')).toBe(true);
    expect(isPrivateUrl('http://224.0.0.1')).toBe(true);
  });

  it('should block private IPv6 ranges', () => {
    expect(isPrivateUrl('http://[fe80::1]')).toBe(true);
    expect(isPrivateUrl('http://[fc00::]')).toBe(true);
    expect(isPrivateUrl('http://[fd00::]')).toBe(true);
  });

  it('should allow public URLs', () => {
    expect(isPrivateUrl('https://google.com')).toBe(false);
    expect(isPrivateUrl('https://8.8.8.8')).toBe(false);
    expect(isPrivateUrl('https://github.com/jules')).toBe(false);
  });

  it('should return true for invalid URLs', () => {
    expect(isPrivateUrl('not-a-url')).toBe(true);
    expect(isPrivateUrl('http://[invalid-ipv6]')).toBe(true);
  });
});
