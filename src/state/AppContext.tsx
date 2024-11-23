import React, { useState, useContext, ReactNode } from 'react';

import { Year } from '../config';

export interface AppContextType {
  selectedYear: Year;
  setSelectedYear: (year: Year) => void;
}

export const AppContext = React.createContext<AppContextType | null>(null);

export type AppProviderProps = {
  children?: ReactNode;
};

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [selectedYear, setSelectedYear] = useState<Year>('2024');

  return (
    <AppContext.Provider value={{ selectedYear, setSelectedYear }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }

  return context;
};
