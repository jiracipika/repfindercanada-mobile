/**
 * Bundled Data Loader Service
 *
 * OFFLINE-FIRST ARCHITECTURE
 * Loads MP data from bundled XML with periodic online updates
 *
 * Data Strategy:
 * 1. Load from bundled XML file (offline capability)
 * 2. Periodically check House of Commons website for updates (every 6 hours)
 * 3. Update in-memory cache if new data available
 *
 * This ensures the app works offline while staying current with official data.
 * All XML fetching is SERVER-SIDE (no CORS issues).
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';
import type { HouseOfCommonsMP } from './houseOfCommonsService';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory storage for all MPs
let allMPs: HouseOfCommonsMP[] = [];
let lastUpdateCheck = 0;
let lastBundleLoad = 0;
let dataVersion = '';

// Check for updates every 6 hours
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000;

// Expected number of ridings based on 2023 Representation Order
const EXPECTED_RIDING_COUNT_2023 = 343;

/**
 * Parse XML data to HouseOfCommonsMP array
 */
async function parseXMLToMPs(xmlData: string): Promise<HouseOfCommonsMP[]> {
  const parsed = await parseStringPromise(xmlData, {
    explicitArray: false,
    trim: true,
  });

  const members = Array.isArray(parsed.ArrayOfMemberOfParliament?.MemberOfParliament)
    ? parsed.ArrayOfMemberOfParliament.MemberOfParliament
    : [parsed.ArrayOfMemberOfParliament?.MemberOfParliament].filter(Boolean);

  if (!members || members.length === 0) {
    throw new Error('No members found in XML');
  }

  return members.map((member: any) => {
    const id = String(member.PersonId || '');
    const firstName = member.PersonOfficialFirstName || '';
    const lastName = member.PersonOfficialLastName || '';

    return {
      id,
      name: firstName && lastName ? `${firstName} ${lastName}`.trim() : '',
      firstName,
      lastName,
      honorific: member.PersonShortHonorific || '',
      constituency: member.ConstituencyName || '',
      province: member.ConstituencyProvinceTerritoryName || '',
      party: member.CaucusShortName || '',
      caucus: member.CaucusShortName || '',
      fromDate: member.FromDateTime || '',
      toDate: member.ToDateTime || undefined,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@parl.gc.ca`,
      photoUrl: id ? `https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/45/${id}.jpg` : undefined,
      profileUrl: id ? `https://www.ourcommons.ca/members/en/${firstName}-${lastName}(${id})` : undefined,
    };
  });
}

/**
 * Load MPs from bundled XML file
 */
async function loadFromBundle(): Promise<HouseOfCommonsMP[]> {
  try {
    console.log('[BundledDataLoader] Loading MPs from bundled XML...');

    const bundlePath = join(__dirname, 'data', 'mps-bundled.xml');
    const xmlData = readFileSync(bundlePath, 'utf-8');

    const mps = await parseXMLToMPs(xmlData);

    console.log(`[BundledDataLoader] ✓ Loaded ${mps.length} MPs from bundled XML`);

    // Validate count
    if (mps.length !== EXPECTED_RIDING_COUNT_2023) {
      console.warn(
        `[BundledDataLoader] ⚠️  WARNING: Expected ${EXPECTED_RIDING_COUNT_2023} ridings, ` +
        `but found ${mps.length} in bundled data.`
      );
    }

    lastBundleLoad = Date.now();
    dataVersion = `bundled-${new Date().toISOString()}`;

    return mps;
  } catch (error: any) {
    console.error('[BundledDataLoader] Error loading bundled XML:', error?.message || String(error));
    throw new Error('Failed to load bundled MP data');
  }
}

/**
 * Check for updated MP data from House of Commons website
 * With timeout to prevent hanging
 */
