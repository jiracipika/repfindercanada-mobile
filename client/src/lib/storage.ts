import { Preferences } from '@capacitor/preferences';
import type { Representative } from '@shared/schema';

const SAVED_REPS_KEY = 'savedReps';

export const getSavedReps = async (): Promise<Representative[]> => {
  const { value } = await Preferences.get({ key: SAVED_REPS_KEY });
  return value ? JSON.parse(value) : [];
};

export const saveRep = async (rep: Representative): Promise<void> => {
  const reps = await getSavedReps();
  const newReps = [...reps, rep];
  await Preferences.set({
    key: SAVED_REPS_KEY,
    value: JSON.stringify(newReps),
  });
};

export const removeRep = async (repUrl: string): Promise<void> => {
  const reps = await getSavedReps();
  const newReps = reps.filter((r) => r.url !== repUrl);
  await Preferences.set({
    key: SAVED_REPS_KEY,
    value: JSON.stringify(newReps),
  });
};
