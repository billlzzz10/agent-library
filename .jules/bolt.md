## 2025-05-23 - Similarity Loop Optimization
**Learning:** Pre-extracting features (normalization and Set creation) before a large batch comparison significantly improves performance by reducing redundant work. In this codebase, the similarity check for new prompts against the last 1000 public prompts was doing redundant normalization and Set creation for the new prompt 1000 times.
**Action:** Always look for O(N) loops where the same operation is performed on a constant value. Extract that operation outside the loop.
