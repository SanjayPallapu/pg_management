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
  const [selectedMonth, setSelectedMonthState] = useState<number>(() => {
    const saved = localStorage.getItem('pg_selected_month');
    return saved ? parseInt(saved, 10) : currentDate.getMonth() + 1;
  });
  const [selectedYear, setSelectedYearState] = useState<number>(() => {
    const saved = localStorage.getItem('pg_selected_year');
    return saved ? parseInt(saved, 10) : currentDate.getFullYear();
  });

  const setSelectedMonth = (month: number) => {
    setSelectedMonthState(month);
    localStorage.setItem('pg_selected_month', String(month));
  };

  const setSelectedYear = (year: number) => {
    setSelectedYearState(year);
    localStorage.setItem('pg_selected_year', String(year));
  };

  return (
    <MonthContext.Provider value={{ selectedMonth, selectedYear, setSelectedMonth, setSelectedYear }}>
      {children}
    </MonthContext.Provider>
  );
};
