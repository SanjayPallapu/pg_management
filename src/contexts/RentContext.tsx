import { createContext, useContext, useCallback, ReactNode } from 'react';
import { TenantPayment } from '@/types';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useQueryClient } from '@tanstack/react-query';

interface RentContextType {
  rentRecords: TenantPayment[];
  selectedMonth: number;
  selectedYear: number;
  isLoading: boolean;
  error: string | null;
  togglePaid: (tenantId: string, roomId?: string) => Promise<void>;
  refreshMonth: () => Promise<void>;
  getPaymentStatus: (tenantId: string) => 'Paid' | 'Pending' | 'Partial' | null;
  getTotalCollected: () => number;
  getTotalPending: () => number;
}

const RentContext = createContext<RentContextType | undefined>(undefined);

export const useRent = () => {
  const context = useContext(RentContext);
  if (!context) {
    throw new Error('useRent must be used within RentProvider');
  }
  return context;
};

interface RentProviderProps {
  children: ReactNode;
  selectedMonth: number;
  selectedYear: number;
}

export const RentProvider = ({ children, selectedMonth, selectedYear }: RentProviderProps) => {
  const { payments, isLoading, error, upsertPayment } = useTenantPayments();
  const queryClient = useQueryClient();

  // Filter payments for the selected month/year
  const rentRecords = payments.filter(
    p => p.month === selectedMonth && p.year === selectedYear
  );

  const togglePaid = useCallback(
    async (tenantId: string, _roomId?: string) => {
      const existingRecord = rentRecords.find(
        r => r.tenantId === tenantId
      );
      if (!existingRecord) return;

      const newStatus = existingRecord.paymentStatus === 'Paid' ? 'Pending' : 'Paid';

      await upsertPayment.mutateAsync({
        tenantId,
        month: selectedMonth,
        year: selectedYear,
        paymentStatus: newStatus,
        paymentDate: existingRecord.paymentDate,
        amount: existingRecord.amount,
        amountPaid: existingRecord.amountPaid,
        paymentEntries: existingRecord.paymentEntries,
      });
    },
    [rentRecords, selectedMonth, selectedYear, upsertPayment]
  );

  const refreshMonth = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['tenant-payments'] });
  }, [queryClient]);

  const getPaymentStatus = useCallback(
    (tenantId: string): 'Paid' | 'Pending' | 'Partial' | null => {
      const record = rentRecords.find(r => r.tenantId === tenantId);
      return record ? record.paymentStatus : null;
    },
    [rentRecords]
  );

  const getTotalCollected = useCallback((): number => {
    return rentRecords
      .filter(r => r.paymentStatus === 'Paid')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [rentRecords]);

  const getTotalPending = useCallback((): number => {
    return rentRecords
      .filter(r => r.paymentStatus !== 'Paid')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [rentRecords]);

  const value: RentContextType = {
    rentRecords,
    selectedMonth,
    selectedYear,
    isLoading,
    error: error ? String(error) : null,
    togglePaid,
    refreshMonth,
    getPaymentStatus,
    getTotalCollected,
    getTotalPending,
  };

  return <RentContext.Provider value={value}>{children}</RentContext.Provider>;
};
