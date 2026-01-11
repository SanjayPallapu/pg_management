import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

export interface PaymentEntry {
  amount: number;
  date: string;
  type: 'full' | 'partial' | 'remaining';
}

export interface DayGuest {
  id: string;
  room_id: string;
  guest_name: string;
  mobile_number: string | null;
  id_proof: string | null;
  from_date: string;
  to_date: string;
  number_of_days: number;
  per_day_rate: number;
  total_amount: number;
  payment_status: 'Paid' | 'Pending';
  amount_paid: number | null;
  payment_entries: PaymentEntry[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDayGuestInput {
  room_id: string;
  guest_name: string;
  mobile_number?: string;
  id_proof?: string;
  from_date: string;
  to_date: string;
  number_of_days: number;
  per_day_rate: number;
  total_amount: number;
  payment_status?: 'Paid' | 'Pending';
  notes?: string;
}

export const useDayGuests = (roomId?: string) => {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: authLoading } = useAuth();

  const { data: dayGuests = [], isLoading } = useQuery({
    queryKey: ['day-guests', roomId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('day_guests')
        .select('*')
        .order('from_date', { ascending: false });

      if (roomId) {
        query = query.eq('room_id', roomId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching day guests:', error);
        throw error;
      }

      // Map the data to our DayGuest type with masked values for staff
      return (data || []).map(item => ({
        ...item,
        // Mask sensitive data for staff users
        mobile_number: isAdmin ? item.mobile_number : (item.mobile_number ? '••••••••••' : null),
        id_proof: isAdmin ? item.id_proof : (item.id_proof ? '••••••••' : null),
        payment_status: item.payment_status as 'Paid' | 'Pending',
        payment_entries: (item.payment_entries as unknown) as PaymentEntry[] | null,
      })) as DayGuest[];
    },
    enabled: !authLoading,
  });

  const addDayGuest = useMutation({
    mutationFn: async (input: CreateDayGuestInput) => {
      const { data, error } = await supabase
        .from('day_guests')
        .insert({
          room_id: input.room_id,
          guest_name: input.guest_name,
          mobile_number: input.mobile_number || null,
          id_proof: input.id_proof || null,
          from_date: input.from_date,
          to_date: input.to_date,
          number_of_days: input.number_of_days,
          per_day_rate: input.per_day_rate,
          total_amount: input.total_amount,
          payment_status: input.payment_status || 'Pending',
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newGuest) => {
      await queryClient.cancelQueries({ queryKey: ['day-guests'] });
      const previousGuests = queryClient.getQueryData<DayGuest[]>(['day-guests', roomId, isAdmin]);
      
      const optimisticGuest: DayGuest = {
        id: `temp-${Date.now()}`,
        room_id: newGuest.room_id,
        guest_name: newGuest.guest_name,
        mobile_number: newGuest.mobile_number || null,
        id_proof: newGuest.id_proof || null,
        from_date: newGuest.from_date,
        to_date: newGuest.to_date,
        number_of_days: newGuest.number_of_days,
        per_day_rate: newGuest.per_day_rate,
        total_amount: newGuest.total_amount,
        payment_status: (newGuest.payment_status as 'Paid' | 'Pending') || 'Pending',
        amount_paid: 0,
        payment_entries: null,
        notes: newGuest.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData<DayGuest[]>(['day-guests', roomId, isAdmin], (old = []) => 
        [optimisticGuest, ...old]
      );
      
      return { previousGuests };
    },
    onError: (_err, _newGuest, context) => {
      if (context?.previousGuests) {
        queryClient.setQueryData(['day-guests', roomId, isAdmin], context.previousGuests);
      }
      toast.error('Failed to add day guest');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['day-guests'] });
      queryClient.invalidateQueries({ queryKey: ['day-guest-stats'] });
    },
    onSuccess: () => {
      toast.success('Day guest added successfully');
    },
  });

  const updateDayGuest = useMutation({
    mutationFn: async ({ id, payment_entries, ...updates }: Partial<DayGuest> & { id: string }) => {
      const updatePayload: Record<string, unknown> = { ...updates };
      
      // Convert payment_entries to Json type for Supabase
      if (payment_entries !== undefined) {
        updatePayload.payment_entries = payment_entries as unknown as Json;
      }

      const { data, error } = await supabase
        .from('day_guests')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (updatedGuest) => {
      await queryClient.cancelQueries({ queryKey: ['day-guests'] });
      const previousGuests = queryClient.getQueryData<DayGuest[]>(['day-guests', roomId, isAdmin]);
      
      queryClient.setQueryData<DayGuest[]>(['day-guests', roomId, isAdmin], (old = []) =>
        old.map(guest => 
          guest.id === updatedGuest.id 
            ? { ...guest, ...updatedGuest, updated_at: new Date().toISOString() } 
            : guest
        )
      );
      
      return { previousGuests };
    },
    onError: (_err, _updatedGuest, context) => {
      if (context?.previousGuests) {
        queryClient.setQueryData(['day-guests', roomId, isAdmin], context.previousGuests);
      }
      toast.error('Failed to update day guest');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['day-guests'] });
      queryClient.invalidateQueries({ queryKey: ['day-guest-stats'] });
    },
  });

  const deleteDayGuest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('day_guests').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (idToDelete) => {
      await queryClient.cancelQueries({ queryKey: ['day-guests'] });
      const previousGuests = queryClient.getQueryData<DayGuest[]>(['day-guests', roomId, isAdmin]);
      
      queryClient.setQueryData<DayGuest[]>(['day-guests', roomId, isAdmin], (old = []) =>
        old.filter(guest => guest.id !== idToDelete)
      );
      
      return { previousGuests };
    },
    onError: (_err, _id, context) => {
      if (context?.previousGuests) {
        queryClient.setQueryData(['day-guests', roomId, isAdmin], context.previousGuests);
      }
      toast.error('Failed to delete day guest');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['day-guests'] });
      queryClient.invalidateQueries({ queryKey: ['day-guest-stats'] });
    },
    onSuccess: () => {
      toast.success('Day guest deleted successfully');
    },
  });

  return {
    dayGuests,
    isLoading: isLoading || authLoading,
    addDayGuest,
    updateDayGuest,
    deleteDayGuest,
  };
};
