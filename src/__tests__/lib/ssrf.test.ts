import { describe, it, expect } from 'vitest';
import { isPrivateUrl } from '@/lib/security';

describe('isPrivateUrl', () => {
  it('should block localhost and loopback addresses', () => {
    expect(isPrivateUrl('http://localhost')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1:3000')).toBe(true);
    expect(isPrivateUrl('http://[::1]')).toBe(true);
  });

  it('should block RFC1918 private IP ranges', () => {
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

  it('should block other reserved/special IP ranges', () => {
    expect(isPrivateUrl('http://169.254.0.1')).toBe(true); // Link-local
    expect(isPrivateUrl('http://0.0.0.0')).toBe(true);     // Current network
    expect(isPrivateUrl('http://224.0.0.1')).toBe(true);   // Multicast
    expect(isPrivateUrl('http://240.0.0.1')).toBe(true);   // Reserved
  });

  it('should block internal hostnames', () => {
    expect(isPrivateUrl('http://test.local')).toBe(true);
    expect(isPrivateUrl('http://api.internal')).toBe(true);
    expect(isPrivateUrl('http://database.localhost')).toBe(true);
  });

  it('should allow public URLs', () => {
    expect(isPrivateUrl('https://google.com')).toBe(false);
    expect(isPrivateUrl('https://github.com/test')).toBe(false);
    expect(isPrivateUrl('http://8.8.8.8')).toBe(false);
    expect(isPrivateUrl('https://api.wiro.ai/v1')).toBe(false);
  });

  it('should block invalid URLs', () => {
    expect(isPrivateUrl('not-a-url')).toBe(true);
    expect(isPrivateUrl('')).toBe(true);
  });
});
