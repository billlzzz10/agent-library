import { extractFeatures, isSimilarContentWithFeatures, normalizeContent } from "../src/lib/similarity";

const content1 = `
This is a sample prompt for testing similarity.
It contains some text that will be normalized.
We want to see how fast the similarity check is.
${'word '.repeat(100)}
`;

const content2 = `
This is another sample prompt for testing similarity.
It contains some text that will be normalized, but slightly different.
We want to see how fast the similarity check is.
${'word '.repeat(95)} extra words here.
`;

const ITERATIONS = 1000;

console.log("Starting benchmark...");

// Benchmark original API-like behavior (normalization + feature extraction for each existing prompt)
const features1 = extractFeatures(content1);
console.time("Optimized loop (1000 iterations - one side pre-extracted)");
for (let i = 0; i < ITERATIONS; i++) {
  isSimilarContentWithFeatures(features1, extractFeatures(content2));
}
console.timeEnd("Optimized loop (1000 iterations - one side pre-extracted)");

// Benchmark best case (pre-extracted both sides)
const features2 = extractFeatures(content2);
console.time("Best case (1000 iterations - both sides pre-extracted)");
for (let i = 0; i < ITERATIONS; i++) {
  isSimilarContentWithFeatures(features1, features2);
}
console.timeEnd("Best case (1000 iterations - both sides pre-extracted)");
