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
 * Features extracted from content for similarity comparison.
 * Pre-computing these avoids redundant work in batch comparisons.
 */
export interface SimilarityFeatures {
  normalized: string;
  wordSet: Set<string>;
  trigrams: Set<string>;
}

/**
 * Extract similarity features from content
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  const wordSet = new Set(normalized.split(" ").filter(Boolean));
  
  const trigrams = new Set<string>();
  const n = 3; // Using trigrams
  const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    trigrams.add(padded.slice(i, i + n));
  }
  
  return { normalized, wordSet, trigrams };
}

/**
 * Calculate Jaccard similarity between two sets efficiently
 */
export function calculateSetSimilarity(set1: Set<unknown>, set2: Set<unknown>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersectionSize = 0;
  // Iterate over the smaller set for better performance
  if (set1.size < set2.size) {
    for (const item of set1) {
      if (set2.has(item)) intersectionSize++;
    }
  } else {
    for (const item of set2) {
      if (set1.has(item)) intersectionSize++;
    }
  }
  
  const unionSize = set1.size + set2.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * Calculate similarity between two sets of features
 */
export function calculateSimilarityWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (f1.normalized === f2.normalized) return 1;
  
  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return 0;
  
  // Combine Jaccard (word-level) and n-gram (character-level) similarities
  const jaccard = calculateSetSimilarity(f1.wordSet, f2.wordSet);
  const ngram = calculateSetSimilarity(f1.trigrams, f2.trigrams);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Calculate similarity between two strings
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
