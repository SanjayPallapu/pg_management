import { useMemo } from 'react';
import { Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { Phone, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TenantSearchResultsProps {
  rooms: Room[];
  searchQuery: string;
}

export const TenantSearchResults = ({ rooms, searchQuery }: TenantSearchResultsProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const results: Array<{
      id: string;
      name: string;
      phone: string;
      roomNo: string;
      monthlyRent: number;
      startDate: string;
      paymentStatus: string;
      amountPaid: number;
    }> = [];

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) {
          return;
        }

        if (tenant.name.toLowerCase().includes(query)) {
          const payment = payments.find(p => 
            p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
          );

          results.push({
            id: tenant.id,
            name: tenant.name,
            phone: tenant.phone,
            roomNo: room.roomNo,
            monthlyRent: tenant.monthlyRent,
            startDate: tenant.startDate,
            paymentStatus: payment?.paymentStatus || 'Pending',
            amountPaid: payment?.amountPaid || 0
          });
        }
      });
    });

    return results;
  }, [rooms, searchQuery, selectedMonth, selectedYear, payments]);

  if (!searchQuery.trim()) return null;

  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-2 mb-6">
      <p className="text-sm text-muted-foreground">
        Found {searchResults.length} tenant(s) matching "{searchQuery}"
      </p>
      {searchResults.map(tenant => {
        const isPaid = tenant.paymentStatus === 'Paid';
        const isPartial = tenant.paymentStatus === 'Partial';
        const remaining = tenant.monthlyRent - tenant.amountPaid;
        const bgClass = isPaid 
          ? 'bg-paid-muted border-l-4 border-paid' 
          : isPartial 
            ? 'bg-partial-muted border-l-4 border-partial'
            : 'bg-pending-muted border-l-4 border-pending';

        return (
          <div key={tenant.id} className={`p-4 rounded-xl ${bgClass}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{tenant.name}</span>
                {tenant.phone && tenant.phone !== '••••••••••' && (
                  <>
                    <a 
                      href={`tel:${tenant.phone}`}
                      className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <a
                      href={`https://wa.me/91${tenant.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </>
                )}
              </div>
              <span className={`font-bold text-lg ${isPaid ? 'text-paid' : 'text-pending'}`}>
                ₹{(isPaid ? tenant.amountPaid : remaining).toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Room {tenant.roomNo} • Joined: {format(new Date(tenant.startDate), 'dd MMM yyyy')}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isPaid 
                  ? 'bg-paid text-paid-foreground' 
                  : isPartial 
                    ? 'bg-partial text-partial-foreground'
                    : 'bg-pending text-pending-foreground'
              }`}>
                {isPaid ? 'Paid' : isPartial ? `Partial (₹${tenant.amountPaid.toLocaleString()} paid)` : 'Pending'}
              </span>
              <span className="text-xs text-muted-foreground">
                {monthsShort[selectedMonth - 1]} {selectedYear}
              </span>
            </div>
          </div>
        );
      })}

      {searchResults.length === 0 && (
        <div className="text-center text-muted-foreground py-4">
          No tenants found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
};
