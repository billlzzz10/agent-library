/**
 * Content similarity utilities for duplicate detection
 */

export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

export interface SimilarityFeatures {
  normalized: string;
  words: Set<string>;
  trigrams: Set<string>;
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
  const words = new Set(normalized.split(" ").filter(Boolean));
  const trigrams = getNgrams(normalized);
  return { normalized, words, trigrams };
}

/**
 * Calculate n-grams (3-character sequences) for better sequence matching
 */
function getNgrams(str: string, n: number = 3): Set<string> {
  const ngrams = new Set<string>();
  const padded = " ".repeat(n - 1) + str + " ".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Calculate the size of the intersection of two sets
 */
function intersectionSize(set1: Set<string>, set2: Set<string>): number {
  let count = 0;
  const isSet1Smaller = set1.size < set2.size;
  const smaller = isSet1Smaller ? set1 : set2;
  const larger = isSet1Smaller ? set2 : set1;
  
  for (const item of smaller) {
    if (larger.has(item)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculate Jaccard similarity between two sets of strings
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = intersectionSize(set1, set2);
  const union = set1.size + set2.size - intersection;
  
  return intersection / union;
}

/**
 * Calculate n-gram similarity for better sequence matching
 */
function ngramSimilarity(ngrams1: Set<string>, ngrams2: Set<string>): number {
  if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;
  
  const intersection = intersectionSize(ngrams1, ngrams2);
  const union = ngrams1.size + ngrams2.size - intersection;
  
  return intersection / union;
}

/**
 * Calculate similarity between two pre-extracted feature sets
 */
export function calculateSimilarityWithFeatures(
  f1: SimilarityFeatures,
  f2: SimilarityFeatures,
  threshold: number = 0
): number {
  // Exact match after normalization
  if (f1.normalized === f2.normalized) return 1;
  
  // Empty content edge case
  if (!f1.normalized || !f2.normalized) return 0;

  // Length-ratio heuristic: If the strings are too different in length,
  // they can't meet the similarity threshold.
  // This is a safe lower bound for both Jaccard and N-gram similarities.
  if (threshold > 0) {
    const len1 = f1.normalized.length;
    const len2 = f2.normalized.length;
    const ratio = Math.min(len1, len2) / Math.max(len1, len2);
    if (ratio < threshold) return ratio;
  }

  // Combine Jaccard (word-level) and n-gram (character-level) similarities
  const jaccard = jaccardSimilarity(f1.words, f2.words);
  const ngram = ngramSimilarity(f1.trigrams, f2.trigrams);
  
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
 * Check if two contents are similar enough to be considered duplicates
 * Default threshold is 0.85 (85% similar)
 */
export function isSimilarContent(
  content1: string,
  content2: string,
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): boolean {
  const f1 = extractFeatures(content1);
  const f2 = extractFeatures(content2);
  return calculateSimilarityWithFeatures(f1, f2, threshold) >= threshold;
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
