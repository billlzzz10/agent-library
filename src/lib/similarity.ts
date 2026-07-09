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
 * Interface representing pre-calculated features for similarity comparison
 */
export interface SimilarityFeatures {
  normalized: string;
  words: Set<string>;
  trigrams: Set<string>;
}

/**
 * Extract features from content for efficient similarity comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  
  // Words for Jaccard
  const words = new Set(normalized.split(" ").filter(Boolean));
  
  // Trigrams for sequence matching
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
 * Efficiently calculate the size of the intersection of two sets
 */
function intersectionSize(set1: Set<string>, set2: Set<string>): number {
  let count = 0;
  // Iterate over the smaller set for better performance
  if (set1.size < set2.size) {
    for (const item of set1) {
      if (set2.has(item)) count++;
    }
  } else {
    for (const item of set2) {
      if (set1.has(item)) count++;
    }
  }
  return count;
}

/**
 * Calculate Jaccard similarity between two word sets
 */
function calculateJaccard(words1: Set<string>, words2: Set<string>): number {
  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersect = intersectionSize(words1, words2);
  const unionSize = words1.size + words2.size - intersect;
  
  return intersect / unionSize;
}

/**
 * Combined similarity score using pre-calculated features
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
  
  // Combine Jaccard (word-level) and n-gram (character-level) similarities
  const jaccard = calculateJaccard(f1.words, f2.words);
  const trigramSim = calculateJaccard(f1.trigrams, f2.trigrams);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + trigramSim * 0.4;
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
