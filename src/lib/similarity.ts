/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Interface representing pre-calculated features for similarity comparison
 */
export interface SimilarityFeatures {
  normalized: string;
  wordSet: Set<string>;
  trigramSet: Set<string>;
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
 * Extracts n-grams from a string
 */
function getNgrams(str: string, n: number = 3): Set<string> {
  const ngrams = new Set<string>();
  if (!str) return ngrams;
  
  const padded = " ".repeat(n - 1) + str + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Extracts features used for similarity calculations
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  return {
    normalized,
    wordSet: new Set(normalized.split(" ").filter(Boolean)),
    trigramSet: getNgrams(normalized, 3),
  };
}

/**
 * Calculate the size of intersection between two sets efficiently
 */
function intersectionSize<T>(set1: Set<T>, set2: Set<T>): number {
  let count = 0;
  if (set1.size > set2.size) {
    for (const item of set2) {
      if (set1.has(item)) count++;
    }
  } else {
    for (const item of set1) {
      if (set2.has(item)) count++;
    }
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

  // Jaccard similarity (word-level)
  const wordIntersection = intersectionSize(f1.wordSet, f2.wordSet);
  const wordUnion = f1.wordSet.size + f2.wordSet.size - wordIntersection;
  const jaccard = wordUnion === 0 ? 0 : wordIntersection / wordUnion;

  // Trigram similarity (character-level)
  const trigramIntersection = intersectionSize(f1.trigramSet, f2.trigramSet);
  const trigramUnion = f1.trigramSet.size + f2.trigramSet.size - trigramIntersection;
  const ngram = trigramUnion === 0 ? 0 : trigramIntersection / trigramUnion;

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
