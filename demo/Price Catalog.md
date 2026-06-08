---
vat_rate: 0.2
---

# Price Catalog

Source note. Its table is named `@name = prices` so other notes can query it.
The `vat_rate` in the frontmatter is read from another note with `xfm`.

| Product  | Price |
| -------- | ----: |
| Keyboard |    80 |
| Mouse    |    25 |
| Monitor  |   200 |
<!-- calc: @name = prices -->

> Change the Monitor price and watch `[[Purchase Order]]` and `[[Monthly Summary]]` update on save.
