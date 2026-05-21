## 2025-05-14 - Bulk Similarity Optimization
**Learning:** Performing string normalization and feature extraction (n-grams, word sets) inside a loop for bulk similarity comparison (O(N)) is a major bottleneck. Pre-extracting these features for the reference string and the candidates can reduce the per-comparison cost significantly (by ~3x in benchmarks).
**Action:** Always separate feature extraction from the comparison logic when performing bulk operations. Use a "Features" interface to pass pre-computed data to comparison functions.
