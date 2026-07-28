import { describe, expect, it } from "vitest";
import {
  formatCleanTenantName,
  prepareTenantsForDisplay,
} from "./tenantHelper";

describe("tenant display preparation", () => {
  it("cleans legacy room annotations without changing the stored name", () => {
    const source = { id: "tenant-1", name: "Sona @202" };

    const [prepared] = prepareTenantsForDisplay([source]);

    expect(prepared.cleanName).toBe("Sona");
    expect(prepared.name).toBe("Sona @202");
    expect(source).toEqual({ id: "tenant-1", name: "Sona @202" });
  });

  it("preserves distinct active tenants that share a phone number or name", () => {
    const tenants = [
      {
        id: "tenant-1",
        name: "Ravi",
        phone: "9876543210",
        room_id: "room-101",
        start_date: "2026-07-01",
        end_date: null,
      },
      {
        id: "tenant-2",
        name: "Ravi",
        phone: "9876543210",
        room_id: "room-102",
        start_date: "2026-07-15",
        end_date: null,
      },
    ];

    const prepared = prepareTenantsForDisplay(tenants);

    expect(prepared).toHaveLength(2);
    expect(prepared.map((tenant) => tenant.id)).toEqual([
      "tenant-1",
      "tenant-2",
    ]);
    expect(prepared.every((tenant) => tenant.end_date === null)).toBe(true);
    expect(tenants.every((tenant) => tenant.end_date === null)).toBe(true);
  });

  it("handles missing names safely", () => {
    expect(formatCleanTenantName(null)).toBe("");
    expect(formatCleanTenantName(undefined)).toBe("");
  });
});
