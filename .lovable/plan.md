## Overview
Five connected upgrades shipped together: a new bills & budget dashboard replacing the old Balance/Enquiry section, a quick room-grid nav on the Rent tab, split UPI + Cash payments (with template updates), a tenant snooze ("will pay in X days") for the pending picker, and AC room electricity billing flowing into reminders and receipts.

---

## 1. Bills & Expense Tracking Dashboard (replaces Balance & Enquiry)

**Remove**: existing Balance Overview, Today's Spending, PG Expenses cards on the Dashboard (the section in screenshot 1) and the Enquiry section.

**Add a new "Bills & Budget" dashboard** with month picker at top:

- **Monthly Budget card** — user sets a budget amount (e.g. ₹80,000), stored per month. Shows:
  - Progress bar: spent vs budget
  - % used + remaining ₹
  - Color shifts green → amber → red as it crosses 70% / 100%
- **Category Bills cards** (each editable, with add-entry button):
  - Current Bills (by floor / unit — entries tagged with floor + room)
  - Utility Bills — Water, Gas, Groceries, Milk (recurring presets)
  - Other Bills — free-form misc entries
  - Family Expenses
  - Each card shows: category total, expandable list of entries (date, label, ₹, note), edit/delete per entry
- **Grand Total** strip — sum across all categories for the month

**Storage**: new `expense_entries` table `{id, pg_id, month, year, category, subcategory, label, amount, entry_date, floor, room_id, notes}` and `monthly_budgets` table `{pg_id, month, year, amount}`. RLS scoped via `pgs.owner_id = auth.uid()`.

---

## 2. Rent tab: Room-number quick grid

**Remove** the "₹0 Collected (0 tenants)" and "₹322,800 Pending (65 tenants)" summary cards above the Rent Sheet.

**Add a new "Rooms" quick-nav card** above the search bar:
- All room numbers rendered as compact pill buttons in a wrap grid (101, 102, 103, 201, …)
- Color coding matches existing room status (green=paid, orange=partial, red=overdue, light-blue=not yet due)
- Tap a room number → scrolls to / opens that room's tenant card in the Rent Sheet (smooth scroll + brief highlight)
- Sorted by floor then room number

---

## 3. Split payment (UPI + Cash in one transaction)

In the **Enter Payment Amount** dialog (`PaymentAmountDialog.tsx`):
- Replace the single "Payment Mode" segmented control with a **"Split Payment" toggle**:
  - **Off** (default): current behavior — one mode (UPI or Cash) for the full amount
  - **On**: two inputs side by side — "UPI ₹___" and "Cash ₹___"; live sum validation against the entered amount; "Confirm" disabled until sum matches
- On confirm with split, write **two `PaymentEntry` rows** in `payment_entries` JSONB (same date, same collectedBy, modes `upi` and `cash`).
- **Receipt template** (`ReceiptTemplate.tsx`) and **WhatsApp success template**: when entries include both modes, show a "Payment Breakdown" row with `UPI ₹X + Cash ₹Y` instead of a single mode line.
- **Reminder template**: unchanged (sent before payment).

---

## 4. Snooze pending tenants ("will pay in X days")

In the **Select Pending Tenants** sheet:
- Add a **"Snooze" action** for selected tenants — opens a small popover with date picker ("Will pay by")
- Snoozed tenants are **hidden from the Overdue/Not-Yet-Due picker tabs** until the snooze date passes (auto-expires)
- They **remain visible in the main Rent Sheet** with a small badge `Promised by DD MMM`
- Add a **"Snoozed (N)"** third tab in the picker to view + modify snoozed list (extend / remove snooze)

**Storage**: new `tenant_snoozes` table `{id, tenant_id, snoozed_until, reason, created_at}` with RLS via tenant → room → pg ownership chain. Active snooze = the row with max `snoozed_until > today`.

---

## 5. AC rooms — electricity bill in rent

**Rooms section**:
- Add an **"AC Room" toggle** when adding/editing a room (`RoomEditDialog`, `AddRoomsDialog`). Schema: `rooms.is_ac boolean default false`.
- Settings: add a **PG-level "Electricity unit price"** setting (₹ per unit).

**Each month, for AC rooms**:
- New input on the room/tenant row in Rent Sheet: **"Units used (this month)"** → stored per room per month.
- Auto-calc: `extra_per_tenant = round(units × unit_price ÷ active_tenants_in_room)`
- This extra is **added on top of monthly rent** in:
  - Pending amount shown in pending picker
  - **Payment Reminder template** — adds a "Current Bill: X units × ₹Y = ₹Z (your share: ₹W)" line
  - **Payment Success / Receipt template** — itemized: "Rent ₹A + Electricity ₹W = ₹Total"
- Non-AC rooms are unaffected.

**Storage**: new `room_electricity_readings` table `{id, room_id, month, year, units, unit_price_snapshot, created_at}` and a `pg_settings.electricity_unit_price` value (extend existing settings or add a tiny `pg_settings` JSON column on `pgs`).

---

## Technical notes

- **Migrations**: 3 new tables (`expense_entries`, `monthly_budgets`, `tenant_snoozes`, `room_electricity_readings`), 2 column additions (`rooms.is_ac`, `pgs.electricity_unit_price`). All with GRANTs + RLS via `pgs.owner_id = auth.uid()` ownership chain.
- **Hooks**: `useExpenseEntries`, `useMonthlyBudget`, `useTenantSnoozes`, `useElectricityReadings`, `useACSurcharge(tenantId, month, year)` helper.
- **Single source of truth**: `useTotalCollected` stays unchanged. AC surcharge is added at display time on top of `monthly_rent`, not stored on `tenant_payments.amount` (keeps reporting clean).
- **Templates**: update `ReceiptTemplate.tsx`, `PaymentReminderTemplate.tsx`, `WhatsAppReceiptDialog` flow to render split payments and AC line items conditionally.
- **Date handling**: all month/date logic via `src/utils/dateOnly.ts`.
- **Memory updates**: add Core rules for AC surcharge formula, snooze visibility scope, split payment storage pattern.

---

## File touchpoints (high level)
```text
DB migrations              4 new
src/components/Dashboard.tsx                       — remove old cards, mount new BillsBudgetDashboard
src/components/BillsBudgetDashboard.tsx            — NEW
src/components/budget/*                            — NEW (CategoryCard, EntryDialog, BudgetCard)
src/components/MonthlyRentSheet.tsx                — remove summary cards, add RoomQuickNav
src/components/RoomQuickNav.tsx                    — NEW
src/components/payment/PaymentAmountDialog.tsx     — split UPI+Cash UI
src/components/ReceiptTemplate.tsx                 — split breakdown + AC line
src/components/PaymentReminderTemplate.tsx         — AC line + share-of-bill
src/components/BulkReminderDialog.tsx              — Snooze action + Snoozed tab
src/components/RoomEditDialog.tsx, AddRoomsDialog  — AC toggle
src/components/SettingsDialog (or new)             — Electricity unit price
src/hooks/useExpenseEntries.ts, useMonthlyBudget.ts, useTenantSnoozes.ts,
    useElectricityReadings.ts, useACSurcharge.ts   — NEW
src/utils/templateHelpers.ts                       — buildPaymentLines() with AC + split
```
