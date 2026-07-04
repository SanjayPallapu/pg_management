import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageCircle, Download, ArrowLeft, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { VisitorFollowUpTemplate, type VisitorFollowUpData } from "./VisitorFollowUpTemplate";
import { generateReceiptImage, downloadReceiptImage, dataURLtoBlob } from "@/utils/generateReceiptImage";
import { usePG } from "@/contexts/PGContext";
import { Room } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
}

export const VisitorFollowUpDialog = ({ open, onOpenChange, rooms }: Props) => {
  const { currentPG } = usePG();
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitDate, setVisitDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [roomNoInterested, setRoomNoInterested] = useState("");
  const [sharingType, setSharingType] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const templateRef = useRef<HTMLDivElement>(null);
  const [templateData, setTemplateData] = useState<VisitorFollowUpData | null>(null);

  // Sync template data when fields change
  useEffect(() => {
    if (open) {
      setTemplateData({
        visitorName: visitorName || "Valued Visitor",
        visitDate,
        roomNoInterested: roomNoInterested === "none" ? undefined : roomNoInterested,
        sharingType: sharingType === "none" ? undefined : sharingType,
        pgName: currentPG?.name,
        pgLogoUrl: currentPG?.logoUrl,
      });
      // Clear generated image so they must re-generate if inputs change
      setGeneratedImage(null);
    }
  }, [visitorName, visitDate, roomNoInterested, sharingType, open, currentPG]);

  const generateTemplate = useCallback(async () => {
    if (!visitorName.trim()) {
      toast({ title: "Name required", description: "Please enter visitor's name first.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      // Small timeout to allow state to settle
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (templateRef.current) {
        const dataUrl = await generateReceiptImage(templateRef.current);
        setGeneratedImage(dataUrl);
        toast({ title: "Template image generated!" });
      }
    } catch (error) {
      console.error("Error generating followup template:", error);
      toast({ title: "Failed to generate image", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [visitorName]);

  const handleDownload = () => {
    if (!generatedImage) return;
    const safeName = visitorName.replace(/\s+/g, "-").toLowerCase();
    downloadReceiptImage(generatedImage, `visit-followup-${safeName}`);
  };

  const shareToWhatsApp = async () => {
    if (!generatedImage) return;
    setIsSending(true);
    try {
      const blob = dataURLtoBlob(generatedImage);
      const safeName = visitorName.replace(/\s+/g, "-").toLowerCase();
      const file = new File([blob], `visit-followup-${safeName}.png`, { type: "image/png" });

      let phone = visitorPhone.replace(/\D/g, "");
      const displayPhone = phone.startsWith("91") ? phone.slice(2) : phone;

      // Copy template text message to clipboard for sharing
      const pgName = currentPG?.name || "our hostel";
      const messageText = 
        `🏡 *Visit Confirmation - ${pgName}* 🏡\n` +
        `---------------------------------\n` +
        `Hello *${visitorName}*,\n\n` +
        `Thank you for visiting ${pgName}! We hope you had a good experience looking at our room options.\n\n` +
        `We wanted to politely follow up to see if you would like to confirm your booking, as beds are filling up fast for the upcoming month.\n\n` +
        `Please let us know your decision so we can block the vacancy for you. We look forward to welcoming you!\n\n` +
        `Warm regards,\n` +
        `Management`;

      // Copy phone number or message to clipboard
      try {
        await navigator.clipboard.writeText(displayPhone);
      } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = displayPhone;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      const nav = navigator as any;
      if (nav?.share && nav?.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "Visit Confirmation Enquiry",
          text: messageText,
        });
      } else {
        downloadReceiptImage(generatedImage, `visit-followup-${safeName}`);
        toast({ 
          title: "Visitor details copied!", 
          description: "Visitor phone number copied to clipboard. Redirecting to WhatsApp..." 
        });
        window.location.href = "https://wa.me/";
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Share failed", variant: "destructive" });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setGeneratedImage(null);
    setVisitorName("");
    setVisitorPhone("");
    setRoomNoInterested("");
    setSharingType("");
    onOpenChange(false);
  };

  return (
    <>
      {/* Hidden template for screenshot generation */}
      {templateData && (
        <div 
          style={{ 
            position: "fixed", 
            left: "0", 
            top: "0", 
            transform: "translateX(-200vw)", 
            zIndex: -1, 
            pointerEvents: "none" 
          }} 
          aria-hidden="true"
        >
          <VisitorFollowUpTemplate ref={templateRef} data={templateData} />
        </div>
      )}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-[420px] rounded-lg">
          <DialogHeader className="text-center flex flex-col items-center justify-center">
            <DialogTitle className="flex items-center gap-2 text-base font-bold justify-center">
              🏡 Send Visit Confirmation
            </DialogTitle>
            <DialogDescription className="text-xs mt-1 max-w-[320px] text-center">
              Send a polite followup template to visitors asking if they plan to join.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label className="text-xs">Visitor Name *</Label>
              <Input
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="e.g. John Doe"
                required
              />
            </div>

            <div>
              <Label className="text-xs">Visitor Phone (for WhatsApp)</Label>
              <Input
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                type="tel"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Visit Date</Label>
                <Input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Interested Room</Label>
                <Select value={roomNoInterested || "none"} onValueChange={setRoomNoInterested}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.roomNo}>
                        Room {r.roomNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Sharing Preference</Label>
              <Select value={sharingType || "none"} onValueChange={setSharingType}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Select sharing" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="1">1 Sharing (Single)</SelectItem>
                  <SelectItem value="2">2 Sharing</SelectItem>
                  <SelectItem value="3">3 Sharing</SelectItem>
                  <SelectItem value="4">4 Sharing</SelectItem>
                  <SelectItem value="5">5 Sharing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {generatedImage && (
              <div className="relative mt-2 rounded-lg border overflow-hidden bg-slate-50">
                <img src={generatedImage} alt="Visit Followup Template" className="w-full max-h-[180px] object-contain mx-auto" />
                <Button size="sm" variant="secondary" className="absolute top-2 right-2 h-7 w-7 p-0" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col mt-2">
            {!generatedImage ? (
              <Button
                onClick={generateTemplate}
                disabled={isGenerating || !visitorName.trim()}
                className="w-full h-10 text-xs"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Template...</>
                ) : (
                  "Generate Followup Image"
                )}
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button
                  onClick={generateTemplate}
                  disabled={isGenerating}
                  variant="outline"
                  className="flex-1 h-10 text-xs"
                >
                  Regenerate
                </Button>
                <Button
                  onClick={shareToWhatsApp}
                  disabled={isSending}
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 h-10 text-xs text-white"
                >
                  {isSending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Sending...</>
                  ) : (
                    <><MessageCircle className="h-4 w-4" />WhatsApp Followup</>
                  )}
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={handleClose} className="w-full h-9 text-xs">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
