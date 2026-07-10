import { db } from "@/lib/db";
import { WebhookEvent } from "@prisma/client";

interface PromptData {
  id: string;
  title: string;
  description: string | null;
  content: string;
  type: string;
  mediaUrl: string | null;
  isPrivate: boolean;
  author: {
    username: string;
    name: string | null;
    avatar: string | null;
  };
  category: {
    name: string;
    slug: string;
  } | null;
  tags: { tag: { name: string; slug: string } }[];
}

// Available placeholders for webhook payloads
export const WEBHOOK_PLACEHOLDERS = {
  PROMPT_ID: "{{PROMPT_ID}}",
  PROMPT_TITLE: "{{PROMPT_TITLE}}",
  PROMPT_DESCRIPTION: "{{PROMPT_DESCRIPTION}}",
  PROMPT_CONTENT: "{{PROMPT_CONTENT}}",
  PROMPT_TYPE: "{{PROMPT_TYPE}}",
  PROMPT_URL: "{{PROMPT_URL}}",
  PROMPT_MEDIA_URL: "{{PROMPT_MEDIA_URL}}",
  AUTHOR_USERNAME: "{{AUTHOR_USERNAME}}",
  AUTHOR_NAME: "{{AUTHOR_NAME}}",
  AUTHOR_AVATAR: "{{AUTHOR_AVATAR}}",
  CATEGORY_NAME: "{{CATEGORY_NAME}}",
  TAGS: "{{TAGS}}",
  TIMESTAMP: "{{TIMESTAMP}}",
  SITE_URL: "{{SITE_URL}}",
  CHATGPT_URL: "{{CHATGPT_URL}}",
} as const;

// Slack Block Kit preset for new prompts
export const SLACK_PRESET_PAYLOAD = `{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "{{PROMPT_TITLE}}",
        "emoji": true
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Prompt",
            "emoji": true
          },
          "url": "{{PROMPT_URL}}",
          "style": "primary",
          "action_id": "view_prompt"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Run in ChatGPT",
            "emoji": true
          },
          "url": "{{CHATGPT_URL}}",
          "action_id": "run_chatgpt"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "{{PROMPT_TYPE}}",
            "emoji": true
          },
          "action_id": "type_badge"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "\`\`\`{{PROMPT_CONTENT}}\`\`\`"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "{{PROMPT_DESCRIPTION}}"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Author:*\\n<{{SITE_URL}}/@{{AUTHOR_USERNAME}}|@{{AUTHOR_USERNAME}}>"
        },
        {
          "type": "mrkdwn",
          "text": "*Category:*\\n{{CATEGORY_NAME}}"
        },
        {
          "type": "mrkdwn",
          "text": "*Tags:*\\n{{TAGS}}"
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": "{{AUTHOR_AVATAR}}",
          "alt_text": "{{AUTHOR_NAME}}"
        },
        {
          "type": "mrkdwn",
          "text": "Created by *{{AUTHOR_NAME}}* on {{TIMESTAMP}}"
        }
      ]
    },
    {
      "type": "divider"
    }
  ]
}`;

function escapeJsonString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}

/**
 * A10: Validates that a URL does not point to private/internal IP ranges.
 * Blocks: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
 * Also blocks localhost and common internal hostnames.
 */
export function isPrivateUrl(urlString: string | null | undefined): boolean {
  if (!urlString) return false;

  try {
    const url = new URL(urlString);

    // Only allow http and https protocols to prevent other URI scheme attacks
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return true;
    }

    // Standardize hostname: lowercase and strip trailing dot (FQDN bypass)
    let hostname = url.hostname.toLowerCase();
    if (hostname.endsWith(".")) {
      hostname = hostname.slice(0, -1);
    }

    // Block localhost variations
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "::"
    ) {
      return true;
    }

    // Block common internal hostnames
    if (
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".localhost")
    ) {
      return true;
    }

    // Helper to check if IPv4 octets are in private/reserved ranges
    const isPrivateIpv4 = (a: number, b: number, c: number, d: number) => {
      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;
      // 10.0.0.0/8 - Private
      if (a === 10) return true;
      // 172.16.0.0/12 - Private (172.16.0.0 - 172.31.255.255)
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.168.0.0/16 - Private
      if (a === 192 && b === 168) return true;
      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return true;
      // 0.0.0.0/8 - Current network
      if (a === 0) return true;
      // 100.64.0.0/10 - Shared Address Space
      if (a === 100 && b >= 64 && b <= 127) return true;
      // 192.0.0.0/24 - IETF Protocol Assignments
      if (a === 192 && b === 0 && c === 0) return true;
      // 192.0.2.0/24 - TEST-NET-1
      if (a === 192 && b === 0 && c === 2) return true;
      // 198.18.0.0/15 - Benchmarking
      if (a === 198 && (b === 18 || b === 19)) return true;
      // 198.51.100.0/24 - TEST-NET-2
      if (a === 198 && b === 51 && c === 100) return true;
      // 203.0.113.0/24 - TEST-NET-3
      if (a === 203 && b === 0 && c === 113) return true;
      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;
      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;

      // Explicitly reference d to avoid unused variable warnings if needed,
      // though currently we don't need d for range checks.
      return !!d && false;
    };

    // Check for IPv4 addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [a, b, c, d] = match.slice(1).map(Number);
      if (isPrivateIpv4(a, b, c, d)) return true;
    }

    // Block IPv6 loopback, link-local and private ranges
    if (hostname.startsWith("[")) {
      const ipv6 = hostname.slice(1, -1).toLowerCase();

      // Basic IPv6 checks
      if (
        ipv6 === "::1" ||
        ipv6 === "::" ||
        ipv6.startsWith("fe80:") ||
        ipv6.startsWith("fc") ||
        ipv6.startsWith("fd")
      ) {
        return true;
      }

      // Handle IPv4-mapped IPv6 (e.g. ::ffff:7f00:1 or ::ffff:127.0.0.1)
      if (ipv6.startsWith("::ffff:")) {
        const parts = ipv6.split(":");
        const lastPart = parts[parts.length - 1];

        if (lastPart.includes(".")) {
          // ::ffff:127.0.0.1 format
          const m = lastPart.match(ipv4Regex);
          if (m) {
            const [a, b, c, d] = m.slice(1).map(Number);
            if (isPrivateIpv4(a, b, c, d)) return true;
          }
        } else {
          // ::ffff:7f00:1 format (normalized by some URL parsers)
          const hexSegments = parts.slice(-2);
          if (hexSegments.length === 2) {
            // Each segment can be up to 4 hex digits.
            // Example: 7f00:1 -> 0x7f, 0x00, 0x00, 0x01
            const high = parseInt(hexSegments[0], 16);
            const low = parseInt(hexSegments[1], 16);

            // Pad segments to 4 digits if needed (e.g., :1 is :0001)
            // But parseInt(hex, 16) handles it correctly regardless of padding.
            // A segment like '7f00' is 0x7f00. A segment like '1' is 0x0001.

            const a = (high >> 8) & 0xff;
            const b = high & 0xff;
            const c = (low >> 8) & 0xff;
            const d = low & 0xff;

            if (isPrivateIpv4(a, b, c, d)) return true;
          }
        }
      }
    }

    return false;
  } catch {
    // Invalid URL - treat as potentially dangerous
    return true;
  }
}


