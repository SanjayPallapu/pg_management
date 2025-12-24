import { supabase } from '@/integrations/supabase/client';

/**
 * Backfills payment records for all existing tenants
 * - First month (from startDate): "Paid" with paymentDate = startDate
 * - Subsequent months up to current: "Pending"
 */
export const backfillTenantPayments = async () => {
  try {
    // Fetch all tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*');

    if (tenantsError) throw tenantsError;
    if (!tenants || tenants.length === 0) {
      return { success: true, message: 'No tenants to process', processed: 0 };
    }

    const currentDate = new Date();
    const paymentsToInsert = [];

    for (const tenant of tenants) {
      const startDate = new Date(tenant.start_date);
      const joinMonth = startDate.getMonth() + 1;
      const joinYear = startDate.getFullYear();

      // Generate payments from join date to current month
      let currentMonth = joinMonth;
      let currentYear = joinYear;

      while (
        currentYear < currentDate.getFullYear() ||
        (currentYear === currentDate.getFullYear() && currentMonth <= currentDate.getMonth() + 1)
      ) {
        const isFirstMonth = currentMonth === joinMonth && currentYear === joinYear;

        paymentsToInsert.push({
          tenant_id: tenant.id,
          month: currentMonth,
          year: currentYear,
          payment_status: isFirstMonth ? 'Paid' : 'Pending',
          payment_date: isFirstMonth ? tenant.start_date : null,
          amount: tenant.monthly_rent,
        });

        // Move to next month
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
    }

    if (paymentsToInsert.length === 0) {
      return { success: true, message: 'No payments to create', processed: 0 };
    }

    // Insert all payments (upsert to avoid duplicates)
    const { error: insertError } = await supabase
      .from('tenant_payments')
      .upsert(paymentsToInsert, {
        onConflict: 'tenant_id,month,year',
        ignoreDuplicates: false,
      });

    if (insertError) throw insertError;

    return {
      success: true,
      message: `Successfully created ${paymentsToInsert.length} payment records for ${tenants.length} tenants`,
      processed: paymentsToInsert.length,
    };
  } catch (error) {
    console.error('Error backfilling payments:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      processed: 0,
    };
  }
};
