/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Similarity features for efficient comparison
 */
export interface SimilarityFeatures {
  normalized: string;
  wordSet: Set<string>;
  ngramSet: Set<string>;
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
 * Extract similarity features from content
 */
export function extractFeatures(content: string, n: number = 3): SimilarityFeatures {
  const normalized = normalizeContent(content);
  const words = normalized.split(" ").filter(Boolean);
  const wordSet = new Set(words);
  
  const ngramSet = new Set<string>();
  if (normalized.length > 0) {
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      ngramSet.add(padded.slice(i, i + n));
    }
  }

  return {
    normalized,
    wordSet,
    ngramSet,
  };
}

/**
 * Calculate Jaccard similarity between two sets
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarityFromSets(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  // Optimization: iterate over the smaller set
  const [smaller, larger] = set1.size < set2.size ? [set1, set2] : [set2, set1];
  
  let intersectionSize = 0;
  for (const item of smaller) {
    if (larger.has(item)) {
      intersectionSize++;
    }
  }
  
  const unionSize = set1.size + set2.size - intersectionSize;
  
  return intersectionSize / unionSize;
}

/**
 * Combined similarity score using multiple algorithms and pre-extracted features
 * Returns a value between 0 (completely different) and 1 (identical)
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
  const jaccard = jaccardSimilarityFromSets(feat1.wordSet, feat2.wordSet);
  const ngram = jaccardSimilarityFromSets(feat1.ngramSet, feat2.ngramSet);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Check if two contents are similar enough to be considered duplicates
 * Default threshold is 0.85 (85% similar)
 */
export function isSimilarContentWithFeatures(
  feat1: SimilarityFeatures,
  feat2: SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  return calculateSimilarityWithFeatures(feat1, feat2) >= threshold;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const feat1 = extractFeatures(content1);
  const feat2 = extractFeatures(content2);
  return calculateSimilarityWithFeatures(feat1, feat2);
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
