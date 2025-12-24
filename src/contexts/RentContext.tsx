import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TenantPayment } from '@/types';

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
  const [rentRecords, setRentRecords] = useState<TenantPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRentForMonth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tenant_payments')
        .select('*')
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('tenant_id', { ascending: true });

      if (fetchError) throw fetchError;

      const mappedRecords: TenantPayment[] = (data || []).map(record => ({
        id: record.id,
        tenantId: record.tenant_id,
        month: record.month,
        year: record.year,
        paymentStatus: record.payment_status as 'Paid' | 'Pending' | 'Partial',
        paymentDate: record.payment_date || undefined,
        amount: record.amount,
        amountPaid: (record as any).amount_paid || 0,
        paymentEntries: ((record as any).payment_entries || []),
      }));
      setRentRecords(mappedRecords);
    } catch (err) {
      console.error('Error fetching rent data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch rent data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const togglePaid = useCallback(
    async (tenantId: string, roomId?: string) => {
      try {
        const existingRecord = rentRecords.find(
          (r) => r.tenantId === tenantId && r.month === selectedMonth && r.year === selectedYear
        );

        if (!existingRecord) return;

        const newStatus = existingRecord.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
        const updatedAt = new Date().toISOString();

        setRentRecords((prev) =>
          prev.map((r) =>
            r.id === existingRecord.id
              ? { ...r, paymentStatus: newStatus, updatedAt }
              : r
          )
        );

        const { error: updateError } = await supabase
          .from('tenant_payments')
          .update({
            payment_status: newStatus,
            updated_at: updatedAt,
          })
          .eq('id', existingRecord.id);

        if (updateError) throw updateError;
      } catch (err) {
        console.error('Error toggling payment status:', err);
        await fetchRentForMonth();
      }
    },
    [rentRecords, selectedMonth, selectedYear, fetchRentForMonth]
  );

  const getPaymentStatus = useCallback(
    (tenantId: string): 'Paid' | 'Pending' | 'Partial' | null => {
      const record = rentRecords.find((r) => r.tenantId === tenantId);
      return record ? record.paymentStatus : null;
    },
    [rentRecords]
  );

  const getTotalCollected = useCallback((): number => {
    return rentRecords
      .filter((r) => r.paymentStatus === 'Paid')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [rentRecords]);

  const getTotalPending = useCallback((): number => {
    return rentRecords
      .filter((r) => r.paymentStatus !== 'Paid')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [rentRecords]);

  useEffect(() => {
    fetchRentForMonth();
  }, [fetchRentForMonth]);

  const value: RentContextType = {
    rentRecords,
    selectedMonth,
    selectedYear,
    isLoading,
    error,
    togglePaid,
    refreshMonth: fetchRentForMonth,
    getPaymentStatus,
    getTotalCollected,
    getTotalPending,
  };

  return <RentContext.Provider value={value}>{children}</RentContext.Provider>;
};
