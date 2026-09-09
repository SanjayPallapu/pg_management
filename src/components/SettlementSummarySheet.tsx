import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Calendar, IndianRupee, ExternalLink, RotateCcw, Receipt } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Room } from '@/types';
import { format } from 'date-fns';
import { parseDateOnly } from '@/utils/dateOnly';
import { useSettlementCalculations } from '@/hooks/useSettlementCalculations';
import { SettlementRefundDialog, SettlementRefundDialogInput } from '@/components/SettlementRefundDialog';

interface SettlementSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
}

export const SettlementSummarySheet = ({
  open,
  onOpenChange,
  rooms,
}: SettlementSummarySheetProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [voucherData, setVoucherData] = useState<SettlementRefundDialogInput | null>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);

  useBackGesture(open, () => onOpenChange(false));

  const { leftTenants, summary, monthName, selectedYear, selectedMonth } = useSettlementCalculations(rooms);

  const handleOpenFullPage = (tab?: string) => {
    onOpenChange(false);
    navigate(tab ? `/settlement?tab=${tab}` : '/settlement');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full max-w-full sm:max-w-xl p-0 [&>button]:hidden bg-slate-50 dark:bg-slate-900"
      >
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
          <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <SheetTitle className="text-base text-foreground font-bold truncate">
                    Settlements - {monthName} {selectedYear}
                  </SheetTitle>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2.5 text-xs font-semibold text-primary border-primary/20 shrink-0"
                onClick={() => handleOpenFullPage()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Full Page</span>
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{leftTenants.length}</div>
                  <p className="text-xs text-muted-foreground">Left Tenants</p>
                </div>
                <div className="bg-paid/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-paid">₹{summary.totalPaid.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Collected</p>
                </div>
                <div className="bg-pending/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-pending">₹{summary.totalBalance.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>

              {/* Refund Banner if any */}
              {summary.totalRefundDue > 0 && (
                <div 
                  onClick={() => handleOpenFullPage('refunds')}
                  className="mb-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-amber-600" />
                    <div>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        ₹{summary.totalRefundDue.toLocaleString()} Early Exit Refunds
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        {summary.refundPendingCount > 0 
                          ? `${summary.refundPendingCount} tenants pending refund`
                          : 'All refunds completed'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">View →</span>
                </div>
              )}

              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Pro-rata Due:</span>
                  <span className="font-medium">₹{summary.totalDue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Settled:</span>
                  <span className="font-medium text-paid">{summary.settledCount}/{leftTenants.length}</span>
                </div>
                {summary.totalDiscount > 0 && (
                  <div className="flex justify-between p-2 bg-paid/10 rounded">
                    <span className="text-muted-foreground">Total Discounts:</span>
                    <span className="font-medium text-paid">₹{summary.totalDiscount.toLocaleString()}</span>
                  </div>
                )}
                {summary.totalExtra > 0 && (
                  <div className="flex justify-between p-2 bg-pending/10 rounded">
                    <span className="text-muted-foreground">Total Extra:</span>
                    <span className="font-medium text-pending">₹{summary.totalExtra.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Tenant List */}
              <div className="space-y-3">
                {leftTenants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No tenants left in {monthName} {selectedYear}</p>
                  </div>
                ) : (
                  leftTenants.map(tenant => (
                    <div
                      key={tenant.id}
                      className="p-3 rounded-lg border bg-card space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{tenant.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Room {tenant.roomNo} • {tenant.capacity}-sharing
                          </div>
                        </div>
                        <Badge 
                          className={
                            tenant.status === 'Settled' || tenant.status === 'Refunded'
                              ? 'bg-paid text-paid-foreground'
                              : tenant.status === 'Refund Pending'
                              ? 'bg-amber-500 text-white'
                              : tenant.status === 'Partial'
                              ? 'bg-blue-600 text-white'
                              : 'bg-pending text-pending-foreground'
                          }
                        >
                          {tenant.status}
                        </Badge>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Left: {tenant.endDate ? format(parseDateOnly(tenant.endDate), 'dd MMM yyyy') : 'N/A'}</span>
                      </div>

                      {/* Pro-rata Breakdown */}
                      <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Stay calculation:</span>
                          <span className="font-medium">
                            {tenant.daysStayed} days × ₹{tenant.dailyRate}/day = ₹{tenant.effectiveRent.toLocaleString()}
                          </span>
                        </div>
                        {tenant.discount > 0 && (
                          <div className="flex justify-between text-paid">
                            <span>Discount:</span>
                            <span>-₹{tenant.discount.toLocaleString()}</span>
                          </div>
                        )}
                        {tenant.extra > 0 && (
                          <div className="flex justify-between text-pending">
                            <span>Extra:</span>
                            <span>+₹{tenant.extra.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium border-t pt-1">
                          <span>Final Due:</span>
                          <span>₹{tenant.finalDue.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Payment Status & Refund */}
                      <div className="flex justify-between items-center text-sm pt-1">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          <span className="text-paid font-medium">Paid: ₹{tenant.amountPaid.toLocaleString()}</span>
                        </div>
                        {tenant.balance > 0 && (
                          <span className="text-pending font-semibold text-xs">
                            Balance: ₹{tenant.balance.toLocaleString()}
                          </span>
                        )}
                        {tenant.refundDue > 0 && (
                          <span className="text-amber-600 font-semibold text-xs">
                            Refund: ₹{tenant.refundDue.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Voucher Image button */}
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-blue-600 border-blue-500/30 hover:bg-blue-500/10"
                          onClick={() => {
                            setVoucherData({
                              tenantName: tenant.name,
                              tenantPhone: tenant.phone,
                              roomNo: tenant.roomNo,
                              sharingType: `${tenant.capacity} Sharing`,
                              monthlyRent: tenant.monthlyRent,
                              startDate: tenant.startDate,
                              endDate: tenant.endDate,
                              amountPaid: tenant.amountPaid,
                              discount: tenant.discount,
                              extra: tenant.extra,
                            });
                            setVoucherOpen(true);
                          }}
                        >
                          <Receipt className="h-3 w-3" />
                          Voucher Image
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>

      <SettlementRefundDialog
        open={voucherOpen}
        onOpenChange={setVoucherOpen}
        data={voucherData}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </Sheet>
  );
};