function replacePlaceholders(template: string, prompt: PromptData): string {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prompts.chat";
  const promptUrl = `${siteUrl}/prompts/${prompt.id}`;
  const defaultAvatar = `${siteUrl}/default-avatar.png`;
  const chatgptUrl = `https://chat.openai.com/?prompt=${encodeURIComponent(prompt.content)}`;

  const replacements: Record<string, string> = {
    [WEBHOOK_PLACEHOLDERS.PROMPT_ID]: prompt.id,
    [WEBHOOK_PLACEHOLDERS.PROMPT_TITLE]: escapeJsonString(prompt.title),
    [WEBHOOK_PLACEHOLDERS.PROMPT_DESCRIPTION]: escapeJsonString(prompt.description || "No description"),
    [WEBHOOK_PLACEHOLDERS.PROMPT_CONTENT]: escapeJsonString(truncate(prompt.content, 2000)),
    [WEBHOOK_PLACEHOLDERS.PROMPT_TYPE]: prompt.type,
    [WEBHOOK_PLACEHOLDERS.PROMPT_URL]: promptUrl,
    [WEBHOOK_PLACEHOLDERS.PROMPT_MEDIA_URL]: prompt.mediaUrl || "",
    [WEBHOOK_PLACEHOLDERS.AUTHOR_USERNAME]: prompt.author.username,
    [WEBHOOK_PLACEHOLDERS.AUTHOR_NAME]: escapeJsonString(prompt.author.name || prompt.author.username),
    [WEBHOOK_PLACEHOLDERS.AUTHOR_AVATAR]: prompt.author.avatar || defaultAvatar,
    [WEBHOOK_PLACEHOLDERS.CATEGORY_NAME]: prompt.category?.name || "Uncategorized",
    [WEBHOOK_PLACEHOLDERS.TAGS]: prompt.tags.map((t) => t.tag.name).join(", ") || "None",
    [WEBHOOK_PLACEHOLDERS.TIMESTAMP]: new Date().toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    [WEBHOOK_PLACEHOLDERS.SITE_URL]: siteUrl,
    [WEBHOOK_PLACEHOLDERS.CHATGPT_URL]: chatgptUrl,
  };

  let result = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), value);
  }

  return result;
}

export async function triggerWebhooks(event: WebhookEvent, prompt: PromptData): Promise<void> {
  try {
    // Get all enabled webhooks for this event
    const webhooks = await db.webhookConfig.findMany({
      where: {
        isEnabled: true,
        events: {
          has: event,
        },
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    // Send webhooks in parallel (fire and forget)
    const promises = webhooks.map(async (webhook) => {
      try {
        // A10: Validate webhook URL is not targeting private/internal networks
        if (isPrivateUrl(webhook.url)) {
          console.error(`Webhook ${webhook.name} blocked: URL targets private/internal network`);
          return;
        }
        
        const payload = replacePlaceholders(webhook.payload, prompt);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(webhook.headers as Record<string, string> || {}),
        };

        const response = await fetch(webhook.url, {
          method: webhook.method,
          headers,
          body: payload,
        });

        if (!response.ok) {
          console.error(`Webhook ${webhook.name} failed:`, response.status, await response.text());
        }
      } catch (error) {
        console.error(`Webhook ${webhook.name} error:`, error);
      }
    });

    // Don't await - fire and forget
    Promise.allSettled(promises);
  } catch (error) {
    console.error("Failed to trigger webhooks:", error);
  }
}
