# Bolt's Performance Journal

## 2025-05-15 - Optimizing Prompt Similarity with Feature Pre-extraction
**Learning:** In the `POST /api/prompts` route, checking for duplicate content against 1000 existing prompts was causing redundant normalization and tokenization of the *new* prompt for every comparison. By pre-extracting "features" (normalized content, word sets, trigram sets) for the new prompt, we can avoid this $O(N)$ redundant processing. Additionally, Set-based intersection is faster if you iterate over the smaller set.

**Action:** When performing bulk comparisons of content, always pre-calculate comparison features (like tokens or hashes) once for the target item. Use $|A \cup B| = |A| + |B| - |A \cap B|$ to calculate union size from intersection size to avoid creating a new Set for the union.
