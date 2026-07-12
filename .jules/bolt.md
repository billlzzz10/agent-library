## 2025-05-15 - [Hoisting feature extraction in similarity loops]
**Learning:** Performing normalization and Set creation inside a loop for similarity checks (e.g., Jaccard, N-grams) is a major performance bottleneck ((N)$ for $ comparisons). Hoisting the feature extraction of the 'needle' outside the loop and using optimized set intersection logic provides a ~3.7x end-to-end speedup.
**Action:** Always pre-calculate similarity features (normalization, word sets, trigrams) before performing batch comparisons. Add an `extractFeatures` utility to encapsulate this.
