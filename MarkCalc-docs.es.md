# MarkCalc — Documentación

> Plugin de Obsidian para **fórmulas tipo hoja de cálculo en tablas Markdown**,
> diseñado con una regla central: **las fórmulas y los resultados viven como
> markdown plano y portable**. La nota es autocontenida y se ve correctamente en
> cualquier editor; las **referencias entre notas** (§6.4) son opcionales y
> preservan la portabilidad porque leen los valores ya escritos, no la lógica.

- **ID del plugin:** `markcalc`
- **Versión:** 0.9.0 · `minAppVersion` 0.12.0 · escritorio y móvil
- **Sin dependencias externas:** el motor evalúa con JavaScript nativo.

---

## 1. Idea central (portabilidad)

| Pieza | Dónde vive | Visible fuera de Obsidian |
|---|---|---|
| Datos de la tabla | celdas markdown | sí |
| **Resultados** calculados | celdas markdown | **sí** (valores reales) |
| **Fórmulas** | comentario `<!-- calc: ... -->` | sí (comentario inofensivo) |
| **Funciones del usuario** | bloques ` ```calc-functions ` / ` ```calc-js ` | sí (texto en la nota) |
| **Dependencias entre notas** | propiedad `padres` (wikilinks) en frontmatter | sí (texto en la nota) |

Como todo es texto dentro del `.md`, puedes mover la nota a otro vault, a GitHub
o a otro editor y **los valores y las fórmulas siguen ahí**. El plugin solo hace
falta para **recalcular**, no para leer.

> Las referencias entre notas (§6.4) son **opt-in**: solo aparecen si usas
> `xcell`/`xcol`/`xlookup`/`xfm`. Aun así la nota sigue siendo legible fuera de
> Obsidian, porque lo que se lee de la otra nota son sus **valores ya escritos**.

> **¿Nuevo en MarkCalc?** No te aprendas las funciones de memoria. Activa las
> **Ayudas del editor** (§12): mientras escribes dentro de un `<!-- calc: -->`, el
> autocompletado te muestra cada función con su **descripción y ejemplo**, y te
> completa los **nombres de columna y de nota**. Es la forma rápida de aprenderlo.

---

## 2. Instalación

Copia la carpeta del plugin a tu vault:

```
<tu-vault>/.obsidian/plugins/markcalc/
├── main.js
├── manifest.json
└── styles.css
```

Luego: **Configuración → Plugins de comunidad** → activa **MarkCalc**.

> `engine.js`, `wrapper.js` y este README son **fuente/referencia** y no hacen
> falta en el vault. `main.js` se genera concatenando `engine.js` + `wrapper.js`
> (no lo edites a mano).

---

## 3. Sintaxis básica

Escribe una tabla normal y, **en la línea inmediatamente siguiente**, un
comentario `<!-- calc: ... -->` con las fórmulas:

```text
| Producto | Cant | Precio | Total |
|----------|-----:|-------:|------:|
| Café     | 2    | 3.5    |       |
| Té       | 4    | 2.0    |       |
<!-- calc: $Total = $Qty * $Price -->
```

Al recalcular, las celdas `Total` se rellenan. La fórmula sigue en el comentario
(es la fuente de verdad; se recalcula siempre desde ella, nunca desde el valor ya
escrito, así que es **idempotente**).

### Disparo del recálculo

1. **Al editar** la nota (si "Recalcular al editar" está activo).
2. **Manualmente** con la paleta (`Cmd/Ctrl+P`): **"MarkCalc: Recalcular tablas
   (nota actual)"**.

---

## 4. Referencias dentro de las fórmulas

| Referencia | Significado |
|---|---|
| `$Columna` | Valor de esa columna en la **fila actual**. |
| `${Columna con espacios}` | Igual, para nombres con espacios **o con tildes** (`${Artículo}`). |
| `col("Columna")` | **Array** con toda la columna (para agregados). |
| `Columna(N)` | Valor de una **celda concreta**: columna `Columna`, fila `N` (1-based, debajo de la cabecera). |
| `cell("Columna", N)` | Igual que `Columna(N)`, pero sirve para **cualquier** nombre (espacios, símbolos como `% del total`). |
| `row` | Índice de la fila actual (empieza en 1). |

