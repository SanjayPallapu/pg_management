/**
 * Format tenant display name cleanly by removing room annotations (e.g. "Sona @202" -> "Sona")
 */
export const formatCleanTenantName = (name: string | undefined | null): string => {
  if (!name) return "";
  // Strip trailing "@..." or "@<roomNo>" (e.g. "Sona @202" -> "Sona")
  return name.replace(/\s*@\s*\d+.*$/i, "").trim();
};

/**
 * Adds a display-only clean name without merging records or changing source data.
 *
 * A phone number or name is not a safe tenant identity: family members can share
 * a phone number and different people can have the same name. Tenant lifecycle
 * and room transfers must therefore be determined only by the record ID and the
 * persisted room_id/end_date fields.
 */
export const prepareTenantsForDisplay = <
  T extends { name: string | null | undefined },
>(
  tenants: readonly T[],
): Array<T & { cleanName: string }> =>
  tenants.map((tenant) => ({
    ...tenant,
    cleanName: formatCleanTenantName(tenant.name),
  }));
