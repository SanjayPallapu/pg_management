import { useState, useEffect } from 'react';

export interface BuildingRentPayment {
  id: string;
  date: string;
  forMonth: string;
  amount: number;
  upiAmount: number;
  cashAmount: number;
  receivedFrom: string;
  paidTo: string;
  createdAt: string;
}

const STORAGE_KEY = 'building-rent-history';

export const useBuildingRentHistory = () => {
  const [payments, setPayments] = useState<BuildingRentPayment[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPayments(JSON.parse(stored));
      } catch {
        setPayments([]);
      }
    }
  }, []);

  const addPayment = (payment: Omit<BuildingRentPayment, 'id' | 'createdAt'>) => {
    const newPayment: BuildingRentPayment = {
      ...payment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newPayment, ...payments];
    setPayments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newPayment;
  };

  const deletePayment = (id: string) => {
    const updated = payments.filter((p) => p.id !== id);
    setPayments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const getPaymentsByMonth = (month: string) => {
    return payments.filter((p) => p.forMonth === month);
  };

  return { payments, addPayment, deletePayment, getPaymentsByMonth };
};