Los nombres de columna son **insensibles a mayúsculas**. Las celdas numéricas se
convierten a número; las vacías valen `0`.

> Ojo con las tildes: `$Artículo` solo captura `$Art` (la `í` corta el nombre).
> Para columnas con tilde, espacios o símbolos usa la forma `${Artículo}`.

Varias fórmulas se separan con `;` (o en varias líneas de comentario contiguas):

```text
<!-- calc: $Total = $Qty * $Price ; $Pct = round($Total / sum(col("Total")) * 100, 1) -->
```

Las fórmulas se aplican **en orden**, así que `$Pct` ya ve la columna `Total`
calculada por la fórmula anterior.

### 4.1 Fórmulas dirigidas a una celda

Además de las fórmulas por columna (`$Col = ...`, que llenan **todas** las filas),
puedes escribir una fórmula para **una sola celda** usando `Columna(N) =`:

```text
<!-- calc:
  Qty(4) = Qty(1) + Qty(2) ;
  Total(4) = Total(1) * ConIVA(2)
-->
```

`Qty(4)` significa "columna **Qty**, fila **4**" (contando filas de datos bajo la
cabecera). Una fórmula de celda **sobrescribe** lo que pusiera una fórmula de
columna en esa celda, así que el **orden** importa: ponla después.

Para columnas con espacios o símbolos usa la forma universal:

```text
<!-- calc: cell("% del total", 1) = cell("% del total", 1) + cell("% del total", 2) -->
```

### 4.2 Auto-expansión de la tabla

Si una fórmula de celda apunta a una fila que **aún no existe**, MarkCalc **crea
las filas que falten** (en blanco) hasta llegar a ella:

```text
| Item | Qty | Price |
|------|----:|------:|
| A    | 2   | 10    |
| B    | 3   | 5     |
<!-- calc: Qty(6) = 99 -->
```

→ La tabla crece a 6 filas; las filas 3, 4 y 5 quedan en blanco y la fila 6
recibe `Qty = 99` (las demás columnas de esa fila, en blanco). A partir de ahí
puedes rellenarlas con más fórmulas o a mano.

### 4.3 Referencias relativas y acumulados

Para evitar escribir una fórmula por fila (p. ej. un **saldo acumulado**), tienes
funciones conscientes de la fila actual, válidas en fórmulas de columna:

| Función | Significado |
|---|---|
| `up("Col")` | Valor de `Col` en la **fila anterior** (`up("Col", k)` = `k` filas arriba). |
| `down("Col")` | Valor de `Col` en la **fila siguiente** (`down("Col", k)` = `k` filas abajo). |
| `runningSum("Col")` | **Suma acumulada** de `Col` desde la fila 1 hasta la actual. |
| `cell("Col", row - 1)` | Equivalente a `up("Col")` usando la variable `row`. |

Así, las cuatro líneas redundantes:

```text
Saldo(1) = Neto(1) ; Saldo(2) = Saldo(1) + Neto(2) ; Saldo(3) = ... ; Saldo(4) = ...
```

se convierten en **una sola** fórmula de columna, equivalente y que crece sola con
la tabla:

```text
$Saldo = up("Saldo") + $Neto
```

o, sin auto-referencia:

```text
$Saldo = runningSum("Neto")
```

> Las fórmulas de columna se calculan **de arriba abajo**, por eso `up("Saldo")`
> ya tiene el valor de la fila anterior cuando llega a la actual. En la fila 1,
> `up(...)` cae fuera de rango y vale `0`.

---

## 5. Funciones incorporadas

Disponibles en cualquier fórmula:

`sum`, `mean`/`avg`, `count`, `product`, `min`, `max`, `round(x, n)`, `floor`,
`ceil`, `abs`, `sqrt`, `pow(x, y)`, `exp`, `log`, `log10`, `IF(cond, a, b)`,
y las constantes `PI`, `E`.

