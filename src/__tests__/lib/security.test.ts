import { describe, it, expect } from 'vitest';
import { isPrivateUrl } from '../../lib/security';

describe('isPrivateUrl', () => {
  describe('Protocols', () => {
    it('should allow http and https', () => {
      expect(isPrivateUrl('http://example.com')).toBe(false);
      expect(isPrivateUrl('https://example.com')).toBe(false);
    });

    it('should block other protocols', () => {
      expect(isPrivateUrl('ftp://example.com')).toBe(true);
      expect(isPrivateUrl('file:///etc/passwd')).toBe(true);
      expect(isPrivateUrl('gopher://example.com')).toBe(true);
      expect(isPrivateUrl('javascript:alert(1)')).toBe(true);
      expect(isPrivateUrl('data:text/plain,hello')).toBe(true);
    });
  });

  describe('IPv4 Private Ranges', () => {
    it('should block loopback (127.0.0.0/8)', () => {
      expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
      expect(isPrivateUrl('http://127.1.2.3')).toBe(true);
      expect(isPrivateUrl('http://127.255.255.255')).toBe(true);
    });

    it('should block RFC 1918 private ranges', () => {
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

    it('should block link-local (169.254.0.0/16)', () => {
      expect(isPrivateUrl('http://169.254.0.1')).toBe(true);
      expect(isPrivateUrl('http://169.254.255.254')).toBe(true);
    });

    it('should block CGNAT (100.64.0.0/10)', () => {
      expect(isPrivateUrl('http://100.64.0.1')).toBe(true);
      expect(isPrivateUrl('http://100.127.255.254')).toBe(true);
    });

    it('should block benchmarking and test nets', () => {
      expect(isPrivateUrl('http://198.18.0.1')).toBe(true); // Benchmarking
      expect(isPrivateUrl('http://192.0.2.1')).toBe(true);  // TEST-NET-1
      expect(isPrivateUrl('http://198.51.100.1')).toBe(true); // TEST-NET-2
      expect(isPrivateUrl('http://203.0.113.1')).toBe(true); // TEST-NET-3
    });

    it('should block multicast and reserved', () => {
      expect(isPrivateUrl('http://224.0.0.1')).toBe(true); // Multicast
      expect(isPrivateUrl('http://240.0.0.1')).toBe(true); // Reserved
    });
  });

  describe('IPv6 Private Ranges', () => {
    it('should block loopback', () => {
      expect(isPrivateUrl('http://[::1]')).toBe(true);
    });

    it('should block link-local and unique-local', () => {
      expect(isPrivateUrl('http://[fe80::1]')).toBe(true);
      expect(isPrivateUrl('http://[fc00::1]')).toBe(true);
      expect(isPrivateUrl('http://[fd00::1]')).toBe(true);
    });

    it('should block IPv4-mapped IPv6 pointing to private IPs', () => {
      expect(isPrivateUrl('http://[::ffff:127.0.0.1]')).toBe(true);
      expect(isPrivateUrl('http://[::ffff:10.0.0.1]')).toBe(true);
      // Test hex-shortened form that Node's URL parser uses
      expect(isPrivateUrl('http://[::ffff:7f00:1]')).toBe(true); // 127.0.0.1
      expect(isPrivateUrl('http://[::ffff:a00:1]')).toBe(true);  // 10.0.0.1
    });

    it('should allow IPv4-mapped IPv6 pointing to public IPs', () => {
      expect(isPrivateUrl('http://[::ffff:8.8.8.8]')).toBe(false);
      expect(isPrivateUrl('http://[::ffff:0808:0808]')).toBe(false);
    });
  });

  describe('Hostnames', () => {
    it('should block localhost and variations', () => {
      expect(isPrivateUrl('http://localhost')).toBe(true);
      expect(isPrivateUrl('http://localhost.')).toBe(true);
    });

    it('should block internal TLDs', () => {
      expect(isPrivateUrl('http://myserver.local')).toBe(true);
      expect(isPrivateUrl('http://service.internal')).toBe(true);
      expect(isPrivateUrl('http://app.localhost')).toBe(true);
      expect(isPrivateUrl('http://router.lan')).toBe(true);
    });

    it('should handle trailing dots in public hostnames', () => {
      expect(isPrivateUrl('http://google.com.')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should block invalid URLs', () => {
      expect(isPrivateUrl('not-a-url')).toBe(true);
      expect(isPrivateUrl('http://[invalid-ipv6]')).toBe(true);
      expect(isPrivateUrl('http://1.2.3.4.5')).toBe(true);
    });
  });
});
