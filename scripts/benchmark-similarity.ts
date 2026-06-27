import { extractFeatures, calculateSimilarityWithFeatures, DEFAULT_SIMILARITY_THRESHOLD } from '../src/lib/similarity';

const content1 = "This is a sample prompt for testing similarity. It should be long enough to pass the 50 character limit.";
const content2 = "This is a sample prompt for testing similarity. It should be long enough to pass the 50 character limit and have some extra words.";

const iterations = 1000;

// Mock the original logic for comparison
function originalNormalize(content: string): string {
  return content
    .replace(/\$\{[^}]+\}/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/<[^>]+>/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function originalJaccard(str1: string, str2: string): number {
  const set1 = new Set(str1.split(" ").filter(Boolean));
  const set2 = new Set(str2.split(" ").filter(Boolean));
  if (set1.size === 0 && set2.size === 0) return 1;
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

function originalNgram(str1: string, str2: string, n: number = 3): number {
  const getNgrams = (str: string): Set<string> => {
    const ngrams = new Set<string>();
    const padded = " ".repeat(n - 1) + str + " ".repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      ngrams.add(padded.slice(i, i + n));
    }
    return ngrams;
  };
  const ngrams1 = getNgrams(str1);
  const ngrams2 = getNgrams(str2);
  const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
  const union = new Set([...ngrams1, ...ngrams2]);
  return intersection.size / union.size;
}

function originalCalculateSimilarity(c1: string, c2: string) {
    const n1 = originalNormalize(c1);
    const n2 = originalNormalize(c2);
    if (n1 === n2) return 1;
    return originalJaccard(n1, n2) * 0.6 + originalNgram(n1, n2) * 0.4;
}

console.log(`Running similarity benchmark with ${iterations} iterations...`);

console.time('Original Implementation');
for (let i = 0; i < iterations; i++) {
    originalCalculateSimilarity(content1, content2);
}
console.timeEnd('Original Implementation');

console.time('Optimized Implementation (Bulk pattern)');
const feat1 = extractFeatures(content1);
for (let i = 0; i < iterations; i++) {
    const feat2 = extractFeatures(content2);
    calculateSimilarityWithFeatures(feat1, feat2);
}
console.timeEnd('Optimized Implementation (Bulk pattern)');

const result = extractFeatures(content1);
const result2 = extractFeatures(content2);
const score = calculateSimilarityWithFeatures(result, result2);
console.log(`Similarity Score: ${score.toFixed(4)} (Threshold: ${DEFAULT_SIMILARITY_THRESHOLD})`);
