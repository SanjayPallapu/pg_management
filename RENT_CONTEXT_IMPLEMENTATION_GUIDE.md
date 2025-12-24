# Complete RentContext Implementation Guide

## Overview
This guide provides step-by-step instructions to implement the RentContext for month-scoped rent management with automatic synchronization across all views (Rooms tab, Tenant card, Rent Sheet, Dashboard, and Reports).

## Files Already Created
1. `src/contexts/RentContext.tsx` - Core context with togglePaid, rentRecords, and month-scoped data

## Step 1: Update Index.tsx (src/pages/Index.tsx)

Add the import at the top:
```typescript
import { RentProvider } from '@/contexts/RentContext';
```

Wrap the main return JSX with RentProvider. Around line 48-106, modify:

From:
```typescript
return (
  <div className="min-h-screen bg-background ...">
    {/* ... JSX content ... */}
  </div>
);
```

To:
```typescript
return (
  <RentProvider selectedMonth={selectedMonth} selectedYear={selectedYear}>
    <div className="min-h-screen bg-background ...">
      {/* ... JSX content ... */}
    </div>
  </RentProvider>
);
```

## Step 2: Update MonthlyRentSheet.tsx (src/components/MonthlyRentSheet.tsx)

Add import:
```typescript
import { useRent } from '@/contexts/RentContext';
```

Inside component, replace the useTenantPayments hook call with:
```typescript
const { rentRecords, togglePaid, selectedMonth, selectedYear } = useRent();
const { selectedMonth: contextMonth, selectedYear: contextYear } = useMonthContext();
```

Update the payment status check from:
```typescript
if (payment?.paymentStatus === 'Paid')
```
To:
```typescript
const paymentRecord = rentRecords.find(r => r.tenantId === tenant.id);
if (paymentRecord?.paymentStatus === 'Paid')
```

Update the toggle callback:
```typescript
const handleTogglePayment = async (tenantId: string) => {
  await togglePaid(tenantId);
};
```

## Step 3: Update RoomCard.tsx (src/components/RoomCard.tsx)

Add import:
```typescript
import { useRent } from '@/contexts/RentContext';
```

Inside component:
```typescript
const { rentRecords, togglePaid, getPaymentStatus } = useRent();
const { selectedMonth, selectedYear } = useMonthContext();

// Get payment status for this tenant
const isPaid = getPaymentStatus(room.tenants[0]?.id) === 'Paid';

// Update toggle handler
const handleTogglePaid = async () => {
  if (room.tenants[0]) {
    await togglePaid(room.tenants[0].id, room.id);
  }
};
```

## Step 4: Update Dashboard.tsx (src/components/Dashboard.tsx)

Add import:
```typescript
import { useRent } from '@/contexts/RentContext';
```

Replace the rent calculation logic (lines 32-42) with:
```typescript
const { getTotalCollected, getTotalPending } = useRent();

const rentCollected = getTotalCollected();
const pendingRent = getTotalPending();
```

This automatically computes values based on the month-scoped rentRecords.

## Step 5: Update Reports.tsx (src/components/Reports.tsx)

Add import:
```typescript
import { useRent } from '@/contexts/RentContext';
```

Inside component:
```typescript
const { rentRecords, selectedMonth, selectedYear } = useRent();
const { selectedMonth: contextMonth, selectedYear: contextYear } = useMonthContext();

// Use rentRecords for all report calculations
// Reports now automatically reflect only the selected month's data
```

Update any report data generation to use `rentRecords` instead of fetching all payments:
```typescript
// Instead of:
const allPayments = await fetchAllPayments();

// Use:
const monthlyReport = rentRecords.map(record => ({
  tenantId: record.tenantId,
  amount: record.amount,
  status: record.paymentStatus,
  date: record.paymentDate,
}));
```

## Step 6: Update TenantManagement.tsx (src/components/TenantManagement.tsx)

Add import:
```typescript
import { useRent } from '@/contexts/RentContext';
```

Update the tenant card to show payment status from RentContext:
```typescript
const { getPaymentStatus, togglePaid } = useRent();

// In the card JSX, display payment status:
const paymentStatus = getPaymentStatus(tenant.id);

// Add toggle button:
<button onClick={() => togglePaid(tenant.id)}>
  {paymentStatus === 'Paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
</button>
```

## Step 7: Verify MonthContext Integration

Ensure that MonthYearPicker.tsx (src/components/MonthYearPicker.tsx) properly sets selectedMonth and selectedYear in MonthContext, as this is read by RentProvider.

## How It Works

### Data Flow:
1. User changes month in MonthYearPicker → MonthContext updated
2. MonthContext passes selectedMonth/selectedYear to RentProvider via Index.tsx props
3. RentProvider fetches `tenant_payments` for that month from Supabase
4. All components (`useRent()`) get rentRecords scoped to that month
5. When user toggles Paid/Not Paid:
   - Local state updates optimistically (instant UI feedback)
   - Supabase updates in background
   - All subscribed components re-render automatically
   - Dashboard totals recalculate via getTotalCollected() and getTotalPending()
   - Reports regenerate with new data

### Key Benefits:
- **Single Source of Truth**: All rent data comes from RentContext
- **Month-Scoped**: Only current month's data is loaded and shown
- **Real-time Sync**: Changing status in one place updates everywhere
- **Automatic Computation**: Dashboard and Reports auto-calculate from rentRecords
- **Optimistic Updates**: UI responds instantly while data persists in background

## Testing Checklist

- [ ] Change month → Rent Sheet updates with new month's data
- [ ] Toggle Paid in Rent Sheet → Dashboard totals update instantly
- [ ] Toggle Paid in Room Card → Rent Sheet reflects change
- [ ] Toggle Paid in Tenant card → All views update
- [ ] Switch to Reports tab → Shows only selected month's data
- [ ] Change month again → Reports regenerate with new month data
- [ ] Refresh page → Data persists from Supabase
- [ ] Multiple month cycles → Each month maintains separate data

## Troubleshooting

If totals don't update:
- Verify RentProvider wraps the entire component tree in Index.tsx
- Check that components import `useRent` from the correct path
- Ensure Supabase has tenant_payments table with month/year columns

If month changes don't reflect:
- Check MonthContext is properly updating selectedMonth/selectedYear
- Verify RentProvider receives correct props from Index.tsx
- Check browser console for any fetch errors
