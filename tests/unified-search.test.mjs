import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function load(path) {
  const { outputFiles } = await build({ entryPoints: [path], bundle: true, write: false, format: 'esm', platform: 'node', define: { 'import.meta.env.DEV': 'false' } });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
}
const { resolveSearchIntent, textSearchKey } = await load('client/src/lib/searchIntent.ts');
const { fetchTextSearchRecords, fetchRepresentCollection } = await load('client/src/lib/textSearchApi.ts');
const { fetchRepsByTextDirect } = await load('client/src/lib/representApiService.ts');

for (const input of ['K1A 0A9', 'K1A0A9', 'k1a0a9', '  k1a 0a9  ', 'k1a   0a9']) {
  test(`postal routing and normalization: ${JSON.stringify(input)}`, () => {
    assert.deepEqual(resolveSearchIntent(input), { kind: 'postal', query: 'K1A 0A9' });
  });
}
for (const input of ['K1', 'K1A', 'K1A 0', 'K1A0A', 'K1A 0A99', 'D1A 1A1', 'K1D 1A1', 'K1A-0A9']) {
  test(`incomplete/invalid postal is not a text request: ${input}`, () => assert.equal(resolveSearchIntent(input).kind, 'invalid'));
}
for (const input of ['Carney', 'Mark Carney', 'Toronto', 'Ottawa', 'Nepean', 'Ward 2', 'St. John’s', '  ottawa   centre  ']) {
  test(`name/city/area/riding routes to text: ${input}`, () => assert.equal(resolveSearchIntent(input).kind, 'text'));
}
test('blank input, normalized keys and distinct word boundaries', () => {
  assert.equal(resolveSearchIntent('   ').kind, 'invalid');
  assert.equal(textSearchKey('  Mark   CARNEY '), textSearchKey('mark carney'));
  assert.notEqual(textSearchKey('AB C'), textSearchKey('A BC'));
});

// All transport responses below are synthetic, not live representative evidence.
function mockFetch(t, handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => { const u = new URL(url); calls.push(u); return handler(u); };
  t.after(() => { globalThis.fetch = original; });
  return calls;
}
const json = (objects, next = null) => Response.json({ objects, meta: { next } });
const rep = (name, district, set = 'House of Commons') => ({ name, district_name: district, representative_set_name: set, elected_office: 'MP', url: `https://example.invalid/${encodeURIComponent(name)}`, related: { boundary_url: '/boundaries/federal-electoral-districts/35001/' } });

test('Carney uses icontains, trims query, transforms real payload shape without fetching an official HTML URL', async t => {
  const calls = mockFetch(t, u => {
    if (u.searchParams.has('name__icontains')) {
      assert.equal(u.searchParams.get('name__icontains'), 'cArNeY');
      return json([rep('Mark Carney', 'Nepean')]);
    }
    return json([]);
  });
  const results = await fetchRepsByTextDirect('  cArNeY  ');
  assert.equal(results[0].name, 'Mark Carney');
  assert.equal(results[0].constituency, 'Nepean');

  assert.equal(calls.length, 3);
  assert.ok(calls.every(u => u.origin === 'https://represent.opennorth.ca'));
});
test('city includes ward members through council sets, plus name and district matches, deduplicated', async t => {
  const mayor = rep('Synthetic Mayor', 'Ottawa', 'Ottawa City Council');
  mockFetch(t, u => {
    if (u.pathname === '/representative-sets/') return json([{ name: 'Ottawa City Council', related: { representatives_url: '/representatives/ottawa-city-council/' } }, { name: 'Toronto City Council', related: { representatives_url: '/representatives/toronto-city-council/' } }]);
    if (u.pathname === '/representatives/ottawa-city-council/') return json([mayor, rep('Synthetic Ward Member', 'Ward 2', 'Ottawa City Council')]);
    if (u.searchParams.has('district_name__icontains')) return json([mayor, rep('Synthetic MP', 'Ottawa Centre')]);
    if (u.searchParams.has('name__icontains')) return json([rep('Ottawa Synthetic Name', 'Other Riding')]);
    throw new Error(`Unexpected URL: ${u}`);
  });
  assert.equal((await fetchTextSearchRecords(' oTtAwA ')).length, 4);
});
for (const area of ['Nepean', 'Ottawa Centre', 'Ward 2']) {
  test(`area/riding query uses district substring filter: ${area}`, async t => {
    mockFetch(t, u => u.searchParams.get('district_name__icontains') === area ? json([rep('Synthetic Area Representative', area)]) : json([]));
    assert.equal((await fetchTextSearchRecords(area))[0].district_name, area);
  });
}
test('blank makes no request and genuine no-results stays empty', async t => {
  const calls = mockFetch(t, () => json([]));
  assert.deepEqual(await fetchTextSearchRecords('  '), []);
  assert.equal(calls.length, 0);
  assert.deepEqual(await fetchTextSearchRecords('NotARealMatch'), []);
  assert.equal(calls.length, 3);
});
test('follows pagination instead of silently truncating search coverage', async t => {
  mockFetch(t, u => u.searchParams.has('offset') ? json([rep('Second', 'Two')]) : json([rep('First', 'One')], '/representatives/?name__icontains=test&offset=1'));
  assert.equal((await fetchRepresentCollection('/representatives/?name__icontains=test')).length, 2);
});
test('synthetic 429 stops all subsequent requests; network failure is not no-results', async t => {
  const calls = mockFetch(t, () => new Response('', { status: 429 }));
  await assert.rejects(fetchTextSearchRecords('Carney'), /429/);
  assert.equal(calls.length, 1);
});
test('pagination cannot send API requests to another origin', async t => {
  mockFetch(t, () => json([], 'https://example.invalid/steal'));
  await assert.rejects(fetchRepresentCollection('/representatives/'), /Invalid Represent pagination/);
});
