---
padres:
  - "[[Price Catalog]]"
---

# Purchase Order

Child of `[[Price Catalog]]`. `UnitPrice` is pulled with **`xlookup`**; **With VAT**
uses **`xfm`** to read `vat_rate` from the catalog. The `padres` property is written
by MarkCalc automatically.

## Lines

| Item     | Qty | UnitPrice | Subtotal |
| -------- | --: | --------: | -------: |
| Keyboard |   2 |        80 |      160 |
| Monitor  |   1 |       200 |      200 |
<!-- calc:
  @name = lines ;
  $UnitPrice = xlookup("Price Catalog", "prices", "Product", $Item, "Price") ;
  $Subtotal = $Qty * $UnitPrice
-->

## Totals

| Concept  | Value |
| -------- | ----: |
| Total    |   360 |
| With VAT |   432 |
<!-- calc:
  @name = totals ;
  Value(1) = sum(tcol("lines", "Subtotal")) ;
  Value(2) = round(Value(1) * (1 + xfm("Price Catalog", "vat_rate")), 2)
-->
