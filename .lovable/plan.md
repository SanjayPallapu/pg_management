
## Scope

Three deliverables in one batch:

### A. Finish remaining backend-driven features

**3. Split Payment (UPI + Cash) in one transaction**
- Edit `src/components/payment/PaymentAmountDialog.tsx`: add a "Split (UPI + Cash)" toggle. When ON, replace the single amount input with two side-by-side inputs (UPI ₹, Cash ₹) showing the live sum. Replaces the UPI/Cash toggle in split mode.
- Update `usePaymentEntry` / call sites in `MonthlyRentSheet` to create **two** `tenant_payments` rows (one per mode) when split is used. Both rows share the same `payment_date` and `paid_by`.
- Receipt + WhatsApp templates (`ReceiptTemplate.tsx`) show a "Payment Breakdown" row: `UPI ₹X · Cash ₹Y` when both > 0.

**4. Snooze pending tenants**
- In `BulkReminderDialog.tsx` Payment Reminders tab, add a "Snooze selected" button next to "Send". Opens a date picker popover (presets: +3d, +7d, custom). Calls `useTenantSnoozes.snoozeTenants`.
- Filter `pendingTenants` to exclude tenants where `isSnoozed(id) === true`.
- In `MonthlyRentSheet`'s tenant cards, when snoozed show a small `Promised by DD MMM` chip + `X` to remove snooze (calls `removeSnooze`).

**5. AC rooms electricity bill + dedicated AC bill template**
- Add `is_ac` toggle to `RoomEditDialog.tsx` and `AddRoomsDialog.tsx`.
- Add `electricity_unit_price` field to PG Settings (BuildingRentSettingsDialog or new section in Settings).
- New `ACBillEntryDialog.tsx`: per AC room, per month, enter units used + auto-pick unit price → preview per-tenant share.
- New section in BillsBudgetDashboard "AC Electricity" listing AC rooms with their units / share / total.
- AC surcharge added to rent reminders + receipts (via existing `PaymentReminderTemplate` extra row "AC Bill (X units)").
- **NEW `ACBillTemplate.tsx`** — a dedicated WhatsApp-shareable image template (like reminder template) with: room number, units used, unit price, tenants list, per-head share. Triggered from the AC Bill row in BillsBudgetDashboard via a "Share to WhatsApp" button per room (generates image, opens wa.me with image-only — no text per memory rule).

### B. Bills & Budget UI overhaul

Completely rebuild `BillsBudgetDashboard.tsx` into two stacked sections matching reference screenshots:

**Top: Bills Management** (matches screenshot 2)
- Header: title + month picker
- Monthly Budget card (existing logic) with progress bar
- Grand Total card
- Section: **Current Bills** — pre-seeded entries per floor/motor (Ground/Motor/1st/2nd&3rd). Each row shows label + entry count + `+` button. Section header has a single ⚙️ settings icon (no pencil) opening a sheet with all entries, edit/delete inside it.
- Section: **Utility Bills** — preset cards (Water Tank, Gas Cylinder, Water Can, Milk & Curd, Rice Bags, Palm Oil, Chicken) each with `X/N entries · Total: ₹Y` and `+` to add quick entry.
- Section: **Other Bills** — empty state + `Add` button (renamed from "Add Entry").
- Section: **Family Expenses** — same structure with `Filter` + ⚙️ + `Add`.
- All cards: edit/delete moved INSIDE the settings sheet (not on outer cards). Delete = 1-step confirm via `AlertDialog`.
- New `BillsEntriesSheet.tsx` opens on settings click — lists entries for that subcategory with edit/delete inline.

**Bottom: Expense Analytics** (matches screenshot 1) — new file `BillsAnalytics.tsx`
- "Hostel Tenants" tenant-count card (saved per PG in a new `pgs.tenant_count_override` column OR derived from active tenants — use active tenant count by default with +/- override stored in localStorage per PG).
- 5 quick stat tiles: Groceries · Utility · Other · Family · Per Tenant.
- Per-Tenant Cost (6 months) — `recharts` AreaChart.
- Current Month Breakdown — Pie chart of category split.
- 6-Month Spending Trend — LineChart.
- Monthly Comparison — BarChart.

All charts use semantic tokens from `index.css` (hsl variables). Use `recharts` (already in deps).

### C. Android app (informational)
Provide a short response on the two paths (PWA install vs Capacitor native APK/Play Store) — no code changes unless the user picks Capacitor afterward. Project already has `capacitor.config.ts`; the path forward would be `npx cap add android && npx cap sync && npx cap open android`.

## Files Touched

- `src/components/payment/PaymentAmountDialog.tsx` — split mode UI
- `src/hooks/usePaymentEntry.ts` — handle 2-row insert
- `src/components/ReceiptTemplate.tsx` — payment breakdown row
- `src/components/BulkReminderDialog.tsx` — snooze button + filter
- `src/components/rent/TenantRentCard.tsx` — snooze badge
- `src/components/RoomEditDialog.tsx`, `AddRoomsDialog.tsx` — is_ac toggle
- `src/components/BuildingRentSettingsDialog.tsx` or new `ElectricityPriceDialog.tsx` — unit price
- new `src/components/ACBillEntryDialog.tsx`
- new `src/components/ACBillTemplate.tsx` — WhatsApp image template
- `src/components/PaymentReminderTemplate.tsx` — optional AC surcharge row
- `src/components/BillsBudgetDashboard.tsx` — full rewrite
- new `src/components/BillsEntriesSheet.tsx`
- new `src/components/BillsAnalytics.tsx`
- `src/components/Dashboard.tsx` — mount BillsAnalytics under BillsBudgetDashboard

No new DB migrations (tables/columns from prior turn cover it). Only adds `pgs.electricity_unit_price` if not already present — it was added last migration.

## Confirm before I build

This is ~10 file edits + 4 new files. Reply "go" and I'll ship in one pass; or pick a subset.
