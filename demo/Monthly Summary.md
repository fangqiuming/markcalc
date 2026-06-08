---
padres:
  - "[[Purchase Order]]"
---

# Monthly Summary

Grandchild: depends on `[[Purchase Order]]`, which depends on `[[Price Catalog]]`.
Demonstrates the transitive cascade — change a price and it ripples here.

| Metric            | Value |
| ----------------- | ----: |
| Order total (VAT) |   432 |
<!-- calc: Value(1) = xcell("Purchase Order", "totals", "Value", 2) -->
