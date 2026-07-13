/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Normalized features of a content string for efficient similarity comparison.
 */
export interface SimilarityFeatures {
  normalized: string;
  words: Set<string>;
  trigrams: Set<string>;
}

/**
 * Normalize content for comparison by:
 * - Removing variables (${...} patterns)
 * - Converting to lowercase
 * - Removing extra whitespace
 * - Removing punctuation
 */
export function normalizeContent(content: string): string {
  return (
    content
      // Remove variables like ${variable} or ${variable:default}
      .replace(/\$\{[^}]+\}/g, "")
      // Remove common placeholder patterns like [placeholder] or <placeholder>
      .replace(/\[[^\]]+\]/g, "")
      .replace(/<[^>]+>/g, "")
      // Convert to lowercase
      .toLowerCase()
      // Remove punctuation
      .replace(/[^\w\s]/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Extracts features from content for efficient similarity calculations.
 * Hoisting this out of loops provides significant performance gains.
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);

  // Word set for Jaccard similarity
  const words = new Set(normalized.split(" ").filter(Boolean));

  // Trigram set for character-level similarity
  const trigrams = new Set<string>();
  const n = 3;
  if (normalized.length > 0) {
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      trigrams.add(padded.slice(i, i + n));
    }
  }

  return { normalized, words, trigrams };
}

/**
 * Efficiently calculates the size of the intersection of two sets.
 * Avoids creating new sets or spreading to arrays.
 */
function intersectionSize(set1: Set<string>, set2: Set<string>): number {
  // Optimization: Iterate over the smaller set
  const [smaller, larger] = set1.size < set2.size ? [set1, set2] : [set2, set1];
  let count = 0;
  for (const item of smaller) {
    if (larger.has(item)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculates similarity between two pre-extracted feature sets.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
export function calculateSimilarityWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (f1.normalized === f2.normalized) return 1;

  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return 0;

  // 1. Jaccard (word-level) similarity
  let jaccard = 0;
  const wordIntersectionSize = intersectionSize(f1.words, f2.words);
  if (f1.words.size > 0 || f2.words.size > 0) {
    const wordUnionSize = f1.words.size + f2.words.size - wordIntersectionSize;
    jaccard = wordIntersectionSize / wordUnionSize;
  } else if (f1.words.size === 0 && f2.words.size === 0) {
    jaccard = 1;
  }

  // 2. n-gram (character-level) similarity
  let ngram = 0;
  const trigramIntersectionSize = intersectionSize(f1.trigrams, f2.trigrams);
  if (f1.trigrams.size > 0 || f2.trigrams.size > 0) {
    const trigramUnionSize = f1.trigrams.size + f2.trigrams.size - trigramIntersectionSize;
    ngram = trigramIntersectionSize / trigramUnionSize;
  } else if (f1.trigrams.size === 0 && f2.trigrams.size === 0) {
    ngram = 1;
  }

  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Combined similarity score using multiple algorithms.
 * For repeated comparisons, use extractFeatures() and calculateSimilarityWithFeatures() instead.
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const f1 = extractFeatures(content1);
  const f2 = extractFeatures(content2);
  return calculateSimilarityWithFeatures(f1, f2);
}

/**
 * Check if two contents are similar enough to be considered duplicates
 * Default threshold is 0.85 (85% similar)
 */
export function isSimilarContent(
  content1: string,
  content2: string,
  threshold: number = 0.85
): boolean {
  return calculateSimilarity(content1, content2) >= threshold;
}

/**
 * Get normalized content hash for database indexing/comparison
 * This is a simple hash for quick lookups before full similarity check
 */
export function getContentFingerprint(content: string): string {
  const normalized = normalizeContent(content);
  // Take first 500 chars of normalized content as fingerprint
  return normalized.slice(0, 500);
}
