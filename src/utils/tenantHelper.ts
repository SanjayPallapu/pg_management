/**
 * Format tenant display name cleanly by removing room annotations (e.g. "Sona @202" -> "Sona")
 */
export const formatCleanTenantName = (name: string | undefined | null): string => {
  if (!name) return "";
  // Strip trailing "@..." or "@<roomNo>" (e.g. "Sona @202" -> "Sona")
  return name.replace(/\s*@\s*\d+.*$/i, "").trim();
};
