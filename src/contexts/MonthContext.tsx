import { createContext, useContext, useState, ReactNode } from 'react';

interface MonthContextType {
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export const useMonthContext = () => {
  const context = useContext(MonthContext);
  if (!context) {
    throw new Error('useMonthContext must be used within MonthProvider');
  }
  return context;
};

export const MonthProvider = ({ children }: { children: ReactNode }) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  return (
    <MonthContext.Provider value={{ selectedMonth, selectedYear, setSelectedMonth, setSelectedYear }}>
      {children}
    </MonthContext.Provider>
  );
};
