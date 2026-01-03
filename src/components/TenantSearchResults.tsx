import { useMemo, useState } from 'react';
import { Room, PaymentEntry } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { Phone, MessageCircle, Receipt, Bell } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WhatsAppReceiptDialog } from './WhatsAppReceiptDialog';
import { PaymentReminderDialog } from './PaymentReminderDialog';

interface TenantSearchResultsProps {
  rooms: Room[];
  searchQuery: string;
}

export const TenantSearchResults = ({ rooms, searchQuery }: TenantSearchResultsProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();

  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [reminderData, setReminderData] = useState<any>(null);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
      paymentEntries: PaymentEntry[];
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
            amountPaid: payment?.amountPaid || 0,
            paymentEntries: (payment?.paymentEntries || []) as PaymentEntry[]
          });
        }
      });
    });

    return results;
  }, [rooms, searchQuery, selectedMonth, selectedYear, payments]);

  if (!searchQuery.trim()) return null;

  const handleOpenReceipt = (tenant: typeof searchResults[0]) => {
    setReceiptData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      monthlyRent: tenant.monthlyRent,
      amountPaid: tenant.amountPaid,
      joiningDate: tenant.startDate,
      roomNo: tenant.roomNo,
      forMonth: `${months[selectedMonth - 1]} ${selectedYear}`,
      paymentEntries: tenant.paymentEntries,
    });
    setReceiptDialogOpen(true);
  };

  const handleOpenReminder = (tenant: typeof searchResults[0]) => {
    setReminderData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      monthlyRent: tenant.monthlyRent,
      joiningDate: tenant.startDate,
      roomNo: tenant.roomNo,
      forMonth: `${months[selectedMonth - 1]} ${selectedYear}`,
    });
    setReminderDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-2 mb-6">
        <p className="text-sm text-muted-foreground">
          Found {searchResults.length} tenant(s) matching "{searchQuery}"
        </p>
        {searchResults.map(tenant => {
          const isPaid = tenant.paymentStatus === 'Paid';
          const isPartial = tenant.paymentStatus === 'Partial';
          const remaining = tenant.monthlyRent - tenant.amountPaid;
          const hasPhone = tenant.phone && tenant.phone !== '••••••••••';
          const hasPaymentEntries = tenant.paymentEntries.length > 0;

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
                  {hasPhone && (
                    <>
                      <a 
                        href={`tel:${tenant.phone}`}
                        className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30">
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          {(isPaid || isPartial) && hasPaymentEntries && (
                            <DropdownMenuItem onClick={() => handleOpenReceipt(tenant)}>
                              <Receipt className="h-4 w-4 mr-2" />
                              Generate Receipt
                            </DropdownMenuItem>
                          )}
                          {!isPaid && (
                            <DropdownMenuItem onClick={() => handleOpenReminder(tenant)}>
                              <Bell className="h-4 w-4 mr-2" />
                              Payment Reminder
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <a
                              href={`https://wa.me/91${tenant.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Chat with Tenant
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                  {months[selectedMonth - 1]} {selectedYear}
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

      <WhatsAppReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        receiptData={receiptData}
        onWhatsappSent={() => {}}
      />

      <PaymentReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        reminderData={reminderData}
      />
    </>
  );
};
