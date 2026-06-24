import { describe, it, expect } from 'vitest';
import { isPrivateUrl } from '@/lib/security';

describe('isPrivateUrl', () => {
  it('should allow public URLs', () => {
    expect(isPrivateUrl('https://google.com')).toBe(false);
    expect(isPrivateUrl('https://github.com/bl1nk-bot/agent-library')).toBe(false);
    expect(isPrivateUrl('http://example.com/image.jpg')).toBe(false);
  });

  it('should block non-http/https protocols', () => {
    expect(isPrivateUrl('ftp://example.com')).toBe(true);
    expect(isPrivateUrl('file:///etc/passwd')).toBe(true);
    expect(isPrivateUrl('gopher://example.com')).toBe(true);
    expect(isPrivateUrl('javascript:alert(1)')).toBe(true);
    expect(isPrivateUrl('data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==')).toBe(true);
  });

  it('should block localhost and loopback', () => {
    expect(isPrivateUrl('http://localhost')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1:3000')).toBe(true);
    expect(isPrivateUrl('http://127.1.2.3')).toBe(true);
    expect(isPrivateUrl('http://[::1]')).toBe(true);
    expect(isPrivateUrl('http://0.0.0.0')).toBe(true);
  });

  it('should block private IPv4 ranges (RFC 1918)', () => {
    expect(isPrivateUrl('http://10.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://172.16.0.1')).toBe(true);
    expect(isPrivateUrl('http://172.31.255.255')).toBe(true);
    expect(isPrivateUrl('http://192.168.1.1')).toBe(true);
  });

  it('should block other reserved IPv4 ranges', () => {
    expect(isPrivateUrl('http://169.254.169.254')).toBe(true); // Link-local
    expect(isPrivateUrl('http://100.64.0.1')).toBe(true); // CGNAT
    expect(isPrivateUrl('http://198.18.0.1')).toBe(true); // Benchmarking
    expect(isPrivateUrl('http://224.0.0.1')).toBe(true); // Multicast
    expect(isPrivateUrl('http://240.0.0.1')).toBe(true); // Reserved
  });

  it('should block internal hostnames', () => {
    expect(isPrivateUrl('http://my-service.local')).toBe(true);
    expect(isPrivateUrl('http://database.internal')).toBe(true);
    expect(isPrivateUrl('http://test.localhost')).toBe(true);
  });

  it('should block private/reserved IPv6 ranges', () => {
    expect(isPrivateUrl('http://[::]')).toBe(true);
    expect(isPrivateUrl('http://[fe80::1]')).toBe(true); // Link-local
    expect(isPrivateUrl('http://[fc00::1]')).toBe(true); // Unique local
    expect(isPrivateUrl('http://[fd00::1]')).toBe(true); // Unique local
    expect(isPrivateUrl('http://[ff00::1]')).toBe(true); // Multicast
  });

  it('should handle trailing dots in hostnames', () => {
    expect(isPrivateUrl('http://127.0.0.1.')).toBe(true);
    expect(isPrivateUrl('http://localhost.')).toBe(true);
    expect(isPrivateUrl('https://google.com.')).toBe(false);
  });

  it('should block invalid URLs', () => {
    expect(isPrivateUrl('not-a-url')).toBe(true);
    expect(isPrivateUrl('')).toBe(true);
  });
});
