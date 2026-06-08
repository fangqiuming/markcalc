// ===== wrapper Obsidian =====
const { Plugin, PluginSettingTab, Setting, MarkdownView, EditorSuggest, debounce } = require('obsidian');

const DEFAULTS = {
  renderOnModify: true,   // recalcular al editar la nota
  enableJsFunctions: true, // permitir bloques ```calc-js (ejecuta JS de la nota)
  precision: 6,           // decimales máximos al formatear
  recalcDelay: 600,       // ms de espera tras dejar de teclear antes de recalcular
  preserveFocus: true,    // no reescribir la tabla donde está el cursor (no pierde el foco)
  autoParents: true,      // escribir `padres` (wikilinks) en el frontmatter + auto-recalc
  editorHelpers: true,    // autocompletado con ficha + hover dentro de los comentarios calc
  lang: 'auto',           // idioma de la UI: 'auto' (sigue a Obsidian) | 'es' | 'en'
  debug: false,
};

// Catálogo de funciones: ÚNICA fuente de verdad para el autocompletado, el hover
// y (referencia) la documentación. n=nombre, s=firma, g=grupo, d=descripción,
// e=ejemplo, ins=texto a insertar (por defecto "nombre(").
const CATALOG = [
  { n: 'sum', s: 'sum(...nums | col)', g: 'agg', d: 'Suma valores o una columna entera.', den: 'Sum values or a whole column.', e: 'sum(col("Total"))' },
  { n: 'mean', s: 'mean(...nums | col)', g: 'agg', d: 'Promedio (media).', den: 'Average (mean).', e: 'mean(col("Nota"))' },
  { n: 'avg', s: 'avg(...nums | col)', g: 'agg', d: 'Alias de mean.', den: 'Alias of mean.', e: 'avg(col("Nota"))' },
  { n: 'count', s: 'count(col)', g: 'agg', d: 'Número de elementos.', den: 'Number of items.', e: 'count(col("Item"))' },
  { n: 'product', s: 'product(...nums | col)', g: 'agg', d: 'Multiplica todos los valores.', den: 'Multiply all values.', e: 'product(col("Factor"))' },
  { n: 'min', s: 'min(...nums | col)', g: 'agg', d: 'Valor mínimo.', den: 'Minimum value.', e: 'min(col("Precio"))' },
  { n: 'max', s: 'max(...nums | col)', g: 'agg', d: 'Valor máximo.', den: 'Maximum value.', e: 'max(col("Precio"))' },
  { n: 'sumIf', s: 'sumIf(colCond, crit, colVal)', g: 'cond', d: 'Suma colVal donde colCond cumple el criterio ("activo", ">10").', den: 'Sum colVal where colCond meets the criteria ("active", ">10").', e: 'sumIf(col("Estado"),"activo",col("Total"))' },
  { n: 'countIf', s: 'countIf(colCond, crit)', g: 'cond', d: 'Cuenta filas que cumplen el criterio.', den: 'Count rows meeting the criteria.', e: 'countIf(col("Estado"),"activo")' },
  { n: 'avgIf', s: 'avgIf(colCond, crit, colVal)', g: 'cond', d: 'Promedio donde se cumple el criterio.', den: 'Average where the criteria is met.', e: 'avgIf(col("Estado"),"activo",col("Total"))' },
  { n: 'round', s: 'round(x, n)', g: 'math', d: 'Redondea x a n decimales.', den: 'Round x to n decimals.', e: 'round($Total, 2)' },
  { n: 'floor', s: 'floor(x)', g: 'math', d: 'Redondea hacia abajo.', den: 'Round down.', e: 'floor($X)' },
  { n: 'ceil', s: 'ceil(x)', g: 'math', d: 'Redondea hacia arriba.', den: 'Round up.', e: 'ceil($X)' },
  { n: 'abs', s: 'abs(x)', g: 'math', d: 'Valor absoluto.', den: 'Absolute value.', e: 'abs($Saldo)' },
  { n: 'sqrt', s: 'sqrt(x)', g: 'math', d: 'Raíz cuadrada.', den: 'Square root.', e: 'sqrt($Area)' },
  { n: 'pow', s: 'pow(x, y)', g: 'math', d: 'x elevado a y.', den: 'x to the power of y.', e: 'pow($Base, 2)' },
  { n: 'exp', s: 'exp(x)', g: 'math', d: 'e elevado a x.', den: 'e to the power of x.', e: 'exp($X)' },
  { n: 'log', s: 'log(x)', g: 'math', d: 'Logaritmo natural.', den: 'Natural logarithm.', e: 'log($X)' },
  { n: 'log10', s: 'log10(x)', g: 'math', d: 'Logaritmo base 10.', den: 'Base-10 logarithm.', e: 'log10($X)' },
  { n: 'IF', s: 'IF(cond, a, b)', g: 'logic', d: 'Devuelve a si cond es verdadero; si no, b.', den: 'Returns a if cond is true; otherwise b.', e: 'IF($Ventas > 100, 10, 0)' },
  { n: 'iif', s: 'iif(cond, a, b)', g: 'logic', d: 'Alias de IF.', den: 'Alias of IF.', e: 'iif($X > 0, "pos", "neg")' },
  { n: 'PI', s: 'PI', g: 'const', d: 'Número pi (3.14159…).', den: 'Pi (3.14159…).', e: '2 * PI * $Radio', ins: 'PI' },
  { n: 'E', s: 'E', g: 'const', d: 'Número e (2.71828…).', den: "Euler's number (2.71828…).", e: 'pow(E, $X)', ins: 'E' },
  { n: 'today', s: 'today()', g: 'date', d: 'Fecha de hoy (YYYY-MM-DD).', den: "Today's date (YYYY-MM-DD).", e: 'days(today(), $Vence)', ins: 'today()' },
  { n: 'days', s: 'days(a, b)', g: 'date', d: 'Días desde a hasta b.', den: 'Days from a to b.', e: 'days("2026-01-01", $Fecha)' },
  { n: 'dateAdd', s: 'dateAdd(a, n)', g: 'date', d: 'Suma n días a la fecha a.', den: 'Add n days to date a.', e: 'dateAdd($Fecha, 30)' },
  { n: 'year', s: 'year(a)', g: 'date', d: 'Año de la fecha.', den: 'Year of the date.', e: 'year($Fecha)' },
  { n: 'month', s: 'month(a)', g: 'date', d: 'Mes (1-12).', den: 'Month (1-12).', e: 'month($Fecha)' },
  { n: 'day', s: 'day(a)', g: 'date', d: 'Día del mes.', den: 'Day of the month.', e: 'day($Fecha)' },
  { n: 'weekday', s: 'weekday(a)', g: 'date', d: 'Día de la semana (0=domingo).', den: 'Day of week (0=Sunday).', e: 'weekday($Fecha)' },
  { n: 'money', s: 'money(x, sym?, dec?)', g: 'fmt', d: 'Formato moneda: money(1500) -> $1,500.00.', den: 'Currency format: money(1500) -> $1,500.00.', e: 'money($Total)' },
  { n: 'thousands', s: 'thousands(x, dec?)', g: 'fmt', d: 'Separador de miles: 1,500.', den: 'Thousands separator: 1,500.', e: 'thousands($Total)' },
  { n: 'percent', s: 'percent(x, dec?)', g: 'fmt', d: 'Añade % sin escalar: 28 -> "28%".', den: 'Adds % without scaling: 28 -> "28%".', e: 'percent($Pct)' },
  { n: 'format', s: 'format(x, pattern)', g: 'fmt', d: 'Patrón "$#,##0.00" / "0.0%" (% sí escala).', den: 'Pattern "$#,##0.00" / "0.0%" (% does scale).', e: 'format(0.28, "0.0%")' },
  { n: 'col', s: 'col("Col")', g: 'ref', d: 'Array con toda la columna (para agregados).', den: 'Array of the whole column (for aggregates).', e: 'sum(col("Total"))' },
  { n: 'cell', s: 'cell("Col", N)', g: 'ref', d: 'Celda concreta: columna, fila N (1-based).', den: 'Specific cell: column, row N (1-based).', e: 'cell("Total", 1)' },
  { n: 'row', s: 'row', g: 'ref', d: 'Índice de la fila actual (empieza en 1).', den: 'Current row index (starts at 1).', e: '$Idx = row', ins: 'row' },
  { n: 'up', s: 'up("Col", k=1)', g: 'rel', d: 'Valor k filas arriba (por defecto la anterior).', den: 'Value k rows above (previous by default).', e: '$Saldo = up("Saldo") + $Neto' },
  { n: 'down', s: 'down("Col", k=1)', g: 'rel', d: 'Valor k filas abajo.', den: 'Value k rows below.', e: 'down("Meta")' },
  { n: 'prev', s: 'prev("Col")', g: 'rel', d: 'Alias de up.', den: 'Alias of up.', e: 'prev("Saldo")' },
  { n: 'next', s: 'next("Col")', g: 'rel', d: 'Alias de down.', den: 'Alias of down.', e: 'next("Saldo")' },
  { n: 'runningSum', s: 'runningSum("Col")', g: 'rel', d: 'Suma acumulada hasta la fila actual.', den: 'Running total up to the current row.', e: '$Acum = runningSum("Neto")' },
  { n: 'lookup', s: 'lookup(keyCol, val, retCol)', g: 'lookup', d: 'Busca en ESTA tabla y devuelve otra columna.', den: 'Looks up in THIS table and returns another column.', e: 'lookup("Codigo", $Cod, "Precio")' },
  { n: 'tcol', s: 'tcol("table", "Col")', g: 'ttable', d: 'Columna de otra tabla @name de la misma nota.', den: 'Column of another @name table in the same note.', e: 'sum(tcol("lineas","Subtotal"))' },
  { n: 'tcell', s: 'tcell("table", "Col", N)', g: 'ttable', d: 'Celda de otra tabla @name de la misma nota.', den: 'Cell of another @name table in the same note.', e: 'tcell("precios","Precio",2)' },
  { n: 'tlookup', s: 'tlookup("table", keyCol, val, retCol)', g: 'ttable', d: 'Lookup en otra tabla @name de la misma nota.', den: 'Lookup in another @name table in the same note.', e: 'tlookup("precios","Prod",$P,"Precio")' },
  { n: 'xcell', s: 'xcell("Note", "table", "Col", N)', g: 'xnote', d: 'Celda de una tabla @name de OTRA nota.', den: 'Cell of an @name table in ANOTHER note.', e: 'xcell("Catalogo","precios","Precio",1)' },
  { n: 'xcol', s: 'xcol("Note", "table", "Col")', g: 'xnote', d: 'Columna de otra nota (para agregados).', den: 'Column of another note (for aggregates).', e: 'sumIf(xcol("Mayor","m","Cat"),"Activo",xcol("Mayor","m","Saldo"))' },
  { n: 'xlookup', s: 'xlookup("Note", "table", keyCol, val, retCol)', g: 'xnote', d: 'Lookup en una tabla @name de otra nota.', den: 'Lookup in an @name table of another note.', e: 'xlookup("Catalogo","precios","Prod","Monitor","Precio")' },
  { n: 'xfm', s: 'xfm("Note", "key")', g: 'xnote', d: 'Escalar del frontmatter de otra nota.', den: "Scalar from another note's frontmatter.", e: 'xfm("Config","tasa_iva")' },
  { n: 'fm', s: 'fm("key")', g: 'fm', d: 'Escalar del frontmatter de ESTA nota.', den: "Scalar from THIS note's frontmatter.", e: '$ConIVA = $Sub * (1 + fm("tasa_iva"))' },
  { n: '@name', s: '@name = name', g: 'directive', d: 'Nombra la tabla para consultarla con tcol/tcell/xcell…', den: 'Names the table so tcol/tcell/xcell… can query it.', e: '@name = ventas', ins: '@name = ' },
];
const CATALOG_BYNAME = (() => { const m = {}; for (const f of CATALOG) m[f.n] = f; return m; })();

