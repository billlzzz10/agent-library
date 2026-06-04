import { describe, it, expect } from 'vitest';
import { isPrivateUrl } from '@/lib/security';

describe('isPrivateUrl', () => {
  it('should block localhost and loopback', () => {
    expect(isPrivateUrl('http://localhost')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.2')).toBe(true);
    expect(isPrivateUrl('http://[::1]')).toBe(true);
    expect(isPrivateUrl('http://[::]')).toBe(true);
    expect(isPrivateUrl('http://0.0.0.0')).toBe(true);
  });

  it('should block RFC 1918 private ranges', () => {
    expect(isPrivateUrl('http://10.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://10.255.255.255')).toBe(true);
    expect(isPrivateUrl('http://172.16.0.1')).toBe(true);
    expect(isPrivateUrl('http://172.31.255.255')).toBe(true);
    expect(isPrivateUrl('http://192.168.1.1')).toBe(true);
  });

  it('should block other reserved ranges', () => {
    // Link-local
    expect(isPrivateUrl('http://169.254.169.254')).toBe(true);
    // CGNAT
    expect(isPrivateUrl('http://100.64.0.1')).toBe(true);
    expect(isPrivateUrl('http://100.127.255.255')).toBe(true);
    // Benchmarking
    expect(isPrivateUrl('http://198.18.0.1')).toBe(true);
    // Documentation
    expect(isPrivateUrl('http://192.0.2.1')).toBe(true);
    expect(isPrivateUrl('http://198.51.100.1')).toBe(true);
    expect(isPrivateUrl('http://203.0.113.1')).toBe(true);
  });

  it('should block internal hostnames', () => {
    expect(isPrivateUrl('http://server.local')).toBe(true);
    expect(isPrivateUrl('http://database.internal')).toBe(true);
    expect(isPrivateUrl('http://test.localhost')).toBe(true);
    expect(isPrivateUrl('http://my.lan')).toBe(true);
  });

  it('should allow public URLs', () => {
    expect(isPrivateUrl('https://google.com')).toBe(false);
    expect(isPrivateUrl('https://github.com/favicon.ico')).toBe(false);
    expect(isPrivateUrl('https://8.8.8.8')).toBe(false);
    expect(isPrivateUrl('http://1.1.1.1')).toBe(false);
  });

  it('should handle invalid URLs safely', () => {
    expect(isPrivateUrl('not-a-url')).toBe(true);
    expect(isPrivateUrl('')).toBe(true);
  });

  it('should handle alternative encodings if URL parser normalizes them', () => {
    // Node.js URL parser normalizes these to 127.0.0.1
    expect(isPrivateUrl('http://0177.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://0x7f.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://2130706433')).toBe(true);
  });
});
