import { Preferences } from '@capacitor/preferences';
import type { Representative } from "@shared/schema";

const KEY = 'SAVED_REPS_V1';
const EVT = "savedRepsChanged";

const emitSavedChange = () => {
  window.dispatchEvent(new CustomEvent(EVT));
};

const getSavedReps = async (): Promise<Representative[]> => {
  const { value } = await Preferences.get({ key: KEY });
  const reps = value ? JSON.parse(value) : [];
  console.log('[repRepository] getSavedReps:', reps.length, 'reps found');
  return reps;
};

const saveReps = async (reps: Representative[]) => {
  console.log('[repRepository] saveReps: Saving', reps.length, 'reps');
  await Preferences.set({ key: KEY, value: JSON.stringify(reps) });
  emitSavedChange();
};

export const repRepository = {
  listSavedReps: async (): Promise<Representative[]> => {
    return getSavedReps();
  },

  saveRep: async (repToSave: Representative): Promise<void> => {
    console.log('[repRepository] saveRep: Attempting to save rep:', repToSave.name, 'ID:', repToSave.id);
    const savedReps = await getSavedReps();
    console.log('[repRepository] saveRep: Current saved reps before save:', savedReps.length);
    // Use Number() to ensure consistent comparison
    if (!savedReps.some(rep => Number(rep.id) === Number(repToSave.id))) {
      savedReps.unshift(repToSave); // Add to beginning
      console.log('[repRepository] saveRep: Rep not already saved, adding. New total:', savedReps.length);
      await saveReps(savedReps);
    } else {
      console.log('[repRepository] saveRep: Rep already saved, skipping');
    }
  },

  removeRep: async (repId: number | string): Promise<void> => {
    let savedReps = await getSavedReps();
    savedReps = savedReps.filter(rep => rep.id !== Number(repId));
    await saveReps(savedReps);
  },

  isSaved: async (repId: number | string): Promise<boolean> => {
    const savedReps = await getSavedReps();
    return savedReps.some(rep => rep.id === Number(repId));
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
    const handler = () => cb();
    window.addEventListener(EVT, handler);
    return () => window.removeEventListener(EVT, handler);
  },
};
