import { supabase as typedSupabase } from "@/integrations/supabase/proxyClient";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = typedSupabase as any;

/**
 * Resolves a storage path or full URL for tenant onboarding documents into a valid, viewable URL.
 * Handles relative paths, bucket prefixes, full URLs, duplicate bucket segments, and auto-bucket creation.
 */
export async function resolveOnboardingDocumentUrl(rawPath: string | null | undefined): Promise<string | null> {
  if (!rawPath || rawPath === "null" || rawPath === "undefined") return null;

  let path = String(rawPath).trim();
  if (!path) return null;

  // Deduplicate repeated bucket names if present
  path = path.replace(/(tenant-onboarding-docs\/)+/g, "tenant-onboarding-docs/");

  // Extract relative storage path inside tenant-onboarding-docs bucket
  const cleanPath = path
    .replace(/^https?:\/\/[^\/]+\/storage\/v1\/object\/(?:public|sign)\/tenant-onboarding-docs\//, "")
    .replace(/^\/?tenant-onboarding-docs\//, "")
    .replace(/^\/+/, "");

  if (!cleanPath) return null;

  try {
    // 1. Try createSignedUrl first
    const { data: signedData, error: signedErr } = await supabase.storage
      .from("tenant-onboarding-docs")
      .createSignedUrl(cleanPath, 3600);

    if (!signedErr && signedData?.signedUrl) {
      return signedData.signedUrl;
    }

    // If bucket was missing in Storage API memory cache, attempt auto-creating bucket
    if (signedErr && (signedErr.message?.includes("not found") || String((signedErr as any).statusCode) === "404")) {
      try {
        await supabase.storage.createBucket("tenant-onboarding-docs", { public: true });
        const { data: retrySigned } = await supabase.storage
          .from("tenant-onboarding-docs")
          .createSignedUrl(cleanPath, 3600);
        if (retrySigned?.signedUrl) return retrySigned.signedUrl;
      } catch (bucketErr) {
        console.warn("[Onboarding] createBucket fallback error", bucketErr);
      }
    }
  } catch (err) {
    console.warn("[Onboarding] createSignedUrl exception", err);
  }

  try {
    // 2. Fallback to getPublicUrl
    const { data: pubData } = supabase.storage
      .from("tenant-onboarding-docs")
      .getPublicUrl(cleanPath);

    if (pubData?.publicUrl) {
      return pubData.publicUrl;
    }
  } catch (err) {
    console.warn("[Onboarding] getPublicUrl exception", err);
  }

  // 3. Fallback: if rawPath was an http(s) URL, return rawPath directly
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return null;
}
