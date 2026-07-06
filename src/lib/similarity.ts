/**
 * Content similarity utilities for duplicate detection
 */

export interface SimilarityFeatures {
  normalized: string;
  words: Set<string>;
  trigrams: Set<string>;
}

export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

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
 * Extract features from content for efficient similarity comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  
  // Word set for Jaccard
  const words = new Set(normalized.split(" ").filter(Boolean));
  
  // Trigram set
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
 * Calculate intersection size of two sets efficiently
 */
function intersectionSize<T>(set1: Set<T>, set2: Set<T>): number {
  if (set1.size > set2.size) {
    return intersectionSize(set2, set1);
  }
  let count = 0;
  for (const item of set1) {
    if (set2.has(item)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculate Jaccard similarity using pre-calculated sets
 */
function jaccardSimilarityWithSets(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = intersectionSize(set1, set2);
  const union = set1.size + set2.size - intersection;
  
  return intersection / union;
}

/**
 * Combined similarity score using pre-calculated features
 */
export function calculateSimilarityWithFeatures(
  feat1: SimilarityFeatures,
  feat2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (feat1.normalized === feat2.normalized) return 1;
  
  // Empty content edge case
  if (!feat1.normalized || !feat2.normalized) return 0;
  
  // Combine Jaccard (word-level) and n-gram (character-level) similarities
  const jaccard = jaccardSimilarityWithSets(feat1.words, feat2.words);
  const ngram = jaccardSimilarityWithSets(feat1.trigrams, feat2.trigrams);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  return calculateSimilarityWithFeatures(
    extractFeatures(content1),
    extractFeatures(content2)
  );
}

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
