# Bolt's Performance Journal

## 2025-05-15 - Optimizing similarity loop by pre-extracting features
**Learning:** Extracting features (normalization, word sets, n-gram sets) once for the input content before a batch comparison loop avoids redundant O(N) regex and set construction operations. Additionally, iterating over the smaller of two sets during Jaccard intersection calculation is significantly faster.
**Action:** Always check if a loop performs redundant transformations on a constant "needle" before comparing it against a "haystack".
