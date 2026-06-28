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
  return content
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
    .trim();
}

/**
 * Extract features from content for efficient similarity comparison.
 * Pre-calculating these features is significantly faster for batch comparisons.
 */
export function extractFeatures(content: string, n: number = 3): SimilarityFeatures {
  const normalized = normalizeContent(content);
  const words = new Set(normalized.split(" ").filter(Boolean));
  
  const ngrams = new Set<string>();
  if (normalized) {
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      ngrams.add(padded.slice(i, i + n));
    }
  }
  
  return { normalized, words, ngrams };
}

/**
 * Calculate similarity between two sets of features.
 * Optimized for performance by avoiding redundant normalization and using smaller set iteration for intersections.
 */
export function calculateSimilarityWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (f1.normalized === f2.normalized) return 1;
  
  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return 0;
  
  // 1. Jaccard similarity (word-level)
  const [s1, s2] = f1.words.size < f2.words.size ? [f1.words, f2.words] : [f2.words, f1.words];
  let wordIntersection = 0;
  for (const word of s1) {
    if (s2.has(word)) wordIntersection++;
  }
  const wordUnion = f1.words.size + f2.words.size - wordIntersection;
  const jaccard = wordUnion === 0 ? 0 : wordIntersection / wordUnion;
  
  // 2. N-gram similarity (character-level)
  const [n1, n2] = f1.ngrams.size < f2.ngrams.size ? [f1.ngrams, f2.ngrams] : [f2.ngrams, f1.ngrams];
  let ngramIntersection = 0;
  for (const gram of n1) {
    if (n2.has(gram)) ngramIntersection++;
  }
  const ngramUnion = f1.ngrams.size + f2.ngrams.size - ngramIntersection;
  const ngram = ngramUnion === 0 ? 0 : ngramIntersection / ngramUnion;
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 *
 * Note: For batch comparisons, use extractFeatures() and calculateSimilarityWithFeatures()
 * to avoid redundant processing.
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
