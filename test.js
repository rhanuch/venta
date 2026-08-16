// node test.js
const assert = require('assert');
const fs = require('fs');
const { parseCSV, dimensions, priceNum, priceText } = require('./docs/app.js');

// CSV: quoted fields with commas, "" escapes, CRLF, trailing blank line
const rows = parseCSV(
  'id,name_en,notes_en\r\n' +
  'a,"Chairs, set of 4","He said ""fine"""\r\n' +
  'b,Table,\r\n' +
  '\r\n'
);
assert.strictEqual(rows.length, 2);
assert.strictEqual(rows[0].name_en, 'Chairs, set of 4');
assert.strictEqual(rows[0].notes_en, 'He said "fine"');
assert.strictEqual(rows[1].notes_en, '');

// cm -> in, both separators, non-numeric passes through
assert.strictEqual(dimensions('160 x 48 x 78'), '63 × 18.9 × 30.7 in / 160 × 48 × 78 cm');
assert.strictEqual(dimensions('40×60'), '15.7 × 23.6 in / 40 × 60 cm');
assert.strictEqual(dimensions('about a meter'), 'about a meter');

// price sorting: blanks sink to the bottom, currency symbols tolerated
assert.strictEqual(priceNum('$120'), 120);
assert.strictEqual(priceNum(''), Infinity);
assert.ok(priceNum('80') < priceNum('$120'));
assert.strictEqual(priceText('45'), '$45');
assert.strictEqual(priceText('$45'), '$45');
assert.strictEqual(priceText(''), 'Ask');

// every photo path in the catalog actually exists on disk
const catalog = parseCSV(fs.readFileSync('catalog.csv', 'utf8'));
const missing = catalog
  .flatMap(i => i.photos.split(',').map(p => p.trim()).filter(Boolean))
  .filter(p => !fs.existsSync('docs/images/' + p));
assert.deepStrictEqual(missing, [], 'missing images: ' + missing);


// free items render as Free, not $0
assert.strictEqual(priceText('0'), 'Free');
assert.strictEqual(priceNum('0'), 0);
assert.ok(catalog.filter(i => i.price === '0').length === 7, 'expected 7 free plants');

// `buyer` is private. The repo is public and docs/catalog.csv is served at a
// guessable URL, so a name must never be committed here — keep it in the
// unpublished master tab of the Sheet only.
const leaked = catalog.filter(i => (i.buyer || '').trim());
assert.deepStrictEqual(leaked.map(i => i.id), [],
  'buyer names must never be committed: ' + leaked.map(i => i.id));

// and it must never reach the rendered card
const appSrc = fs.readFileSync('docs/app.js', 'utf8');
assert.ok(!/item\.buyer|'buyer'|"buyer"/.test(appSrc), 'app.js must not reference buyer');

console.log(`ok — ${catalog.length} items, all photos present, no buyer data committed`);
