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
 * Features used for similarity comparison to avoid redundant pre-processing
 */
export interface SimilarityFeatures {
  normalized: string;
  wordSet: Set<string>;
  ngramSet: Set<string>;
}

/**
 * Extract features from content for similarity comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  const wordSet = new Set(normalized.split(" ").filter(Boolean));
  
  // Character-level n-grams (trigrams)
  const n = 3;
  const ngramSet = new Set<string>();
  const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    ngramSet.add(padded.slice(i, i + n));
  }
  
  return { normalized, wordSet, ngramSet };
}

/**
 * Optimized set similarity calculation (Jaccard)
 */
function calculateSetSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersectionSize = 0;
  // Iterate over the smaller set to minimize lookups
  const smallerSet = set1.size < set2.size ? set1 : set2;
  const largerSet = set1.size < set2.size ? set2 : set1;
  
  for (const item of smallerSet) {
    if (largerSet.has(item)) {
      intersectionSize++;
    }
  }
  
  const unionSize = set1.size + set2.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * Calculate similarity between two pre-extracted feature sets
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
  const ngram = calculateSetSimilarity(f1.ngramSet, f2.ngramSet);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Check if two pre-extracted feature sets are similar enough to be duplicates
 */
export function isSimilarContentWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  return calculateSimilarityWithFeatures(f1, f2) >= threshold;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const features1 = extractFeatures(content1);
  const features2 = extractFeatures(content2);

  return calculateSimilarityWithFeatures(features1, features2);
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
  const features1 = extractFeatures(content1);
  const features2 = extractFeatures(content2);

  return isSimilarContentWithFeatures(features1, features2, threshold);
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
