// Simple type definitions for Represent API-only implementation
// No database dependencies

export interface Representative {
  id: number;
  name: string;
  party: string;
  constituency: string;
  province: string;
  electedOffice: string | null;
  email: string | null;
  phone: string | null;
  photo: string | null;
  website: string | null;
  personalWebsite: string | null;
  socialMedia: Record<string, any> | null;
  biography: string | null;
  offices: Record<string, any>[] | null;
  fax: string | null;
  parliamentId: string | null;
  createdAt: Date | null;
}

export interface Search {
  id: number;
  query: string;
  location: string | null;
  postalCode: string | null;
  results: Representative[];
  createdAt: Date;
}

export interface SavedRepresentative {
  id: number;
  representativeId: number | null;
  userId: string;
  createdAt: Date;
}

export type InsertRepresentative = Omit<Representative, 'id' | 'createdAt'>;
export type InsertSearch = Omit<Search, 'id' | 'createdAt'>;
export type InsertSavedRepresentative = Omit<SavedRepresentative, 'id' | 'createdAt'>;