## 2025-05-15 - Redundant (N)$ Normalization in Bulk Similarity Checks
**Learning:** The prompt creation API was performing content normalization and tokenization for the same input string 1000 times during duplicate detection. Additionally, Jaccard and n-gram calculations were creating intermediate arrays and sets for intersection/union, leading to significant memory churn.
**Action:** Use a feature extraction pattern to compute normalized content and token sets once before bulk comparison. Optimize set intersection logic by iterating over the smaller set and avoiding new allocations.
