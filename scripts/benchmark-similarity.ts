import { calculateSimilarityWithFeatures, extractFeatures } from "../src/lib/similarity";

// Mock data generation
const generateRandomPrompt = (id: number) => {
  const baseContent = `
    Role: You are a world-class photographer and AI prompt engineer.
    Task: Write a detailed prompt for an AI to generate a beautiful landscape of a ${id % 2 === 0 ? "mountain" : "beach"} at sunset.
    Details: The scene should include ${id % 3 === 0 ? "snowy peaks" : "palm trees"} and a ${id % 5 === 0 ? "purple" : "orange"} sky.
    Composition: Wide angle, rule of thirds, leading lines from the ${id % 4 === 0 ? "foreground" : "middle ground"}.
    Lighting: Golden hour, soft shadows, high dynamic range.
    Technical: 8k resolution, photorealistic, cinematic lighting, shot on 35mm lens, f/1.8.
    Style: ${id % 6 === 0 ? "National Geographic style" : "Vogue photography"}.
    Additional: Make sure to capture the reflection in the ${id % 7 === 0 ? "water" : "ice"}.
  `.trim();

  return {
    id: `id-${id}`,
    content: baseContent + " ".repeat(id % 20), // Slight variations
    features: extractFeatures(baseContent + " ".repeat(id % 20))
  };
};

const existingPrompts = Array.from({ length: 1000 }, (_, i) => generateRandomPrompt(i));
const uniqueContent = "This is a completely unique prompt that should not match anything in the database of 1000 prompts and thus requires full loop execution.";

function runBenchmark() {
  console.log("Starting similarity benchmark (OPTIMIZED + PRE-EXTRACTED)...");
  console.log(`Comparing 1 new prompt against ${existingPrompts.length} existing prompts.`);

  // Simulation of what happens in the API
  const start = performance.now();
  const newFeatures = extractFeatures(uniqueContent);
  existingPrompts.forEach(p => {
    // In the real DB, we can't easily pre-extract unless we store features in DB
    // But we CAN see the impact of just the comparison logic
    const feat = extractFeatures(p.content);
    calculateSimilarityWithFeatures(newFeatures, feat);
  });
  const end = performance.now();
  console.log(`Duration for 1000 comparisons (with extraction for each): ${(end - start).toFixed(2)}ms`);

  // Measure comparison logic alone
  let compDuration = 0;
  const iterations = 100;
  const feat1 = extractFeatures(uniqueContent);
  for (let i = 0; i < iterations; i++) {
    const s = performance.now();
    existingPrompts.forEach(p => {
        calculateSimilarityWithFeatures(feat1, p.features);
    });
    compDuration += (performance.now() - s);
  }

  console.log(`Average duration for 1000 comparisons (COMP ONLY): ${(compDuration / iterations).toFixed(2)}ms`);
}

runBenchmark();
