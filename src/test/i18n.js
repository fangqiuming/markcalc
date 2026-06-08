#!/usr/bin/env node
/* MarkCalc — tests de integridad i18n (catálogo bilingüe + diccionario UI).
 * Uso:  node src/test/i18n.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const w = fs.readFileSync(path.join(__dirname, '..', 'wrapper.js'), 'utf8');
// Extrae el bloque de consts (CATALOG, CATALOG_BYNAME, GRP, I18N) y evalúalo aislado.
const a = w.indexOf('const CATALOG = [');
const b = w.indexOf('class MarkCalcPlugin');
const tmp = path.join(require('os').tmpdir(), 'mc_i18n_' + Date.now() + '.js');
fs.writeFileSync(tmp, w.slice(a, b) + '\nmodule.exports = { CATALOG, GRP, I18N };\n');
const { CATALOG, GRP, I18N } = require(tmp);
fs.unlinkSync(tmp);

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + n); };
const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);

ok('catálogo no vacío (' + CATALOG.length + ')', CATALOG.length >= 50);
ok('todas las entradas con descripción ES (d)', CATALOG.every((f) => f.d && f.d.length));
ok('todas las entradas con descripción EN (den)', CATALOG.every((f) => f.den && f.den.length));
ok('toda clave de grupo del catálogo existe en GRP', CATALOG.every((f) => GRP[f.g]));
ok('claves dinámicas en GRP', ['column','note','noteP','nameLocal','nameOther','fmOther','colOther','colTable'].every((k) => GRP[k] && GRP[k].es && GRP[k].en));
ok('cada grupo tiene es + en', Object.values(GRP).every((g) => g.es && g.en));
ok('I18N es/en con las mismas claves', eq(Object.keys(I18N.es).sort(), Object.keys(I18N.en).sort()));
ok('I18N sin cadenas vacías', [...Object.values(I18N.es), ...Object.values(I18N.en)].every((v) => typeof v === 'string' && v.length));

// t() y locFn() (lógica pura)
const t = (lang, k) => { const d = I18N[lang] || I18N.en; return d[k] != null ? d[k] : (I18N.en[k] || k); };
ok('t(en) en inglés', t('en', 'cmdRecalc') === 'Recalculate tables (current note)');
ok('t(es) en español', t('es', 'cmdRecalc') === 'Recalcular tablas (nota actual)');
const locFn = (lang, fn) => ({ g: GRP[fn.g] ? GRP[fn.g][lang] : fn.g, d: lang === 'en' ? (fn.den || fn.d) : fn.d });
const sum = CATALOG.find((f) => f.n === 'sum');
ok('locFn(en, sum) traduce grupo + desc', locFn('en', sum).g === 'aggregate' && /^Sum/.test(locFn('en', sum).d));
ok('locFn(es, sum) traduce grupo + desc', locFn('es', sum).g === 'agregado' && /^Suma/.test(locFn('es', sum).d));

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
