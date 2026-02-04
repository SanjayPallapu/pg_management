import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User, 
  CreditCard,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AdminPaymentApprovalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaymentRequest {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  screenshot_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  user_email?: string;
  // Profile info
  full_name?: string;
  phone?: string;
  city?: string;
}

export const AdminPaymentApproval = ({ open, onOpenChange }: AdminPaymentApprovalProps) => {
  const { isAdmin } = useAuth();
  const { approvePaymentRequest, rejectPaymentRequest } = useSubscription();
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Fetch all pending payment requests with profile info
  const { data: paymentRequests, isLoading, refetch } = useQuery({
    queryKey: ['admin-payment-requests', page],
    queryFn: async () => {
      const end = page * pageSize - 1;
      const { data, error } = await supabase
        .from('payment_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, end);

      if (error) throw error;
      
      // Fetch profile info for each user
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, city')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(request => ({
        ...request,
        full_name: profileMap.get(request.user_id)?.full_name || null,
        phone: profileMap.get(request.user_id)?.phone || null,
        city: profileMap.get(request.user_id)?.city || null,
      })) as PaymentRequest[];
    },
    enabled: open && isAdmin,
  });

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    await approvePaymentRequest.mutateAsync(selectedRequest.id);
    setShowApproveDialog(false);
    setSelectedRequest(null);
    refetch();
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    await rejectPaymentRequest.mutateAsync({
      requestId: selectedRequest.id,
      notes: rejectNotes || undefined,
    });
    setShowRejectDialog(false);
    setSelectedRequest(null);
    setRejectNotes('');
    refetch();
  };

  const pendingRequests = paymentRequests?.filter(r => r.status === 'pending') || [];
  const processedRequests = paymentRequests?.filter(r => r.status !== 'pending') || [];
  const canLoadMore = (paymentRequests?.length || 0) >= page * pageSize;

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Approvals
            </SheetTitle>
            <SheetDescription>
              Review and approve subscription payment requests
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Pending Requests */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Pending ({pendingRequests.length})
                  </h3>
                  
                  {pendingRequests.length === 0 ? (
                    <Card>
                      <CardContent className="py-6 text-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No pending payment requests</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequests.map((request) => (
                        <Card key={request.id} className="border-amber-200 dark:border-amber-800">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {request.full_name || 'Unknown User'}
                                  </span>
                                </div>
                                {request.phone && (
                                  <p className="text-xs text-muted-foreground mb-1">📱 {request.phone}</p>
                                )}
                                {request.city && (
                                  <p className="text-xs text-muted-foreground mb-1">📍 {request.city}</p>
                                )}
                                <p className="font-semibold text-lg">₹{request.amount}</p>
                                <p className="text-sm text-muted-foreground capitalize">
                                  via {request.payment_method}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground mb-3">
                              Submitted {format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>

                            {request.screenshot_url && (
                              <div className="mb-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => window.open(request.screenshot_url!, '_blank')}
                                >
                                  <ImageIcon className="h-4 w-4" />
                                  View Screenshot
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowApproveDialog(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Processed Requests */}
                {processedRequests.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      History ({processedRequests.length})
                    </h3>
                    
                    <div className="space-y-2">
                      {processedRequests.slice(0, 10).map((request) => (
                        <Card key={request.id} className="opacity-75">
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">₹{request.amount}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(request.created_at), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              <Badge 
                                variant={request.status === 'approved' ? 'default' : 'destructive'}
                                className={request.status === 'approved' ? 'bg-green-600' : ''}
                              >
                                {request.status === 'approved' ? (
                                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</>
                                ) : (
                                  <><XCircle className="h-3 w-3 mr-1" /> Rejected</>
                                )}
                              </Badge>
                            </div>
                            {request.notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                Note: {request.notes}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {canLoadMore && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => p + 1)}
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will activate the user's Pro subscription for 30 days.
              Amount: ₹{selectedRequest?.amount}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
              disabled={approvePaymentRequest.isPending}
            >
              {approvePaymentRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Approve'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the payment request. You can add a reason below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            className="my-4"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive hover:bg-destructive/90"
              disabled={rejectPaymentRequest.isPending}
            >
              {rejectPaymentRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Reject'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
