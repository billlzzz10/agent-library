/**
 * Content similarity utilities for duplicate detection
 */

export interface SimilarityFeatures {
  normalized: string;
  words: Set<string>;
  ngrams: Set<string>;
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
 * Extract pre-computed features (normalized content, word set, ngram set) from a string
 * to enable highly optimized similarity comparison in loops.
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);

  const words = new Set(normalized.split(" ").filter(Boolean));

  const ngrams = new Set<string>();
  const n = 3;
  if (normalized) {
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      ngrams.add(padded.slice(i, i + n));
    }
  }

  return {
    normalized,
    words,
    ngrams,
  };
}

/**
 * Highly optimized helper to find the size of the intersection of two Sets
 * without allocating new Sets or Arrays, running in O(min(N, M)) time.
 */
function intersectionSize(set1: Set<string>, set2: Set<string>): number {
  let count = 0;
  const smaller = set1.size < set2.size ? set1 : set2;
  const larger = set1.size < set2.size ? set2 : set1;
  for (const item of smaller) {
    if (larger.has(item)) {
      count++;
    }
  }
  return count;
}

/**
 * Combined similarity score using pre-computed features
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarityWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (f1.normalized === f2.normalized) return 1;

  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return 0;

  // Calculate Jaccard similarity using pre-computed word sets
  let jaccard = 0;
  if (f1.words.size === 0 && f2.words.size === 0) {
    jaccard = 1;
  } else if (f1.words.size > 0 && f2.words.size > 0) {
    const intersectCount = intersectionSize(f1.words, f2.words);
    const unionCount = f1.words.size + f2.words.size - intersectCount;
    jaccard = intersectCount / unionCount;
  }

  // Calculate n-gram similarity using pre-computed ngram sets
  let ngram = 0;
  if (f1.ngrams.size === 0 && f2.ngrams.size === 0) {
    ngram = 1;
  } else if (f1.ngrams.size > 0 && f2.ngrams.size > 0) {
    const intersectCount = intersectionSize(f1.ngrams, f2.ngrams);
    const unionCount = f1.ngrams.size + f2.ngrams.size - intersectCount;
    ngram = intersectCount / unionCount;
  }

  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
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
