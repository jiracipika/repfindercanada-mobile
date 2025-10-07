import { Preferences } from '@capacitor/preferences';
import type { Representative } from "@shared/schema";

const KEY = 'SAVED_REPS_V1';
const OLD_KEY = 'savedReps';
const EVT = "savedRepsChanged";

// Helper to normalize representative IDs for comparison
// Returns a string to handle both numeric and synthetic string IDs (e.g., "postal-search-0")
const normalizeId = (id: number | string): string => {
  return String(id);
};

const emitSavedChange = () => {
  console.log('[repRepository] Emitting savedRepsChanged event');
  window.dispatchEvent(new CustomEvent(EVT));
};

// Migrate old data if exists
const migrateOldData = async (): Promise<void> => {
  const { value: oldValue } = await Preferences.get({ key: OLD_KEY });
  const { value: newValue } = await Preferences.get({ key: KEY });

  if (oldValue && !newValue) {
    console.log('[repRepository] Migrating old data from', OLD_KEY, 'to', KEY);
    await Preferences.set({ key: KEY, value: oldValue });
    await Preferences.remove({ key: OLD_KEY });
  }
};

const getSavedReps = async (): Promise<Representative[]> => {
  await migrateOldData();
  const { value } = await Preferences.get({ key: KEY });
  const reps = value ? JSON.parse(value) : [];

  // Deduplicate by ID in case of corrupt data
  const seen = new Set<string>();
  const deduplicated = reps.filter((rep: Representative) => {
    const id = normalizeId(rep.id);
    if (seen.has(id)) {
      console.warn('[repRepository] getSavedReps: Removing duplicate ID:', id);
      return false;
    }
    seen.add(id);
    return true;
  });

  console.log('[repRepository] getSavedReps:', deduplicated.length, 'reps found (', reps.length - deduplicated.length, 'duplicates removed)');
  return deduplicated;
};

const saveReps = async (reps: Representative[]): Promise<void> => {
  console.log('[repRepository] saveReps: Saving', reps.length, 'reps');
  await Preferences.set({ key: KEY, value: JSON.stringify(reps) });
  console.log('[repRepository] saveReps: Preferences write completed, emitting event');
  emitSavedChange();
};

export const repRepository = {
  listSavedReps: async (): Promise<Representative[]> => {
    return getSavedReps();
  },

  saveRep: async (repToSave: Representative): Promise<void> => {
    console.log('[repRepository] saveRep: Attempting to save rep:', repToSave.name, 'ID:', repToSave.id, 'Type:', typeof repToSave.id);
    const savedReps = await getSavedReps();
    console.log('[repRepository] saveRep: Current saved reps before save:', savedReps.length);
    console.log('[repRepository] saveRep: Existing IDs:', savedReps.map(rep => `${rep.id} (${typeof rep.id})`).join(', '));

    // Ensure we're comparing numbers strictly using normalizeId
    const repIdNum = normalizeId(repToSave.id);
    const isDuplicate = savedReps.some(rep => {
      const savedIdNum = normalizeId(rep.id);
      const match = savedIdNum === repIdNum;
      console.log(`[repRepository] saveRep: Comparing ${rep.id} (${typeof rep.id}) with ${repToSave.id} (${typeof repToSave.id}) => ${savedIdNum} === ${repIdNum} => ${match}`);
      return match;
    });

    if (!isDuplicate) {
      savedReps.push(repToSave); // Add to end
      console.log('[repRepository] saveRep: Rep not already saved, adding. New total:', savedReps.length);
      await saveReps(savedReps);
    } else {
      console.log('[repRepository] saveRep: Rep already saved, skipping');
    }
  },

  removeRep: async (repId: number | string): Promise<void> => {
    console.log('[repRepository] removeRep: Attempting to remove rep with ID:', repId, 'Type:', typeof repId);
    let savedReps = await getSavedReps();
    console.log('[repRepository] removeRep: Current saved reps before removal:', savedReps.length);
    console.log('[repRepository] removeRep: Existing IDs:', savedReps.map(rep => `${rep.id} (${typeof rep.id})`).join(', '));

    const repIdNum = normalizeId(repId);
    const lengthBefore = savedReps.length;
    savedReps = savedReps.filter(rep => {
      const savedIdNum = normalizeId(rep.id);
      const keep = savedIdNum !== repIdNum;
      console.log(`[repRepository] removeRep: Rep ${rep.id} => ${savedIdNum} !== ${repIdNum} => keep: ${keep}`);
      return keep;
    });

    console.log('[repRepository] removeRep: Saved reps after removal:', savedReps.length, '(removed:', lengthBefore - savedReps.length, ')');

    // Only save if something was actually removed
    if (lengthBefore !== savedReps.length) {
      await saveReps(savedReps);
    } else {
      console.log('[repRepository] removeRep: No reps removed, skipping save');
    }
  },

  isSaved: async (repId: number | string): Promise<boolean> => {
    const savedReps = await getSavedReps();
    const repIdNum = normalizeId(repId);
    const found = savedReps.some(rep => normalizeId(rep.id) === repIdNum);
    console.log('[repRepository] isSaved: Checking if', repId, 'is saved:', found, '(total saved:', savedReps.length, ')');
    return found;
  },

  toggleSaved: async (rep: Representative): Promise<void> => {
    const saved = await repRepository.isSaved(rep.id);
    if (saved) {
      await repRepository.removeRep(rep.id);
    } else {
      await repRepository.saveRep(rep);
    }
  },

  subscribeSavedChanges: (cb: () => void) => {
    const handler = () => {
      console.log('[repRepository] subscribeSavedChanges: Event received, calling callback');
      cb();
    };
    console.log('[repRepository] subscribeSavedChanges: Setting up listener for', EVT);
    window.addEventListener(EVT, handler);
    return () => {
      console.log('[repRepository] subscribeSavedChanges: Removing listener for', EVT);
      window.removeEventListener(EVT, handler);
    };
  },
};
