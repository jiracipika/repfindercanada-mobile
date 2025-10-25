/**
 * IndexedDB Storage for Representative Data
 * Stores federal, provincial, and municipal representatives for offline access
 */

import type { FederalMP } from '../data-sources/federalDataSource';
import type { ProvincialRep } from '../data-sources/provincialDataSource';
import type { MunicipalRep } from '../data-sources/municipalDataSource';

const DB_NAME = 'RepresentativeDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  FEDERAL: 'federal_mps',
  PROVINCIAL: 'provincial_reps',
  MUNICIPAL: 'municipal_reps',
  METADATA: 'metadata',
};

export type Representative = FederalMP | ProvincialRep | MunicipalRep;

interface DataMetadata {
  key: string;
  lastUpdated: string;
  recordCount: number;
  version: string;
}

/**
 * Initialize IndexedDB
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.FEDERAL)) {
        const federalStore = db.createObjectStore(STORES.FEDERAL, { keyPath: 'id' });
        federalStore.createIndex('riding', 'riding', { unique: false });
        federalStore.createIndex('province', 'province', { unique: false });
        federalStore.createIndex('party', 'party', { unique: false });
        federalStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PROVINCIAL)) {
        const provincialStore = db.createObjectStore(STORES.PROVINCIAL, { keyPath: 'id' });
        provincialStore.createIndex('riding', 'riding', { unique: false });
        provincialStore.createIndex('province', 'province', { unique: false });
        provincialStore.createIndex('party', 'party', { unique: false });
        provincialStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.MUNICIPAL)) {
        const municipalStore = db.createObjectStore(STORES.MUNICIPAL, { keyPath: 'id' });
        municipalStore.createIndex('municipality', 'municipality', { unique: false });
        municipalStore.createIndex('province', 'province', { unique: false });
        municipalStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Save federal MPs to IndexedDB
 */
export async function saveFederalMPs(mps: FederalMP[]): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.FEDERAL, STORES.METADATA], 'readwrite');
    const store = transaction.objectStore(STORES.FEDERAL);
    const metaStore = transaction.objectStore(STORES.METADATA);

    // Clear existing data
    store.clear();

    // Add all MPs
    mps.forEach(mp => store.add(mp));

    // Update metadata
    const metadata: DataMetadata = {
      key: 'federal',
      lastUpdated: new Date().toISOString(),
      recordCount: mps.length,
      version: '1.0',
    };
    metaStore.put(metadata);

    transaction.oncomplete = () => {
      console.log(`[RepDB] Saved ${mps.length} federal MPs`);
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get all federal MPs from IndexedDB
 */
export async function getAllFederalMPs(): Promise<FederalMP[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FEDERAL, 'readonly');
    const store = transaction.objectStore(STORES.FEDERAL);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Search federal MPs by riding name
 */
export async function searchFederalMPsByRiding(ridingName: string): Promise<FederalMP[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FEDERAL, 'readonly');
    const store = transaction.objectStore(STORES.FEDERAL);
    const index = store.index('riding');
    const request = index.getAll(ridingName);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Search federal MPs by name (fuzzy)
 */
export async function searchFederalMPsByName(name: string): Promise<FederalMP[]> {
  const allMPs = await getAllFederalMPs();
  const searchLower = name.toLowerCase().trim();

  return allMPs.filter(mp =>
    mp.name.toLowerCase().includes(searchLower) ||
    mp.firstName.toLowerCase().includes(searchLower) ||
    mp.lastName.toLowerCase().includes(searchLower)
  );
}

/**
 * Save provincial representatives
 */
export async function saveProvincialReps(reps: ProvincialRep[]): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PROVINCIAL, STORES.METADATA], 'readwrite');
    const store = transaction.objectStore(STORES.PROVINCIAL);
    const metaStore = transaction.objectStore(STORES.METADATA);

    store.clear();
    reps.forEach(rep => store.add(rep));

    const metadata: DataMetadata = {
      key: 'provincial',
      lastUpdated: new Date().toISOString(),
      recordCount: reps.length,
      version: '1.0',
    };
    metaStore.put(metadata);

    transaction.oncomplete = () => {
      console.log(`[RepDB] Saved ${reps.length} provincial representatives`);
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get all provincial representatives
 */
export async function getAllProvincialReps(): Promise<ProvincialRep[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROVINCIAL, 'readonly');
    const store = transaction.objectStore(STORES.PROVINCIAL);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save municipal representatives
 */
export async function saveMunicipalReps(reps: MunicipalRep[]): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MUNICIPAL, STORES.METADATA], 'readwrite');
    const store = transaction.objectStore(STORES.MUNICIPAL);
    const metaStore = transaction.objectStore(STORES.METADATA);

    store.clear();
    reps.forEach(rep => store.add(rep));

    const metadata: DataMetadata = {
      key: 'municipal',
      lastUpdated: new Date().toISOString(),
      recordCount: reps.length,
      version: '1.0',
    };
    metaStore.put(metadata);

    transaction.oncomplete = () => {
      console.log(`[RepDB] Saved ${reps.length} municipal representatives`);
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get all municipal representatives
 */
export async function getAllMunicipalReps(): Promise<MunicipalRep[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.MUNICIPAL, 'readonly');
    const store = transaction.objectStore(STORES.MUNICIPAL);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get metadata about stored data
 */
export async function getDataMetadata(key: 'federal' | 'provincial' | 'municipal'): Promise<DataMetadata | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.METADATA, 'readonly');
    const store = transaction.objectStore(STORES.METADATA);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if data needs refresh (older than 24 hours)
 */
export async function needsDataRefresh(key: 'federal' | 'provincial' | 'municipal'): Promise<boolean> {
  const metadata = await getDataMetadata(key);

  if (!metadata) return true; // No data, needs refresh

  const lastUpdated = new Date(metadata.lastUpdated);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

  return hoursSinceUpdate > 24; // Refresh if older than 24 hours
}

/**
 * Clear all data (for testing or reset)
 */
export async function clearAllData(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.FEDERAL, STORES.PROVINCIAL, STORES.MUNICIPAL, STORES.METADATA],
      'readwrite'
    );

    transaction.objectStore(STORES.FEDERAL).clear();
    transaction.objectStore(STORES.PROVINCIAL).clear();
    transaction.objectStore(STORES.MUNICIPAL).clear();
    transaction.objectStore(STORES.METADATA).clear();

    transaction.oncomplete = () => {
      console.log('[RepDB] All data cleared');
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}
