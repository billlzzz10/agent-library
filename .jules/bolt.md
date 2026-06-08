## 2025-05-14 - Similarity calculation optimization
**Learning:** The previous similarity logic was performing redundant normalization and feature extraction (tokenization/n-gram generation) inside a loop of 1000 items. By extracting features once for the target and once for each candidate, and optimizing set intersection to avoid intermediate array allocations, performance improved by ~2x.
**Action:** Always look for redundant operations (normalization, parsing, regex) inside loops, especially when comparing one item against a batch.