async function checkForUpdates(): Promise<HouseOfCommonsMP[] | null> {
  try {
    console.log('[BundledDataLoader] Checking House of Commons website for updates...');

    // Add abort controller with 10 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://www.ourcommons.ca/Members/en/search/xml', {
      headers: {
        'User-Agent': 'CanadianRepFinder/2.0',
        'Accept': 'application/xml, text/xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[BundledDataLoader] Update check failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const xmlData = await response.text();
    const mps = await parseXMLToMPs(xmlData);

    console.log(`[BundledDataLoader] ✓ Found ${mps.length} MPs on House of Commons website`);

    // Compare counts to detect changes
    const countChanged = mps.length !== allMPs.length;

    if (countChanged) {
      console.log('[BundledDataLoader] 🔄 Update detected - MP count changed');
      dataVersion = `online-${new Date().toISOString()}`;
      return mps;
    }

    // TODO: Could add more sophisticated change detection (compare IDs, names, etc.)
    console.log('[BundledDataLoader] No updates needed - data is current');
    return null;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('[BundledDataLoader] Update check timed out after 10 seconds');
    } else {
      console.warn('[BundledDataLoader] Update check failed:', error?.message || String(error));
    }
    return null;
  }
}

/**
 * Initialize the bundled data loader
 * Loads from bundle and optionally checks for updates IN BACKGROUND
 */
export async function initializeBundledData(checkUpdates = true): Promise<void> {
  try {
    // First load: always load from bundle (FAST, synchronous)
    if (allMPs.length === 0) {
      allMPs = await loadFromBundle();
    }

    // Check for updates IN BACKGROUND (non-blocking)
    // This allows the server to start immediately
    if (checkUpdates && (Date.now() - lastUpdateCheck) > UPDATE_CHECK_INTERVAL) {
      lastUpdateCheck = Date.now();

      // Run update check in background without awaiting
      checkForUpdates()
        .then(updatedMPs => {
          if (updatedMPs) {
            allMPs = updatedMPs;
            console.log('[BundledDataLoader] ✓ MP data updated from House of Commons website (background)');
          }
        })
        .catch(error => {
          console.warn('[BundledDataLoader] Background update check failed:', error?.message || String(error));
        });

      console.log('[BundledDataLoader] Background update check started (non-blocking)');
    }

  } catch (error: any) {
    console.error('[BundledDataLoader] Initialization failed:', error?.message || String(error));
    throw error;
  }
}

/**
 * Get all MPs from bundled data
 */
export function getAllMPs(): HouseOfCommonsMP[] {
  if (allMPs.length === 0) {
    throw new Error('Bundled data not initialized. Call initializeBundledData() first.');
  }
  return allMPs;
}

/**
 * Get MP by riding name
 */
export function getMPByRiding(ridingName: string): HouseOfCommonsMP | null {
  const normalized = ridingName.toLowerCase().trim();
  return allMPs.find(mp => mp.constituency.toLowerCase().trim() === normalized) || null;
}

/**
 * Search MPs by name (partial match)
 */
export function searchMPsByName(name: string): HouseOfCommonsMP[] {
  const normalized = name.toLowerCase().trim();
  return allMPs.filter(mp =>
    mp.name.toLowerCase().includes(normalized) ||
    mp.firstName.toLowerCase().includes(normalized) ||
    mp.lastName.toLowerCase().includes(normalized)
  );
}

/**
 * Get MP by ID
 */
export function getMPById(id: string): HouseOfCommonsMP | null {
  return allMPs.find(mp => mp.id === id) || null;
}

/**
 * Get data version info
 */
export function getDataInfo() {
  return {
    mpCount: allMPs.length,
    expectedCount: EXPECTED_RIDING_COUNT_2023,
    version: dataVersion,
    lastBundleLoad: new Date(lastBundleLoad).toISOString(),
    lastUpdateCheck: lastUpdateCheck > 0 ? new Date(lastUpdateCheck).toISOString() : 'never',
    isInitialized: allMPs.length > 0,
  };
}

/**
 * Force reload from bundle (useful for testing)
 */
export async function reloadBundle(): Promise<void> {
  allMPs = await loadFromBundle();
}

/**
 * Force update check (useful for admin/testing)
 */
export async function forceUpdateCheck(): Promise<boolean> {
  lastUpdateCheck = Date.now();
  const updatedMPs = await checkForUpdates();

  if (updatedMPs) {
    allMPs = updatedMPs;
    return true;
  }

  return false;
}
