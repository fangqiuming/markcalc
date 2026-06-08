# Ledger

Source note (root). Each account with its `Debit`, `Credit` and `Balance`. The
`Balance` is computed from the account nature (`D` debit, `C` credit). Named
`@name = ledger` so the Balance Sheet can query it.

| Account     | Type      | Nat | Debit | Credit | Balance |
| ----------- | --------- | --- | ----: | -----: | ------: |
| Cash        | Asset     | D   |  5000 |   1000 |    4000 |
| Bank        | Asset     | D   | 30000 |  12000 |   18000 |
| Receivables | Asset     | D   | 15000 |   7000 |    8000 |
| Inventory   | Asset     | D   | 25000 |   5000 |   20000 |
| Payables    | Liability | C   |  4000 |  14000 |   10000 |
| Loan        | Liability | C   |     0 |  20000 |   20000 |
| Capital     | Equity    | C   |     0 |  15000 |   15000 |
| Retained    | Equity    | C   |     0 |   5000 |    5000 |
<!-- calc: @name = ledger ; $Balance = $Nat == "D" ? $Debit - $Credit : $Credit - $Debit -->
