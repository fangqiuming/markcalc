#!/usr/bin/env node
/* MarkCalc — build sin dependencias.
 * Concatena engine.js (sin su bloque de exports) + wrapper.js -> ../main.js
 * Uso:  node src/build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const EXPORT_MARK = '// ===== exports';

const engine = fs.readFileSync(path.join(DIR, 'engine.js'), 'utf8');
const wrapper = fs.readFileSync(path.join(DIR, 'wrapper.js'), 'utf8');

// Quita el bloque de exports (solo sirve para los tests de node).
const enginePure = engine.split(EXPORT_MARK)[0].replace(/\s+$/, '\n\n');
const out = enginePure + wrapper;

const target = path.join(DIR, '..', 'main.js');
fs.writeFileSync(target, out);
console.log('main.js generado: ' + out.length + ' B desde engine.js + wrapper.js');
