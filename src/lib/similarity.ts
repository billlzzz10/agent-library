/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Features extracted from content to avoid redundant processing during bulk comparisons
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
 * Extract features from content for efficient similarity comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  
  // Word set for Jaccard similarity
  const wordSet = new Set(normalized.split(" ").filter(Boolean));
  
  // N-gram set (trigrams) for sequence matching
  const ngramSet = new Set<string>();
  const n = 3;
  if (normalized.length > 0) {
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      ngramSet.add(padded.slice(i, i + n));
    }
  }
  
  return { normalized, wordSet, ngramSet };
}

/**
 * Calculate Jaccard similarity between two sets efficiently
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateSetSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  // Optimization: iterate over the smaller set
  const [smaller, larger] = set1.size <= set2.size ? [set1, set2] : [set2, set1];
  
  let intersectionSize = 0;
  for (const item of smaller) {
    if (larger.has(item)) {
      intersectionSize++;
    }
  }
  
  // Union size = size1 + size2 - intersection
  const unionSize = set1.size + set2.size - intersectionSize;
  
  return intersectionSize / unionSize;
}

/**
 * Combined similarity score using multiple algorithms and pre-extracted features
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarityWithFeatures(
  features1: SimilarityFeatures,
  features2: SimilarityFeatures
): number {
  // Exact match after normalization (fast path)
  if (features1.normalized === features2.normalized) return 1;
  
  // Empty content edge case
  if (!features1.normalized || !features2.normalized) return 0;
  
  // Combine Jaccard (word-level) and n-gram (character-level) similarities
  const jaccard = calculateSetSimilarity(features1.wordSet, features2.wordSet);
  const ngram = calculateSetSimilarity(features1.ngramSet, features2.ngramSet);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Check if two contents are similar using pre-extracted features
 */
export function isSimilarContentWithFeatures(
  features1: SimilarityFeatures,
  features2: SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  return calculateSimilarityWithFeatures(features1, features2) >= threshold;
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
