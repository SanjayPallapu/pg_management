import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Room, Tenant } from "@/types";
import { useAuth } from "./useAuth";
import { useAuditLog } from "./useAuditLog";

export const useRooms = () => {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { logAudit } = useAuditLog();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooms", isAdmin],
    queryFn: async () => {
      // Fetch rooms and tenants in parallel for better performance
      const [roomsResult, tenantsResult] = await Promise.all([
        supabase.from("rooms").select("*").order("room_no"),
        supabase.from("tenants").select("*"),
      ]);

      if (roomsResult.error) throw roomsResult.error;
      if (tenantsResult.error) throw tenantsResult.error;

      const roomsData = roomsResult.data;
      const tenantsData = tenantsResult.data;

      // Group tenants by room_id for O(1) lookup instead of O(n) filter per room
      const tenantsByRoom = tenantsData.reduce(
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
          // Mask phone number for staff users
          phone: isAdmin ? tenant.phone : "••••••••••",
          startDate: tenant.start_date,
          endDate: tenant.end_date || undefined,
          monthlyRent: tenant.monthly_rent,
          paymentStatus: tenant.payment_status as "Paid" | "Pending",
          paymentDate: tenant.payment_date || undefined,
          // Hide security deposit info from staff
          securityDepositAmount: isAdmin ? tenant.security_deposit_amount : null,
          securityDepositDate: isAdmin ? tenant.security_deposit_date : null,
          securityDepositMode: isAdmin ? tenant.security_deposit_mode : null,
          isLocked: (tenant as any).is_locked || false,
        })),
      })) as Room[];
    },
    enabled: !authLoading,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes (reduced for fresher data)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const updateRoom = useMutation({
    mutationFn: async (room: Room) => {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("id")
        .eq("room_no", room.roomNo)
        .single();

      if (roomError) throw roomError;

      const { error: updateError } = await supabase
        .from("rooms")
        .update({
          status: room.status,
          capacity: room.capacity,
          rent_amount: room.rentAmount,
          notes: room.notes,
        })
        .eq("id", roomData.id);

      if (updateError) throw updateError;

      return room;
    },
    onMutate: async (newRoom) => {
      await queryClient.cancelQueries({ queryKey: ["rooms"] });
      const previousRooms = queryClient.getQueryData(["rooms", isAdmin]);
      queryClient.setQueryData(["rooms", isAdmin], (old: Room[] | undefined) => {
        if (!old) return old;
        return old.map((room) => (room.roomNo === newRoom.roomNo ? newRoom : room));
      });
      return { previousRooms };
    },
    onError: (_err, _newRoom, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(["rooms", isAdmin], context.previousRooms);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const addTenant = useMutation({
    mutationFn: async ({ roomNo, tenant }: { roomNo: string; tenant: Omit<Tenant, "id"> }) => {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("id")
        .eq("room_no", roomNo)
        .single();

      if (roomError) throw roomError;

      const { data: tenantData, error: insertError } = await supabase
        .from("tenants")
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

      // Log audit for tenant creation
      logAudit.mutate({
        action: "create",
        tableName: "tenants",
        recordId: tenantData.id,
        recordName: `${tenant.name} (Room ${roomNo})`,
        newData: { name: tenant.name, phone: tenant.phone, room: roomNo, rent: tenant.monthlyRent },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-payments"] });
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
      const previousRooms = queryClient.getQueryData(["rooms", isAdmin]);
      queryClient.setQueryData(["rooms", isAdmin], (old: Room[] | undefined) => {
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
        queryClient.setQueryData(["rooms", isAdmin], context.previousRooms);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
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
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const resetRentCycle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({ payment_status: "Pending" })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
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
