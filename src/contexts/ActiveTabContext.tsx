import { createContext, useContext, useState, ReactNode } from 'react';

interface ActiveTabContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ActiveTabContext = createContext<ActiveTabContextType>({
  activeTab: 'dashboard',
  setActiveTab: () => {},
});

export const useActiveTab = () => useContext(ActiveTabContext);

export const ActiveTabProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTabState] = useState<string>(() => {
    return localStorage.getItem('pg_active_tab') || 'dashboard';
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    localStorage.setItem('pg_active_tab', tab);
  };

  return (
    <ActiveTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </ActiveTabContext.Provider>
  );
};
