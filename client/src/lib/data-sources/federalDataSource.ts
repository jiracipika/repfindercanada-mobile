// Simple stub for the removed federal data source
// Provides basic representative data using the main API

import type { Representative } from "@shared/types";

export async function fetchHouseOfCommonsMPs(): Promise<Representative[]> {
  const response = await fetch('/api/representatives/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '', type: 'name' }) // Empty search to get all
  });
  const data = await response.json();
  return data.representatives || [];
}

export async function fetchFederalMPs(): Promise<Representative[]> {
  const response = await fetch('/api/representatives/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '', type: 'name' }) // Empty search to get all
  });
  const data = await response.json();
  return data.representatives || [];
}

export async function searchMPsByName(name: string): Promise<Representative[]> {
  const response = await fetch('/api/representatives/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: name, type: 'name' })
  });
  const data = await response.json();
  return data.representatives || [];
}

export async function fetchMPByRiding(ridingName: string): Promise<Representative | null> {
  const response = await fetch('/api/representatives/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: ridingName, type: 'riding' })
  });
  const data = await response.json();
  const representatives = data.representatives || [];
  return representatives.length > 0 ? representatives[0] : null;
}

// Additional exports for compatibility
export interface FederalMP {
  id: string;
  name: string;
  party: string;
  riding: string;
  province: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  profileUrl?: string;
}

export async function getDataQualityStats() {
  return {
    source: 'represent_api',
    confidence: 'high',
    lastUpdated: new Date().toISOString(),
    totalRecords: 338 // Approximate number of Canadian MPs
  };
}