## 2025-05-14 - Optimized Similarity Batch Comparison
**Learning:** In loops comparing one item against many (like duplicate detection), pre-extracting features (normalization, set creation) once outside the loop yields massive gains (~14x-20x) by avoiding redundant regex and string operations.
**Action:** Always look for O(N) operations inside loops that can be hoisted to O(1) by pre-calculating features.
