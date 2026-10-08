import { Preferences } from '@capacitor/preferences';
import { makeRepresentativeId } from '../repId';
import type { Representative } from '@shared/schema';

const KEY_V2 = 'SAVED_REPS_V2';
const KEY_V1 = 'SAVED_REPS_V1';
const OLD_KEY = 'savedReps';
const MIGRATION_FLAG = 'SAVED_REPS_MIGRATION_V2_COMPLETE';

/**
 * One-time migration to update representative IDs from legacy formats
 * (postal-search-0, postal-search-1, open-north-*, etc.) to the new
 * deterministic hash-based format (rep_[0-9a-f]{16}).
 */
export async function migrateSavedRepsV2(): Promise<void> {
  try {
    // Check if migration already completed
    const { value: migrationComplete } = await Preferences.get({ key: MIGRATION_FLAG });
    if (migrationComplete === 'true') {
      return;
    }

    // Check if we already have V2 data
    const { value: v2Value } = await Preferences.get({ key: KEY_V2 });
    if (v2Value) {
      await Preferences.set({ key: MIGRATION_FLAG, value: 'true' });
      return;
    }

    // Try to load from V1
    let repsToMigrate: Representative[] = [];
    const { value: v1Value } = await Preferences.get({ key: KEY_V1 });
    if (v1Value) {
      repsToMigrate = JSON.parse(v1Value);
    } else {
      // Fall back to original old key
      const { value: oldValue } = await Preferences.get({ key: OLD_KEY });
      if (oldValue) {
        repsToMigrate = JSON.parse(oldValue);
      }
    }

    if (repsToMigrate.length === 0) {
      await Preferences.set({ key: MIGRATION_FLAG, value: 'true' });
      return;
    }

    // Migrate each representative
    const migratedReps: Representative[] = [];
    const seenIds = new Set<string>();

    for (const rep of repsToMigrate) {
      const currentId = String(rep.id);

      // Check if this needs migration (legacy IDs start with "postal-search-" or "open-north-")
      const needsMigration =
        currentId.startsWith('postal-search-') ||
        currentId.startsWith('open-north-') ||
        /^\d+$/.test(currentId); // Pure numeric IDs also need migration

      if (needsMigration) {

        // Generate new ID based on representative data
        const newId = await makeRepresentativeId({
          source: currentId.startsWith('postal-search-')
            ? 'opennorth-postal'
            : currentId.startsWith('open-north-')
            ? 'opennorth-search'
            : 'legacy',
          elected_office: rep.constituency ? 'MP' : undefined, // Assume MP for Canadian reps
          name: rep.name,
          district_name: rep.constituency,
          party_name: rep.party,
          email: rep.email || undefined,
        });

        // Check for duplicates in the migrated set
        if (seenIds.has(newId)) {
          continue;
        }

        seenIds.add(newId);
        migratedReps.push({
          ...rep,
          id: newId as any,
        });

      } else if (!seenIds.has(currentId)) {
        // Already has new format ID, just dedupe
        seenIds.add(currentId);
        migratedReps.push(rep);
      }
    }

    // Save migrated data to V2
    await Preferences.set({
      key: KEY_V2,
      value: JSON.stringify(migratedReps),
    });

    // Clean up old keys
    if (v1Value) {
      await Preferences.remove({ key: KEY_V1 });
    }
    const { value: oldValue } = await Preferences.get({ key: OLD_KEY });
    if (oldValue) {
      await Preferences.remove({ key: OLD_KEY });
    }

    // Mark migration as complete
    await Preferences.set({ key: MIGRATION_FLAG, value: 'true' });
  } catch (error) {
    console.error('[Migration] Error during V2 migration:', error);
    // Don't throw - let the app continue even if migration fails
  }
}
