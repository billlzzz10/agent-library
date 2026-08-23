import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.OPENAI_API_KEY = "test-key";

let getConfigCallCount = 0;

vi.mock("@/lib/config", () => ({
  getConfig: vi.fn(async () => {
    getConfigCallCount++;
    return {
      features: {
        aiSearch: true,
      },
    };
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    prompt: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        title: "Test Title",
        description: "Test Desc",
        content: "Test Content",
        isPrivate: false,
      })),
      findMany: vi.fn(async () => Array.from({ length: 500 }, (_, i) => ({ id: `prompt-${i}` }))),
      update: vi.fn(async () => ({})),
    },
  },
}));

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      embeddings = {
        create: vi.fn(async () => ({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
        })),
      };
    },
  };
});

vi.mock("@/lib/ai/load-prompt", () => ({
  loadPrompt: vi.fn(() => ({})),
  getSystemPrompt: vi.fn(() => ""),
}));

import { generatePromptEmbedding, generateAllEmbeddings } from "@/lib/ai/embeddings";
import { getConfig } from "@/lib/config";

describe("embeddings performance benchmark", () => {
  beforeEach(() => {
    getConfigCallCount = 0;
    vi.clearAllMocks();
  });

  it("measures getConfig calls when processing N items individually without preloaded config (Baseline)", async () => {
    const N = 500;
    const promptIds = Array.from({ length: N }, (_, i) => `prompt-${i}`);

    const start = performance.now();
    for (const id of promptIds) {
      await generatePromptEmbedding(id);
    }
    const duration = performance.now() - start;

    console.log(`[Baseline Benchmark - Individual] Processed ${N} items in ${duration.toFixed(2)}ms`);
    console.log(`[Baseline Benchmark - Individual] getConfig call count: ${getConfigCallCount}`);

    expect(getConfigCallCount).toBe(N);
  });

  it("measures getConfig calls when processing N items with preloaded config (Optimized)", async () => {
    const N = 500;
    const promptIds = Array.from({ length: N }, (_, i) => `prompt-${i}`);

    const start = performance.now();
    const config = await getConfig(); // 1 call
    for (const id of promptIds) {
      await generatePromptEmbedding(id, config);
    }
    const duration = performance.now() - start;

    console.log(`[Optimized Benchmark - Preloaded] Processed ${N} items in ${duration.toFixed(2)}ms`);
    console.log(`[Optimized Benchmark - Preloaded] getConfig call count: ${getConfigCallCount}`);

    expect(getConfigCallCount).toBe(1);
  });
});
