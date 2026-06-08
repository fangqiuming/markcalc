# MarkCalc — Demo

Drop this whole folder into a vault (with MarkCalc enabled) and open the notes.
Run **MarkCalc: Recalculate tables (current note)** if values look stale.

| Note | Shows |
|---|---|
| **Price Catalog** | A source table named with `@name`, plus a frontmatter constant (`vat_rate`). Root of the graph (no `padres`). |
| **Purchase Order** | A child note: `xlookup` pulls prices from the catalog, `xfm` reads the VAT rate, `tcol` + `sum` total the lines. |
| **Monthly Summary** | A grandchild: `xcell` pulls the order total. Shows the **transitive cascade**. |
| **Ledger** | An accounting sub-ledger: `Balance` computed from each account's nature (debit/credit). |
| **Balance Sheet** | Aggregates the ledger by type with `xcol` + `sumIf`. The `Discrepancy` row is a self-check — it stays `0` only if the books balance. |

## Try the cascade

Open **Price Catalog**, change the Monitor price, and save. **Purchase Order** and
**Monthly Summary** recalculate on their own — MarkCalc only walks the dependency
chain (via `padres`), not the whole vault.

Or open **Ledger**, change a `Debit`/`Credit`, and watch **Balance Sheet** update —
if you unbalance an entry, the `Discrepancy` row stops being `0`.
