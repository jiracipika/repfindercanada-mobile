import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Bundles a client module for Node the same way unified-search.test.mjs does.
async function load(path) {
  const { outputFiles } = await build({ entryPoints: [path], bundle: true, write: false, format: 'esm', platform: 'node' });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
}
const { PostalLookup, supportsPostalWorker } = await load('client/src/lib/postalLookupCore.ts');

test('the worker is used on http(s) (Android shell, web) and not on unverified schemes (iOS capacitor://)', () => {
  assert.equal(supportsPostalWorker('https:'), true);
  assert.equal(supportsPostalWorker('http:'), true);
  assert.equal(supportsPostalWorker('capacitor:'), false);
  assert.equal(supportsPostalWorker('file:'), false);
});

// Synthetic index shaped like the bundled one: code → offset of its latitude.
function storeOf(entries) {
  const index = {};
  const coordinates = new Float32Array(entries.length * 2);
  entries.forEach(([code, lat, lng], i) => { index[code] = i * 2; coordinates[i * 2] = lat; coordinates[i * 2 + 1] = lng; });
  return { index, coordinates };
}
// Coordinates are stored as Float32 (~7 significant digits), as in the bundle.
const near = (a, b) => Math.abs(a - b) < 1e-4;

const lookup = new PostalLookup(storeOf([
  ['K1A0A9', 45.42, -75.70],
  ['K1A0B2', 45.43, -75.71],
  ['L6E1A1', 43.84, -79.33],
  ['V6B1A1', 49.28, -123.11],
]));

test('an indexed code resolves exactly, in any spacing or case', () => {
  for (const code of ['K1A0A9', 'k1a 0a9', ' K1A0A9 ']) {
    const hit = lookup.get(code);
    assert.equal(hit.matchedOn, 'exact');
    assert.ok(near(hit.latitude, 45.42) && near(hit.longitude, -75.70));
  }
});

test('a newer code resolves through its longest indexed prefix', () => {
  // Same block (5 chars) as K1A0A9.
  const block = lookup.get('K1A0A1');
  assert.equal(block.matchedOn, 'prefix');
  assert.equal(block.matchedPrefix, 'K1A0A');
  assert.ok(near(block.latitude, 45.42));
  // Same intersection (4 chars) only — no indexed code starts with K1A0C,
  // so the answer is the first indexed code under K1A0.
  const intersection = lookup.get('K1A0C3');
  assert.equal(intersection.matchedPrefix, 'K1A0');
  assert.ok(near(intersection.latitude, 45.42));
  // Same FSA only.
  const fsa = lookup.get('K1A9Z9');
  assert.equal(fsa.matchedPrefix, 'K1A');
});

test('an unknown FSA is a miss, not a wrong answer', () => {
  assert.equal(lookup.get('Z9Z9Z9'), null);
  assert.equal(lookup.get(''), null);
});

test('size counts indexed codes', () => {
  assert.equal(lookup.size, 4);
});
