import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, MessageCircle, Share2, Loader2 } from "lucide-react";
import { calculateAPCommercialBill } from "@/hooks/useElectricityReadings";
import { generateReceiptImage, downloadReceiptImage } from "@/utils/generateReceiptImage";
import { usePG } from "@/contexts/PGContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ExpenseEntry } from "@/hooks/useExpenseEntries";
interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entry: ExpenseEntry | null;
  units: number;
  originalNotes: string;
}
const fmt = (n: number) => `₹ ${Math.floor(n).toLocaleString("en-IN")}`;
export const CurrentBillReceiptDialog = ({
  open,
  onOpenChange,
  entry,
  units,
  originalNotes,
}: Props) => {
  const { currentPG } = usePG();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  if (!entry) return null;
  const pgName = currentPG?.name || "PG Management";
  const pgLogoUrl = currentPG?.logoUrl || "/icon-512.png";
  const apBill = calculateAPCommercialBill(units);
  
  // Format Month Year
  const dateObj = new Date(entry.entry_date);
  const monthYearLabel = format(dateObj, "MMMM yyyy");
  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(receiptRef.current);
      const filename = `current-bill-${(entry.subcategory || "floor").toLowerCase().replace(/\s+/g, "-")}-${format(dateObj, "MMM-yyyy")}`;
      downloadReceiptImage(dataUrl, filename);
      toast({ title: "Receipt downloaded successfully" });
    } catch (e) {
      console.error("Receipt download failed:", e);
      toast({ title: "Failed to download receipt", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };
  const handleShareWhatsApp = async () => {
    if (!receiptRef.current) return;
    setIsSending(true);
    try {
      const dataUrl = await generateReceiptImage(receiptRef.current);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const filename = `current-bill-${(entry.subcategory || "floor").toLowerCase().replace(/\s+/g, "-")}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      const nav = navigator as any;
      if (nav?.share && nav?.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "Electricity Current Bill",
          text: `Electricity current bill for ${entry.subcategory || "Floor"} - ${monthYearLabel}`,
        });
      } else {
        // Fallback: download the receipt image and copy text message
        downloadReceiptImage(dataUrl, filename.replace(".png", ""));
        
        const messageText = 
          `⚡ *Electricity Current Bill - ${pgName}* ⚡\n` +
          `---------------------------------\n` +
          `*Floor/Service:* ${entry.subcategory || "Floor/Service"}\n` +
          `*Bill Month:* ${monthYearLabel}\n` +
          `*Units Consumed:* ${units} units\n` +
          `---------------------------------\n` +
          `*Energy Charges:* ${fmt(apBill.energyCharges)}\n` +
          `*Fixed Charges:* ${fmt(apBill.fixedCharges)}\n` +
          `---------------------------------\n` +
          `*Total Bill Amount:* ${fmt(apBill.totalBill)}\n\n` +
          (originalNotes ? `*Notes:* ${originalNotes}\n\n` : "") +
          `Receipt image downloaded. Please pay standard electricity dues. Thank you! 🙏`;
        await navigator.clipboard.writeText(messageText);
        toast({ 
          title: "Share message copied!", 
          description: "WhatsApp message text copied to clipboard. Paste it in WhatsApp chat." 
        });
        
        // Open WhatsApp web or app
        window.open("https://wa.me/", "_blank");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("WhatsApp share failed:", e);
        toast({ title: "Failed to share via WhatsApp", variant: "destructive" });
      }
    } finally {
      setIsSending(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[550px] p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 border-b bg-slate-50">
          <DialogTitle className="text-sm font-semibold text-slate-800">Electricity Bill Receipt</DialogTitle>
        </DialogHeader>
        {/* Receipt Container wrapped in a hidden parent styled cleanly */}
        <div className="flex justify-center bg-slate-100 p-6 overflow-y-auto max-h-[70vh]">
          <div
            ref={receiptRef}
            style={{
              width: "480px",
              background: "#ffffff",
              fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
            }}
          >
            {/* Header with PG Logo */}
            <div style={{ width: "100%", textAlign: "center", padding: "24px 20px 8px" }}>
              <img
                src={pgLogoUrl}
                alt={pgName}
                crossOrigin="anonymous"
                style={{
                  width: "180px",
                  height: "auto",
                  margin: "0 auto",
                  display: "block",
                  maxHeight: "100px",
                  objectFit: "contain",
                }}
              />
              <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {pgName}
              </div>
            </div>
            {/* Bill Title & Period */}
            <div style={{ textAlign: "center", padding: "8px 20px 16px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
                <span style={{ fontSize: "22px" }}>⚡</span>
                <span>Electricity Bill</span>
              </div>
              <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 500, marginTop: "4px" }}>
                {monthYearLabel}
              </div>
            </div>
            {/* Service metadata strip */}
            <div style={{ margin: "0 24px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px" }}>
                <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
                  Floor / Service
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>
                  {entry.subcategory || "Floor"}
                </div>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px" }}>
                <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
                  Billing Date
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>
                  {format(new Date(entry.entry_date), "dd MMM yyyy")}
                </div>
              </div>
            </div>
            {/* Reading breakdown */}
            <div style={{ margin: "0 24px 16px", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <td style={{ padding: "10px 14px", color: "#475569", fontWeight: 600 }}>Units Consumed</td>
                    <td style={{ padding: "10px 14px", color: "#0f172a", fontWeight: 700, textAlign: "right" }}>
                      {units} Units
                    </td>
                  </tr>
                  {apBill.slabBreakdown.map((slab, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 14px 8px 24px", color: "#64748b", fontSize: "12px" }}>
                        • Slab {slab.slab}
                      </td>
                      <td style={{ padding: "8px 14px", color: "#334155", textAlign: "right", fontSize: "12px" }}>
                        {slab.units > 0 ? (
                          <span>
                            {slab.units} units × ₹{slab.rate.toFixed(2)} ={" "}
                            <strong>₹{Math.round(slab.amount).toLocaleString("en-IN")}</strong>
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>0 units</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 14px", color: "#475569", fontWeight: 500 }}>Energy Charges</td>
                    <td style={{ padding: "10px 14px", color: "#0f172a", fontWeight: 600, textAlign: "right" }}>
                      ₹ {Math.round(apBill.energyCharges).toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 14px", color: "#475569", fontWeight: 500 }}>Fixed Charges</td>
                    <td style={{ padding: "10px 14px", color: "#0f172a", fontWeight: 600, textAlign: "right" }}>
                      ₹ {apBill.fixedCharges}
                    </td>
                  </tr>
                  <tr style={{ background: "#fffbeb" }}>
                    <td style={{ padding: "12px 14px", color: "#b45309", fontWeight: 700 }}>
                      Total Bill (AP LT-II Commercial)
                    </td>
                    <td style={{ padding: "12px 14px", color: "#b45309", fontWeight: 800, textAlign: "right", fontSize: "16px" }}>
                      {fmt(apBill.totalBill)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Total Highlight Panel */}
            <div
              style={{
                margin: "0 24px 16px",
                background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                borderRadius: "10px",
                padding: "14px 16px",
                textAlign: "center",
                border: "1px solid #fcd34d",
              }}
            >
              <div style={{ fontSize: "11px", color: "#92400e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Bill Amount
              </div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#78350f", marginTop: "2px" }}>
                {fmt(entry.amount)}
              </div>
              <div style={{ fontSize: "12px", color: "#92400e", fontWeight: 500, marginTop: "2px" }}>
                Calculated for {entry.subcategory || "Floor"}
              </div>
            </div>
            {/* Notes if any */}
            {originalNotes && (
              <div style={{ margin: "0 24px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
                  Notes
                </div>
                <div style={{ fontSize: "12px", color: "#334155", marginTop: "3px", lineHeight: "1.4" }}>
                  {originalNotes}
                </div>
              </div>
            )}
            {/* Footer banner */}
            <div
              style={{
                background: "#0f172a",
                padding: "16px 20px",
                textAlign: "center",
                fontSize: "12px",
                color: "#e2e8f0",
                lineHeight: "1.5",
              }}
            >
              <p style={{ margin: 0, fontWeight: 500 }}>
                This is a computer-generated electricity bill receipt.
              </p>
            </div>
          </div>
        </div>
        {/* Share actions */}
        <div className="p-4 border-t bg-slate-50 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download
              </>
            )}
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleShareWhatsApp} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 mr-2" />
                Share via WhatsApp
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
