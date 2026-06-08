# Changelog

All notable changes to MarkCalc are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/); versioning follows
[Semantic Versioning](https://semver.org/).

## [0.10.0] - 2026-06-08

First public release.

### Added

- **Formula engine** in Markdown tables: column formulas (`$Col = ...`),
  cell-targeted formulas (`Col(N) = ...`), automatic row expansion.
- **Functions**: aggregates (`sum`, `mean`, `count`, `min`, `max`, `product`),
  conditional aggregates (`sumIf`, `countIf`, `avgIf`), math, dates
  (`today`, `days`, `dateAdd`, …), number formatting (`money`, `percent`, `format`),
  relative references (`up`, `down`, `runningSum`) and same-table `lookup`.
- **User functions** embedded in the note: ` ```calc-functions ` (one-liners) and
  ` ```calc-js ` (full JavaScript).
- **Frontmatter constants** via `fm("key")`.
- **Same-note table references**: `tcol`, `tcell`, `tlookup` over `@name`d tables.
- **Cross-note references**: `xcell`, `xcol`, `xlookup`, `xfm` — read tables and
  frontmatter from other notes (by basename or path; homonyms resolved by path).
- **Dependency graph + auto-recalculation**: a `padres` frontmatter property
  (wikilinks) records each note's sources; editing a source cascades recalculation
  to dependent notes, maintained in-memory from Obsidian's metadata cache.
- **Editor helpers**: context-aware autocomplete with documentation cards inside
  `<!-- calc: -->` comments (functions, columns, `@name` tables, note names), plus
  hover cards. No recalculation while the cursor is inside an unfinished formula.
- **Bilingual UI (EN / ES)** with a language selector (automatic, English, Spanish).

### Notes

- Results are written into the note as plain Markdown (portable, idempotent).
- Formulas and `calc-js` run via `new Function` — use only in trusted notes.

[0.10.0]: https://github.com/Levis-Code/markcalc/releases/tag/0.10.0