const GRP = {
  agg: { es: 'agregado', en: 'aggregate' }, cond: { es: 'condicional', en: 'conditional' },
  math: { es: 'matemática', en: 'math' }, logic: { es: 'lógica', en: 'logic' },
  const: { es: 'constante', en: 'constant' }, date: { es: 'fecha', en: 'date' },
  fmt: { es: 'formato', en: 'format' }, ref: { es: 'referencia', en: 'reference' },
  rel: { es: 'relativa', en: 'relative' }, lookup: { es: 'búsqueda', en: 'lookup' },
  ttable: { es: 'otra tabla', en: 'other table' }, xnote: { es: 'otra nota', en: 'other note' },
  fm: { es: 'frontmatter', en: 'frontmatter' }, directive: { es: 'directiva', en: 'directive' },
  column: { es: 'columna', en: 'column' }, note: { es: 'nota', en: 'note' },
  noteP: { es: 'nota (ruta)', en: 'note (path)' },
  nameLocal: { es: '@name (esta nota)', en: '@name (this note)' },
  nameOther: { es: '@name (otra nota)', en: '@name (other note)' },
  fmOther: { es: 'frontmatter (otra nota)', en: 'frontmatter (other note)' },
  colOther: { es: 'columna (otra nota)', en: 'column (other note)' },
  colTable: { es: 'columna (otra tabla)', en: 'column (other table)' },
};

