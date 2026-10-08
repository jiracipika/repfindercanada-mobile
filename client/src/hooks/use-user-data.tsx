import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import type { Representative } from '@shared/schema';

// Define the shape of the user data
export interface UserData {
  searchCount: number;
  savedReps: Representative[];
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
  addSavedRep: (rep: Representative) => void;
  removeSavedRep: (repId: string) => void;
  isRepSaved: (repId: string) => boolean;
  updateLastSearch: (search: string, type: 'postalCode' | 'name') => void;
  setSearchResults: (results: Representative[]) => void;
  updateProfile: (name: string, homePostalCode: string) => void;
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
    addSavedRep, 
    removeSavedRep, 
    isRepSaved, 
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
