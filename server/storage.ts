import { representatives, searches, savedRepresentatives, type Representative, type InsertRepresentative, type Search, type InsertSearch, type SavedRepresentative, type InsertSavedRepresentative } from "@shared/schema";

export interface IStorage {
  // Representatives
  getRepresentative(id: number): Promise<Representative | undefined>;
  getRepresentativeByParliamentId(parliamentId: string): Promise<Representative | undefined>;
  createRepresentative(representative: InsertRepresentative): Promise<Representative>;
  searchRepresentatives(query: string): Promise<Representative[]>;
  
  // Searches
  createSearch(search: InsertSearch): Promise<Search>;
  getRecentSearches(limit?: number): Promise<Search[]>;
  
  // Saved Representatives
  saveRepresentative(saved: InsertSavedRepresentative): Promise<SavedRepresentative>;
  getSavedRepresentatives(userId: string): Promise<Representative[]>;
  removeSavedRepresentative(userId: string, representativeId: number): Promise<boolean>;
  isSaved(userId: string, representativeId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private representatives: Map<number, Representative>;
  private searches: Map<number, Search>;
  private savedRepresentatives: Map<number, SavedRepresentative>;
  private currentRepId: number;
  private currentSearchId: number;
  private currentSavedId: number;

  constructor() {
    this.representatives = new Map();
    this.searches = new Map();
    this.savedRepresentatives = new Map();
    this.currentRepId = 1;
    this.currentSearchId = 1;
    this.currentSavedId = 1;
  }

  clearCache() {
    this.representatives.clear();
    this.searches.clear();
    this.savedRepresentatives.clear();
    this.currentRepId = 1;
    this.currentSearchId = 1;
    this.currentSavedId = 1;
  }

  async getRepresentative(id: number): Promise<Representative | undefined> {
    return this.representatives.get(id);
  }

  async getRepresentativeByParliamentId(parliamentId: string): Promise<Representative | undefined> {
    return Array.from(this.representatives.values()).find(
      (rep) => rep.parliamentId === parliamentId,
    );
  }

  async createRepresentative(insertRepresentative: InsertRepresentative): Promise<Representative> {
    const id = this.currentRepId++;
    const representative: Representative = { 
      ...insertRepresentative, 
      id,
      createdAt: new Date()
    };
    this.representatives.set(id, representative);
    return representative;
  }

  async searchRepresentatives(query: string): Promise<Representative[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.representatives.values()).filter(
      (rep) =>
        rep.name.toLowerCase().includes(lowerQuery) ||
        rep.constituency.toLowerCase().includes(lowerQuery) ||
        rep.party.toLowerCase().includes(lowerQuery)
    );
  }

  async createSearch(insertSearch: InsertSearch): Promise<Search> {
    const id = this.currentSearchId++;
    const search: Search = { 
      ...insertSearch, 
      id,
      createdAt: new Date()
    };
    this.searches.set(id, search);
    return search;
  }

  async getRecentSearches(limit: number = 10): Promise<Search[]> {
    return Array.from(this.searches.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async saveRepresentative(insertSaved: InsertSavedRepresentative): Promise<SavedRepresentative> {
    const id = this.currentSavedId++;
    const saved: SavedRepresentative = { 
      ...insertSaved, 
      id,
      createdAt: new Date()
    };
    this.savedRepresentatives.set(id, saved);
    return saved;
  }

  async getSavedRepresentatives(userId: string): Promise<Representative[]> {
    const saved = Array.from(this.savedRepresentatives.values()).filter(
      (s) => s.userId === userId
    );
    const representatives = [];
    for (const s of saved) {
      if (s.representativeId) {
        const rep = await this.getRepresentative(s.representativeId);
        if (rep) representatives.push(rep);
      }
    }
    return representatives;
  }

  async removeSavedRepresentative(userId: string, representativeId: number): Promise<boolean> {
    const saved = Array.from(this.savedRepresentatives.entries()).find(
      ([_, s]) => s.userId === userId && s.representativeId === representativeId
    );
    if (saved) {
      this.savedRepresentatives.delete(saved[0]);
      return true;
    }
    return false;
  }

  async isSaved(userId: string, representativeId: number): Promise<boolean> {
    return Array.from(this.savedRepresentatives.values()).some(
      (s) => s.userId === userId && s.representativeId === representativeId
    );
  }
}

export const storage = new MemStorage();
