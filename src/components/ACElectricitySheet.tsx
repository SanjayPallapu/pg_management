import { BillUnitPricesCard } from './BillUnitPricesCard';
import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  Snowflake, 
  Send, 
  Check, 
  Zap, 
  ChevronRight, 
  Bell, 
  FileSpreadsheet
} from 'lucide-react';
import { applyStyledExport, saveAndShareExcel } from '@/utils/excelStyles';
import { toast } from 'sonner';


interface ACElectricitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acRooms: any[];
  acMonth: number;
  acYear: number;
  setAcMonth: (m: number) => void;
  setAcYear: (y: number) => void;
  setReading: any;
  customModeRooms: Record<string, boolean>;
  setCustomModeRooms: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onShare: (
    item: any,
    units: number, 
    unitPrice: number, 
    startReading: number | null, 
    endReading: number | null, 
    splitType: string, 
    splitCount: number | null, 
    targetTenantName?: string
  ) => void;
  onTogglePaymentStatus?: (tenantId: string, currentStatus: 'Paid' | 'Pending') => void;
  months: { value: number; label: string }[];
  years: number[];
}

export const ACElectricitySheet = ({
  open,
  onOpenChange,
  acRooms,
  acMonth,
  acYear,
  setAcMonth,
  setAcYear,
  setReading,
  customModeRooms,
  setCustomModeRooms,
  onShare,
  onTogglePaymentStatus,
  months,
  years,
}: ACElectricitySheetProps) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [pricesCardOpen, setPricesCardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ac-bill' | 'pendings' | 'share-bills' | 'reports'>('ac-bill');

  const pendingTenantsList = useMemo(() => {
    const list: any[] = [];
    acRooms.forEach(item => {
      (item.tenantShares || []).forEach((share: any) => {
        if (share.acPaymentStatus !== 'Paid' && share.share > 0) {
          list.push({
            id: share.id || share.name,
            name: share.name,
            roomNo: item.room.roomNo,
            pending: share.share + (share.overdueAcTotal || 0),
            roomItem: item
          });
        }
      });
    });
    return list;
  }, [acRooms]);

  const expectedTotal = acRooms.reduce((sum, item) => {
    return sum + (item.tenantShares || []).reduce((tSum: number, share: any) => tSum + (share.share || 0), 0);
  }, 0);

  const collectedTotal = acRooms.reduce((sum, item) => {
    return sum + (item.tenantShares || []).reduce((tSum: number, share: any) => {
      return tSum + (share.acPaymentStatus === 'Paid' ? (share.share || 0) : 0);
    }, 0);
  }, 0);

  const pendingTotal = Math.max(0, expectedTotal - collectedTotal);
  const overallPct = expectedTotal > 0 ? Math.round((collectedTotal / expectedTotal) * 100) : 0;

  const selectedRoomItem = useMemo(() => {
    if (!selectedRoomId) return null;
    return acRooms.find(item => item.room.id === selectedRoomId);
  }, [selectedRoomId, acRooms]);

  useEffect(() => {
    if (!open) setSelectedRoomId(null);
  }, [open]);


  const handleExport = async () => {
    const excelData: Record<string, string | number>[] = [];
    
    acRooms.forEach(item => {
      const roomExpected = (item.tenantShares || []).reduce((s: number, t: any) => s + (t.share || 0), 0);
      const roomCollected = (item.tenantShares || []).reduce((s: number, t: any) => s + (t.acPaymentStatus === 'Paid' ? (t.share || 0) : 0), 0);
      const roomPending = Math.max(0, roomExpected - roomCollected);
      
      excelData.push({
        "Room No": item.room.roomNo,
        "Tenant Name": "--- ROOM SUMMARY ---",
        "Status": "",
        "Units Consumed": item.units || 0,
        "Total Bill (₹)": item.total || 0,
        "Share Amount (₹)": "",
        "Payment Status": `Pending: ₹${roomPending}`
      });

      (item.tenantShares || []).forEach((tenant: any) => {
        excelData.push({
          "Room No": "",
          "Tenant Name": tenant.name || 'Unknown',
          "Status": tenant.acPaymentStatus || 'Pending',
          "Units Consumed": "",
          "Total Bill (₹)": "",
          "Share Amount (₹)": tenant.share || 0,
          "Payment Status": tenant.acPaymentStatus || 'Pending'
        });
      });
    });

    const colWidths = [
      { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }
    ];

    const wb = applyStyledExport(excelData, `AC_Bill_${acMonth}_${acYear}`, colWidths, {
      statusColumns: [2, 6],
      currencyColumns: [4, 5],
      fileName: `AC_Bill_${acMonth}_${acYear}.xlsx`
    });

    try {
      await saveAndShareExcel(wb, `AC_Bill_${acMonth}_${acYear}.xlsx`);
      toast.success("Export successful");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const handleShareAll = () => {
    let count = 0;
    acRooms.forEach(item => {
      (item.tenantShares || []).forEach((share: any) => {
        if (share.share > 0) count++;
      });
    });
    if (count === 0) { toast.info("No tenants with AC bills!"); return; }
    toast.info(`Sharing bills with ${count} tenants...`);
    acRooms.forEach(item => {
      (item.tenantShares || []).forEach((share: any) => {
        if (share.share > 0) {
          onShare(item, item.units, item.unitPrice, item.startReading, item.endReading, item.splitType, item.splitCount, share.name);
        }
      });
    });
  };

  const handleBulkReminders = () => {
    let pendingCount = 0;
    acRooms.forEach(item => {
      (item.tenantShares || []).forEach((share: any) => {
        if (share.acPaymentStatus !== 'Paid' && share.share > 0) pendingCount++;
      });
    });
    if (pendingCount === 0) { toast.info("All tenants have paid their AC bills!"); return; }
    toast.info(`Sending reminders to ${pendingCount} tenants...`);
    acRooms.forEach(item => {
      (item.tenantShares || []).forEach((share: any) => {
        if (share.acPaymentStatus !== 'Paid' && share.share > 0) {
          onShare(item, item.units, item.unitPrice, item.startReading, item.endReading, item.splitType, item.splitCount, share.name);
        }
      });
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 [&>button]:hidden bg-slate-50 dark:bg-slate-900 text-foreground dark:text-white border-l border-border dark:border-slate-900 flex flex-col h-full overflow-hidden">
        {selectedRoomItem ? (
          <ACRoomDetailView
            item={selectedRoomItem}
            onBack={() => setSelectedRoomId(null)}
            onSaveReading={(units, unitPrice, startReading, endReading, splitType, splitCount) => {
              setReading.mutate({ roomId: selectedRoomItem.room.id, units, unitPrice, startReading, endReading, splitType, splitCount });
            }}
            onShare={(units, unitPrice, startReading, endReading, splitType, splitCount, targetTenantName) => {
              onShare(selectedRoomItem, units, unitPrice, startReading, endReading, splitType, splitCount, targetTenantName);
            }}
            onTogglePaymentStatus={onTogglePaymentStatus}
            onModeToggle={(isCustom) => {
              localStorage.setItem(`ac_bill_mode_${selectedRoomItem.room.id}`, isCustom ? "custom" : "commercial");
              setCustomModeRooms((prev) => ({ ...prev, [selectedRoomItem.room.id]: isCustom }));
            }}
          />
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <SheetHeader className="px-5 pt-5 pb-2 border-b border-border dark:border-slate-900 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground dark:text-slate-400 hover:text-foreground dark:text-white hover:bg-muted dark:hover:bg-slate-900" onClick={() => onOpenChange(false)} aria-label="Back">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Snowflake className="h-4 w-4 text-cyan-400 shrink-0" />
                      <SheetTitle className="text-base font-extrabold text-foreground dark:text-white">AC Bill</SheetTitle>
                    </div>
                    <span className="text-[10px] text-muted-foreground dark:text-slate-400 mt-0.5 block">Track. Split. Collect.</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <select value={acMonth} onChange={(e) => setAcMonth(parseInt(e.target.value))} className="h-7 rounded-lg bg-white dark:bg-slate-900 border border-border dark:border-slate-800 text-foreground dark:text-slate-300 px-2 text-[11px] font-semibold focus-visible:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer">
                    {months.map((m) => (<option key={m.value} value={m.value} className="bg-background dark:bg-slate-900 text-foreground dark:text-white">{m.label}</option>))}
                  </select>
                  <select value={acYear} onChange={(e) => setAcYear(parseInt(e.target.value))} className="h-7 rounded-lg bg-white dark:bg-slate-900 border border-border dark:border-slate-800 text-foreground dark:text-slate-300 px-2 text-[11px] font-semibold focus-visible:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer">
                    {years.map((y) => (<option key={y} value={y} className="bg-background dark:bg-slate-900 text-foreground dark:text-white">{y}</option>))}
                  </select>
                </div>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-border dark:border-slate-800/80 w-full mt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('ac-bill')}
                  className={cn(
                    "flex-1 text-[10px] sm:text-xs font-bold py-1.5 rounded-lg transition-all",
                    activeTab === 'ac-bill' 
                      ? "bg-cyan-500 text-slate-950 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  AC Bill
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pendings')}
                  className={cn(
                    "flex-1 text-[10px] sm:text-xs font-bold py-1.5 rounded-lg transition-all",
                    activeTab === 'pendings' 
                      ? "bg-cyan-500 text-slate-950 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Pendings
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('share-bills')}
                  className={cn(
                    "flex-1 text-[10px] sm:text-xs font-bold py-1.5 rounded-lg transition-all",
                    activeTab === 'share-bills' 
                      ? "bg-cyan-500 text-slate-950 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reports')}
                  className={cn(
                    "flex-1 text-[10px] sm:text-xs font-bold py-1.5 rounded-lg transition-all",
                    activeTab === 'reports' 
                      ? "bg-cyan-500 text-slate-950 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Reports
                </button>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {activeTab === 'ac-bill' && (
                <>
                  {/* Overview Card */}
                  <div className="relative rounded-2xl overflow-hidden bg-card border border-border dark:border-slate-800/80 p-5 shadow-lg">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground dark:text-slate-400 mb-3">Month Overview</h4>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-muted dark:bg-muted/50 border border-border dark:border-border/50 rounded-xl p-3 text-center">
                        <span className="block text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground dark:text-slate-400">Expected</span>
                        <span className="block text-sm font-black text-cyan-500 dark:text-cyan-400 mt-1">₹{expectedTotal.toLocaleString()}</span>
                      </div>
                      <div className="bg-muted dark:bg-muted/50 border border-border dark:border-border/50 rounded-xl p-3 text-center">
                        <span className="block text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground dark:text-slate-400">Collected</span>
                        <span className="block text-sm font-black text-emerald-500 dark:text-emerald-400 mt-1">₹{collectedTotal.toLocaleString()}</span>
                      </div>
                      <div className="bg-muted dark:bg-muted/50 border border-border dark:border-border/50 rounded-xl p-3 text-center">
                        <span className="block text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground dark:text-slate-400">Pending</span>
                        <span className="block text-sm font-black text-orange-500 dark:text-orange-400 mt-1">₹{pendingTotal.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground dark:text-slate-400">
                        <span>Collection Progress</span>
                        <span className="font-bold text-emerald-400">{overallPct}% Collected</span>
                      </div>
                      <Progress value={overallPct} className="h-1.5 bg-muted dark:bg-slate-950 border border-border dark:border-slate-800" />
                    </div>
                  </div>

                  {/* Rates Template Card */}
                  <div 
                    onClick={() => setPricesCardOpen(true)} 
                    className="p-4 bg-cyan-500/5 dark:bg-cyan-500/5 border border-cyan-500/20 dark:border-cyan-500/10 rounded-2xl space-y-2 cursor-pointer hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-bold">
                      <Zap className="h-3.5 w-3.5" />
                      AC ELECTRICITY PRICING & RATES
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs mt-1">
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase font-bold">Flat Rate</span>
                        <span className="font-extrabold text-foreground dark:text-white">₹12 / Unit</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase font-bold">Govt. Commercial Slabs</span>
                        <span className="font-extrabold text-foreground dark:text-white">₹5.4 to ₹9.95 / Unit</span>
                      </div>
                    </div>
                  </div>

                  {/* Room Cards */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground dark:text-slate-400">Rooms Summary</h3>
                      <Badge variant="outline" className="text-[9px] border-border dark:border-slate-800 text-muted-foreground dark:text-slate-400 px-2 py-0">{acRooms.length} Rooms</Badge>
                    </div>
                    <div className="space-y-2.5">
                      {acRooms.length === 0 ? (
                        <div className="text-center text-muted-foreground dark:text-slate-500 py-12 text-xs border border-dashed border-border dark:border-slate-900 rounded-2xl">No AC Rooms configured.</div>
                      ) : acRooms.map((item) => {
                        const roomExpected = (item.tenantShares || []).reduce((s: number, t: any) => s + (t.share || 0), 0);
                        const roomCollected = (item.tenantShares || []).reduce((s: number, t: any) => s + (t.acPaymentStatus === 'Paid' ? (t.share || 0) : 0), 0);
                        const roomPending = Math.max(0, roomExpected - roomCollected);
                        const roomPct = roomExpected > 0 ? Math.round((roomCollected / roomExpected) * 100) : 0;

                        return (
                          <div key={item.room.id} onClick={() => setSelectedRoomId(item.room.id)} className="group p-4 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="relative h-10 w-10 shrink-0">
                                <svg className="w-10 h-10 -rotate-90 transform" viewBox="0 0 36 36">
                                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e293b" strokeWidth="3.2" />
                                  <circle cx="18" cy="18" r="15.915" fill="none" stroke={roomPct === 100 ? "#10b981" : "#06b6d4"} strokeWidth="3.2" strokeDasharray={`${roomPct} 100`} strokeLinecap="round" className="transition-all duration-500 ease-out" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-foreground dark:text-white">{roomPct}%</div>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-foreground dark:text-white">Room {item.room.roomNo}</span>
                                  <Badge className={cn("text-[9px] font-bold py-0.5 border-0 px-2 rounded-full", roomPending > 0 ? "bg-orange-500/10 text-orange-400" : "bg-emerald-500/10 text-emerald-400")}>
                                    {roomPending > 0 ? `₹${roomPending.toLocaleString()} Pending` : 'All Paid'}
                                  </Badge>
                                </div>
                                <span className="text-[10px] text-muted-foreground dark:text-slate-400 block mt-0.5">{item.room.capacity} Sharing · {item.activeTenants.length} Tenant{item.activeTenants.length === 1 ? '' : 's'}</span>
                                <span className="text-[9px] text-muted-foreground dark:text-slate-500 block mt-1">{item.units || 0} Units · ₹{item.unitPrice}/Unit · Bill: ₹{(item.total || 0).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground dark:text-slate-500 group-hover:text-foreground dark:text-slate-300 transition-colors shrink-0">
                              <span className="text-[10px] font-semibold hidden sm:inline">Details</span>
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'pendings' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground dark:text-slate-400">Pending AC Bills</h3>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-card">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-muted-foreground uppercase">
                          <th className="p-3">Room</th>
                          <th className="p-3">Tenant</th>
                          <th className="p-3 text-right">Pending</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pendingTenantsList.map(tenant => (
                          <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-extrabold">{tenant.roomNo}</td>
                            <td className="p-3 font-medium">{tenant.name}</td>
                            <td className="p-3 text-right text-orange-400 font-extrabold">₹{tenant.pending.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <Button size="xs" variant="outline" className="h-7 px-2.5 text-[10px] font-bold border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10" onClick={() => onShare(tenant.roomItem, tenant.roomItem.units, tenant.roomItem.unitPrice, tenant.roomItem.startReading, tenant.roomItem.endReading, tenant.roomItem.splitType, tenant.roomItem.splitCount, tenant.name)}>
                                Remind
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {pendingTenantsList.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground text-xs">No pending AC bills! 🎉</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'share-bills' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground dark:text-slate-400">Share AC Bills</h3>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-card">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-muted-foreground uppercase">
                          <th className="p-3">Room</th>
                          <th className="p-3">Total Bill</th>
                          <th className="p-3">Strategy</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {acRooms.map(item => (
                          <tr key={item.room.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-extrabold">{item.room.roomNo}</td>
                            <td className="p-3 font-medium">₹{(item.total || 0).toLocaleString()}</td>
                            <td className="p-3 text-muted-foreground text-[10px] font-semibold">{item.splitType === 'custom' ? 'Custom' : item.splitType === 'capacity' ? 'Capacity' : 'Proportional'}</td>
                            <td className="p-3 text-center">
                              <Button size="xs" variant="outline" className="h-7 px-2.5 text-[10px] font-bold border-blue-500/30 text-blue-500 hover:bg-blue-500/10" onClick={() => onShare(item, item.units, item.unitPrice, item.startReading, item.endReading, item.splitType, item.splitCount)}>
                                Share
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-extrabold text-muted-foreground dark:text-slate-400 uppercase tracking-wider">AC Bill Report</span>
                    <Button size="xs" variant="outline" className="h-7 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 animate-pulse" onClick={handleExport}>
                      <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel Export
                    </Button>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-card overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-muted-foreground uppercase">
                          <th className="p-3">Room</th>
                          <th className="p-3">Units</th>
                          <th className="p-3">Total Bill</th>
                          <th className="p-3">Expected</th>
                          <th className="p-3">Collected</th>
                          <th className="p-3">Pending</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {acRooms.map(item => {
                          const roomExpected = (item.tenantShares || []).reduce((s: number, t: any) => s + (t.share || 0), 0);
                          const roomCollected = (item.tenantShares || []).reduce((s: number, t: any) => s + (t.acPaymentStatus === 'Paid' ? (t.share || 0) : 0), 0);
                          const roomPending = Math.max(0, roomExpected - roomCollected);
                          return (
                            <tr key={item.room.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-3 font-extrabold">{item.room.roomNo}</td>
                              <td className="p-3">{item.units || 0}</td>
                              <td className="p-3 font-medium">₹{(item.total || 0).toLocaleString()}</td>
                              <td className="p-3">₹{roomExpected.toLocaleString()}</td>
                              <td className="p-3 text-emerald-400 font-bold">₹{roomCollected.toLocaleString()}</td>
                              <td className="p-3 text-orange-400 font-bold">₹{roomPending.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border dark:border-slate-900 bg-muted dark:bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground dark:text-slate-500 font-bold">COLLECTED:</span>
                <span className="text-emerald-400 font-black">₹{collectedTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground dark:text-slate-500 font-bold">PENDING:</span>
                <span className="text-orange-400 font-black">₹{pendingTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
        <BillUnitPricesCard 
        showSummaryCard={false} 
        defaultOpen={pricesCardOpen} 
        onClose={() => setPricesCardOpen(false)} 
      />
      </SheetContent>
    </Sheet>
  );
};
interface DetailProps {
  item: any;
  onBack: () => void;
  onSaveReading: (units: number, unitPrice: number, startReading: number | null, endReading: number | null, splitType: string, splitCount: number | null) => void;
  onShare: (units: number, unitPrice: number, startReading: number | null, endReading: number | null, splitType: string, splitCount: number | null, targetTenantName?: string) => void;
  onTogglePaymentStatus?: (tenantId: string, currentStatus: 'Paid' | 'Pending') => void;
  onModeToggle: (isCustom: boolean) => void;
}

const calculateAPCommercialBill = (u: number) => {
  let energyCharges = 0;
  if (u <= 50) energyCharges = u * 5.4;
  else if (u <= 100) energyCharges = 50 * 5.4 + (u - 50) * 7.65;
  else energyCharges = 50 * 5.4 + 50 * 7.65 + (u - 100) * 9.95;
  const customerCharges = u <= 50 ? 45 : u <= 100 ? 55 : 65;
  return { totalBill: Math.round(energyCharges + customerCharges) };
};

const ACRoomDetailView = ({ item, onBack, onSaveReading, onShare, onTogglePaymentStatus, onModeToggle }: DetailProps) => {
  const { room, activeTenants, units, unitPrice, total, tenantShares = [], isCustom, startReading, endReading, splitType, splitCount } = item;

  const [startReadingDraft, setStartReadingDraft] = useState(startReading !== null ? String(startReading) : "");
  const [endReadingDraft, setEndReadingDraft] = useState(endReading !== null ? String(endReading) : "");
  const [unitsDraft, setUnitsDraft] = useState(String(units ?? 0));
  const [priceDraft, setPriceDraft] = useState(String(unitPrice ?? 12));
  const [selectedSplitType, setSelectedSplitType] = useState(splitType || "active_tenants");
  const [splitCountDraft, setSplitCountDraft] = useState(splitCount !== null ? String(splitCount) : "");

  useEffect(() => { setStartReadingDraft(startReading !== null ? String(startReading) : ""); }, [startReading]);
  useEffect(() => { setEndReadingDraft(endReading !== null ? String(endReading) : ""); }, [endReading]);
  useEffect(() => { setUnitsDraft(String(units ?? 0)); }, [units]);
  useEffect(() => { setPriceDraft(String(unitPrice ?? 12)); }, [unitPrice]);
  useEffect(() => { setSelectedSplitType(splitType || "active_tenants"); }, [splitType]);
  useEffect(() => { setSplitCountDraft(splitCount !== null ? String(splitCount) : ""); }, [splitCount]);

  const draftUnits = parseInt(unitsDraft) || 0;
  const draftUnitPrice = parseInt(priceDraft) || 0;
  const startVal = startReadingDraft === "" ? null : parseInt(startReadingDraft);
  const endVal = endReadingDraft === "" ? null : parseInt(endReadingDraft);
  const draftSplitCount = splitCountDraft === "" ? null : parseInt(splitCountDraft);

  const apBill = calculateAPCommercialBill(draftUnits);
  const draftTotal = selectedSplitType === "custom" && draftSplitCount && draftSplitCount > 0
    ? draftUnits * draftUnitPrice
    : isCustom ? draftUnits * draftUnitPrice : apBill.totalBill;

  const dayWiseShares = draftTotal > 0
    ? tenantShares.map((tenant: any) => ({ ...tenant, share: total > 0 ? Math.round((draftTotal * tenant.share) / total) : tenant.share }))
    : tenantShares;

  const customShare = selectedSplitType === "custom" && draftSplitCount && draftSplitCount > 0 ? Math.round(draftTotal / draftSplitCount) : 0;
  const shareValues = dayWiseShares.map((t: any) => t.share).filter((s: number) => s > 0);
  const minShare = shareValues.length ? Math.min(...shareValues) : 0;
  const maxShare = shareValues.length ? Math.max(...shareValues) : 0;
  let shareLabel = "";
  if (selectedSplitType === "custom" && customShare > 0) shareLabel = `₹${customShare.toLocaleString()} each`;
  else if (selectedSplitType === "capacity") {
    const as2 = minShare === maxShare ? `₹${minShare.toLocaleString()}` : `₹${minShare.toLocaleString()} – ₹${maxShare.toLocaleString()}`;
    shareLabel = `${as2} (Vacancy absorbed)`;
  } else shareLabel = minShare === maxShare ? `₹${minShare.toLocaleString()}` : `₹${minShare.toLocaleString()} – ₹${maxShare.toLocaleString()}`;

  const triggerSave = (u: number, p: number, s: number | null, e: number | null, sp: string, sc: number | null) => onSaveReading(u, p, s, e, sp, sc);
  const handleStartBlur = () => { const s = startReadingDraft === "" ? null : parseInt(startReadingDraft); const e = endReadingDraft === "" ? null : parseInt(endReadingDraft); let u = parseInt(unitsDraft) || 0; if (s !== null && e !== null) { u = Math.max(0, e - s); setUnitsDraft(String(u)); } triggerSave(u, parseInt(priceDraft) || 0, s, e, selectedSplitType, draftSplitCount); };
  const handleEndBlur = () => { const s = startReadingDraft === "" ? null : parseInt(startReadingDraft); const e = endReadingDraft === "" ? null : parseInt(endReadingDraft); let u = parseInt(unitsDraft) || 0; if (s !== null && e !== null) { u = Math.max(0, e - s); setUnitsDraft(String(u)); } triggerSave(u, parseInt(priceDraft) || 0, s, e, selectedSplitType, draftSplitCount); };
  const handleUnitsBlur = () => triggerSave(parseInt(unitsDraft) || 0, parseInt(priceDraft) || 0, startVal, endVal, selectedSplitType, draftSplitCount);
  const handlePriceBlur = () => triggerSave(draftUnits, parseInt(priceDraft) || 0, startVal, endVal, selectedSplitType, draftSplitCount);
  const handleSplitTypeChange = (type: string) => { setSelectedSplitType(type); let sc = draftSplitCount; if (type === 'custom' && !sc) { sc = activeTenants.length || room.capacity; setSplitCountDraft(String(sc)); } triggerSave(draftUnits, draftUnitPrice, startVal, endVal, type, sc); };
  const handleSplitCountBlur = () => triggerSave(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, splitCountDraft === "" ? null : parseInt(splitCountDraft));

  const roomCollected = dayWiseShares.reduce((s: number, t: any) => s + (t.acPaymentStatus === 'Paid' ? (t.share || 0) : 0), 0);
  const roomPending = Math.max(0, draftTotal - roomCollected);
  const roomPct = draftTotal > 0 ? Math.round((roomCollected / draftTotal) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SheetHeader className="px-5 pt-5 pb-3 border-b border-border dark:border-slate-900 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground dark:text-slate-400 hover:text-foreground dark:text-white hover:bg-muted dark:hover:bg-slate-900" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <SheetTitle className="text-base font-extrabold text-foreground dark:text-white">Room {room.roomNo}</SheetTitle>
              <span className="text-[10px] text-muted-foreground dark:text-slate-400 block mt-0.5">{room.capacity} Sharing · {activeTenants.length} Active Tenant{activeTenants.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-[10px] border-border dark:border-slate-800 text-foreground dark:text-slate-300 hover:bg-muted dark:hover:bg-slate-900 hover:text-foreground dark:text-white shrink-0 px-2.5" onClick={() => onShare(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, draftSplitCount)}>
            <Send className="mr-1.5 h-3 w-3" /> Share All
          </Button>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Summary card */}
        <div className="rounded-2xl border border-border dark:border-slate-900 bg-muted dark:bg-slate-950/30 p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div><span className="text-[10px] font-extrabold text-muted-foreground dark:text-slate-400 uppercase tracking-wider block">Total Bill</span><span className="text-lg font-black text-foreground dark:text-white mt-0.5">₹{draftTotal.toLocaleString()}</span></div>
            <div className="text-right"><span className="text-[10px] font-extrabold text-muted-foreground dark:text-slate-400 uppercase tracking-wider block">Pending</span><span className={cn("text-lg font-black mt-0.5", roomPending > 0 ? "text-orange-400" : "text-emerald-400")}>₹{roomPending.toLocaleString()}</span></div>
          </div>
          <div className="space-y-1.5 border-t border-border dark:border-slate-900/60 pt-3">
            <div className="flex justify-between text-[10px] text-muted-foreground dark:text-slate-400">
              <span>Collection rate</span>
              <span className={cn("font-bold", roomPct === 100 ? "text-emerald-400" : "text-cyan-400")}>{roomPct}% Collected {roomPct === 100 ? '🎉' : ''}</span>
            </div>
            <Progress value={roomPct} className="h-1.5 bg-muted dark:bg-slate-950 border border-border dark:border-slate-900" />
          </div>
        </div>

        {/* Meter Reading */}
        <div className="rounded-2xl border border-border dark:border-slate-900 bg-muted dark:bg-slate-950/30 p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground dark:text-slate-400">Meter Readings</h4>
            <div className="flex items-center gap-1.5">
              <input type="checkbox" id={`detail-ac-mode-${room.roomNo}`} checked={isCustom} onChange={(e) => onModeToggle(e.target.checked)} className="h-3.5 w-3.5 rounded border-border dark:border-slate-800 bg-muted dark:bg-slate-950 text-cyan-600 cursor-pointer" />
              <label htmlFor={`detail-ac-mode-${room.roomNo}`} className="text-[10px] text-muted-foreground dark:text-slate-400 cursor-pointer">Flat Rate (₹{draftUnitPrice}/unit)</label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-extrabold uppercase text-muted-foreground dark:text-slate-500 block mb-1">Prev Reading</Label>
              <Input type="number" value={startReadingDraft} onChange={(e) => setStartReadingDraft(e.target.value)} onBlur={handleStartBlur} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} placeholder="Start" className="h-9 text-xs px-2.5 bg-muted dark:bg-slate-950 border-border dark:border-slate-900 text-foreground dark:text-white focus-visible:ring-cyan-500" />
            </div>
            <div>
              <Label className="text-[10px] font-extrabold uppercase text-muted-foreground dark:text-slate-500 block mb-1">Curr Reading</Label>
              <Input type="number" value={endReadingDraft} onChange={(e) => setEndReadingDraft(e.target.value)} onBlur={handleEndBlur} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} placeholder="End" className="h-9 text-xs px-2.5 bg-muted dark:bg-slate-950 border-border dark:border-slate-900 text-foreground dark:text-white focus-visible:ring-cyan-500" />
            </div>
            <div>
              <Label className="text-[10px] font-extrabold uppercase text-muted-foreground dark:text-slate-500 block mb-1">Units Consumed</Label>
              <Input type="number" value={unitsDraft} onChange={(e) => setUnitsDraft(e.target.value)} onBlur={handleUnitsBlur} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} placeholder="0" className="h-9 text-xs px-2.5 bg-muted dark:bg-slate-950 border-border dark:border-slate-900 text-foreground dark:text-white focus-visible:ring-cyan-500" />
            </div>
            <div>
              <Label className="text-[10px] font-extrabold uppercase text-muted-foreground dark:text-slate-500 block mb-1">Rate per Unit (₹)</Label>
              <Input type="number" value={priceDraft} disabled={!isCustom} onChange={(e) => setPriceDraft(e.target.value)} onBlur={handlePriceBlur} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} className="h-9 text-xs px-2.5 bg-muted dark:bg-slate-950 border-border dark:border-slate-900 text-foreground dark:text-white disabled:opacity-40 focus-visible:ring-cyan-500" />
            </div>
          </div>
        </div>

        {/* Split Strategy */}
        <div className="rounded-2xl border border-border dark:border-slate-900 bg-muted dark:bg-slate-950/30 p-4 space-y-3.5">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground dark:text-slate-400">Bill Split Strategy</h4>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label className="text-[10px] font-extrabold uppercase text-muted-foreground dark:text-slate-500 block mb-1">Strategy</Label>
              <select value={selectedSplitType} onChange={(e) => handleSplitTypeChange(e.target.value)} className="h-9 rounded-lg border border-border dark:border-slate-900 bg-white dark:bg-slate-950 px-2 text-xs font-semibold focus-visible:outline-none focus:ring-1 focus:ring-cyan-500 text-foreground dark:text-white w-full cursor-pointer">
                <option value="active_tenants">Split by Active Tenants</option>
                <option value="capacity">Split by Capacity ({room.capacity} sharing)</option>
                <option value="custom">Split Equally (Custom Count)</option>
              </select>
            </div>
            <div>
              {selectedSplitType === "custom" ? (
                <>
                  <Label className="text-[10px] font-extrabold uppercase text-muted-foreground dark:text-slate-500 block mb-1">Persons Count</Label>
                  <Input type="number" min="1" value={splitCountDraft} onChange={(e) => setSplitCountDraft(e.target.value)} onBlur={handleSplitCountBlur} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} placeholder="Count" className="h-9 text-xs px-2.5 bg-muted dark:bg-slate-950 border-border dark:border-slate-900 text-foreground dark:text-white focus-visible:ring-cyan-500" />
                </>
              ) : (
                <div className="h-9 flex flex-col justify-center">
                  <span className="text-[10px] font-extrabold uppercase text-muted-foreground dark:text-slate-500 block">Total</span>
                  <span className="text-xs font-black text-cyan-400 mt-0.5">₹{draftTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-100/60 dark:bg-slate-900/50 border border-border dark:border-slate-900 px-3 py-2 text-[11px] text-muted-foreground dark:text-slate-400">
            <span>{selectedSplitType === "custom" ? `Custom split by ${draftSplitCount} persons` : selectedSplitType === "capacity" ? `Split by ${room.capacity} slots` : `Proportional by active tenants`}</span>
            <span className="font-extrabold text-cyan-400">{shareLabel}</span>
          </div>
        </div>

        {/* Tenants */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground dark:text-slate-400 px-1">Tenant Breakdown</h4>
          <div className="grid gap-2">
            {dayWiseShares.length === 0 ? (
              <div className="text-center text-muted-foreground dark:text-slate-500 py-6 text-xs border border-dashed border-border dark:border-slate-900 rounded-xl">No active tenants in this room.</div>
            ) : dayWiseShares.map((tenant: any) => {
              const isPaid = tenant.acPaymentStatus === "Paid";
              const hasOverdue = (tenant.overdueAcTotal || 0) > 0;
              const initials = tenant.name ? tenant.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "??";
              return (
                <div key={tenant.name} className="p-3.5 bg-muted dark:bg-muted/40 dark:bg-muted/40 border border-border dark:border-slate-900 hover:border-border dark:border-slate-800/80 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("h-9 w-9 rounded-full border flex items-center justify-center text-xs font-bold shrink-0", isPaid ? "bg-emerald-950/50 border-emerald-800/60 text-emerald-400" : "bg-slate-100 dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-slate-300")}>{initials}</div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-xs text-foreground dark:text-white truncate block">{tenant.name}</span>
                      <span className="text-[10px] text-muted-foreground dark:text-slate-400 block mt-0.5">{tenant.daysStayed} days stayed</span>
                      <span className="text-[10px] text-muted-foreground dark:text-slate-500 block mt-0.5">
                        Share: ₹{(tenant.share || 0).toLocaleString()}
                        {hasOverdue && <span className="text-orange-400 ml-1 font-bold">+ ₹{tenant.overdueAcTotal.toLocaleString()} overdue</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isPaid && (
                      <Button size="xs" variant="outline" className="h-7 w-7 p-0 rounded-lg border-border dark:border-slate-800 text-muted-foreground dark:text-slate-400 hover:bg-muted dark:hover:bg-slate-900 hover:text-foreground dark:text-white" onClick={() => onShare(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, draftSplitCount, tenant.name)}>
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="xs"
                      className={cn("h-7 px-3 text-[10px] font-bold rounded-lg border-0",
                        isPaid ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-emerald-400" : "bg-cyan-500 hover:bg-cyan-600 text-slate-950"
                      )}
                      onClick={() => { if (tenant.id && onTogglePaymentStatus) onTogglePaymentStatus(tenant.id, tenant.acPaymentStatus || 'Pending'); }}
                    >
                      {isPaid ? "Receipt" : "Mark Paid"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-border dark:border-slate-900 bg-muted dark:bg-slate-950/80 backdrop-blur-md p-4 flex items-center gap-2 shrink-0">
        <Button variant="outline" className="flex-1 text-[11px] font-bold h-9 border-border dark:border-slate-800 bg-slate-900/50 text-foreground dark:text-slate-300 hover:bg-muted dark:hover:bg-slate-900 hover:text-foreground dark:text-white" onClick={() => onShare(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, draftSplitCount)}>
          <Send className="mr-1.5 h-3.5 w-3.5" /> Send Reminder
        </Button>
        <Button variant="outline" className="flex-1 text-[11px] font-bold h-9 border-border dark:border-slate-800 bg-slate-900/50 text-foreground dark:text-slate-300 hover:bg-muted dark:hover:bg-slate-900 hover:text-foreground dark:text-white" onClick={() => onShare(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, draftSplitCount)}>
          <Zap className="mr-1.5 h-3.5 w-3.5" /> Share Bill
        </Button>
      </div>
    </div>
  );
};
