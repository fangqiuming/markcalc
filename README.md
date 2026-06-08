# MarkCalc

[![Obsidian plugin](https://img.shields.io/badge/Obsidian-plugin-7c3aed)](https://obsidian.md)
[![Version](https://img.shields.io/github/manifest-json/v/Levis-Code/markcalc)](https://github.com/Levis-Code/markcalc/releases)
[![License: MIT](https://img.shields.io/github/license/Levis-Code/markcalc)](./LICENSE)

> **Spreadsheet-style formulas in Markdown tables — where the results stay as plain, portable text.**

Compute inside your notes (budgets, ledgers, trackers, data tables) without leaving
Obsidian, and **without locking the results into a plugin**. Values are written into
the cells as real Markdown, so the note stays readable — and the numbers stay there —
even if you move the `.md` to GitHub, another editor, or another vault.

<!--
  DEMO: graba un GIF corto (5-8 s) mostrando la cascada cross-note —
  cambiar un precio en una nota y ver cómo otra se recalcula sola.
  Guárdalo como docs/demo.gif y descomenta la línea de abajo:
![MarkCalc demo](docs/demo.gif)
-->

## Why MarkCalc

|  | MarkCalc | Dataview | Static tables |
|---|:---:|:---:|:---:|
| Results as plain, portable Markdown | ✅ | ❌ (rendered view) | — |
| Survives without the plugin / in Git | ✅ | ❌ | ✅ |
| Computes (formulas, aggregates, lookups) | ✅ | ✅ | ❌ |
| Cross-note references with auto-recalc | ✅ | partial | ❌ |

- **Portable results.** The computed value is written into the cell. Versionable in
  Git, printable, readable without the plugin. Dataview renders an ephemeral view
  that disappears without it — MarkCalc doesn't.
- **Cross-note, like a multi-sheet workbook over your vault.** A note can read a
  table in another note (`xcell`, `xcol`, `xlookup`, `xfm`); editing the source
  cascades the recalculation to dependent notes via a `padres` dependency graph,
  without scanning the whole vault.
- **Context-aware autocomplete.** Inside the `<!-- calc: -->` comment, the editor
  suggests functions (with signature, description and example), table columns,
  `@name` tables and note names — derived from the formula itself.
- **Bilingual (EN / ES).** Interface and editor helpers in English or Spanish, with
  a selector in settings (or automatic, following Obsidian's language).
- **Zero dependencies.** The engine evaluates with native JavaScript. User functions
  (`calc-functions` / `calc-js`) are embedded in the note itself.

## Example

```markdown
| Product | Qty | Price | Total |
|---------|----:|------:|------:|
| Coffee  | 2   | 3.5   |       |
| Tea     | 4   | 2.0   |       |
<!-- calc: $Total = $Qty * $Price -->
```

On recalculation, the `Total` column is filled in. The formula stays in the comment
(the source of truth — idempotent).

### Cross-note in action

A `Ledger` note names its table `@name = accounts`; a `Balance Sheet` note pulls
totals from it with `xcol` + `sumIf`, and a check row stays at `0` only if the books
balance. Change a number in the ledger and the balance updates on its own. Neither
Dataview nor a static table can do that in plain Markdown.

## Installation

**From the Community Plugins store** (once approved): Settings → Community plugins →
Browse → search **MarkCalc**.

**Manual:** download `main.js`, `manifest.json` and `styles.css` from the
[latest release](https://github.com/Levis-Code/markcalc/releases), drop them in
`<your-vault>/.obsidian/plugins/markcalc/`, then enable MarkCalc in Settings.

## Documentation

Full reference (every function, cross-note, security, editor helpers) in
[`MarkCalc-docs.md`](./MarkCalc-docs.md) — Spanish: [`MarkCalc-docs.es.md`](./MarkCalc-docs.es.md).
Ready-to-run examples in the [`demo/`](./demo) folder.

## Development

`main.js` is a **generated artifact** — never edit it by hand. Edit the sources in
`src/` and rebuild:

```bash
node src/build.js        # concatenates src/engine.js + src/wrapper.js -> main.js
node src/test/run.js     # engine test suite (~42 assertions, no dependencies)
node src/test/i18n.js    # bilingual catalog integrity
```

- `src/engine.js` — pure engine (no dependencies, testable with Node).
- `src/wrapper.js` — Obsidian glue (Plugin, EditorSuggest, settings).

Tagging a release (`git tag 0.10.0 && git push --tags`) triggers a CI workflow that
builds, tests, and publishes the release assets automatically.

## Security

MarkCalc evaluates note content as **trusted code** (same model as DataviewJS /
Templater): formulas and `calc-js` blocks run via `new Function`. Use it **only in
notes you write yourself**. Details in the docs, §7.

## Support

If MarkCalc saves you time and you'd like to support its development:

<a href="https://www.buymeacoffee.com/leviscodeup">☕ Buy me a coffee</a>

## License

[MIT](./LICENSE) © 2026 [Levis-Code](https://github.com/Levis-Code)