Los agregados aceptan un array (`sum(col("Total"))`) o varios argumentos
(`sum($A, $B, $C)`). Como el lenguaje es JavaScript, también puedes usar
operadores y métodos nativos: `$A > 10 ? $B : 0`, etc.

### 5.1 Agregados condicionales

Como en una hoja de cálculo, con un **criterio** (`"activo"`, `">10"`, `"<=5"`,
`"!=x"`):

| Función | Qué hace |
|---|---|
| `sumIf(col("Estado"), "activo", col("Total"))` | Suma `Total` donde `Estado = activo`. |
| `countIf(col("Estado"), "activo")` | Cuenta filas que cumplen el criterio. |
| `avgIf(col("Estado"), "activo", col("Total"))` | Promedio de `Total` donde se cumple. |

Si omites la tercera columna, opera sobre la primera: `sumIf(col("Edad"), ">18")`.

### 5.2 Fechas

| Función | Qué hace |
|---|---|
| `today()` | Fecha de hoy en `YYYY-MM-DD`. |
| `days(a, b)` | Días de `a` a `b` (acepta `"2026-06-01"` o una celda de fecha). |
| `dateAdd(a, n)` | Suma `n` días a la fecha `a` y devuelve `YYYY-MM-DD`. |
| `year(a)` · `month(a)` · `day(a)` · `weekday(a)` | Componentes (weekday: 0=domingo). |

> `today()` cambia cada día, así que una nota que lo use se recalculará (y se
> reescribirá) al abrirla en una fecha distinta.

### 5.3 Formato de salida

Devuelven **texto**, pero el valor sigue siendo numérico para cálculos
posteriores (`$1,500.00 * 2` da `3000`):

| Función | Ejemplo | Resultado |
|---|---|---|
| `money(x, sym?, dec?)` | `money(1500)` | `$1,500.00` |
| `thousands(x, dec?)` | `thousands(1500)` | `1,500` |
| `percent(x, dec?)` | `percent(28.5)` | `28.5%` (no escala) |
| `format(x, patrón)` | `format(0.286, "0.0%")` | `28.6%` (`%` sí escala) |

> Formatea solo columnas de **presentación**. Internamente el número se
> recupera quitando `$`, comas y `%`, así que el encadenado sigue funcionando.

---

## 6. Funciones definidas por el usuario

Dos niveles, **ambos embebidos en la nota** (por eso no rompen la portabilidad).

### 6.1 Expresiones de una línea — ` ```calc-functions `

Para fórmulas reutilizables sencillas. Sintaxis `nombre(args) = expresión`:

````text
```calc-functions
iva(x) = x * 0.21
conIva(x) = x + iva(x)
margen(venta, costo) = round((venta - costo) / venta * 100, 1)
```
````

Luego se usan como cualquier función: `$Final = conIva($Total)`.

### 6.2 JavaScript completo — ` ```calc-js `

Para lógica compleja (condiciones, bucles, fechas, tablas de tramos…). El bloque
recibe `exports` (donde registras tus funciones) y `helpers` (las incorporadas):

````text
```calc-js
// Descuento por volumen con tramos
exports.descuento = function (precio, qty) {
  let pct = 0;
  if (qty >= 10) pct = 0.20;
  else if (qty >= 5) pct = 0.10;
  return precio * (1 - pct);
};

// Puedes apoyarte en los helpers incorporados
exports.normalizado = (x, columna) => x / helpers.max(columna);
```
````

Uso: `$Neto = round(descuento($Total, $Qty), 2)`.

> **Portabilidad:** como el JS vive en la nota, viaja con ella. Si copias la nota
> a otro vault con MarkCalc instalado, las funciones siguen funcionando sin
> mover ningún archivo aparte.

## 6.3 Lookup y constantes dentro de la misma nota

Búsquedas **dentro de la propia nota** (entre tablas) y constantes desde el
**frontmatter de la nota**. Para referencias a OTRAS notas, ver §6.4.

**Constante del frontmatter** — `fm("clave")`:

```text
---
tasa_iva: 0.21
---
...
<!-- calc: $ConIVA = round($Subtotal * (1 + fm("tasa_iva")), 2) -->
```

