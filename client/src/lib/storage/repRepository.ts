import { Preferences } from '@capacitor/preferences';
import type { Representative, ApiRepresentative } from "@shared/schema";

const KEY = 'SAVED_REPS_V2';
const OLD_KEY_V1 = 'SAVED_REPS_V1';
const OLD_KEY = 'savedReps';
const EVT = "savedRepsChanged";

// Helper to normalize representative IDs for comparison
// Returns a string to handle both numeric and synthetic string IDs (e.g., "rep_abc123...")
const normalizeId = (id: number | string): string => {
  return String(id);
};

const emitSavedChange = () => {
  window.dispatchEvent(new CustomEvent(EVT));
};

// Migrate old data if exists
const migrateOldData = async (): Promise<void> => {
  const { value: newValue } = await Preferences.get({ key: KEY });

  // Skip if we already have V2 data
  if (newValue) {
    return;
  }

  // Try V1 first
  const { value: v1Value } = await Preferences.get({ key: OLD_KEY_V1 });
  if (v1Value) {
    // Migration handled by migrateSavedRepsV2 in migrations
    return;
  }

  // Fall back to original old key
  const { value: oldValue } = await Preferences.get({ key: OLD_KEY });
  if (oldValue) {
    // This is legacy data with numeric IDs, will be handled by migration script
  }
};

const getSavedReps = async (): Promise<(Representative | ApiRepresentative)[]> => {
  await migrateOldData();
  const { value } = await Preferences.get({ key: KEY });
  const reps = value ? JSON.parse(value) : [];

  // Deduplicate by ID in case of corrupt data
  const seen = new Set<string>();
  const deduplicated = reps.filter((rep: Representative | ApiRepresentative) => {
    const id = normalizeId(rep.id);
    if (seen.has(id)) {
      console.warn('[repRepository] getSavedReps: Removing duplicate ID:', id);
      return false;
    }
    seen.add(id);
    return true;
  });

  return deduplicated;
};

const saveReps = async (reps: (Representative | ApiRepresentative)[]): Promise<void> => {
  await Preferences.set({ key: KEY, value: JSON.stringify(reps) });
  emitSavedChange();
};

export const repRepository = {
  listSavedReps: async (): Promise<(Representative | ApiRepresentative)[]> => {
    return getSavedReps();
  },

  saveRep: async (repToSave: Representative | ApiRepresentative): Promise<void> => {
    const savedReps = await getSavedReps();

    const repIdStr = normalizeId(repToSave.id);
    const existingIndex = savedReps.findIndex(rep => normalizeId(rep.id) === repIdStr);

    if (existingIndex === -1) {
      // Not a duplicate, add it
      savedReps.push(repToSave);
      await saveReps(savedReps);
    } else {
      // Check if it's truly the same representative (content-wise)
      const existing = savedReps[existingIndex];
      const same =
        existing.name === repToSave.name &&
        existing.constituency === repToSave.constituency &&
        existing.party === repToSave.party &&
        existing.email === repToSave.email;

      if (!same) {
        // Extremely unlikely: same ID but different content
        // This should never happen with a good hash, but handle gracefully
        console.warn('[repRepository] saveRep: ID collision detected! Same ID but different content. Generating suffix.');
        let suffix = 2;
        let newId = `${repIdStr}-${suffix}`;
        while (savedReps.some(r => normalizeId(r.id) === newId)) {
          suffix++;
          newId = `${repIdStr}-${suffix}`;
        }
        const repWithNewId = { ...repToSave, id: newId as any };
        savedReps.push(repWithNewId);
        await saveReps(savedReps);
      }
    }
  },

  removeRep: async (repId: number | string): Promise<void> => {
    let savedReps = await getSavedReps();

    const repIdNum = normalizeId(repId);
    const lengthBefore = savedReps.length;
    savedReps = savedReps.filter(rep => {
      const savedIdNum = normalizeId(rep.id);
      const keep = savedIdNum !== repIdNum;
      return keep;
    });

    // Only save if something was actually removed
    if (lengthBefore !== savedReps.length) {
      await saveReps(savedReps);
    }
  },

  isSaved: async (repId: number | string): Promise<boolean> => {
    const savedReps = await getSavedReps();
    const repIdNum = normalizeId(repId);
    const found = savedReps.some(rep => normalizeId(rep.id) === repIdNum);
    return found;
  },

  toggleSaved: async (rep: Representative | ApiRepresentative): Promise<void> => {
    const saved = await repRepository.isSaved(rep.id);
    if (saved) {
      await repRepository.removeRep(rep.id);
    } else {
      await repRepository.saveRep(rep);
    }
  },

  subscribeSavedChanges: (cb: () => void) => {
    const handler = () => {
      cb();
    };
    window.addEventListener(EVT, handler);
    return () => {
      window.removeEventListener(EVT, handler);
    };
  },
};
