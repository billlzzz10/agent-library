/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Features used for similarity comparison to avoid redundant calculations in loops
 */
export interface SimilarityFeatures {
  normalized: string;
  wordSet: Set<string>;
  ngramSet: Set<string>;
}

/**
 * Extract features from content for efficient similarity comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);
  const words = normalized.split(" ").filter(Boolean);
  const wordSet = new Set(words);

  const ngramSet = new Set<string>();
  const n = 3; // Using trigrams as default
  if (normalized.length > 0) {
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      ngramSet.add(padded.slice(i, i + n));
    }
  }

  return { normalized, wordSet, ngramSet };
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
 * Calculate the size of the intersection between two sets
 * O(min(N, M)) time complexity, avoids creating intermediate arrays or sets
 */
function getIntersectionSize<T>(set1: Set<T>, set2: Set<T>): number {
  let intersectionSize = 0;
  const [smaller, larger] = set1.size < set2.size ? [set1, set2] : [set2, set1];
  for (const item of smaller) {
    if (larger.has(item)) {
      intersectionSize++;
    }
  }
  return intersectionSize;
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarityFromSets(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersectionSize = getIntersectionSize(set1, set2);
  const unionSize = set1.size + set2.size - intersectionSize;
  
  return intersectionSize / unionSize;
}


/**
 * Calculate n-gram similarity for better sequence matching
 */
function ngramSimilarityFromSets(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersectionSize = getIntersectionSize(set1, set2);
  const unionSize = set1.size + set2.size - intersectionSize;
  
  return intersectionSize / unionSize;
}


/**
 * Combined similarity score using pre-extracted features
 */
export function calculateSimilarityWithFeatures(f1: SimilarityFeatures, f2: SimilarityFeatures): number {
  // Exact match after normalization
  if (f1.normalized === f2.normalized) return 1;
  
  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return 0;
  
  // Combine Jaccard (word-level) and n-gram (character-level) similarities
  const jaccard = jaccardSimilarityFromSets(f1.wordSet, f2.wordSet);
  const ngram = ngramSimilarityFromSets(f1.ngramSet, f2.ngramSet);
  
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
 * Check if two contents are similar enough using features
 */
export function isSimilarContentWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  return calculateSimilarityWithFeatures(f1, f2) >= threshold;
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
