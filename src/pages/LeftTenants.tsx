import { useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRooms } from '@/hooks/useRooms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { hasTenantLeftNow, parseDateOnly } from '@/utils/dateOnly';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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

  const { rooms, isLoading } = useRooms();

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

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Left Tenants');
    
    // Auto-size columns
    const colWidths = [
      { wch: 10 }, // Room No
      { wch: 20 }, // Tenant Name
      { wch: 12 }, // Phone
      { wch: 15 }, // Join Date
      { wch: 15 }, // Leave Date
    ];
    ws['!cols'] = colWidths;
    
    XLSX.writeFile(wb, `Left_Tenants${roomNo ? `_Room_${roomNo}` : ''}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }, [leftTenants, roomNo]);

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
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-medium text-foreground">{leftTenants.length}</span>
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
              leftTenants.map(({ roomNo: rn, tenant }) => (
                <Card key={tenant.id} className="rounded-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{tenant.name}</CardTitle>
                      <Badge variant="outline">Room {rn}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-sm">
                    <div className="text-muted-foreground">Phone: <span className="text-foreground">{tenant.phone}</span></div>
                    <div className="text-muted-foreground">Joined: <span className="text-foreground">{format(parseDateOnly(tenant.startDate), 'dd MMM yyyy')}</span></div>
                    {tenant.endDate && (
                      <div className="text-muted-foreground">Left: <span className="text-foreground">{format(parseDateOnly(tenant.endDate), 'dd MMM yyyy')}</span></div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default LeftTenants;
