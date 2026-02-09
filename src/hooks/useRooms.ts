import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Room, Tenant } from "@/types";
import { useAuth } from "./useAuth";
import { useAuditLog } from "./useAuditLog";
import { usePG } from "@/contexts/PGContext";

export const useRooms = () => {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { currentPG } = usePG();
  const { logAudit } = useAuditLog();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooms", currentPG?.id],
    queryFn: async () => {
      // Don't fetch if no PG is selected
      if (!currentPG?.id) {
        return [];
      }

      // Fetch rooms filtered by current PG
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("*")
        .eq("pg_id", currentPG.id)
        .order("room_no");

      if (roomsError) throw roomsError;

      if (!roomsData || roomsData.length === 0) {
        return [];
      }

      const roomIds = roomsData.map(r => r.id);

      // Fetch tenants only for rooms in this PG
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .in("room_id", roomIds);

      if (tenantsError) throw tenantsError;

      // Group tenants by room_id
      const tenantsByRoom = (tenantsData || [])
        .reduce(
          (acc, tenant) => {
            if (!acc[tenant.room_id]) {
              acc[tenant.room_id] = [];
            }
            acc[tenant.room_id].push(tenant);
            return acc;
          },
          {} as Record<string, typeof tenantsData>,
        );

      return roomsData.map((room) => ({
        id: room.id,
        roomNo: room.room_no,
        status: room.status as "Vacant" | "Occupied" | "Partially Occupied",
        capacity: room.capacity,
        rentAmount: room.rent_amount,
        floor: room.floor as 1 | 2 | 3,
        notes: room.notes || undefined,
        tenants: (tenantsByRoom[room.id] || []).map((tenant) => ({
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          startDate: tenant.start_date,
          endDate: tenant.end_date || undefined,
          monthlyRent: tenant.monthly_rent,
          paymentStatus: tenant.payment_status as "Paid" | "Pending",
          paymentDate: tenant.payment_date || undefined,
          securityDepositAmount: tenant.security_deposit_amount,
          securityDepositDate: tenant.security_deposit_date,
          securityDepositMode: tenant.security_deposit_mode,
          isLocked: (tenant as any).is_locked || false,
        })),
      })) as Room[];
    },
    enabled: !authLoading && !!currentPG?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const updateRoom = useMutation({
    mutationFn: async (room: Room) => {
      const { error: updateError } = await supabase
        .from("rooms")
        .update({
          status: room.status,
          capacity: room.capacity,
          rent_amount: room.rentAmount,
          notes: room.notes,
        })
        .eq("id", room.id);

      if (updateError) throw updateError;

      return room;
    },
    onMutate: async (newRoom) => {
      await queryClient.cancelQueries({ queryKey: ["rooms"] });
      const previousRooms = queryClient.getQueryData(["rooms", currentPG?.id]);
      queryClient.setQueryData(["rooms", currentPG?.id], (old: Room[] | undefined) => {
        if (!old) return old;
        return old.map((room) => (room.roomNo === newRoom.roomNo ? newRoom : room));
      });
      return { previousRooms };
    },
    onError: (_err, _newRoom, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(["rooms", currentPG?.id], context.previousRooms);
      }
    },
    onSuccess: () => {
      // Immediate refetch for faster UX
      queryClient.invalidateQueries({ queryKey: ["rooms"], refetchType: 'active' });
    },
  });

  const addTenant = useMutation({
    mutationFn: async ({ roomId, roomNo, tenant }: { roomId: string; roomNo: string; tenant: Omit<Tenant, "id"> }) => {

      const { data: tenantData, error: insertError } = await supabase
        .from("tenants")
        .insert({
          room_id: roomId,
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

      // Log audit for tenant creation
      logAudit.mutate({
        action: "create",
        tableName: "tenants",
        recordId: tenantData.id,
        recordName: `${tenant.name} (Room ${roomNo})`,
        newData: { name: tenant.name, phone: tenant.phone, room: roomNo, rent: tenant.monthlyRent },
      });

      return tenantData;
    },
    onMutate: async ({ roomId, roomNo, tenant }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["rooms"] });
      
      // Snapshot the previous value
      const previousRooms = queryClient.getQueryData(["rooms", currentPG?.id]);
      
      // Optimistically update with a temp ID
      queryClient.setQueryData(["rooms", currentPG?.id], (old: Room[] | undefined) => {
        if (!old) return old;
        return old.map((room) => {
          if (room.id === roomId) {
            const newTenantCount = room.tenants.length + 1;
            const newStatus = newTenantCount >= room.capacity 
              ? "Occupied" 
              : newTenantCount === 0 
                ? "Vacant" 
                : "Partially Occupied";
            return {
              ...room,
              status: newStatus as any,
              tenants: [
                ...room.tenants,
                {
                  ...tenant,
                  id: `temp-${Date.now()}`, // Temp ID, will be replaced on refetch
                } as Tenant,
              ],
            };
          }
          return room;
        });
      });
      
      return { previousRooms };
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousRooms) {
        queryClient.setQueryData(["rooms", currentPG?.id], context.previousRooms);
      }
    },
    onSuccess: () => {
      // Immediate refetch to get the real ID from the server
      queryClient.invalidateQueries({ queryKey: ["rooms"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["tenant-payments"], refetchType: 'active' });
    },
  });

  const updateTenant = useMutation({
    mutationFn: async ({
      tenantId,
      updates,
      tenantName,
    }: {
      tenantId: string;
      updates: Partial<Tenant>;
      tenantName?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      const changes: Record<string, { old: unknown; new: unknown }> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) {
        updateData.end_date = updates.endDate;
        changes.end_date = { old: null, new: updates.endDate };
      }
      if (updates.monthlyRent !== undefined) {
        updateData.monthly_rent = updates.monthlyRent;
        changes.monthly_rent = { old: null, new: updates.monthlyRent };
      }
      if (updates.paymentStatus !== undefined) updateData.payment_status = updates.paymentStatus;
      if (updates.paymentDate !== undefined) updateData.payment_date = updates.paymentDate;
      if (updates.securityDepositAmount !== undefined) {
        updateData.security_deposit_amount = updates.securityDepositAmount;
        changes.security_deposit = { old: null, new: updates.securityDepositAmount };
      }
      if (updates.securityDepositDate !== undefined) updateData.security_deposit_date = updates.securityDepositDate;
      if (updates.securityDepositMode !== undefined) updateData.security_deposit_mode = updates.securityDepositMode;
      if (updates.isLocked !== undefined) {
        updateData.is_locked = updates.isLocked;
        changes.is_locked = { old: !updates.isLocked, new: updates.isLocked };
      }

      const { error } = await supabase.from("tenants").update(updateData).eq("id", tenantId);

      if (error) throw error;

      // Log audit for significant updates
      if (Object.keys(changes).length > 0) {
        logAudit.mutate({
          action: "update",
          tableName: "tenants",
          recordId: tenantId,
          recordName: tenantName,
          changes,
        });
      }
    },
    onMutate: async ({ tenantId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["rooms"] });
      const previousRooms = queryClient.getQueryData(["rooms", currentPG?.id]);
      queryClient.setQueryData(["rooms", currentPG?.id], (old: Room[] | undefined) => {
        if (!old) return old;
        return old.map((room) => ({
          ...room,
          tenants: room.tenants.map((tenant) => (tenant.id === tenantId ? { ...tenant, ...updates } : tenant)),
        }));
      });
      return { previousRooms };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(["rooms", currentPG?.id], context.previousRooms);
      }
    },
    onSuccess: () => {
      // Immediate refetch for faster UX
      queryClient.invalidateQueries({ queryKey: ["rooms"], refetchType: 'active' });
    },
  });

  const removeTenant = useMutation({
    mutationFn: async ({ tenantId, tenantName }: { tenantId: string; tenantName?: string }) => {
      const { error } = await supabase.from("tenants").delete().eq("id", tenantId);

      if (error) throw error;

      // Log audit for tenant deletion
      logAudit.mutate({
        action: "delete",
        tableName: "tenants",
        recordId: tenantId,
        recordName: tenantName,
      });
    },
    onSuccess: () => {
      // Immediate refetch for faster UX
      queryClient.invalidateQueries({ queryKey: ["rooms"], refetchType: 'active' });
    },
  });

  const resetRentCycle = useMutation({
    mutationFn: async () => {
      if (!currentPG?.id) return;

      const { data: roomIdsData, error: roomIdsError } = await supabase
        .from("rooms")
        .select("id")
        .eq("pg_id", currentPG.id);

      if (roomIdsError) throw roomIdsError;

      const roomIds = (roomIdsData || []).map(r => r.id);
      if (roomIds.length === 0) return;

      const { error } = await supabase
        .from("tenants")
        .update({ payment_status: "Pending" })
        .in("room_id", roomIds);

      if (error) throw error;
    },
    onSuccess: () => {
      // Immediate refetch for faster UX
      queryClient.invalidateQueries({ queryKey: ["rooms"], refetchType: 'active' });
    },
  });

  return {
    rooms,
    isLoading: isLoading || authLoading,
    updateRoom,
    addTenant,
    updateTenant,
    removeTenant,
    resetRentCycle,
  };
};
