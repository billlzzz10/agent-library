## 2025-05-14 - Pre-extracting Similarity Features
**Learning:** For batch similarity checks (e.g., checking a new prompt against 1000 existing ones), extracting features (normalization, word sets, trigrams) for the "needle" once instead of for every comparison reduces the workload from O(N*M) to O(N+M) for the extraction phase. Additionally, manual intersection loops over the smaller Set are significantly faster than spreading Sets into arrays.
**Action:** Always look for opportunities to hoist expensive pre-processing out of loops in batch operations.
