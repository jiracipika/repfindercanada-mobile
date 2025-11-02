// Simple stub for the removed postal code lookup service
// Redirects to the main API search endpoint

export async function lookupByPostalCode(postalCode: string) {
  const response = await fetch('/api/representatives/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: postalCode, type: 'postal_code' })
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const representatives = data.representatives || [];

  if (representatives.length === 0) {
    return null;
  }

  const rep = representatives[0];

  // Return a compatible format for the existing code
  return {
    mp: {
      id: rep.parliamentId || rep.id.toString(),
      name: rep.name,
      party: rep.party,
      riding: rep.constituency,
      province: rep.province,
      email: rep.email,
      phone: rep.phone,
      photoUrl: rep.photo,
      profileUrl: rep.website,
      offices: rep.offices || []
    },
    source: 'represent_api',
    confidence: 'high'
  };
}