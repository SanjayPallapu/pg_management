import { BillUnitPricesCard } from './BillUnitPricesCard';
import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Snowflake,
  Send,
  Check,
  Zap,
  ChevronRight,
  Bell,
  FileSpreadsheet,
  TrendingUp,
  IndianRupee,
  Users,
  AlertTriangle,
  Share2,
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

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'ac-bill', label: 'Rooms' },
    { key: 'pendings', label: 'Pending' },
    { key: 'share-bills', label: 'Share' },
    { key: 'reports', label: 'Reports' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 [&>button]:hidden bg-background text-foreground flex flex-col h-full overflow-hidden">
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
            {/* Illustrated Hero Header */}
            <div className="relative overflow-hidden shrink-0" style={{ background: "linear-gradient(145deg, #020617 0%, #071b46 48%, #312e81 76%, #6d28d9 100%)" }}>
              {/* Decorative blobs */}
              <span className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-white/5" aria-hidden="true" />
              <span className="pointer-events-none absolute -right-8 top-4 h-32 w-32 rounded-full bg-white/5" aria-hidden="true" />
              <span className="pointer-events-none absolute right-20 bottom-6 h-3 w-3 rounded-full bg-cyan-300/60" aria-hidden="true" />
              <span className="pointer-events-none absolute left-16 bottom-8 h-2 w-2 rounded-full bg-white/40" aria-hidden="true" />

              <SheetHeader className="relative z-10 px-0 pt-3 pb-3">
                {/* Top bar */}
                <div className="flex items-center justify-between gap-2 px-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white"
                      onClick={() => onOpenChange(false)}
                      aria-label="Back"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Snowflake className="h-4 w-4 text-cyan-300 shrink-0" />
                        <SheetTitle className="text-base font-extrabold text-white">AC Bill</SheetTitle>
                      </div>
                      <span className="text-[10px] text-cyan-200/80 block">Track. Split. Collect.</span>
                    </div>
                  </div>
                  {/* Month / Year selects */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={acMonth}
                      onChange={(e) => setAcMonth(parseInt(e.target.value))}
                      className="h-8 rounded-xl bg-white/10 border border-white/20 text-white px-2 text-[11px] font-bold focus-visible:outline-none focus:ring-1 focus:ring-cyan-300 cursor-pointer backdrop-blur"
                    >
                      {months.map((m) => (
                        <option key={m.value} value={m.value} className="bg-[#071b46] text-white">{m.label}</option>
                      ))}
                    </select>
                    <select
                      value={acYear}
                      onChange={(e) => setAcYear(parseInt(e.target.value))}
                      className="h-8 rounded-xl bg-white/10 border border-white/20 text-white px-2 text-[11px] font-bold focus-visible:outline-none focus:ring-1 focus:ring-cyan-300 cursor-pointer backdrop-blur"
                    >
                      {years.map((y) => (
                        <option key={y} value={y} className="bg-[#071b46] text-white">{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Collection summary above a full-width curved illustration */}
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2 px-2">
                    <div className="rounded-2xl bg-white/10 border border-white/15 p-2 text-center backdrop-blur">
                      <span className="block text-[8px] font-extrabold uppercase tracking-wide text-cyan-200">Expected</span>
                      <span className="block text-xs font-black text-white mt-0.5">₹{expectedTotal > 999 ? `${(expectedTotal / 1000).toFixed(1)}k` : expectedTotal.toLocaleString()}</span>
                    </div>
                    <div className="rounded-2xl bg-white/10 border border-white/15 p-2 text-center backdrop-blur">
                      <span className="block text-[8px] font-extrabold uppercase tracking-wide text-emerald-300">Collected</span>
                      <span className="block text-xs font-black text-white mt-0.5">₹{collectedTotal > 999 ? `${(collectedTotal / 1000).toFixed(1)}k` : collectedTotal.toLocaleString()}</span>
                    </div>
                    <div className="rounded-2xl bg-white/10 border border-white/15 p-2 text-center backdrop-blur">
                      <span className="block text-[8px] font-extrabold uppercase tracking-wide text-orange-300">Pending</span>
                      <span className="block text-xs font-black text-white mt-0.5">₹{pendingTotal > 999 ? `${(pendingTotal / 1000).toFixed(1)}k` : pendingTotal.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-full overflow-hidden border-y border-white/15 shadow-lg">
                    <img
                      src="/ac-bill-banner-v5.png"
                      alt="AC Electricity Billing"
                      className="w-full h-auto max-h-[160px] object-cover object-center"
                    />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 space-y-1 px-2">
                  <div className="flex items-center justify-between text-[10px] text-cyan-200">
                    <span className="font-semibold">Collection Progress</span>
                    <span className="font-black text-white">{overallPct}% Collected</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${overallPct}%`,
                        background: overallPct === 100 ? "#10b981" : "linear-gradient(90deg, #22d3ee, #06b6d4)",
                      }}
                    />
                  </div>
                </div>

                {/* Tab bar */}
                <div className="mt-3 flex gap-1 rounded-2xl bg-black/20 p-1 backdrop-blur">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "flex-1 rounded-xl py-1.5 text-[10px] font-bold transition-all",
                        activeTab === tab.key
                          ? "bg-cyan-400 text-slate-900 shadow-sm"
                          : "text-white/70 hover:text-white"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </SheetHeader>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3">
              {/* ── ROOMS TAB ── */}
              {activeTab === 'ac-bill' && (
                <>
                  {/* Rates card */}
                  <button
                    type="button"
                    onClick={() => setPricesCardOpen(true)}
                    className="w-full text-left p-4 rounded-2xl border border-cyan-500/25 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                        <Zap className="h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-wide">AC Electricity Rates</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-cyan-500/60" />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block text-[9px] font-bold uppercase text-muted-foreground">Flat Rate</span>
                        <span className="font-extrabold text-foreground">₹12 / Unit</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase text-muted-foreground">Govt. Commercial</span>
                        <span className="font-extrabold text-foreground">₹5.4 – ₹9.95 / Unit</span>
                      </div>
                    </div>
                  </button>

                  {/* Room cards */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-0.5">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Rooms</h3>
                      <Badge variant="outline" className="text-[9px] px-2 py-0">{acRooms.length} Rooms</Badge>
                    </div>

                    {acRooms.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-border">
                        <Snowflake className="h-10 w-10 text-cyan-500/30 mb-3" />
                        <p className="text-sm font-bold text-muted-foreground">No AC rooms configured</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Enable AC on a room to track electricity bills.</p>
                      </div>
                    ) : acRooms.map((item) => {
                      const roomExpected = (item.tenantShares || []).reduce((s: number, t: any) => s + (t.share || 0), 0);
                      const roomCollected = (item.tenantShares || []).reduce((s: number, t: any) => s + (t.acPaymentStatus === 'Paid' ? (t.share || 0) : 0), 0);
                      const roomPending = Math.max(0, roomExpected - roomCollected);
                      const roomPct = roomExpected > 0 ? Math.round((roomCollected / roomExpected) * 100) : 0;
                      const allPaid = roomPending === 0 && roomExpected > 0;

                      return (
                        <button
                          key={item.room.id}
                          type="button"
                          onClick={() => setSelectedRoomId(item.room.id)}
                          className="group w-full text-left p-4 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Radial progress ring */}
                            <div className="relative h-12 w-12 shrink-0">
                              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
                                <circle
                                  cx="18" cy="18" r="15.915" fill="none"
                                  stroke={allPaid ? "#10b981" : "#06b6d4"}
                                  strokeWidth="3"
                                  strokeDasharray={`${roomPct} 100`}
                                  strokeLinecap="round"
                                  className="transition-all duration-500"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-foreground">{roomPct}%</div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-extrabold text-sm">Room {item.room.roomNo}</span>
                                <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border-0", allPaid ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-orange-500/10 text-orange-500")}>
                                  {allPaid ? "All Paid" : `₹${roomPending.toLocaleString()} Due`}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground">{item.room.capacity} Sharing · {item.activeTenants.length} Tenant{item.activeTenants.length === 1 ? '' : 's'}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{item.units || 0} Units · ₹{item.unitPrice}/Unit · Bill: ₹{(item.total || 0).toLocaleString()}</p>
                            </div>

                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── PENDINGS TAB ── */}
              {activeTab === 'pendings' && (
                <div className="space-y-3">
                  {/* Summary pill */}
                  {pendingTenantsList.length > 0 && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-orange-500/8 border border-orange-500/20">
                      <div className="h-10 w-10 rounded-2xl bg-orange-500/15 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground">{pendingTenantsList.length} Pending</p>
                        <p className="text-xs text-muted-foreground">₹{pendingTotal.toLocaleString()} outstanding</p>
                      </div>
                      <Button
                        size="sm"
                        className="ml-auto h-9 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shrink-0"
                        onClick={handleBulkReminders}
                      >
                        <Bell className="h-3.5 w-3.5 mr-1.5" />
                        Remind All
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {pendingTenantsList.map(tenant => (
                      <div key={tenant.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-card">
                        <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-orange-600">{tenant.name?.charAt(0)?.toUpperCase() || '?'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold truncate">{tenant.name}</p>
                          <p className="text-[10px] text-muted-foreground">Room {tenant.roomNo}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-black text-orange-500">₹{tenant.pending.toLocaleString()}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-[10px] font-bold rounded-xl border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10"
                            onClick={() => onShare(tenant.roomItem, tenant.roomItem.units, tenant.roomItem.unitPrice, tenant.roomItem.startReading, tenant.roomItem.endReading, tenant.roomItem.splitType, tenant.roomItem.splitCount, tenant.name)}
                          >
                            Remind
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingTenantsList.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-border">
                        <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                          <Check className="h-7 w-7 text-emerald-500" />
                        </div>
                        <p className="text-sm font-black text-foreground">All cleared!</p>
                        <p className="text-xs text-muted-foreground mt-1">No pending AC bills this month.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── SHARE TAB ── */}
              {activeTab === 'share-bills' && (
                <div className="space-y-3">
                  {/* Share all button */}
                  <button
                    type="button"
                    onClick={handleShareAll}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-[linear-gradient(120deg,#0e7490,#0369a1)] text-white shadow-lg"
                  >
                    <div className="text-left">
                      <p className="text-sm font-black">Share All Bills</p>
                      <p className="text-[11px] text-cyan-200 mt-0.5">Send to all {acRooms.reduce((n, item) => n + (item.tenantShares || []).filter((s: any) => s.share > 0).length, 0)} tenants with AC charges</p>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                      <Share2 className="h-5 w-5" />
                    </div>
                  </button>

                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground px-0.5">Room-wise</h3>
                    {acRooms.map(item => (
                      <div key={item.room.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-card">
                        <div className="h-9 w-9 rounded-2xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                          <Snowflake className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold">Room {item.room.roomNo}</p>
                          <p className="text-[10px] text-muted-foreground">₹{(item.total || 0).toLocaleString()} · {item.splitType === 'custom' ? 'Custom' : item.splitType === 'capacity' ? 'Capacity' : 'Proportional'}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-[10px] font-bold rounded-xl border-blue-500/30 text-blue-600 hover:bg-blue-500/10 shrink-0"
                          onClick={() => onShare(item, item.units, item.unitPrice, item.startReading, item.endReading, item.splitType, item.splitCount)}
                        >
                          <Send className="h-3 w-3 mr-1" /> Share
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── REPORTS TAB ── */}
              {activeTab === 'reports' && (
                <div className="space-y-3">
                  {/* Export button */}
                  <button
                    type="button"
                    onClick={handleExport}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-[linear-gradient(120deg,#065f46,#047857)] text-white shadow-lg"
                  >
                    <div className="text-left">
                      <p className="text-sm font-black">Export to Excel</p>
                      <p className="text-[11px] text-emerald-200 mt-0.5">Download full AC bill report for {months.find(m => m.value === acMonth)?.label} {acYear}</p>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                  </button>

                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-4 rounded-2xl border border-border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Collected</span>
                      </div>
                      <p className="text-xl font-black text-emerald-600">₹{collectedTotal.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <IndianRupee className="h-4 w-4 text-orange-500" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Pending</span>
                      </div>
                      <p className="text-xl font-black text-orange-500">₹{pendingTotal.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Room breakdown */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground px-0.5">Room Breakdown</h3>
                    {acRooms.map(item => {
                      const roomExpected = (item.tenantShares || []).reduce((s: number, t: any) => s + (t.share || 0), 0);
                      const roomCollected = (item.tenantShares || []).reduce((s: number, t: any) => s + (t.acPaymentStatus === 'Paid' ? (t.share || 0) : 0), 0);
                      const roomPending = Math.max(0, roomExpected - roomCollected);
                      const pct = roomExpected > 0 ? Math.round((roomCollected / roomExpected) * 100) : 0;

                      return (
                        <div key={item.room.id} className="p-3.5 rounded-2xl border border-border bg-card space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm">Room {item.room.roomNo}</span>
                            <span className={cn("text-xs font-bold", roomPending === 0 ? "text-emerald-500" : "text-orange-500")}>
                              {roomPending === 0 ? "All paid" : `₹${roomPending.toLocaleString()} due`}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                            <span>{item.units || 0} units</span>
                            <span className="text-center">₹{(item.total || 0).toLocaleString()} bill</span>
                            <span className="text-right text-emerald-500 font-bold">{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: pct === 100 ? "#10b981" : "#06b6d4" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom summary bar */}
            <div className="border-t border-border bg-muted/60 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-bold">COLLECTED</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{collectedTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-bold">PENDING</span>
                <span className="text-orange-500 font-black">₹{pendingTotal.toLocaleString()}</span>
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
      {/* Illustrated sub-header */}
      <div
        className="relative overflow-hidden shrink-0"
        style={{ background: "linear-gradient(150deg, #0c4a6e 0%, #0e7490 60%, #0891b2 100%)" }}
      >
        <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" aria-hidden="true" />

        <SheetHeader className="relative z-10 px-2 pt-4 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white"
                onClick={onBack}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <SheetTitle className="text-base font-extrabold text-white">Room {room.roomNo}</SheetTitle>
                <span className="text-[10px] text-cyan-200/80">{room.capacity} Sharing · {activeTenants.length} Active Tenant{activeTenants.length === 1 ? '' : 's'}</span>
              </div>
            </div>
            <Button
              size="sm"
              className="h-9 rounded-xl bg-white/15 border border-white/20 hover:bg-white/25 text-white font-bold text-xs shrink-0"
              onClick={() => onShare(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, draftSplitCount)}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" /> Share All
            </Button>
          </div>

          {/* Bill summary row */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/10 border border-white/15 p-2.5 text-center">
              <span className="block text-[8px] font-extrabold uppercase tracking-wide text-cyan-200">Total Bill</span>
              <span className="block text-sm font-black text-white mt-0.5">₹{draftTotal.toLocaleString()}</span>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 p-2.5 text-center">
              <span className="block text-[8px] font-extrabold uppercase tracking-wide text-emerald-300">Paid</span>
              <span className="block text-sm font-black text-white mt-0.5">₹{roomCollected.toLocaleString()}</span>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 p-2.5 text-center">
              <span className="block text-[8px] font-extrabold uppercase tracking-wide text-orange-300">Pending</span>
              <span className={cn("block text-sm font-black mt-0.5", roomPending > 0 ? "text-orange-300" : "text-emerald-300")}>
                ₹{roomPending.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-cyan-200">
              <span>Collection rate</span>
              <span className="font-black text-white">{roomPct}%{roomPct === 100 ? " — All paid!" : ""}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${roomPct}%`,
                  background: roomPct === 100 ? "#10b981" : "linear-gradient(90deg,#22d3ee,#06b6d4)",
                }}
              />
            </div>
          </div>
        </SheetHeader>
      </div>

      {/* Scrollable detail body */}
      <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3.5">
        {/* Meter Readings */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Meter Readings</h4>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCustom}
                onChange={(e) => onModeToggle(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border text-cyan-600 cursor-pointer"
              />
              <span className="text-[10px] text-muted-foreground">Flat Rate (₹{draftUnitPrice}/unit)</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-extrabold uppercase text-muted-foreground block mb-1">Prev Reading</Label>
              <Input
                type="number"
                value={startReadingDraft}
                onChange={(e) => setStartReadingDraft(e.target.value)}
                onBlur={handleStartBlur}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                placeholder="Start"
                className="h-9 text-xs px-2.5 focus-visible:ring-cyan-500"
              />
            </div>
            <div>
              <Label className="text-[10px] font-extrabold uppercase text-muted-foreground block mb-1">Curr Reading</Label>
              <Input
                type="number"
                value={endReadingDraft}
                onChange={(e) => setEndReadingDraft(e.target.value)}
                onBlur={handleEndBlur}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                placeholder="End"
                className="h-9 text-xs px-2.5 focus-visible:ring-cyan-500"
              />
            </div>
            <div>
              <Label className="text-[10px] font-extrabold uppercase text-muted-foreground block mb-1">Units Consumed</Label>
              <Input
                type="number"
                value={unitsDraft}
                onChange={(e) => setUnitsDraft(e.target.value)}
                onBlur={handleUnitsBlur}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                placeholder="0"
                className="h-9 text-xs px-2.5 focus-visible:ring-cyan-500"
              />
            </div>
            <div>
              <Label className="text-[10px] font-extrabold uppercase text-muted-foreground block mb-1">Rate / Unit (₹)</Label>
              <Input
                type="number"
                value={priceDraft}
                disabled={!isCustom}
                onChange={(e) => setPriceDraft(e.target.value)}
                onBlur={handlePriceBlur}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                className="h-9 text-xs px-2.5 focus-visible:ring-cyan-500 disabled:opacity-40"
              />
            </div>
          </div>
        </div>

        {/* Bill Split Strategy */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Bill Split Strategy</h4>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label className="text-[10px] font-extrabold uppercase text-muted-foreground block mb-1">Strategy</Label>
              <select
                value={selectedSplitType}
                onChange={(e) => handleSplitTypeChange(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold focus-visible:outline-none focus:ring-1 focus:ring-cyan-500 text-foreground w-full cursor-pointer"
              >
                <option value="active_tenants">Split by Active Tenants</option>
                <option value="capacity">Split by Capacity ({room.capacity} sharing)</option>
                <option value="custom">Split Equally (Custom Count)</option>
              </select>
            </div>
            <div>
              {selectedSplitType === "custom" ? (
                <>
                  <Label className="text-[10px] font-extrabold uppercase text-muted-foreground block mb-1">Persons</Label>
                  <Input
                    type="number"
                    min="1"
                    value={splitCountDraft}
                    onChange={(e) => setSplitCountDraft(e.target.value)}
                    onBlur={handleSplitCountBlur}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    placeholder="Count"
                    className="h-9 text-xs px-2.5 focus-visible:ring-cyan-500"
                  />
                </>
              ) : (
                <div className="h-9 flex flex-col justify-center">
                  <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Total</span>
                  <span className="text-xs font-black text-cyan-500 mt-0.5">₹{draftTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-cyan-500/5 border border-cyan-500/20 px-3 py-2 text-[11px]">
            <span className="text-muted-foreground">
              {selectedSplitType === "custom" ? `Custom split by ${draftSplitCount} persons` : selectedSplitType === "capacity" ? `Split by ${room.capacity} slots` : `Proportional by active tenants`}
            </span>
            <span className="font-extrabold text-cyan-600 dark:text-cyan-400">{shareLabel}</span>
          </div>
        </div>

        {/* Tenant Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Tenant Breakdown</h4>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{dayWiseShares.length} tenants</span>
            </div>
          </div>

          {dayWiseShares.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-xs border border-dashed border-border rounded-2xl">
              No active tenants in this room.
            </div>
          ) : dayWiseShares.map((tenant: any) => {
            const isPaid = tenant.acPaymentStatus === "Paid";
            const hasOverdue = (tenant.overdueAcTotal || 0) > 0;
            const initials = tenant.name
              ? tenant.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
              : "??";

            return (
              <div
                key={tenant.name}
                className={cn(
                  "p-4 rounded-2xl border flex items-center justify-between gap-3 transition-colors",
                  isPaid
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : "border-border bg-card"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "h-10 w-10 rounded-full border flex items-center justify-center text-xs font-black shrink-0",
                    isPaid
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted border-border text-foreground"
                  )}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs truncate block">{tenant.name}</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">{tenant.daysStayed} days stayed</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Share: ₹{(tenant.share || 0).toLocaleString()}
                      {hasOverdue && (
                        <span className="text-orange-500 ml-1 font-bold">+ ₹{tenant.overdueAcTotal.toLocaleString()} overdue</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isPaid && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 rounded-xl border-border text-muted-foreground hover:text-foreground"
                      onClick={() => onShare(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, draftSplitCount, tenant.name)}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-[10px] font-bold rounded-xl border-0",
                      isPaid
                        ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-cyan-500 hover:bg-cyan-600 text-white"
                    )}
                    onClick={() => { if (tenant.id && onTogglePaymentStatus) onTogglePaymentStatus(tenant.id, tenant.acPaymentStatus || 'Pending'); }}
                  >
                    {isPaid ? <><Check className="h-3 w-3 mr-1" /> Paid</> : "Mark Paid"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail footer */}
      <div
        className="border-t border-border bg-background/95 backdrop-blur p-4 flex items-center gap-2 shrink-0"
        style={{ paddingBottom: "calc(81px + env(safe-area-inset-bottom, 0px))" }}
      >
        <Button
          variant="outline"
          className="flex-1 text-[11px] font-bold h-11 rounded-xl"
          onClick={() => onShare(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, draftSplitCount)}
        >
          <Bell className="mr-1.5 h-3.5 w-3.5" /> Send Reminder
        </Button>
        <Button
          className="flex-1 text-[11px] font-bold h-11 rounded-xl bg-[linear-gradient(100deg,#06b6d4,#3b82f6)] text-white hover:opacity-95 shadow-sm"
          onClick={() => onShare(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, draftSplitCount)}
        >
          <Zap className="mr-1.5 h-3.5 w-3.5" /> Share Bill
        </Button>
      </div>
    </div>
  );
};