const I18N = {
  es: {
    cmdRecalc: 'Recalcular tablas (nota actual)',
    sRecalcN: 'Recalcular al editar', sRecalcD: 'Recalcula las tablas automáticamente cuando modificas la nota.',
    sJsN: 'Permitir funciones JavaScript (calc-js)', sJsD: 'Ejecuta el JavaScript de los bloques calc-js de la nota. Potente, pero actívalo solo en vaults de confianza: ejecuta código arbitrario.',
    sPrecN: 'Decimales máximos', sPrecD: 'Precisión al formatear resultados no enteros.',
    sDelayN: 'Tiempo de recálculo (ms)', sDelayD: 'Espera tras dejar de teclear antes de recalcular. Más alto = menos interrupciones.',
    sFocusN: 'Recuperar el foco al recalcular en vivo', sFocusD: 'Recalcula mientras editas y devuelve el cursor a la celda tras renderizar. Si lo apagas, el recálculo puede mover el foco.',
    sParentsN: 'Dependencias entre notas (padres)', sParentsD: 'Escribe la propiedad padres (wikilinks) en el frontmatter según las notas referenciadas con xcell/xcol/xlookup/xfm, y recalcula en cascada las notas hijas. Apágalo para no tocar el frontmatter.',
    sHelpersN: 'Ayudas del editor (autocompletado + fichas)', sHelpersD: 'Dentro de los comentarios calc sugiere funciones (firma, descripción, ejemplo), columnas, tablas @name y notas. Muestra una ficha al pasar el ratón.',
    sLangN: 'Idioma', sLangD: 'Idioma de la interfaz y de las ayudas del editor.',
    sDebugN: 'Logs de depuración', sDebugD: 'Avisa en consola cuando una fórmula o función falla.',
    langAuto: 'Automático (Obsidian)',
  },
  en: {
    cmdRecalc: 'Recalculate tables (current note)',
    sRecalcN: 'Recalculate while editing', sRecalcD: 'Automatically recalculates tables when you edit the note.',
    sJsN: 'Allow JavaScript functions (calc-js)', sJsD: "Runs the JavaScript in the note's calc-js blocks. Powerful, but enable it only in trusted vaults: it executes arbitrary code.",
    sPrecN: 'Max decimals', sPrecD: 'Precision when formatting non-integer results.',
    sDelayN: 'Recalculation delay (ms)', sDelayD: 'Wait after you stop typing before recalculating. Higher = fewer interruptions.',
    sFocusN: 'Keep focus on live recalculation', sFocusD: 'Recalculates while you edit and returns the cursor to the cell after rendering. If off, recalculation may move your focus.',
    sParentsN: 'Cross-note dependencies (parents)', sParentsD: 'Writes the padres property (wikilinks) in the frontmatter based on notes referenced with xcell/xcol/xlookup/xfm, and cascades recalculation to child notes. Turn off to leave the frontmatter untouched.',
    sHelpersN: 'Editor helpers (autocomplete + cards)', sHelpersD: 'Inside calc comments, suggests functions (signature, description, example), columns, @name tables and note names. Shows a card on hover.',
    sLangN: 'Language', sLangD: 'Language of the interface and editor helpers.',
    sDebugN: 'Debug logs', sDebugD: 'Warns in the console when a formula or function fails.',
    langAuto: 'Automatic (Obsidian)',
  },
};

class MarkCalcPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.isUpdating = false;
    this._suggestOpen = false;                                      // popup de autocompletado abierto
    this.selfWrites = new Set();                                    // rutas que escribimos nosotros
    this.refIndex = { bySource: new Map(), byConsumer: new Map() }; // grafo de dependencias
    this.rebuildScheduler();

    // Indexa qué nota referencia a cuál (para auto-recalc por dependencias).
    this.app.workspace.onLayoutReady(() => this.buildRefIndex());

    this.addCommand({
      id: 'markcalc-recalc-current',
      name: this.t('cmdRecalc'),
      callback: () => this.recalcActiveFile(),
    });

    // Recalcular al teclear en el editor (vista activa).
    this.registerEvent(
      this.app.workspace.on('editor-change', (editor, info) => {
        if (!this.settings.renderOnModify || this.isUpdating) return;
        const file = info && info.file;
        if (file && file.extension === 'md') this.scheduleRecalc(file);
      })
    );

    // Cambio en disco (sync, otra nota): recalcula esa nota y sus dependientes.
    // Ignora nuestras propias escrituras y la nota activa (la lleva editor-change).
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (!this.settings.renderOnModify || this.isUpdating) return;
        if (!file || file.extension !== 'md') return;
        if (this.selfWrites.has(file.path)) return;
        const active = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (active && active.file && active.file.path === file.path) return;
        this.recalcChain(file, new Set());
      })
    );

    // Recalcular al abrir una nota.
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        if (file && file.extension === 'md') this.scheduleRecalc(file);
      })
    );

    // Mantén el índice inverso (padre -> hijas) desde el frontmatter en caché,
    // sin leer cuerpos: al cambiar los metadatos de una nota, reindexa sus padres.
    this.registerEvent(
      this.app.metadataCache.on('changed', (file, data, cache) => {
        this.indexFromFrontmatter(file.path, cache && cache.frontmatter);
      })
    );

    this.addSettingTab(new MarkCalcSettingTab(this.app, this));

    // Ayudas del editor: autocompletado contextual con ficha + hover.
    try { this.registerEditorSuggest(new MarkCalcSuggest(this)); }
    catch (e) { if (this.settings.debug) console.warn('MarkCalc suggest:', e.message); }
    try { const hx = this.buildHoverExtension(); if (hx) this.registerEditorExtension([hx]); }
    catch (e) { if (this.settings.debug) console.warn('MarkCalc hover:', e.message); }

    if (this.settings.debug) console.log('MarkCalc cargado');
  }

  onunload() {}

  // (Re)crea el debounce con el retardo actual. Se llama al cargar y al
  // cambiar el ajuste "Tiempo de recálculo".
  rebuildScheduler() {
    const delay = Math.max(0, parseInt(this.settings.recalcDelay, 10) || 0);
    this.scheduleRecalc = debounce((file) => this.recalcChain(file, new Set()), delay, true);
  }

  async recalcActiveFile() {
    const file = this.app.workspace.getActiveFile();
    if (file && file.extension === 'md') await this.recalcChain(file, new Set());
  }

  // Recalcula UNA nota. Devuelve true si su contenido cambió. (Anti-reentrada
  // por isUpdating; no reescribe si nada cambió.)
  async recalcFile(file) {
    if (this.isUpdating) return false;
    // No reescribir el documento mientras el autocompletado está abierto: el
    // setValue movería el cursor y el contexto del popup. Reintenta al cerrarse.
    if (this._suggestOpen) { this.scheduleRecalc(file); return false; }
    let changed = false;
    try {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const isActive = view && view.file && file && view.file.path === file.path;

      // Si estoy ESCRIBIENDO la fórmula (cursor dentro del comentario calc, con el
      // editor enfocado), no recalcular todavía: esperar a salir del comentario.
      // Evita renderizar/auto-expandir con la fórmula a medio escribir o sin cerrar.
      if (isActive && view.editor) {
        const focused = view.editor.hasFocus ? view.editor.hasFocus() : true;
        if (focused && mcInCalc(view.editor.getRange({ line: 0, ch: 0 }, view.editor.getCursor()))) {
          this.scheduleRecalc(file);
          return false;
        }
      }

      const content = isActive ? view.editor.getValue() : await this.app.vault.read(file);
      const externals = await this.resolveExternals(content, file);
      let out = processContent(content, this.settings, externals);

      // Escribe/actualiza `padres` (wikilinks) en el frontmatter según las notas
      // que esta referencia. El índice inverso (hijas) se mantiene aparte desde
      // metadataCache. Solo cambia el contenido si el conjunto de padres cambió.
      if (this.settings.autoParents) out = upsertParents(out, Array.from(scanExternalRefs(content)));

      if (out == null || out === content) return false;
      changed = true;

      this.isUpdating = true;
      if (isActive) {
        // Recalcula EN VIVO (sin salir de la celda): re-renderiza y devuelve el
        // cursor a su sitio dentro de la celda, recuperando el foco.
        const ed = view.editor;
        const cur = ed.getCursor();
        const hadFocus = ed.hasFocus ? ed.hasFocus() : true;
        const scroll = ed.getScrollInfo ? ed.getScrollInfo() : null;

        // Remapea el cursor solo si el nº de líneas no cambió. Si se insertó o
        // quitó frontmatter (padres), las líneas se desplazan: no remapear.
        let target = cur;
        const sameLineCount = content.split('\n').length === out.split('\n').length;
        if (this.settings.preserveFocus && sameLineCount) {
          const oldLine = content.split('\n')[cur.line] || '';
          const newLine = out.split('\n')[cur.line] || '';
          target = { line: cur.line, ch: remapCursorCh(oldLine, newLine, cur.ch) };
        }

        ed.setValue(out); // re-render: aquí ves el resultado actualizado
        if (this.settings.preserveFocus && hadFocus && ed.focus) ed.focus();
        try { ed.setCursor(target); } catch (e) { try { ed.setCursor(cur); } catch (_) {} }
        if (scroll && ed.scrollTo) ed.scrollTo(scroll.left, scroll.top);
      } else {
        // Nota no activa: escritura directa. Marca selfWrites para no recursar
        // sobre nuestro propio evento 'modify'.
        this.selfWrites.add(file.path);
        await this.app.vault.modify(file, out);
        setTimeout(() => this.selfWrites.delete(file.path), 0);
      }
    } catch (e) {
      console.error('MarkCalc error:', e);
    } finally {
      this.isUpdating = false;
    }
    return changed;
  }

  // Recalcula una nota y, en cascada, las que dependen de ella. `visited` evita
  // ciclos (A->B->A). La raíz siempre propaga; los niveles profundos solo si
  // cambiaron, así la cascada termina en un punto fijo.
  async recalcChain(file, visited) {
    visited = visited || new Set();
    if (!file || visited.has(file.path)) return;
    const isRoot = visited.size === 0;
    visited.add(file.path);
    const changed = await this.recalcFile(file);
    if (!changed && !isRoot) return;
    const consumers = this.refIndex.bySource.get(file.path);
    if (!consumers) return;
    for (const path of Array.from(consumers)) {
      if (visited.has(path)) continue;
      const cf = this.app.vault.getAbstractFileByPath(path);
      if (cf) await this.recalcChain(cf, visited);
    }
  }

  // Lee las notas externas referenciadas -> { claveNota: {tables, fm} }.
  // Usa el editor activo si la fuente está abierta (valores en vivo); si no, cachedRead.
  async resolveExternals(content, sourceFile) {
    const ext = {};
    const refs = scanExternalRefs(content);
    if (!refs.size) return ext;
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    const srcPath = sourceFile ? sourceFile.path : '';
    for (const raw of refs) {
      const dest = this.app.metadataCache.getFirstLinkpathDest(String(raw).trim(), srcPath);
      if (!dest) continue;
      let c;
      if (active && active.file && active.file.path === dest.path) c = active.editor.getValue();
      else c = await this.app.vault.cachedRead(dest);
      ext[normNote(raw)] = extractNoteData(c);
    }
    return ext;
  }

  // Actualiza el índice inverso (padre -> hijas) para `path` leyendo su propiedad
  // `padres` del frontmatter en caché. NO lee el cuerpo de la nota.
  indexFromFrontmatter(path, frontmatter) {
    const newKeys = new Set();
    const padres = frontmatter && frontmatter.padres;
    if (padres != null) {
      const arr = Array.isArray(padres) ? padres : [padres];
      const names = [];
      for (const p of arr) {
        const wl = parseWikilinks(String(p));
        if (wl.length) wl.forEach((t) => names.push(t));
        else { const t = String(p).trim().replace(/^["']|["']$/g, ''); if (t) names.push(t); }
      }
      for (const name of names) {
        // Resuelve el nombre/ruta a un archivo REAL (como wikilink, relativo a la
        // nota) y usa su RUTA como clave: única aunque existan homónimos en otras
        // carpetas. Si no resuelve (la fuente aún no existe), se omite.
        const dest = this.app.metadataCache.getFirstLinkpathDest(name, path);
        if (dest) newKeys.add(dest.path);
      }
    }
    const oldKeys = this.refIndex.byConsumer.get(path) || new Set();
    for (const k of oldKeys) {
      if (newKeys.has(k)) continue;
      const s = this.refIndex.bySource.get(k);
      if (s) { s.delete(path); if (!s.size) this.refIndex.bySource.delete(k); }
    }
    for (const k of newKeys) {
      let s = this.refIndex.bySource.get(k);
      if (!s) { s = new Set(); this.refIndex.bySource.set(k, s); }
      s.add(path);
    }
    if (newKeys.size) this.refIndex.byConsumer.set(path, newKeys);
    else this.refIndex.byConsumer.delete(path);
  }

  // Índice inicial desde el frontmatter ya cacheado por Obsidian (en memoria,
  // sin leer cuerpos ni recorrer disco).
  buildRefIndex() {
    try {
      for (const f of this.app.vault.getMarkdownFiles()) {
        const cache = this.app.metadataCache.getFileCache(f);
        this.indexFromFrontmatter(f.path, cache && cache.frontmatter);
      }
    } catch (e) {
      if (this.settings.debug) console.warn('MarkCalc index:', e.message);
    }
  }

  // Ficha flotante (hover) para una función conocida del catálogo.
  mcInfoCard(fn) {
    const el = document.createElement('div');
    el.className = 'markcalc-info';
    const add = (cls, txt) => { if (!txt) return; const d = document.createElement('div'); d.className = cls; d.textContent = txt; el.appendChild(d); };
    add('mc-sig', fn.s || fn.n);
    add('mc-grp', fn.g);
    add('mc-desc', fn.d);
    add('mc-ex', fn.e);
    return el;
  }

  // Extensión CM6: ficha al pasar el ratón sobre una función dentro de un calc.
  buildHoverExtension() {
    let hoverTooltip;
    try { hoverTooltip = require('@codemirror/view').hoverTooltip; } catch (e) { return null; }
    if (!hoverTooltip) return null;
    const self = this;
    return hoverTooltip((view, pos) => {
      if (!self.settings.editorHelpers) return null;
      if (!mcInCalc(view.state.sliceDoc(0, pos))) return null;
      const line = view.state.doc.lineAt(pos);
      const t = line.text;
      let a = pos - line.from, b = pos - line.from;
      while (a > 0 && /\w/.test(t[a - 1])) a--;
      while (b < t.length && /\w/.test(t[b])) b++;
      const fn = CATALOG_BYNAME[t.slice(a, b)];
      if (!fn) return null;
      return { pos: line.from + a, end: line.from + b, above: true, create: () => ({ dom: self.mcInfoCard(self.locFn(fn)) }) };
    });
  }

  // --- i18n ---------------------------------------------------------------
  lang() {
    const l = this.settings.lang;
    if (l === 'es' || l === 'en') return l;
    let ob = '';
    try { ob = window.localStorage.getItem('language') || ''; } catch (e) {}
    return ob === 'es' ? 'es' : 'en';
  }
  t(key) {
    const d = I18N[this.lang()] || I18N.en;
    return d[key] != null ? d[key] : (I18N.en[key] != null ? I18N.en[key] : key);
  }
  locFn(fn) {
    if (!fn) return fn;
    const lang = this.lang();
    const g = fn.g && GRP[fn.g] ? (GRP[fn.g][lang] || GRP[fn.g].en) : fn.g;
    const d = lang === 'en' ? (fn.den || fn.d) : (fn.d || fn.den);
    return { s: fn.s, e: fn.e, g, d };
  }

  async saveSettings() { await this.saveData(this.settings); }
}

// Autocompletado contextual: solo dentro de los comentarios <!-- calc: -->.
// Ofrece funciones (con firma/descripción/ejemplo), columnas de la tabla, @names
// locales y, dentro del primer argumento de x..., nombres de nota del vault.
class MarkCalcSuggest extends EditorSuggest {
  constructor(plugin) { super(plugin.app); this.plugin = plugin; }

  // Marca el popup como abierto/cerrado. Mientras está abierto, el recálculo
  // (setValue) NO se dispara (era lo que saltaba el cursor fuera del bloque calc).
  open() { super.open(); this.plugin._suggestOpen = true; }
  close() { super.close(); this.plugin._suggestOpen = false; }

  onTrigger(cursor, editor) {
    if (!this.plugin.settings.editorHelpers) return null;
    if (!mcInCalc(editor.getRange({ line: 0, ch: 0 }, cursor))) return null;
    const lineText = editor.getLine(cursor.line).slice(0, cursor.ch);
    const call = mcEnclosingCall(lineText);
    if (call && call.inString) {
      const m = lineText.match(/["']([^"']*)$/);
      return this.trig(cursor, m ? m[1] : '');
    }
    const m = lineText.match(/[@$]?[A-Za-z_][\w]*$|[@$]$/);
    if (!m) return null;
    return this.trig(cursor, m[0]);
  }

  trig(cursor, query) {
    return {
      start: { line: cursor.line, ch: cursor.ch - query.length },
      end: { line: cursor.line, ch: cursor.ch },
      query,
    };
  }

  async getSuggestions(context) {
    const q = (context.query || '').toLowerCase();
    const lineText = context.editor.getLine(context.start.line).slice(0, context.end.ch);
    const call = mcEnclosingCall(lineText);
    let items = await this.contextItems(call, context, q);
    if (items == null) items = this.genericItems(context, q);
    return items;
  }

  // Sugerencias según el ARGUMENTO de la función en curso (contexto sacado de la
  // propia fórmula): notas, tablas @name (misma u otra nota), o columnas correctas.
  async contextItems(call, context, q) {
    if (!call || !call.inString) return null;
    const fn = call.fn, ai = call.argIndex, prev = call.prevArgs;
    const isX = (fn === 'xcell' || fn === 'xcol' || fn === 'xlookup');
    const anyX = isX || fn === 'xfm';
    // arg 0 de x-funciones -> NOMBRE DE NOTA
    if (anyX && ai === 0) return this.noteItems(q);
    // arg 1 de xcell/xcol/xlookup -> TABLA @name de la OTRA nota
    if (isX && ai === 1) {
      const data = await this.otherNoteData(prev[0], context);
      return this.nameItems(data ? Object.keys(data.tables) : [], q, 'nameOther');
    }
    // arg 1 de xfm -> CLAVE de frontmatter de la otra nota
    if (fn === 'xfm' && ai === 1) {
      const data = await this.otherNoteData(prev[0], context);
      return this.nameItems(data ? Object.keys(data.fm) : [], q, 'fmOther');
    }
    // COLUMNA de tabla de OTRA nota
    if ((fn === 'xcell' || fn === 'xcol') && ai === 2) return this.colItems(await this.otherTableCols(prev[0], prev[1], context), q, 'colOther');
    if (fn === 'xlookup' && (ai === 2 || ai === 4)) return this.colItems(await this.otherTableCols(prev[0], prev[1], context), q, 'colOther');
    // arg 0 de t-funciones -> TABLA @name de ESTA nota
    if ((fn === 'tcol' || fn === 'tcell' || fn === 'tlookup') && ai === 0) {
      return this.nameItems(mcLocalNames(context.editor.getValue()), q, 'nameLocal');
    }
    // COLUMNA de otra tabla de ESTA nota
    if ((fn === 'tcol' || fn === 'tcell') && ai === 1) return this.colItems(this.localTableCols(prev[0], context), q, 'colTable');
    if (fn === 'tlookup' && (ai === 1 || ai === 3)) return this.colItems(this.localTableCols(prev[0], context), q, 'colTable');
    // COLUMNA de la tabla ACTUAL (lookup / col / cell)
    if ((fn === 'lookup' && (ai === 0 || ai === 2)) || (fn === 'col' && ai === 0) || (fn === 'cell' && ai === 0)) {
      return this.colItems(mcColumnsAbove((i) => context.editor.getLine(i), context.start.line), q, 'column');
    }
    return null;
  }

  genericItems(context, q) {
    const out = [];
    const cols = mcColumnsAbove((i) => context.editor.getLine(i), context.start.line);
    for (const c of cols) {
      const ins = /[^A-Za-z0-9_]/.test(c) ? '${' + c + '}' : '$' + c;
      out.push({ kind: 'col', label: c, insert: ins, fn: { s: ins, g: 'column', d: 'Valor de “' + c + '” en la fila actual.', den: 'Value of “' + c + '” in the current row.', e: '$X = ' + ins + ' * 2' } });
    }
    for (const f of CATALOG) out.push({ kind: 'fn', label: f.n, insert: f.ins || (f.n + '('), fn: f });
    const qq = q.replace(/^[$@]/, '');
    return out.filter((o) => o.label.toLowerCase().includes(qq)).slice(0, 60);
  }

  noteItems(q) {
    const files = this.plugin.app.vault.getMarkdownFiles();
    const counts = {};
    for (const f of files) counts[f.basename] = (counts[f.basename] || 0) + 1;
    return files
      .map((f) => {
        const dup = counts[f.basename] > 1;
        const insert = dup ? f.path.replace(/\.md$/i, '') : f.basename;
        return { kind: 'note', label: f.basename, insert, fn: { s: insert, g: dup ? 'noteP' : 'note', d: f.path } };
      })
      .filter((o) => o.label.toLowerCase().includes(q) || o.insert.toLowerCase().includes(q))
      .slice(0, 50);
  }

  nameItems(names, q, grp) {
    return (names || []).filter((n) => n.toLowerCase().includes(q))
      .map((n) => ({ kind: 'name', label: n, insert: n, fn: { s: n, g: grp } }))
      .slice(0, 50);
  }

  // Columnas dentro de un argumento string -> se insertan SIN $ (van entre comillas).
  colItems(cols, q, grp) {
    return (cols || []).filter((c) => c.toLowerCase().includes(q))
      .map((c) => ({ kind: 'col', label: c, insert: c, fn: { s: c, g: grp || 'column' } }))
      .slice(0, 50);
  }

  async otherNoteData(noteName, context) {
    if (!noteName) return null;
    const app = this.plugin.app;
    const dest = app.metadataCache.getFirstLinkpathDest(String(noteName).trim(), context.file ? context.file.path : '');
    if (!dest) return null;
    let content;
    const active = app.workspace.getActiveViewOfType(MarkdownView);
    if (active && active.file && active.file.path === dest.path) content = active.editor.getValue();
    else content = await app.vault.cachedRead(dest);
    return extractNoteData(content);
  }

  async otherTableCols(noteName, tableName, context) {
    const data = await this.otherNoteData(noteName, context);
    if (!data || !tableName) return [];
    const t = data.tables[String(tableName).trim().toLowerCase()];
    return t ? t.header.filter(Boolean) : [];
  }

  localTableCols(name, context) {
    if (!name) return [];
    const t = extractNoteData(context.editor.getValue()).tables[String(name).trim().toLowerCase()];
    return t ? t.header.filter(Boolean) : [];
  }

  renderSuggestion(item, el) {
    el.addClass('markcalc-sugg');
    const f = this.plugin.locFn(item.fn) || {};
    const head = el.createDiv({ cls: 'mc-sg-head' });
    head.createSpan({ cls: 'mc-sg-name', text: f.s || item.label });
    if (f.g) head.createSpan({ cls: 'mc-sg-grp', text: f.g });
    if (f.d) el.createDiv({ cls: 'mc-sg-desc', text: f.d });
    if (f.e) el.createDiv({ cls: 'mc-sg-ex', text: f.e });
  }

  selectSuggestion(item) {
    const ctx = this.context;
    if (!ctx || !item) return;
    const editor = ctx.editor;
    // Re-deriva el rango desde el CURSOR REAL al elegir (no de un contexto viejo).
    const cursor = editor.getCursor();
    const lineText = editor.getLine(cursor.line).slice(0, cursor.ch);
    const call = mcEnclosingCall(lineText);
    let startCh;
    if (call && call.inString) {
      const m = lineText.match(/["']([^"']*)$/);
      startCh = m ? cursor.ch - m[1].length : cursor.ch;
    } else {
      const m = lineText.match(/[@$]?[A-Za-z_][\w]*$|[@$]$/);
      startCh = m ? cursor.ch - m[0].length : cursor.ch;
    }
    if (startCh < 0 || startCh > cursor.ch) startCh = cursor.ch;
    editor.replaceRange(item.insert, { line: cursor.line, ch: startCh }, cursor);
    editor.setCursor({ line: cursor.line, ch: startCh + item.insert.length });
    editor.focus();
  }
}

class MarkCalcSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }

  display() {
    const { containerEl } = this;
    const p = this.plugin;
    const t = (k) => p.t(k);
    const save = async () => { await p.saveSettings(); };
    containerEl.empty();
    containerEl.createEl('h2', { text: 'MarkCalc' });

    new Setting(containerEl)
      .setName(t('sLangN')).setDesc(t('sLangD'))
      .addDropdown((d) => d
        .addOption('auto', t('langAuto'))
        .addOption('es', 'Español')
        .addOption('en', 'English')
        .setValue(p.settings.lang)
        .onChange(async (v) => { p.settings.lang = v; await save(); this.display(); }));

    new Setting(containerEl)
      .setName(t('sRecalcN')).setDesc(t('sRecalcD'))
      .addToggle((x) => x.setValue(p.settings.renderOnModify).onChange(async (v) => { p.settings.renderOnModify = v; await save(); }));

    new Setting(containerEl)
      .setName(t('sJsN')).setDesc(t('sJsD'))
      .addToggle((x) => x.setValue(p.settings.enableJsFunctions).onChange(async (v) => { p.settings.enableJsFunctions = v; await save(); }));

    new Setting(containerEl)
      .setName(t('sPrecN')).setDesc(t('sPrecD'))
      .addText((x) => x.setValue(String(p.settings.precision)).onChange(async (v) => { const n = parseInt(v, 10); if (!isNaN(n)) { p.settings.precision = n; await save(); } }));

    new Setting(containerEl)
      .setName(t('sDelayN')).setDesc(t('sDelayD'))
      .addText((x) => x.setValue(String(p.settings.recalcDelay)).onChange(async (v) => { const n = parseInt(v, 10); if (!isNaN(n) && n >= 0) { p.settings.recalcDelay = n; await save(); p.rebuildScheduler(); } }));

    new Setting(containerEl)
      .setName(t('sFocusN')).setDesc(t('sFocusD'))
      .addToggle((x) => x.setValue(p.settings.preserveFocus).onChange(async (v) => { p.settings.preserveFocus = v; await save(); }));

    new Setting(containerEl)
      .setName(t('sParentsN')).setDesc(t('sParentsD'))
      .addToggle((x) => x.setValue(p.settings.autoParents).onChange(async (v) => { p.settings.autoParents = v; await save(); }));

    new Setting(containerEl)
      .setName(t('sHelpersN')).setDesc(t('sHelpersD'))
      .addToggle((x) => x.setValue(p.settings.editorHelpers).onChange(async (v) => { p.settings.editorHelpers = v; await save(); }));

    new Setting(containerEl)
      .setName(t('sDebugN')).setDesc(t('sDebugD'))
      .addToggle((x) => x.setValue(p.settings.debug).onChange(async (v) => { p.settings.debug = v; await save(); }));
  }
}

module.exports = MarkCalcPlugin;
