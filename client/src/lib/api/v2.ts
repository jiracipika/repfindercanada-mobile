// Simple stub for the removed federal data source
// Redirects to the main API search endpoint

export async function fetchRepsByPostalV2(postalCode: string) {
  const response = await fetch('/api/representatives/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: postalCode, type: 'postal_code' })
  });
  return response.json();
}

export async function fetchRepsByNameV2(name: string) {
  const response = await fetch('/api/representatives/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: name, type: 'name' })
  });
  return response.json();
}