## 2025-05-15 - Optimizing Batch Similarity Checks

**Learning:** Redundant regex-heavy normalization and set creations in a tight loop (like checking 1000 prompts for duplicates) is a significant bottleneck. Hoisting feature extraction out of the loop and optimizing set operations (avoiding array spreads) provides a measurable speedup.

**Action:** Always look for "hoistable" computations in loops. For similarity algorithms, extract features (normalization, tokenization) once per unique content and use efficient set intersection logic that avoids creating intermediate objects.
