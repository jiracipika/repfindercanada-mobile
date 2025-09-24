import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import type { Representative } from '@shared/schema';

// Define the shape of the user data
export interface UserData {
  searchCount: number;
  savedReps: Representative[];
  joinDate: string;
  lastSearch: string;
}

// Define the shape of the context value
interface UserDataContextType {
  userData: UserData | null;
  isLoading: boolean;
  initializeUserData: () => void;
  incrementSearchCount: () => void;
  addSavedRep: (rep: Representative) => void;
  removeSavedRep: (repId: string) => void;
  isRepSaved: (repId: string) => boolean;
  updateLastSearch: (search: string) => void;
}

// Create the context
const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

const USER_DATA_KEY = 'userData';

// Create the provider component
export function UserDataProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { value } = await Preferences.get({ key: USER_DATA_KEY });
        if (value) {
          setUserData(JSON.parse(value));
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
      await Preferences.set({ key: USER_DATA_KEY, value: JSON.stringify(newData) });
    } catch (error) {
      console.error("Failed to save user data", error);
    }
  };

  const initializeUserData = () => {
    const initialData: UserData = {
      searchCount: 0,
      savedReps: [],
      joinDate: new Date().toISOString(),
      lastSearch: "",
    };
    saveUserData(initialData);
  };

  const incrementSearchCount = () => {
    if (userData) {
      saveUserData({ ...userData, searchCount: userData.searchCount + 1 });
    }
  };

  const addSavedRep = (rep: Representative) => {
    if (userData && !userData.savedReps.some(r => r.id === rep.id)) {
      const newReps = [...userData.savedReps, rep];
      saveUserData({ ...userData, savedReps: newReps });
    }
  };

  const removeSavedRep = (repId: string) => {
    if (userData) {
      const newReps = userData.savedReps.filter(r => r.id !== parseInt(repId, 10));
      saveUserData({ ...userData, savedReps: newReps });
    }
  };

  const isRepSaved = (repId: string) => {
    return userData?.savedReps.some(r => r.id === parseInt(repId, 10)) ?? false;
  };

  const updateLastSearch = (search: string) => {
    if (userData) {
      saveUserData({ ...userData, lastSearch: search });
    }
  };

  const value = { 
    userData, 
    isLoading, 
    initializeUserData, 
    incrementSearchCount, 
    addSavedRep, 
    removeSavedRep, 
    isRepSaved, 
    updateLastSearch 
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
