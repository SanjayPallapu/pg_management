import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/proxyClient';
import { useAuth } from './useAuth';
import { usePG } from '@/contexts/PGContext';
import { toast } from 'sonner';

export const useSubscription = () => {
  const { user } = useAuth();
  const { subscription, refreshSubscription } = usePG();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const createPaymentRequest = useMutation({
    mutationFn: async ({
      amount,
      paymentMethod,
      screenshotUrl,
    }: {
      amount: number;
      paymentMethod: string;
      screenshotUrl?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('payment_requests')
        .insert({
          user_id: user.id,
          amount,
          payment_method: paymentMethod,
          screenshot_url: screenshotUrl,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Update subscription status to pending
      await supabase
        .from('subscriptions')
        .update({
          status: 'pending',
          payment_requested_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return data;
    },
    onSuccess: () => {
      refreshSubscription();
      queryClient.invalidateQueries({ queryKey: ['payment-requests'] });
      toast.success('Payment request submitted! We will review and activate your Pro plan soon.');
    },
    onError: (error) => {
      console.error('Error creating payment request:', error);
      toast.error('Failed to submit payment request');
    },
  });

  const uploadPaymentScreenshot = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Error uploading screenshot:', err);
      toast.error('Failed to upload screenshot');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Admin functions
  const approvePaymentRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('User not authenticated');

      // Get the payment request
      const { data: request, error: fetchError } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Update payment request status
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Activate user's subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          plan: 'pro',
          status: 'active',
          max_pgs: -1,
          max_tenants_per_pg: -1,
          features: {
            auto_reminders: true,
            daily_reports: true,
            ai_logo: true,
          },
          payment_approved_at: new Date().toISOString(),
          approved_by: user.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .eq('user_id', request.user_id);

      if (subError) throw subError;

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-requests'] });
      toast.success('Subscription activated!');
    },
    onError: (error) => {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment');
    },
  });

  const rejectPaymentRequest = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: request, error: fetchError } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Reset subscription status
      await supabase
        .from('subscriptions')
        .update({
          status: 'free',
        })
        .eq('user_id', request.user_id);

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-requests'] });
      toast.success('Payment request rejected');
    },
    onError: (error) => {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    },
  });

  return {
    subscription,
    createPaymentRequest,
    uploadPaymentScreenshot,
    isUploading,
    approvePaymentRequest,
    rejectPaymentRequest,
    isPending: subscription?.status === 'pending',
    isActive: subscription?.status === 'active',
    isPro: subscription?.plan === 'pro' && subscription?.status === 'active',
  };
};
