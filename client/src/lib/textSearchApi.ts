// Represent supports explicit field filters, not a generic `search` parameter.
// Keep transport independent so regression tests exercise the real URL semantics.
const ORIGIN = 'https://represent.opennorth.ca';

type RecordData = Record<string, any>;

export async function fetchRepresentCollection(path: string, base = ORIGIN): Promise<RecordData[]> {
  const objects: RecordData[] = [];
  let next: string | null = path;
  const seen = new Set<string>();
  while (next) {
    const url: URL = new URL(next, ORIGIN);
    if (url.origin !== ORIGIN || seen.has(url.href)) throw new Error('Invalid Represent pagination');
    seen.add(url.href);
    const response = await fetch(`${base}${url.pathname}${url.search}`);
    if (!response.ok) throw new Error(`Represent API error: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.objects)) throw new Error('Invalid Represent response');
    objects.push(...data.objects);
    next = data.meta?.next ?? null;
  }
  return objects;
}

export async function fetchTextSearchRecords(raw: string, base = ORIGIN): Promise<RecordData[]> {
  const query = raw.trim().replace(/\s+/g, ' ');
  if (!query) return [];
  const encoded = encodeURIComponent(query);
  // Sequential requests: a rate-limit error stops the search, not more fallbacks.
  const names = await fetchRepresentCollection(`/representatives/?name__icontains=${encoded}&limit=1000`, base);
  const districts = await fetchRepresentCollection(`/representatives/?district_name__icontains=${encoded}&limit=1000`, base);
  // A city council's members often have district_name='Ward 2', not the city.
  // representative_set_name is NOT a supported representative filter (silently
  // ignored by the API). Filter the set catalogue locally, then use scoped URLs.
  const sets = await fetchRepresentCollection('/representative-sets/?limit=1000', base);
  const cityMembers: RecordData[] = [];
  for (const set of sets) {
    if (typeof set.name !== 'string' || !set.name.toLowerCase().includes(query.toLowerCase())) continue;
    const path = set.related?.representatives_url;
    if (typeof path === 'string') cityMembers.push(...await fetchRepresentCollection(`${path}?limit=1000`, base));
  }
  const unique = new Map<string, RecordData>();
  for (const rep of [...names, ...districts, ...cityMembers]) {
    const key = JSON.stringify([rep.name, rep.representative_set_name, rep.district_name]);
    unique.set(key, rep);
  }
  return Array.from(unique.values());
}