**Lookup en la misma tabla** — `lookup(colClave, valor, colDevuelta)`:

```text
<!-- calc: $Precio = lookup("Codigo", $Codigo, "PrecioUnitario") -->
```

**Lookup entre tablas de la nota.** Primero nombra una tabla con `@name` dentro de
su comentario; luego, en otra tabla **más abajo**, consúltala:

````text
| Producto | Precio |
|----------|-------:|
| Café | 3.5 |
| Té   | 2.0 |
<!-- calc: @name = precios -->

| Pedido | Articulo | Unidades | PrecioU | Subtotal |
|--------|----------|---------:|--------:|---------:|
| P1 | Café | 4 |  |  |
<!-- calc:
  $PrecioU = tlookup("precios", "Producto", $Articulo, "Precio") ;
  $Subtotal = $Unidades * $PrecioU
-->
````

| Función | Qué hace |
|---|---|
| `tlookup("tabla", "colClave", valor, "colDev")` | Busca en otra tabla nombrada y devuelve una celda. |
| `tcell("tabla", "Col", N)` | Celda concreta de otra tabla. |
| `tcol("tabla", "Col")` | Columna completa de otra tabla (para `sum`, etc.). |

> La tabla consultada debe estar **definida antes** (más arriba) que la que la
> usa, dentro de la misma nota. Para leer tablas de **otras notas**, usa las
> funciones `x...` de la sección siguiente.

## 6.4 Referencias entre notas (cross-note)

Desde **0.8.0** una celda puede tomar el valor de una tabla de **otra nota**. La
portabilidad se mantiene: se leen los **valores ya escritos** en la otra nota (su
markdown), **no** se re-evalúa su lógica.

**En la nota fuente (padre):** nombra la tabla con `@name` (igual que para los
lookups internos):

```text
| Producto | PrecioBase |
|----------|----------:|
| Teclado  | 80 |
<!-- calc: @name = precios -->
```

**En la nota que consume (hija):** referencia la nota por su **nombre** y la tabla
por su `@name`:

| Función | Qué hace |
|---|---|
| `xcell("Nota", "tabla", "Col", N)` | Una **celda** concreta (fila N, 1-based). |
| `xcol("Nota", "tabla", "Col")` | **Columna** completa (para `sum`, `mean`…). |
| `xlookup("Nota", "tabla", colClave, valor, colDev)` | Busca una fila y devuelve otra columna. |
| `xfm("Nota", "clave")` | Un escalar del **frontmatter** de la otra nota. |

```text
<!-- calc:
  $PrecioU = xlookup("Catálogo de Precios", "precios", "Producto", ${Artículo}, "PrecioBase") ;
  $ConIVA  = round($Total * (1 + xfm("Catálogo de Precios", "tasa_iva")), 2)
-->
```

El nombre de nota se resuelve como un **wikilink** (basename, ruta relativa). Si la
nota o la tabla no existen, la función **degrada a `0` / `[]`** sin romper la nota.

### Dependencias automáticas (`padres` → hijas)

Cuando una nota usa estas funciones, MarkCalc **escribe en su frontmatter** la
propiedad `padres`: la lista de notas que consume, como wikilinks.

```text
---
padres:
  - "[[Catálogo de Precios]]"
---
```

- Si una nota **no** referencia a ninguna otra, **no** se le añade la clave (sin
  ruido en el frontmatter).
- `padres` se deriva **solo de los comentarios `<!-- calc: -->`**, no de prosa ni
  de bloques de código. Una nota que solo **menciona** `xcell(...)` como ejemplo
  (esta misma documentación, p. ej.) **no** gana dependencias falsas.
- Las **hijas** (quién consume a esta nota) **no se escriben**: se derivan del
  índice inverso que MarkCalc mantiene en memoria desde el `metadataCache` de
  Obsidian — sin recorrer el vault.

**Auto-recálculo en cascada.** Al guardar una nota fuente, MarkCalc recalcula
**solo** las notas que la tienen como `padre` (y, transitivamente, las hijas de
esas), **no todo el vault**. Una protección anti-ciclos corta los bucles `A→B→A`
y la cascada termina en un punto fijo (deja de propagar cuando ningún valor cambia).

