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
 * Features extracted from content for similarity comparison
 */
export interface ContentFeatures {
  normalized: string;
  wordSet: Set<string>;
  trigramSet: Set<string>;
}

/**
 * Extracts features from content once to be reused in multiple comparisons.
 */
export function extractFeatures(content: string): ContentFeatures {
  const normalized = normalizeContent(content);
  const wordSet = new Set(normalized.split(" ").filter(Boolean));
  
  const trigramSet = new Set<string>();
  const n = 3;
  if (normalized.length > 0) {
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      trigramSet.add(padded.slice(i, i + n));
    }
  }

  return { normalized, wordSet, trigramSet };
}

/**
 * Calculates set similarity (Jaccard index) without expensive array spreads.
 */
function calculateSetSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersectionSize = 0;
  // Iterate over the smaller set for efficiency
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
 * Calculates similarity between two sets of pre-extracted features.
 */
export function calculateSimilarityWithFeatures(
  features1: ContentFeatures,
  features2: ContentFeatures
): number {
  // Exact match after normalization
  if (features1.normalized === features2.normalized) return 1;
  
  // Empty content edge case
  if (!features1.normalized || !features2.normalized) return 0;
  
  // Combine Jaccard (word-level) and trigram (character-level) similarities
  const jaccard = calculateSetSimilarity(features1.wordSet, features2.wordSet);
  const trigram = calculateSetSimilarity(features1.trigramSet, features2.trigramSet);
  
  // Weighted average: 60% Jaccard (word overlap), 40% trigram (sequence similarity)
  return jaccard * 0.6 + trigram * 0.4;
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
