## 2025-05-14 - Optimized Similarity Check in Prompt Creation

**Learning:** Extracting features (normalization, word sets, trigrams) for a candidate item once before a bulk comparison loop, rather than inside the loop, yields significant performance gains. Additionally, implementing set intersection manually (`for...of` with `set.has()`) is much faster than `[...set1].filter(x => set2.has(x))` because it avoids large intermediate array allocations and spread operations.

**Action:** Always look for redundant processing in loops, especially regex-heavy normalization or set creations. Use pre-calculated features and memory-efficient set operations for bulk similarity checks.
