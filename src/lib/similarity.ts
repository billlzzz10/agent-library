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
 * Features used for similarity comparison to avoid redundant calculations
 */
export interface SimilarityFeatures {
  normalized: string;
  wordSet: Set<string>;
  ngrams: Set<string>;
}

/**
 * Extract features from content for optimized similarity comparison
 */
export function getSimilarityFeatures(content: string, n: number = 3): SimilarityFeatures {
  const normalized = normalizeContent(content);
  return {
    normalized,
    wordSet: new Set(normalized.split(" ").filter(Boolean)),
    ngrams: getNgrams(normalized, n),
  };
}

/**
 * Get n-grams (sequences of n characters) from a string
 */
function getNgrams(str: string, n: number): Set<string> {
  const ngrams = new Set<string>();
  if (!str) return ngrams;
  const padded = " ".repeat(n - 1) + str + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Calculate Jaccard similarity between two sets
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSetSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersectionSize = 0;
  for (const item of set1) {
    if (set2.has(item)) {
      intersectionSize++;
    }
  }
  
  const unionSize = set1.size + set2.size - intersectionSize;
  return intersectionSize / unionSize;
}


/**
 * Optimized similarity score calculation using pre-extracted features
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarityNormalized(
  feat1: SimilarityFeatures,
  feat2: SimilarityFeatures
): number {
  // Exact match after normalization
  if (feat1.normalized === feat2.normalized) return 1;
  
  // Empty content edge case
  if (!feat1.normalized || !feat2.normalized) return 0;
  
  // Combine Jaccard (word-level) and n-gram (character-level) similarities
  const jaccard = jaccardSetSimilarity(feat1.wordSet, feat2.wordSet);
  const ngram = jaccardSetSimilarity(feat1.ngrams, feat2.ngrams);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const feat1 = getSimilarityFeatures(content1);
  const feat2 = getSimilarityFeatures(content2);
  return calculateSimilarityNormalized(feat1, feat2);
}

/**
 * Optimized check if two contents are similar enough to be considered duplicates
 * using pre-extracted features.
 */
export function isSimilarContentNormalized(
  feat1: SimilarityFeatures,
  feat2: SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  return calculateSimilarityNormalized(feat1, feat2) >= threshold;
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
