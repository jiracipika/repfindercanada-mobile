import { Preferences } from '@capacitor/preferences';
import type { Representative } from "@shared/schema";

const KEY = 'SAVED_REPS_V1';
const EVT = "savedRepsChanged";

const emitSavedChange = () => {
  window.dispatchEvent(new CustomEvent(EVT));
};

const getSavedReps = async (): Promise<Representative[]> => {
  const { value } = await Preferences.get({ key: KEY });
  return value ? JSON.parse(value) : [];
};

const saveReps = async (reps: Representative[]) => {
  await Preferences.set({ key: KEY, value: JSON.stringify(reps) });
  emitSavedChange();
};

export const repRepository = {
  listSavedReps: async (): Promise<Representative[]> => {
    return getSavedReps();
  },

  saveRep: async (repToSave: Representative): Promise<void> => {
    const savedReps = await getSavedReps();
    if (!savedReps.some(rep => rep.id === repToSave.id)) {
      savedReps.unshift(repToSave); // Add to beginning
      await saveReps(savedReps);
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
