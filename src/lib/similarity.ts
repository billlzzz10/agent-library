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
 * Pre-calculated features for faster similarity comparison
 */
export interface SimilarityFeatures {
  normalized: string;
  wordSet: Set<string>;
  ngramSet: Set<string>;
}

/**
 * Extract features from content for efficient comparison
 */
export function extractFeatures(content: string): SimilarityFeatures {
  const normalized = normalizeContent(content);

  // Word set for Jaccard similarity
  const wordSet = new Set(normalized.split(" ").filter(Boolean));
  
  // Trigrams for n-gram similarity
  const ngramSet = new Set<string>();
  const n = 3;
  const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    ngramSet.add(padded.slice(i, i + n));
  }

  return { normalized, wordSet, ngramSet };
}

/**
 * Calculate similarity between two sets using Jaccard index
 * Returns a value between 0 and 1
 * Optimized to avoid creating intermediate arrays or sets
 */
function calculateSetSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  // Always iterate over the smaller set for intersection
  const [smaller, larger] = set1.size <= set2.size ? [set1, set2] : [set2, set1];
  
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
 * Calculate Jaccard similarity between two strings
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(" ").filter(Boolean));
  const set2 = new Set(str2.split(" ").filter(Boolean));
  return calculateSetSimilarity(set1, set2);
}

/**
 * Calculate n-gram similarity for better sequence matching
 * Uses trigrams (3-character sequences) by default
 */
function ngramSimilarity(str1: string, str2: string, n: number = 3): number {
  const getNgrams = (str: string): Set<string> => {
    const ngrams = new Set<string>();
    const padded = " ".repeat(n - 1) + str + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      ngrams.add(padded.slice(i, i + n));
    }
    return ngrams;
  };
  
  return calculateSetSimilarity(getNgrams(str1), getNgrams(str2));
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const normalized1 = normalizeContent(content1);
  const normalized2 = normalizeContent(content2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return 1;
  
  // Empty content edge case
  if (!normalized1 || !normalized2) return 0;
  
  // Combine Jaccard (word-level) and n-gram (character-level) similarities
  const jaccard = jaccardSimilarity(normalized1, normalized2);
  const ngram = ngramSimilarity(normalized1, normalized2);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Check if two contents are similar enough using pre-calculated features
 */
export function isSimilarContentWithFeatures(
  features1: SimilarityFeatures,
  features2: SimilarityFeatures,
  threshold: number = 0.85
): boolean {
  // Exact match after normalization
  if (features1.normalized === features2.normalized) return true;

  // Empty content edge case
  if (!features1.normalized || !features2.normalized) return false;

  const jaccard = calculateSetSimilarity(features1.wordSet, features2.wordSet);
  const ngram = calculateSetSimilarity(features1.ngramSet, features2.ngramSet);

  const similarity = jaccard * 0.6 + ngram * 0.4;
  return similarity >= threshold;
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
