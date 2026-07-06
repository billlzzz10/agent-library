## 2025-05-23 - Similarity Check Optimization
**Learning:** In bulk similarity checks, normalizing and extracting features (like trigrams and word sets) for the target string inside the loop is a major bottleneck ($O(N \cdot M)$ where $M$ is the number of existing records). Pre-extracting these features once reduces the work to $O(M)$ extractions + $O(M)$ fast set intersections.
**Action:** Always pre-calculate expensive features (normalization, set creation, regex parsing) outside of loops when comparing a single item against a collection.
