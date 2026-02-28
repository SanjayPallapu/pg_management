import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Check, 
  Upload, 
  Smartphone, 
  Wallet, 
  CreditCard,
  Loader2,
  Clock,
  Copy,
  MessageCircle,
  ExternalLink,
  Zap
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { usePG } from '@/contexts/PGContext';
import { SUBSCRIPTION_PLANS, PAYMENT_METHODS, ADMIN_UPI_ID, ADMIN_WHATSAPP } from '@/types/pg';
import { toast } from 'sonner';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_ICONS = {
  upi: Smartphone,
  gpay: Wallet,
  phonepe: CreditCard,
  paytm: Smartphone,
};

export const UpgradeDialog = ({ open, onOpenChange }: UpgradeDialogProps) => {
  const { subscription } = usePG();
  const { createPaymentRequest, uploadPaymentScreenshot, isUploading, isPending } = useSubscription();
  const { initiateCheckout, isLoading: stripeLoading } = useStripeCheckout();
  const [selectedPlan, setSelectedPlan] = useState<'manual' | 'automatic'>('manual');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'plan' | 'payment' | 'confirm'>('plan');

  const currentPlan = SUBSCRIPTION_PLANS[selectedPlan];

  const copyUPI = () => {
    navigator.clipboard.writeText(ADMIN_UPI_ID);
    toast.success('UPI ID copied!');
  };

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    
    const amount = currentPlan.price;
    const upiUrl = `upi://pay?pa=${ADMIN_UPI_ID}&pn=PG%20Manager&am=${amount}&cu=INR&tn=${selectedPlan}%20Plan`;
    
    if (methodId === 'gpay') {
      window.open(upiUrl, '_blank');
    } else if (methodId === 'phonepe') {
      window.open(upiUrl, '_blank');
    } else if (methodId === 'paytm') {
      window.open(upiUrl, '_blank');
    } else if (methodId === 'upi') {
      copyUPI();
    }
    
    setStep('confirm');
  };

  const openWhatsApp = () => {
    const message = `Hi, I have paid ₹${currentPlan.price} for ${currentPlan.name} Plan subscription. Please verify and activate my account.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');
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
      amount: currentPlan.price,
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
            <p className="text-muted-foreground mb-4">
              Your payment is being reviewed. Contact admin on WhatsApp for quick activation.
            </p>
            <Button onClick={openWhatsApp} variant="outline" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Contact Admin
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Subscribe to Pro
          </DialogTitle>
          <DialogDescription>
            Unlock unlimited PGs and all features
          </DialogDescription>
        </DialogHeader>

        {step === 'plan' && (
          <div className="space-y-4">
            {/* Manual Plan */}
            <Card 
              className={`cursor-pointer transition-all ${selectedPlan === 'manual' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
              onClick={() => setSelectedPlan('manual')}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Manual Plan</h3>
                  <div className="text-right">
                    <span className="text-2xl font-bold">₹{SUBSCRIPTION_PLANS.manual.price}</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{SUBSCRIPTION_PLANS.manual.description}</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> <strong>Limited PGs</strong> (2)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> <strong>Unlimited</strong> tenants
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> Manual WhatsApp reminders
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> Payment receipts
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> Basic reports
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> AI logo generator
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Automatic Plan */}
            <Card 
              className={`cursor-pointer transition-all relative ${selectedPlan === 'automatic' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
              onClick={() => setSelectedPlan('automatic')}
            >
              <div className="absolute -top-2 right-4">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  Best Value
                </Badge>
              </div>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    Automatic Plan
                    <Crown className="h-4 w-4 text-amber-500" />
                  </h3>
                  <div className="text-right">
                    <span className="text-2xl font-bold">₹{SUBSCRIPTION_PLANS.automatic.price}</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{SUBSCRIPTION_PLANS.automatic.description}</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> <strong>Unlimited</strong> PGs
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> <strong>Unlimited</strong> tenants
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> <strong>Automated</strong> image reminders
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> Smart payment receipts
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> Daily activity reports
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> AI logo generator
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Button onClick={() => setStep('payment')} className="w-full">
              Continue to Payment - ₹{currentPlan.price}
            </Button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            {/* Razorpay Online Payment */}
            <Button
              className="w-full gap-2 py-6 text-base"
              onClick={() => {
                initiateCheckout({
                  plan: selectedPlan,
                  amount: currentPlan.price,
                  onSuccess: () => {
                    onOpenChange(false);
                  },
                });
              }}
              disabled={stripeLoading}
            >
              {stripeLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <><Zap className="h-5 w-5" /> Pay ₹{currentPlan.price} Online (Card/UPI/Net Banking)</>
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or pay manually via UPI</span>
              </div>
            </div>

            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Pay to UPI ID</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-mono font-bold">{ADMIN_UPI_ID}</code>
                <Button variant="ghost" size="icon" onClick={copyUPI}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-2xl font-bold text-primary mt-2">₹{currentPlan.price}</p>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Select payment app to pay manually
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
                    <CardContent className="py-4 text-center">
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
            {/* Payment Status Header */}
            <div className="text-center py-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <Badge className="mb-3 bg-primary/20 text-primary border-0">
                <Clock className="h-3 w-3 mr-1" /> Pending Verification
              </Badge>
              <h3 className="text-xl font-bold mb-2">Payment Submitted</h3>
              <p className="text-sm text-muted-foreground">
                Please upload your payment proof below
              </p>
            </div>

            {/* Payment Details */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium">{currentPlan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-lg">₹{currentPlan.price}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="font-medium capitalize">{selectedMethod}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Screenshot Upload */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Upload Payment Proof</p>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                {screenshotUrl ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img 
                        src={screenshotUrl} 
                        alt="Payment proof" 
                        className="h-48 object-contain rounded-lg shadow-sm"
                      />
                      <div className="absolute top-2 right-2 bg-green-500/90 text-white rounded-full p-2">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-xs text-green-600 font-medium">Screenshot uploaded successfully</p>
                    <Button variant="outline" size="sm" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-3 w-3 mr-1" />
                        Replace
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
                      <div className="space-y-2">
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium text-foreground">Click to upload or drag</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
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
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button 
                onClick={handleSubmit} 
                className="w-full gap-2"
                disabled={!screenshotUrl || createPaymentRequest.isPending}
              >
                {createPaymentRequest.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Check className="h-4 w-4" /> Submit Payment</>
                )}
              </Button>

              <Button 
                variant="outline" 
                onClick={openWhatsApp} 
                className="w-full gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Contact Admin on WhatsApp
              </Button>

              <Button variant="ghost" onClick={() => setStep('payment')} className="w-full text-xs">
                Choose Another Method
              </Button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
              <p className="text-xs text-blue-900 dark:text-blue-200">
                <strong>Note:</strong> Your subscription will be activated once admin verifies the payment. You'll receive confirmation via email.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
