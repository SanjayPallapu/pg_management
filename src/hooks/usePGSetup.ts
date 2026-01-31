import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { PGBrandingData } from '@/types/pg';
import { getPricePerBed } from '@/constants/pricing';
import { toast } from 'sonner';

export const usePGSetup = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);

  const createPG = useMutation({
    mutationFn: async (pgData: PGBrandingData) => {
      if (!user) throw new Error('User not authenticated');

      // 1. Create the PG
      const { data: pg, error: pgError } = await supabase
        .from('pgs')
        .insert({
          owner_id: user.id,
          name: pgData.name,
          address: pgData.address,
          logo_url: pgData.logoUrl,
          floors: pgData.floors,
        })
        .select()
        .single();

      if (pgError) throw pgError;

      // 2. Create rooms for this PG
      const rooms = [];
      for (let floor = 1; floor <= pgData.floors; floor++) {
        for (let room = 1; room <= pgData.roomsPerFloor; room++) {
          const roomNo = `${floor}0${room.toString().padStart(1, '0')}`;
          // Default capacity based on common PG setup
          const capacity = 3; // Can be customized later
          rooms.push({
            pg_id: pg.id,
            property_id: pg.id, // For backward compatibility
            room_no: roomNo,
            floor: floor,
            capacity: capacity,
            rent_amount: getPricePerBed(capacity) * capacity,
            status: 'Vacant',
          });
        }
      }

      if (rooms.length > 0) {
        const { error: roomsError } = await supabase
          .from('rooms')
          .insert(rooms);

        if (roomsError) throw roomsError;
      }

      return pg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pgs'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('PG created successfully!');
    },
    onError: (error) => {
      console.error('Error creating PG:', error);
      toast.error('Failed to create PG');
    },
  });

  const generateAILogo = async (
    pgName: string,
    style: string,
    color: string
  ): Promise<string | null> => {
    setIsGeneratingLogo(true);
    try {
      // Call edge function to generate logo using Lovable AI
      const { data, error } = await supabase.functions.invoke('generate-pg-logo', {
        body: { pgName, style, color },
      });

      if (error) throw error;
      return data?.logoUrl || null;
    } catch (err) {
      console.error('Error generating logo:', err);
      toast.error('Failed to generate logo');
      return null;
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const uploadLogo = async (file: File, pgName: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${pgName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`;
      const filePath = `pg-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast.error('Failed to upload logo');
      return null;
    }
  };

  return {
    createPG,
    generateAILogo,
    uploadLogo,
    isGeneratingLogo,
  };
};
