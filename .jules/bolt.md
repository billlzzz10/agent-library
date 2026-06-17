## 2025-05-15 - Optimizing Batch Similarity Checks
**Learning:** Hoisting expensive operations like normalization and feature extraction out of loops, combined with optimizing set operations (avoiding array spreading/filtering), yields significant performance gains. In this project, pre-extracting features for a new prompt before comparing it against 1000 existing prompts reduced the execution time by nearly 50%.
**Action:** Always look for redundant computations in loops, especially regex-heavy normalization, and use specialized comparison functions that accept pre-calculated features.