Se controla con el ajuste **"Dependencias entre notas (padres)"**. Apágalo si no
quieres que el plugin toque el frontmatter; perderás el auto-recálculo en cascada
(las hijas se actualizarán al abrirlas o editarlas).

> **Fuente de verdad:** las fórmulas. `padres` es una **proyección derivada** que
> el plugin reescribe al recalcular; no la edites a mano.
>
> **Rutas y homónimos:** la nota fuente puede estar en **cualquier carpeta**. Se
> resuelve como un wikilink: por basename si es único, o por ruta
> (`xcell("Carpeta/Sub/Nota", ...)`) para precisar. El grafo de dependencias se
> indexa por **ruta resuelta**, así que dos notas con el mismo nombre en carpetas
> distintas **no colisionan**.

---

## 7. Seguridad (léelo)

**MarkCalc trata el contenido de la nota como código de confianza.** Es el mismo
modelo (y el mismo riesgo) que DataviewJS, Templater o QuickAdd. Conviene que
entiendas exactamente qué ejecuta.

### Qué ejecuta y por qué es peligroso

- **`calc-js` ejecuta JavaScript arbitrario** mediante `new Function`. Ese código
  corre dentro de Obsidian (Electron), así que en la práctica puede hacer casi
  cualquier cosa que pueda el proceso: hacer **peticiones de red** (`fetch`),
  y según la configuración del entorno, **leer o escribir archivos** o acceder a
  APIs del sistema. Una nota maliciosa podría, por ejemplo, **filtrar el
  contenido de tu vault** a un servidor externo.
- **Las fórmulas también se evalúan como JavaScript** (`<!-- calc: ... -->` usa el
  mismo `new Function` internamente). Por tanto **una fórmula, no solo un bloque
  `calc-js`, puede ejecutar código** (p. ej. referenciando `globalThis`/`fetch`).
  Esto es importante: **desactivar "Permitir funciones JavaScript" reduce la
  superficie (quita los bloques `calc-js`), pero NO es un sandbox**: mientras el
  recálculo esté activo, las fórmulas siguen evaluándose como JS.

### Cuándo se ejecuta

