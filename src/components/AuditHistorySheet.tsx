import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuditLog } from '@/hooks/useAuditLog';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface AuditHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'create':
      return <Plus className="h-3 w-3" />;
    case 'update':
      return <Pencil className="h-3 w-3" />;
    case 'delete':
      return <Trash2 className="h-3 w-3" />;
    default:
      return null;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'create':
      return 'bg-green-500/20 text-green-700 dark:text-green-400';
    case 'update':
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
    case 'delete':
      return 'bg-red-500/20 text-red-700 dark:text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getTableLabel = (tableName: string) => {
  switch (tableName) {
    case 'tenants':
      return 'Tenant';
    case 'rooms':
      return 'Room';
    case 'tenant_payments':
      return 'Payment';
    case 'day_guests':
      return 'Day Guest';
    default:
      return tableName;
  }
};

const formatChanges = (changes: Record<string, { old: unknown; new: unknown }> | null) => {
  if (!changes) return null;
  
  return Object.entries(changes).map(([key, value]) => {
    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return (
      <div key={key} className="text-xs text-muted-foreground ml-4">
        <span className="font-medium">{formattedKey}:</span>{' '}
        <span className="text-pending line-through">{String(value.old ?? 'null')}</span>
        {' → '}
        <span className="text-paid">{String(value.new ?? 'null')}</span>
      </div>
    );
  });
};

export const AuditHistorySheet = ({ open, onOpenChange }: AuditHistorySheetProps) => {
  const { logs, isLoading } = useAuditLog();

  // Group logs by date
  const groupedLogs = logs.reduce((acc, log) => {
    const date = format(new Date(log.createdAt), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, typeof logs>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Activity History</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity recorded yet
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                <div key={date}>
                  <div className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                    {format(new Date(date), 'EEEE, MMM d, yyyy')}
                  </div>
                  <div className="space-y-3">
                    {dateLogs.map(log => (
                      <div key={log.id} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`${getActionColor(log.action)} border-0 flex items-center gap-1`}
                          >
                            {getActionIcon(log.action)}
                            {log.action}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getTableLabel(log.tableName)}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(log.createdAt), 'h:mm a')}
                          </span>
                        </div>
                        
                        {log.recordName && (
                          <div className="text-sm font-medium">
                            {log.recordName}
                          </div>
                        )}
                        
                        {log.changes && (
                          <div className="pt-1">
                            {formatChanges(log.changes)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
