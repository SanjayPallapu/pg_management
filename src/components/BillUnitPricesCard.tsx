import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  IndianRupee,
  Zap,
  ArrowLeft,
  Share2,
  Download,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePG } from "@/contexts/PGContext";

import { generateReceiptImage, downloadReceiptImage } from "@/utils/generateReceiptImage";
import { BillUnitPricesTemplate, type BillPricesData } from "./BillUnitPricesTemplate";

// AP LT-II Commercial slabs (must match useElectricityReadings.ts)
const AP_SLABS = [
  { slab: "0–50 units", rate: 5.40 },
  { slab: "51–100 units", rate: 7.65 },
  { slab: "101–300 units", rate: 9.05 },
  { slab: "301–500 units", rate: 9.60 },
  { slab: "Above 500 units", rate: 10.15 },
];

const FIXED_CHARGES = [
  { range: "Up to 50 units", charge: 30 },
  { range: "51–100 units", charge: 40 },
  { range: "Above 100 units", charge: 45 },
];

const fmt = (n: number) => `₹${Math.floor(n).toLocaleString("en-IN")}`;

export const BillUnitPricesCard = () => {
  const { currentPG } = usePG();
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const templateRef = useRef<HTMLDivElement>(null);

  const pricesData: BillPricesData = {
    pgName: currentPG?.name || "PG Management",
    pgLogoUrl: currentPG?.logoUrl || "/icon-512.png",
    electricitySlabs: AP_SLABS,
    fixedCharges: FIXED_CHARGES,
    effectiveDate: new Date().toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    }),
  };

  const handleGenerate = useCallback(async () => {
    if (!templateRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(templateRef.current);
      setGeneratedImage(dataUrl);
      toast({ title: "Price card generated!" });
    } catch (e) {
      console.error("Price card generation failed:", e);
      toast({ title: "Failed to generate image", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleDownload = () => {
    if (!generatedImage) return;
    downloadReceiptImage(generatedImage, `bill-prices-${currentPG?.name || "pg"}`);
    toast({ title: "Price card downloaded!" });
  };

  const shareToWhatsApp = async () => {
    if (!generatedImage) return;
    setIsSending(true);
    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const pgName = (currentPG?.name || "pg").replace(/\s+/g, "-").toLowerCase();
      const file = new File([blob], `bill-prices-${pgName}.png`, { type: "image/png" });

      const navAny = navigator as any;
      if (navAny?.share && navAny?.canShare?.({ files: [file] })) {
        await navAny.share({
          files: [file],
          title: "Current Bill & Unit Prices",
          text: `Current pricing and electricity rates for ${currentPG?.name || "PG"}`,
        });
        toast({ title: "Shared successfully!" });
      } else {
        // Fallback: download + open WhatsApp
        downloadReceiptImage(generatedImage, `bill-prices-${pgName}`);
        toast({
          title: "Image downloaded!",
          description: "Open WhatsApp and share the downloaded image.",
        });
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("Share failed:", e);
        toast({ title: "Share failed", variant: "destructive" });
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Summary Card */}
      <Card
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={() => {
          setOpen(true);
          setGeneratedImage(null);
        }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              Bill Unit Prices
            </div>
            <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
              {AP_SLABS.length} slabs
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            View current electricity rates & share via WhatsApp
          </p>
        </CardContent>
      </Card>

      {/* Full Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          {/* Header */}
          <SheetHeader className="border-b px-4 py-4 space-y-0">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="h-9 w-9 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <IndianRupee className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <SheetTitle className="text-base leading-tight">
                    Current Pricing & Rates
                  </SheetTitle>
                  <SheetDescription className="text-xs">
                    Electricity slabs • Fixed charges
                  </SheetDescription>
                </div>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-5 py-4">
              {/* Electricity Slabs Section */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Electricity Charges (AP LT-II Commercial)
                </h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-50/50 dark:bg-blue-950/30">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-700 dark:text-blue-400">
                          Slab Range
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-blue-700 dark:text-blue-400">
                          Rate / Unit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {AP_SLABS.map((slab, i) => (
                        <tr
                          key={slab.slab}
                          className={i < AP_SLABS.length - 1 ? "border-b" : ""}
                        >
                          <td className="px-4 py-2.5">{slab.slab}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">
                            ₹{slab.rate.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fixed Charges Section */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <IndianRupee className="h-4 w-4 text-green-500" />
                  Fixed Charges (per month)
                </h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {FIXED_CHARGES.map((fc, i) => (
                        <tr
                          key={fc.range}
                          className={i < FIXED_CHARGES.length - 1 ? "border-b" : ""}
                        >
                          <td className="px-4 py-2.5">{fc.range}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">
                            ₹{fc.charge}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Share Section */}
              <div className="space-y-3 pb-6">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  Share Price Card
                </h3>

                {!generatedImage ? (
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        Generate Shareable Image
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {/* Preview */}
                    <div className="rounded-xl border overflow-hidden bg-white">
                      <img
                        src={generatedImage}
                        alt="Price card preview"
                        className="w-full"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={handleDownload}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        onClick={shareToWhatsApp}
                        disabled={isSending}
                        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Hidden template for image generation */}
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: -1,
          pointerEvents: "none",
          transform: "translateX(-200vw)",
        }}
      >
        <BillUnitPricesTemplate ref={templateRef} data={pricesData} />
      </div>
    </>
  );
};
