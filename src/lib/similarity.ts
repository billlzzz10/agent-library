/**
 * Content similarity utilities for duplicate detection
 */

/**
 * Normalized features of a content string for efficient similarity comparison
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
 * Extract features from content for optimized bulk comparison
 */
export function extractFeatures(content: string, n: number = 3): SimilarityFeatures {
  const normalized = normalizeContent(content);
  
  // Word set for Jaccard similarity
  const wordSet = new Set(normalized.split(" ").filter(Boolean));
  
  // N-gram set for sequence matching
  const ngramSet = new Set<string>();
  if (normalized.length > 0) {
    const padded = " ".repeat(n - 1) + normalized + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      ngramSet.add(padded.slice(i, i + n));
    }
  }
  
  return { normalized, wordSet, ngramSet };
}

/**
 * Calculate Jaccard similarity between two feature sets
 */
function jaccardSimilarityWithFeatures(f1: SimilarityFeatures, f2: SimilarityFeatures): number {
  if (f1.wordSet.size === 0 && f2.wordSet.size === 0) return 1;
  if (f1.wordSet.size === 0 || f2.wordSet.size === 0) return 0;
  
  let intersectionCount = 0;
  for (const item of f1.wordSet) {
    if (f2.wordSet.has(item)) {
      intersectionCount++;
    }
  }
  
  const unionSize = f1.wordSet.size + f2.wordSet.size - intersectionCount;
  return intersectionCount / unionSize;
}

/**
 * Calculate n-gram similarity between two feature sets
 */
function ngramSimilarityWithFeatures(f1: SimilarityFeatures, f2: SimilarityFeatures): number {
  if (f1.ngramSet.size === 0 && f2.ngramSet.size === 0) return 1;
  if (f1.ngramSet.size === 0 || f2.ngramSet.size === 0) return 0;
  
  let intersectionCount = 0;
  for (const item of f1.ngramSet) {
    if (f2.ngramSet.has(item)) {
      intersectionCount++;
    }
  }
  
  const unionSize = f1.ngramSet.size + f2.ngramSet.size - intersectionCount;
  return intersectionCount / unionSize;
}

/**
 * Combined similarity score using pre-extracted features
 */
export function calculateSimilarityWithFeatures(f1: SimilarityFeatures, f2: SimilarityFeatures): number {
  // Exact match after normalization
  if (f1.normalized === f2.normalized) return 1;
  
  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return 0;
  
  const jaccard = jaccardSimilarityWithFeatures(f1, f2);
  const ngram = ngramSimilarityWithFeatures(f1, f2);
  
  // Weighted average: 60% Jaccard (word overlap), 40% n-gram (sequence similarity)
  return jaccard * 0.6 + ngram * 0.4;
}

/**
 * Combined similarity score using multiple algorithms
 */
export function calculateSimilarity(content1: string, content2: string): number {
  const f1 = extractFeatures(content1);
  const f2 = extractFeatures(content2);
  return calculateSimilarityWithFeatures(f1, f2);
}

/**
 * Check if two contents are similar enough to be considered duplicates
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
 */
export function getContentFingerprint(content: string): string {
  const normalized = normalizeContent(content);
  // Take first 500 chars of normalized content as fingerprint
  return normalized.slice(0, 500);
}
