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
  const [activeTab, setActiveTab] = useState('dashboard');
  return (
    <ActiveTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </ActiveTabContext.Provider>
  );
};
