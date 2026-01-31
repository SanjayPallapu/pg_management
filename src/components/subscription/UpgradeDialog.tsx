import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Crown, 
  Check, 
  Upload, 
  Smartphone, 
  MessageCircle, 
  Wallet, 
  CreditCard,
  Loader2,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { usePG } from '@/contexts/PGContext';
import { SUBSCRIPTION_PLANS, PAYMENT_METHODS } from '@/types/pg';
import { toast } from 'sonner';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_ICONS = {
  upi: Smartphone,
  whatsapp: MessageCircle,
  gpay: Wallet,
  phonepe: CreditCard,
};

const UPI_ID = 'yourupi@bank'; // Replace with actual UPI ID
const WHATSAPP_NUMBER = '919989568666'; // Replace with actual WhatsApp number
const WHATSAPP_MESSAGE = "Hi, I want to upgrade my PG Management App to Pro Plan. My payment is complete.";

export const UpgradeDialog = ({ open, onOpenChange }: UpgradeDialogProps) => {
  const { subscription } = usePG();
  const { createPaymentRequest, uploadPaymentScreenshot, isUploading, isPending } = useSubscription();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'plan' | 'payment' | 'confirm'>('plan');

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    
    // Open payment app/link
    if (methodId === 'whatsapp') {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`, '_blank');
    } else if (methodId === 'gpay') {
      window.open(`upi://pay?pa=${UPI_ID}&pn=PG%20Management&am=${SUBSCRIPTION_PLANS.pro.price}&cu=INR`, '_blank');
    } else if (methodId === 'phonepe') {
      window.open(`phonepe://pay?pa=${UPI_ID}&pn=PG%20Management&am=${SUBSCRIPTION_PLANS.pro.price}&cu=INR`, '_blank');
    } else if (methodId === 'upi') {
      // Show UPI ID to copy
      navigator.clipboard.writeText(UPI_ID);
      toast.success('UPI ID copied to clipboard!');
    }
    
    setStep('confirm');
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadPaymentScreenshot(file);
    if (url) {
      setScreenshotUrl(url);
      toast.success('Screenshot uploaded!');
    }
  };

  const handleSubmit = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    await createPaymentRequest.mutateAsync({
      amount: SUBSCRIPTION_PLANS.pro.price,
      paymentMethod: selectedMethod,
      screenshotUrl: screenshotUrl || undefined,
    });

    onOpenChange(false);
  };

  if (isPending) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Payment Under Review
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-muted-foreground">
              Your payment is being reviewed. You'll be notified once your Pro plan is activated.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            Unlock unlimited PGs, automated reminders, and more
          </DialogDescription>
        </DialogHeader>

        {step === 'plan' && (
          <div className="space-y-4">
            {/* Free Plan */}
            <Card className="border-muted">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Free Plan</h3>
                  <Badge variant="secondary">Current</Badge>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" /> 1 PG
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" /> 10 tenants max
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" /> Manual reminders
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-primary ring-2 ring-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    Pro Plan
                  </h3>
                  <div className="text-right">
                    <span className="text-2xl font-bold">₹{SUBSCRIPTION_PLANS.pro.price}</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> <strong>Unlimited</strong> PGs
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> <strong>Unlimited</strong> tenants
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> Automated image reminders
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> Daily activity reports
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> AI logo generator
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> Multi-admin support
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Button onClick={() => setStep('payment')} className="w-full">
              Continue to Payment
            </Button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Select your preferred payment method
            </p>

            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = PAYMENT_ICONS[method.id as keyof typeof PAYMENT_ICONS];
                return (
                  <Card
                    key={method.id}
                    className="cursor-pointer hover:border-primary transition-all"
                    onClick={() => handleMethodSelect(method.id)}
                  >
                    <CardContent className="pt-4 text-center">
                      <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium text-sm">{method.name}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button variant="ghost" onClick={() => setStep('plan')} className="w-full">
              Back
            </Button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                After completing payment, upload your screenshot or click "I have paid"
              </p>
            </div>

            <div className="space-y-3">
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {screenshotUrl ? (
                  <div className="space-y-2">
                    <img 
                      src={screenshotUrl} 
                      alt="Payment proof" 
                      className="h-32 mx-auto object-contain rounded"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <label className="cursor-pointer">
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleScreenshotUpload}
                        />
                      </label>
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Upload payment screenshot (optional)
                        </p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleScreenshotUpload}
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full"
                disabled={createPaymentRequest.isPending}
              >
                {createPaymentRequest.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <>I have paid</>
                )}
              </Button>

              <Button variant="ghost" onClick={() => setStep('payment')} className="w-full">
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