El recálculo se dispara **al abrir** la nota y **al teclear** (si "Recalcular al
editar" está activo) y con el **comando**. Es decir, **con solo abrir una nota
preparada por otra persona, su código podría ejecutarse**.

> Con **cross-note** activo, recalcular una nota **lee** las notas fuente que
> referencia. Sus tablas/frontmatter se leen como datos (no se ejecuta su JS),
> pero recuerda que al **guardar** una nota fuente se recalculan sus hijas, lo que
> evalúa las fórmulas de esas hijas. Mantén el principio: solo notas de confianza.

### Cómo protegerte

- Usa MarkCalc **solo en vaults y notas de confianza** (las que escribes tú).
- **Desconfía de notas de terceros**: no abras con el plugin activo notas
  descargadas, compartidas o de plantillas que no hayas revisado.
- Para reducir el riesgo de ejecución automática, **desactiva "Recalcular al
  editar"**: así solo se calcula cuando tú lanzas el comando a propósito.
- **Desactiva "Permitir funciones JavaScript"** si no usas bloques `calc-js` (quita
  esa vía, aunque —como se dijo— no elimina del todo la evaluación de fórmulas).
- Si vas a abrir un vault que no controlas, **desactiva el plugin** mientras tanto.

### Por qué es así

Esa misma evaluación es la que da la potencia (funciones complejas definidas por
ti, todo dentro de la nota y portable). Un "modo seguro" real exigiría sustituir
`new Function` por un parser restringido propio; está en la lista de mejoras
futuras (ver §10). Hasta entonces: **la confianza en la nota es la única
protección real.**

---

## 8. Ejemplo completo

````text
```calc-functions
iva(x) = x * 0.21
```

```calc-js
exports.descuento = (precio, qty) => precio * (qty >= 3 ? 0.9 : 1);
```

| Item | Qty | Price | Total | ConIVA | Neto | % del total |
|------|----:|------:|------:|-------:|-----:|------------:|
| A    | 2   | 10    |       |        |      |             |
| B    | 3   | 5     |       |        |      |             |
| C    | 1   | 40    |       |        |      |             |
<!-- calc:
  $Total = $Qty * $Price ;
  $ConIVA = round($Total + iva($Total), 2) ;
  $Neto = round(descuento($Total, $Qty), 2) ;
  ${% del total} = round($Total / sum(col("Total")) * 100, 1)
-->
````

### 8.1 Ejemplo cross-note (padre → hija → nieta)

Tres notas encadenadas que demuestran `xlookup`, `xfm`, `xcell` y el
auto-recálculo en cascada (incluidas en `07 - Wiki/MarkCalc - Ejemplos/`):

- **`Catálogo de Precios`** (raíz): tabla `@name = precios` + `tasa_iva` en
  frontmatter. No tiene `padres`.
- **`Pedido de Compra`** (hija): `xlookup` trae el precio del catálogo, `xfm` la
  tasa de IVA. Su `padres` apunta a `[[Catálogo de Precios]]`.
- **`Resumen de Compras`** (nieta): `xcell` toma el total con IVA del pedido. Su
  `padres` apunta a `[[Pedido de Compra]]`.

Cambia un precio en el catálogo y, al guardar, la cascada actualiza el pedido y
luego el resumen — sin recorrer el vault.

### 8.2 Ejemplo contable y banco de pruebas

En `07 - Wiki/MarkCalc - Ejemplos/`:

- **`Submayor de Cuentas`** + **`Balance General`**: sub-mayor contable (Debe /
  Haber / Saldo por naturaleza) que alimenta un balance con `xcol` + `sumIf`. La
  fila `Descuadre` es un auto-chequeo: vale `0` solo si cuadra la partida doble.
- **`MarkCalc - Banco de Pruebas`**: informe de **auto-verificación**. Cada fila
  compara `Resultado` vs `Esperado` y marca `OK` / `FALLA`; el Resumen final dice
  `TODO OK` solo si todo pasó. Recárgalo y ejecútalo para confirmar de un vistazo
  que internas, acumulados y cross-note funcionan.

---

## 9. Si "no calcula nada"

1. **Ejecuta el comando** `MarkCalc: Recalcular tablas (nota actual)` desde la
   paleta (`Cmd/Ctrl+P`). Es la forma determinista de probar.
2. El comentario debe empezar **exactamente** por `<!-- calc:` (en minúsculas) y
   cerrar con `-->`. Puede ocupar **una o varias líneas**.
3. La tabla debe tener fila separadora (`|---|---|`) y la **columna destino debe
   existir** en la cabecera (el resultado se escribe en una columna, no se crea).
4. Si referencias una columna que no existe (mayúsculas aparte) o usas una
   función no definida, esa celda se deja igual. Activa **"Logs de depuración"**
   en los ajustes y mira la consola (`Ctrl/Cmd+Shift+I`) para ver el error.
5. El recálculo se dispara al **teclear**, al **abrir** la nota y con el
   **comando**. En la nota activa el resultado se escribe vía el editor.
6. **Cross-note:** si `xcell`/`xlookup` devuelven `0`, comprueba que el **nombre de
   la nota** y el **`@name`** de la tabla fuente coincidan exactamente (el `@name`
   es insensible a mayúsculas; el nombre de nota se resuelve como wikilink).

---

## 10. Limitaciones actuales

- Soporta **tablas de pipes** bien formadas (cabecera + separador `|---|`).
- `col()`, `cell()` y `Columna(N)` se refieren a la **misma tabla**; entre tablas
  de la nota se usa `tcell/tcol/tlookup` (§6.3) y entre notas las funciones `x...`
  (§6.4).
- Cross-note lee los **valores ya escritos** en la nota fuente (no re-evalúa su
  lógica). La fuente puede estar en **cualquier carpeta**; el grafo se indexa por
  **ruta resuelta**, así que homónimos en carpetas distintas **no colisionan**
  (usa `xcell("Carpeta/Nota", ...)` para desambiguar si comparten basename).
- La auto-expansión solo **añade** filas; no recorta filas de más.
- El comentario de fórmulas debe ir junto a la tabla (se permite alguna línea en
  blanco en medio, pero no contenido intercalado).

---

## 11. Estructura de archivos

| Archivo | Rol |
|---|---|
| `main.js` | **Archivo GENERADO** que carga Obsidian. Motor + wrapper. No editar a mano. |
| `manifest.json` | Metadatos del plugin (versión). |
| `styles.css` | Estilos de las ayudas del editor (autocompletado + hover). |
| `src/engine.js` | **Fuente** del motor (puro, sin dependencias; testeable con node). |
| `src/wrapper.js` | **Fuente** del enlace con Obsidian (Plugin, EditorSuggest, settings). |
| `src/build.js` | Concatena `engine` (sin exports) + `wrapper` → `main.js`. |
| `src/test/run.js` | Suite del motor (~42 asserts, sin dependencias). |
| `MarkCalc - Ejemplos/` | Notas de ejemplo y banco de pruebas (en el vault). |

> **Build (sin dependencias).** Edita `src/engine.js` y/o `src/wrapper.js`, y luego:
>
> ```
> node src/build.js        # regenera main.js
> node src/test/run.js     # tests del motor
> node src/test/i18n.js    # tests del catálogo bilingüe (ES/EN)
> ```
>
> **Nunca edites `main.js` a mano** — se sobrescribe en cada build. Los tests
> cubren el motor y la lógica; el editor vivo (autocompletado/hover) es prueba manual.

---

## 12. Ayudas del editor (autocompletado y fichas)

**La forma más fácil de aprender MarkCalc.** Desde **0.9.0**, mientras escribes
dentro de un comentario `<!-- calc: -->`, el editor te ayuda en vivo. Se controla
en **Ajustes → MarkCalc → "Ayudas del editor"** (activado por defecto).

### Autocompletado contextual

Empieza a teclear y aparece una lista de sugerencias; **cada una muestra su firma,
grupo, descripción y un ejemplo**. Pulsa Enter para insertarla. Según dónde esté el
cursor, sugiere:

- **Funciones** del catálogo (52): `sum`, `round`, `sumIf`, `xlookup`, `up`,
  `runningSum`… con su documentación incrustada en la propia sugerencia.
- **Columnas de la tabla** de arriba: eliges `$Total` (o `${Con espacios}`) en vez
  de teclearlo. **Esto mata el error más común** — un nombre de columna mal escrito
  que devolvía `0` en silencio.
- **Tablas `@name`** de la nota, dentro del primer argumento de
  `tcol` / `tcell` / `tlookup`.
- **Nombres de nota** del vault, dentro del primer argumento de
  `xcell` / `xcol` / `xlookup` / `xfm`.
- La directiva **`@name`** para nombrar la tabla.

> Solo se dispara **dentro** de los comentarios `calc`; en el resto de la nota no
> molesta. Usa la API `EditorSuggest`, así que **convive con el autocompletado
> nativo** de Obsidian (`[[`, `#`, …) sin romperlo.

### Ficha al pasar el ratón (hover)

Pasa el cursor por encima de una función **ya escrita** dentro de un `calc` y sale
una ficha con su firma, descripción y ejemplo. Sirve para releer una nota (tuya de
hace meses, o de otra persona) sin venir a esta documentación.

### Por qué importa

La curva de MarkCalc se empinaba por dos cosas: el **namespace invisible** (≈50
funciones en 4 ámbitos — misma tabla, otra tabla `t…`, otra nota `x…`) y el **fallo
silencioso** (un typo devolvía `0` sin avisar). El autocompletado convierte ese
namespace en un menú que **eliges** (no que adivinas), y completar columnas y
`@name` ataca el fallo silencioso de raíz.

> **Una sola fuente de verdad:** el catálogo interno de funciones alimenta a la vez
> el autocompletado, el hover y (como referencia) esta documentación.
