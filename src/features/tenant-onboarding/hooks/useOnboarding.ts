import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as typedSupabase } from "@/integrations/supabase/proxyClient";
// Onboarding tables live outside the generated types; use an untyped client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = typedSupabase as any;
import { usePG } from "@/contexts/PGContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type {
  OnboardingProfile,
  OnboardingLink,
  OnboardingTimelineEvent,
  OnboardingNotification,
  OnboardingStatus,
  VerificationStatus,
} from "../types";

// ============================================================================
// Hook: useOnboardingProfiles
// Fetches all onboarding profiles for the current PG.
// Used to determine Profile Complete badge status across all views.
// ============================================================================
export const useOnboardingProfiles = () => {
  const { currentPG } = usePG();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["onboarding-profiles", currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from("tenant_onboarding_profiles")
        .select("*")
        .eq("pg_id", currentPG.id)
        .eq("owner_id", user.id);

      if (error) {
        console.error("[Onboarding] Failed to fetch profiles", error);
        return [];
      }

      return (data || []) as OnboardingProfile[];
    },
    enabled: !!currentPG?.id && !!user?.id,
    staleTime: 30 * 1000, // 30 seconds - keep fresh for badge updates
  });
};

// ============================================================================
// Hook: useOnboardingProfile
// Fetches a single onboarding profile for a specific tenant.
// ============================================================================
export const useOnboardingProfile = (tenantId: string | null) => {
  return useQuery({
    queryKey: ["onboarding-profile", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("tenant_onboarding_profiles")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) {
        console.error("[Onboarding] Failed to fetch profile", error);
        return null;
      }

      return (data as OnboardingProfile) || null;
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });
};

// ============================================================================
// Hook: useOnboardingProfileMap
// Returns a Map of tenant_id -> OnboardingProfile for quick badge lookups.
// This is the primary hook for badge rendering across all views.
// ============================================================================
export const useOnboardingProfileMap = () => {
  const { data: profiles = [] } = useOnboardingProfiles();

  const profileMap = new Map<string, OnboardingProfile>();
  profiles.forEach((p) => {
    profileMap.set(p.tenant_id, p);
  });

  return profileMap;
};

// ============================================================================
// Hook: useGenerateOnboardingLink
// Generates a secure onboarding link for a tenant.
// ============================================================================
export const useGenerateOnboardingLink = () => {
  const queryClient = useQueryClient();
  const { currentPG } = usePG();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      tenantId,
      tenantName,
      sentVia = "whatsapp",
    }: {
      tenantId: string;
      tenantName: string;
      sentVia?: string;
    }) => {
      if (!currentPG?.id || !user?.id) {
        throw new Error("Missing PG or user context");
      }

      const { data, error } = await supabase.rpc("generate_onboarding_link", {
        p_tenant_id: tenantId,
        p_pg_id: currentPG.id,
        p_owner_id: user.id,
        p_sent_via: sentVia,
      });

      if (error) throw error;

      // Add timeline event for tenant_added if first time
      try {
        const { error: timelineError } = await supabase.from("tenant_onboarding_timeline").insert({
          tenant_id: tenantId,
          pg_id: currentPG.id,
          event_type: "tenant_added",
          event_description: `Tenant ${tenantName} added to the system`,
        });

        if (timelineError) {
          console.warn("[Onboarding] Timeline insert failed (non-critical)", timelineError);
        }
      } catch (e) {
        console.warn("[Onboarding] Timeline insert failed (non-critical)", e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-link"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-timeline"] });
      toast.success("Onboarding link generated successfully");
    },
    onError: (error) => {
      console.error("[Onboarding] Failed to generate link", error);
      toast.error("Failed to generate onboarding link");
    },
  });
};

// ============================================================================
// Hook: useOnboardingLink
// Fetches the onboarding link for a specific tenant.
// ============================================================================
export const useOnboardingLink = (tenantId: string | null) => {
  return useQuery({
    queryKey: ["onboarding-link", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("tenant_onboarding_links")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[Onboarding] Failed to fetch link", error);
        return null;
      }

      return (data as OnboardingLink) || null;
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });
};

// ============================================================================
// Hook: useOnboardingTimeline
// Fetches the complete activity timeline for a tenant.
// ============================================================================
export const useOnboardingTimeline = (tenantId: string | null) => {
  return useQuery({
    queryKey: ["onboarding-timeline", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_onboarding_timeline")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Onboarding] Failed to fetch timeline", error);
        return [];
      }

      return (data || []) as OnboardingTimelineEvent[];
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });
};

// ============================================================================
// Hook: useOnboardingDocuments
// Fetches documents uploaded by a tenant during onboarding.
// ============================================================================
export const useOnboardingDocuments = (tenantId: string | null) => {
  return useQuery({
    queryKey: ["onboarding-documents", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_onboarding_documents")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("[Onboarding] Failed to fetch documents", error);
        return [];
      }

      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });
};

// ============================================================================
// Hook: useVerifyOnboarding
// Owner verifies or rejects tenant onboarding.
// ============================================================================
export const useVerifyOnboarding = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      tenantId,
      action,
      rejectionReason,
    }: {
      tenantId: string;
      action: "approve" | "reject" | "request_reupload";
      rejectionReason?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("verify_tenant_onboarding", {
        p_tenant_id: tenantId,
        p_action: action,
        p_rejection_reason: rejectionReason || null,
        p_verifier_id: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-profile", variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-timeline", variables.tenantId] });

      const actionLabels = {
        approve: "Tenant verified successfully",
        reject: "Tenant onboarding rejected",
        request_reupload: "Document re-upload requested",
      };
      toast.success(actionLabels[variables.action]);
    },
    onError: (error) => {
      console.error("[Onboarding] Verification failed", error);
      toast.error("Verification action failed");
    },
  });
};

// ============================================================================
// Hook: useOnboardingNotifications
// Fetches onboarding notifications for the owner.
// ============================================================================
export const useOnboardingNotifications = () => {
  const { currentPG } = usePG();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["onboarding-notifications", currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from("tenant_onboarding_notifications")
        .select("*")
        .eq("pg_id", currentPG.id)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[Onboarding] Failed to fetch notifications", error);
        return [];
      }

      return (data || []) as OnboardingNotification[];
    },
    enabled: !!currentPG?.id && !!user?.id,
    staleTime: 30 * 1000,
  });
};

// ============================================================================
// Hook: useMarkNotificationRead
// Marks an onboarding notification as read.
// ============================================================================
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("tenant_onboarding_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-notifications"] });
    },
  });
};

// ============================================================================
// Hook: useUploadOnboardingDocument
// Uploads a document file to Supabase Storage and creates a record.
// ============================================================================
export const useUploadOnboardingDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      tenantId,
      profileId,
      documentType,
    }: {
      file: File;
      tenantId: string;
      profileId: string;
      documentType: string;
    }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${tenantId}/${documentType}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("tenant-onboarding-docs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("tenant-onboarding-docs")
        .getPublicUrl(uploadData.path);

      const { data, error } = await supabase
        .from("tenant_onboarding_documents")
        .insert({
          onboarding_profile_id: profileId,
          tenant_id: tenantId,
          document_type: documentType,
          document_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-documents"] });
    },
    onError: (error) => {
      console.error("[Onboarding] Document upload failed", error);
      toast.error("Failed to upload document");
    },
  });
};
