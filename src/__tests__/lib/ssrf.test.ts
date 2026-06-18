import { describe, it, expect } from 'vitest';
import { isPrivateUrl } from '../../lib/security';

describe('isPrivateUrl', () => {
  it('should block localhost and loopback addresses', () => {
    expect(isPrivateUrl('http://localhost')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://127.0.1.1')).toBe(true);
    expect(isPrivateUrl('http://[::1]')).toBe(true);
    expect(isPrivateUrl('http://0.0.0.0')).toBe(true);
    expect(isPrivateUrl('http://[::]')).toBe(true);
  });

  it('should block private IPv4 ranges (RFC 1918)', () => {
    expect(isPrivateUrl('http://10.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://10.255.255.255')).toBe(true);
    expect(isPrivateUrl('http://172.16.0.1')).toBe(true);
    expect(isPrivateUrl('http://172.31.255.255')).toBe(true);
    expect(isPrivateUrl('http://192.168.1.1')).toBe(true);
    expect(isPrivateUrl('http://192.168.255.255')).toBe(true);
  });

  it('should block CGNAT, Benchmarking and Link-local ranges', () => {
    expect(isPrivateUrl('http://100.64.0.1')).toBe(true);
    expect(isPrivateUrl('http://100.127.255.255')).toBe(true);
    expect(isPrivateUrl('http://198.18.0.1')).toBe(true);
    expect(isPrivateUrl('http://198.19.255.255')).toBe(true);
    expect(isPrivateUrl('http://169.254.1.1')).toBe(true);
  });

  it('should block internal hostnames', () => {
    expect(isPrivateUrl('http://test.local')).toBe(true);
    expect(isPrivateUrl('http://service.internal')).toBe(true);
    expect(isPrivateUrl('http://myapp.localhost')).toBe(true);
  });

  it('should block private/reserved IPv6 ranges', () => {
    expect(isPrivateUrl('http://[fe80::1]')).toBe(true);
    expect(isPrivateUrl('http://[fc00::]')).toBe(true);
    expect(isPrivateUrl('http://[fd00::]')).toBe(true);
    expect(isPrivateUrl('http://[ff00::]')).toBe(true);
  });

  it('should allow public URLs', () => {
    expect(isPrivateUrl('http://google.com')).toBe(false);
    expect(isPrivateUrl('https://github.com/trending')).toBe(false);
    expect(isPrivateUrl('https://8.8.8.8')).toBe(false);
    expect(isPrivateUrl('http://[2001:4860:4860::8888]')).toBe(false);
  });

  it('should block invalid URLs', () => {
    expect(isPrivateUrl('not-a-url')).toBe(true);
    expect(isPrivateUrl('http://')).toBe(true);
  });
});
