import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Room, Tenant } from '@/types';

export const useRooms = () => {
  const queryClient = useQueryClient();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('room_no');

      if (roomsError) throw roomsError;

      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*');

      if (tenantsError) throw tenantsError;

      return roomsData.map(room => ({
        id: room.id,
        roomNo: room.room_no,
        status: room.status as 'Vacant' | 'Occupied' | 'Partially Occupied',
        capacity: room.capacity,
        rentAmount: room.rent_amount,
        floor: room.floor as 1 | 2 | 3,
        notes: room.notes || undefined,
        tenants: tenantsData
          .filter(tenant => tenant.room_id === room.id)
          .map(tenant => ({
            id: tenant.id,
            name: tenant.name,
            phone: tenant.phone,
            startDate: tenant.start_date,
            endDate: tenant.end_date || undefined,
            monthlyRent: tenant.monthly_rent,
            paymentStatus: tenant.payment_status as 'Paid' | 'Pending',
            paymentDate: tenant.payment_date || undefined,
            securityDepositAmount: tenant.security_deposit_amount,
            securityDepositDate: tenant.security_deposit_date,
          })),
      })) as Room[];
    },
  });

  const updateRoom = useMutation({
    mutationFn: async (room: Room) => {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_no', room.roomNo)
        .single();

      if (roomError) throw roomError;

      const { error: updateError } = await supabase
        .from('rooms')
        .update({
          status: room.status,
          capacity: room.capacity,
          rent_amount: room.rentAmount,
          notes: room.notes,
        })
        .eq('id', roomData.id);

      if (updateError) throw updateError;

      return room;
    },
    onMutate: async (newRoom) => {
      await queryClient.cancelQueries({ queryKey: ['rooms'] });
      const previousRooms = queryClient.getQueryData(['rooms']);
      queryClient.setQueryData(['rooms'], (old: Room[] | undefined) => {
        if (!old) return old;
        return old.map(room => room.roomNo === newRoom.roomNo ? newRoom : room);
      });
      return { previousRooms };
    },
    onError: (_err, _newRoom, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(['rooms'], context.previousRooms);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  const addTenant = useMutation({
    mutationFn: async ({ roomNo, tenant }: { roomNo: string; tenant: Omit<Tenant, 'id'> }) => {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_no', roomNo)
        .single();

      if (roomError) throw roomError;

      const { data: tenantData, error: insertError } = await supabase
        .from('tenants')
        .insert({
          room_id: roomData.id,
          name: tenant.name,
          phone: tenant.phone,
          start_date: tenant.startDate,
          end_date: tenant.endDate,
          monthly_rent: tenant.monthlyRent,
          payment_status: tenant.paymentStatus,
          payment_date: tenant.paymentDate,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Auto-create first month payment as "Paid" (advance payment)
      const startDate = new Date(tenant.startDate);
      const joinMonth = startDate.getMonth() + 1;
      const joinYear = startDate.getFullYear();

      const { error: paymentError } = await supabase
        .from('tenant_payments')
        .insert({
          tenant_id: tenantData.id,
          month: joinMonth,
          year: joinYear,
          payment_status: 'Paid',
          payment_date: tenant.startDate,
          amount: tenant.monthlyRent,
        });

      if (paymentError) throw paymentError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-payments'] });
    },
  });

  const updateTenant = useMutation({
    mutationFn: async ({ tenantId, updates }: { tenantId: string; updates: Partial<Tenant> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.monthlyRent !== undefined) updateData.monthly_rent = updates.monthlyRent;
      if (updates.paymentStatus !== undefined) updateData.payment_status = updates.paymentStatus;
      if (updates.paymentDate !== undefined) updateData.payment_date = updates.paymentDate;
      if (updates.securityDepositAmount !== undefined) updateData.security_deposit_amount = updates.securityDepositAmount;
      if (updates.securityDepositDate !== undefined) updateData.security_deposit_date = updates.securityDepositDate;

      const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenantId);

      if (error) throw error;
    },
    onMutate: async ({ tenantId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['rooms'] });
      const previousRooms = queryClient.getQueryData(['rooms']);
      queryClient.setQueryData(['rooms'], (old: Room[] | undefined) => {
        if (!old) return old;
        return old.map(room => ({
          ...room,
          tenants: room.tenants.map(tenant => 
            tenant.id === tenantId ? { ...tenant, ...updates } : tenant
          ),
        }));
      });
      return { previousRooms };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(['rooms'], context.previousRooms);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  const removeTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  const resetRentCycle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tenants')
        .update({ payment_status: 'Pending' })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  return {
    rooms,
    isLoading,
    updateRoom,
    addTenant,
    updateTenant,
    removeTenant,
    resetRentCycle,
  };
};
