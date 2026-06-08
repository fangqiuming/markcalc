---
padres:
  - "[[Ledger]]"
---

# Balance Sheet

Child of `[[Ledger]]`. Aggregates the ledger balances by type with `xcol` + `sumIf`
(cross-note). The last row is a **self-check**: `Discrepancy = 0` only if the books
balance (Assets = Liabilities + Equity).

| Section              | Amount |
| -------------------- | -----: |
| Assets               |  50000 |
| Liabilities          |  30000 |
| Equity               |  20000 |
| Liabilities + Equity |  50000 |
| Discrepancy          |      0 |
<!-- calc:
  @name = balance ;
  Amount(1) = sumIf(xcol("Ledger", "ledger", "Type"), "Asset", xcol("Ledger", "ledger", "Balance")) ;
  Amount(2) = sumIf(xcol("Ledger", "ledger", "Type"), "Liability", xcol("Ledger", "ledger", "Balance")) ;
  Amount(3) = sumIf(xcol("Ledger", "ledger", "Type"), "Equity", xcol("Ledger", "ledger", "Balance")) ;
  Amount(4) = Amount(2) + Amount(3) ;
  Amount(5) = Amount(1) - Amount(4)
-->
