/**
 * Content similarity utilities for duplicate detection
 */

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
 * Pre-extracted features for efficient similarity comparison
 */
export interface SimilarityFeatures {
  normalized: string;
  words: Set<string>;
  trigrams: Set<string>;
}

/**
 * Extract features from content for similarity comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  const words = new Set(normalized.split(" ").filter(Boolean));
  
  const trigrams = new Set<string>();
  const n = 3;
  // Character-level trigrams with padding
  const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    trigrams.add(padded.slice(i, i + n));
  }
  
  return { normalized, words, trigrams };
}

/**
 * Efficiently calculate the size of intersection between two sets
 */
function intersectionSize(set1: Set<string>, set2: Set<string>): number {
  let count = 0;
  // Optimization: Always iterate over the smaller set
  const [smaller, larger] = set1.size < set2.size ? [set1, set2] : [set2, set1];
  for (const item of smaller) {
    if (larger.has(item)) count++;
  }
  return count;
}

/**
 * Calculate similarity between two pre-extracted feature sets
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

  // Jaccard similarity (word-level overlap)
  const jInter = intersectionSize(f1.words, f2.words);
  const jUnion = f1.words.size + f2.words.size - jInter;
  const jaccard = jUnion === 0 ? 0 : jInter / jUnion;

  // N-gram similarity (character-level sequence matching)
  const nInter = intersectionSize(f1.trigrams, f2.trigrams);
  const nUnion = f1.trigrams.size + f2.trigrams.size - nInter;
  const ngram = nUnion === 0 ? 0 : nInter / nUnion;

  // Weighted average: 60% Jaccard, 40% n-gram
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 *
 * Note: For bulk comparisons, use extractFeatures and calculateSimilarityWithFeatures
 * to avoid redundant processing.
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const f1 = extractFeatures(content1);
  const f2 = extractFeatures(content2);
  return calculateSimilarityWithFeatures(f1, f2);
}

export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

/**
 * Check if two contents are similar enough to be considered duplicates
 * Default threshold is 0.85 (85% similar)
 */
export function isSimilarContent(
  content1: string, 
  content2: string, 
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
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
