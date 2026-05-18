## 2025-05-15 - Optimizing Bulk Similarity Detection
**Learning:** Performing string normalization, tokenization, and set creation within a loop for bulk similarity checks (e.g., checking against 1000 items) is a significant performance bottleneck.
**Action:** Use a "feature extraction" pattern where the input string is processed once into reusable sets/features, and the comparison logic is optimized for set intersections (e.g., iterating over the smaller set) to minimize allocations and CPU cycles.
