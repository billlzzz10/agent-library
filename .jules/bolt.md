
## 2025-05-14 - Optimized Set Similarity and Feature Extraction
**Learning:** In batch similarity checks (e.g., comparing 1 new prompt against 1000 existing ones), pre-extracting features (normalization, word sets, trigrams) for the "needle" once before the loop and avoiding expensive array spreads (`[...set]`) for intersection/union yields significant performance gains.
**Action:** Always look for redundant processing inside `.find()`, `.filter()`, or `.map()` loops. Use `Set` for O(1) lookups and iterate over the smaller set during intersections to minimize work.
