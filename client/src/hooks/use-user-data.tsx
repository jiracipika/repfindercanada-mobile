import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import type { Representative } from '@shared/schema';
import { repRepository } from '@/lib/storage/repRepository';

/**
 * App-level user data (profile, search counters).
 *
 * NOTE: saved representatives intentionally do NOT live here. The single
 * store for saved reps is `lib/storage/repRepository` (SAVED_REPS_V2) — the
 * previous dual store in this context had a parseInt-on-URL bug in
 * removeSavedRep/isRepSaved and is now unified into repRepository. Any
 * savedReps found in the legacy userData blob are merged into
 * repRepository once, then stripped.
 */

// Define the shape of the user data
export interface UserData {
  searchCount: number;
  joinDate: string;
  lastPostalCodeSearch: string;
  lastNameSearch: string;
  lastSearchType: 'postalCode' | 'name';
  searchResults: Representative[];
  name: string;
  homePostalCode: string;
}

// Define the shape of the context value
interface UserDataContextType {
  userData: UserData | null;
  isLoading: boolean;
  initializeUserData: () => void;
  incrementSearchCount: () => void;
  updateLastSearch: (search: string, type: 'postalCode' | 'name') => void;
  setSearchResults: (results: Representative[]) => void;
  updateProfile: (name: string, homePostalCode: string) => void;
}

// Create the context
const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

const USER_DATA_KEY = 'userData';

/** Strip legacy fields when persisting (savedReps moved to repRepository). */
function sanitizeUserData(data: UserData & { savedReps?: Representative[] }): UserData {
  const { savedReps: _legacy, ...rest } = data;
  void _legacy;
  return rest;
}

// Create the provider component
export function UserDataProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { value } = await Preferences.get({ key: USER_DATA_KEY });
        if (value) {
          const parsed = JSON.parse(value) as UserData & { savedReps?: Representative[] };

          // One-time migration: saved reps previously lived in this blob.
          // Merge them into the canonical repRepository store, then persist
          // the blob without them so this runs at most once per device.
          if (Array.isArray(parsed.savedReps) && parsed.savedReps.length > 0) {
            await repRepository.mergeReps(parsed.savedReps);
          }
          setUserData(sanitizeUserData(parsed));
          if (Array.isArray(parsed.savedReps)) {
            await Preferences.set({ key: USER_DATA_KEY, value: JSON.stringify(sanitizeUserData(parsed)) });
          }
        } else {
          // If no user data is found, initialize it
          initializeUserData();
        }
      } catch (error) {
        console.error("Failed to load user data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, []);

  const saveUserData = async (newData: UserData) => {
    try {
      setUserData(newData);
      await Preferences.set({ key: USER_DATA_KEY, value: JSON.stringify(sanitizeUserData(newData)) });
    } catch (error) {
      console.error("Failed to save user data", error);
    }
  };

  const initializeUserData = () => {
    const initialData: UserData = {
      searchCount: 0,
      joinDate: new Date().toISOString(),
      lastPostalCodeSearch: "",
      lastNameSearch: "",
      lastSearchType: "postalCode",
      searchResults: [],
      name: "",
      homePostalCode: "",
    };
    saveUserData(initialData);
  };

  const incrementSearchCount = () => {
    if (userData) {
      saveUserData({ ...userData, searchCount: userData.searchCount + 1 });
    }
  };

  const updateLastSearch = (search: string, type: 'postalCode' | 'name') => {
    if (userData) {
      const updatedData = {
        ...userData,
        lastSearchType: type,
        lastPostalCodeSearch: type === 'postalCode' ? search : userData.lastPostalCodeSearch,
        lastNameSearch: type === 'name' ? search : userData.lastNameSearch,
      };
      saveUserData(updatedData);
    }
  };

  const setSearchResults = (results: Representative[]) => {
    if (userData) {
      saveUserData({ ...userData, searchResults: results });
    }
  };

  const updateProfile = (name: string, homePostalCode: string) => {
    if (userData) {
      saveUserData({ ...userData, name, homePostalCode });
    }
  };

  const value = {
    userData,
    isLoading,
    initializeUserData,
    incrementSearchCount,
    updateLastSearch,
    setSearchResults,
    updateProfile,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

// Custom hook to use the context
export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}
