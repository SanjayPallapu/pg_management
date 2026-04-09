import { useEffect, useMemo, useCallback, useState } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRooms } from '@/hooks/useRooms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { hasTenantLeftNow, parseDateOnly } from '@/utils/dateOnly';
import { format } from 'date-fns';
import { Download, Pencil, Trash2, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const setMeta = (name: string, content: string) => {
  const el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (el) el.content = content;
};

const upsertCanonical = (href: string) => {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
};

const LeftTenants = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomNo = searchParams.get('roomNo');
  const { isAdmin } = useAuth();

  const { rooms, isLoading, updateTenant, removeTenant } = useRooms();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', startDate: '', endDate: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [reactivateConfirm, setReactivateConfirm] = useState<string | null>(null);

  // Handle OS back gesture to close dialogs
  useBackGesture(!!deleteConfirm, () => setDeleteConfirm(null));
  useBackGesture(!!reactivateConfirm, () => setReactivateConfirm(null));

  useEffect(() => {
    document.title = 'Left Tenants | PG Management';
    setMeta('description', 'Left tenants list with room details and leave dates for PG management.');
    upsertCanonical(window.location.href);
  }, []);

  const leftTenants = useMemo(() => {
    const all = rooms.flatMap(r =>
      r.tenants
        .filter(t => !!t.endDate)
        .map(t => ({
          roomNo: r.roomNo,
          capacity: r.capacity,
          tenant: t,
        }))
    );

    if (!roomNo) return all;
    return all.filter(x => x.roomNo === roomNo);
  }, [rooms, roomNo]);

  const handleExportExcel = useCallback(() => {
    const data = leftTenants.map(({ roomNo: rn, tenant }) => ({
      'Room No': rn,
      'Tenant Name': tenant.name,
      'Phone': tenant.phone,
      'Join Date': format(parseDateOnly(tenant.startDate), 'dd MMM yyyy'),
      'Leave Date': tenant.endDate ? format(parseDateOnly(tenant.endDate), 'dd MMM yyyy') : '',
    }));

    const colWidths = [
      { wch: 10 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
    ];
    const wb = applyStyledExport(data, 'Left Tenants', colWidths, {
      fileName: `Left_Tenants${roomNo ? `_Room_${roomNo}` : ''}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    });
    styledXLSX.writeFile(wb, `Left_Tenants${roomNo ? `_Room_${roomNo}` : ''}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }, [leftTenants, roomNo]);

  const handleStartEdit = (tenant: any) => {
    setEditingTenantId(tenant.id);
    setEditForm({
      name: tenant.name,
      phone: tenant.phone,
      startDate: tenant.startDate,
      endDate: tenant.endDate || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTenantId) return;
    await updateTenant.mutateAsync({
      tenantId: editingTenantId,
      updates: {
        name: editForm.name,
        phone: editForm.phone,
        startDate: editForm.startDate,
        endDate: editForm.endDate || undefined,
      },
    });
    toast({ title: 'Tenant updated successfully' });
    setEditingTenantId(null);
  };

  const handleDelete = async (tenantId: string, tenantName?: string) => {
    await removeTenant.mutateAsync({ tenantId, tenantName });
    toast({ title: 'Tenant deleted successfully' });
    setDeleteConfirm(null);
  };

  const handleReactivate = async (tenantId: string) => {
    await updateTenant.mutateAsync({
      tenantId,
      updates: { endDate: undefined },
    });
    toast({ title: 'Tenant reactivated successfully' });
    setReactivateConfirm(null);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Left Tenants</h1>
            <p className="text-sm text-muted-foreground">
              {roomNo ? (
                <>Showing left tenants for Room <span className="font-medium text-foreground">{roomNo}</span>.</>
              ) : (
                <>All left tenants across rooms.</>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            {leftTenants.length > 0 && (
              <Button variant="outline" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/')}>Back</Button>
          </div>
        </header>

        <Separator />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground">{leftTenants.length}</span>
              </div>
              {isAdmin && leftTenants.length > 0 && (
                <Button
                  variant={isEditMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsEditMode(!isEditMode);
                    setEditingTenantId(null);
                  }}
                >
                  {isEditMode ? "Done" : "Edit"}
                </Button>
              )}
            </div>
            {roomNo && (
              <Badge variant="outline">Room {roomNo}</Badge>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Loading…</CardTitle>
                </CardHeader>
                <CardContent />
              </Card>
            ) : leftTenants.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">No left tenants</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  No tenants have been marked as left{roomNo ? ' for this room' : ''}.
                </CardContent>
              </Card>
            ) : (
              leftTenants.map(({ roomNo: rn, tenant }) => {
                const isEditing = editingTenantId === tenant.id;
                
                return (
                  <Card key={tenant.id} className="rounded-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Name"
                            className="font-medium"
                          />
                        ) : (
                          <CardTitle className="text-base">{tenant.name}</CardTitle>
                        )}
                        <Badge variant="outline">Room {rn}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">Phone</Label>
                            <Input
                              value={editForm.phone}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                              placeholder="Phone"
                              maxLength={10}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Joining Date</Label>
                            <Input
                              type="date"
                              value={editForm.startDate}
                              onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Leave Date</Label>
                            <Input
                              type="date"
                              value={editForm.endDate}
                              onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingTenantId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-muted-foreground">Phone: <span className="text-foreground">{tenant.phone}</span></div>
                          <div className="text-muted-foreground">Joined: <span className="text-foreground">{format(parseDateOnly(tenant.startDate), 'dd MMM yyyy')}</span></div>
                          {tenant.endDate && (
                            <div className="text-muted-foreground">Left: <span className="text-foreground">{format(parseDateOnly(tenant.endDate), 'dd MMM yyyy')}</span></div>
                          )}
                          
                          {isEditMode && (
                            <div className="flex gap-2 pt-2 border-t mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartEdit(tenant)}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                                onClick={() => setReactivateConfirm(tenant.id)}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reactivate
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteConfirm(tenant.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this tenant? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteConfirm) {
                const tenantInfo = leftTenants.find(t => t.tenant.id === deleteConfirm);
                handleDelete(deleteConfirm, tenantInfo?.tenant.name);
              }
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Confirmation Dialog */}
      <AlertDialog open={!!reactivateConfirm} onOpenChange={() => setReactivateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the leave date and mark the tenant as active again. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => reactivateConfirm && handleReactivate(reactivateConfirm)}>
              Reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default LeftTenants;