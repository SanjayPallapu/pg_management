import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/proxyClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { Key, Copy, Plus, Trash2, Edit2, Check, X, ChevronRight, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePG } from '@/contexts/PGContext';

interface KeyNumber {
  id: string;
  serial_number: string;
  room_number: string;
}

export const KeyNumbersCard = ({ defaultOpen = false, onClose, showSummaryCard = true }: { defaultOpen?: boolean; onClose?: () => void; showSummaryCard?: boolean }) => {
  const queryClient = useQueryClient();
  const { currentPG } = usePG();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleClose = () => {
      setIsOpen(false);
      setIsBulkOpen(false);
      onClose?.();
    };
    window.addEventListener('tab-click', handleClose);
    return () => window.removeEventListener('tab-click', handleClose);
  }, [onClose]);
  const [editMode, setEditMode] = useState(false);
  const [newSerial, setNewSerial] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSerial, setEditSerial] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const { data: keyNumbers = [], isLoading } = useQuery({
    queryKey: ['key-numbers', currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return [];
      const { data, error } = await supabase
        .from('key_numbers')
        .select('*')
        .eq('pg_id', currentPG.id)
        .order('room_number', { ascending: true });
      
      if (error) throw error;
      return data as KeyNumber[];
    },
    enabled: !!currentPG?.id,
  });

  const addKeyNumber = useMutation({
    mutationFn: async ({ serial_number, room_number }: { serial_number: string; room_number: string }) => {
      if (!currentPG?.id) throw new Error('No PG selected');
      const { error } = await supabase
        .from('key_numbers')
        .insert({ serial_number, room_number, pg_id: currentPG.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-numbers'] });
      setNewSerial('');
      setNewRoom('');

    },
    onError: (err: any) => {
      toast({ title: 'Failed to add key', description: err?.message ?? String(err), variant: 'destructive' as any });
    },
  });
  const addBulkKeyNumbers = useMutation({
    mutationFn: async (entries: { serial_number: string; room_number: string }[]) => {
      if (!currentPG?.id) throw new Error('No PG selected');
      const records = entries.map(e => ({
        serial_number: e.serial_number,
        room_number: e.room_number,
        pg_id: currentPG.id
      }));
      const { error } = await supabase
        .from('key_numbers')
        .insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-numbers'] });
      setBulkText('');
      setIsBulkOpen(false);
      toast({ title: 'Success', description: 'Bulk key numbers added successfully' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to add keys', description: err?.message ?? String(err), variant: 'destructive' });
    },
  });
  const updateKeyNumber = useMutation({
    mutationFn: async ({ id, serial_number, room_number }: { id: string; serial_number: string; room_number: string }) => {
      const { error } = await supabase
        .from('key_numbers')
        .update({ serial_number, room_number })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-numbers'] });
      setEditingId(null);

    },
  });

  const deleteKeyNumber = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('key_numbers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-numbers'] });

    },
  });

  const copyToClipboard = (serial: string, room: string) => {
    navigator.clipboard.writeText(`${serial} - ${room}`);

  };

  const copyAll = () => {
    const text = keyNumbers.map(k => `${k.serial_number} - ${k.room_number}`).join('\n');
    navigator.clipboard.writeText(text);

  };

  const handleAdd = () => {
    if (!newSerial.trim() || !newRoom.trim()) return;
    addKeyNumber.mutate({ serial_number: newSerial.trim(), room_number: newRoom.trim() });
  };

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n');
    const parsed: { serial_number: string; room_number: string }[] = [];
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      const match = line.match(/(\d+)\D+(\d+)/);
      if (match) {
        parsed.push({
          serial_number: match[1],
          room_number: match[2]
        });
      }
    }
    if (parsed.length === 0) {
      toast({ title: 'No valid key mappings found', description: 'Please format as: Serial -> Room (e.g. 2831317 -> 103)', variant: 'destructive' });
      return;
    }
    addBulkKeyNumbers.mutate(parsed);
  };

  const handleEdit = (key: KeyNumber) => {
    setEditingId(key.id);
    setEditSerial(key.serial_number);
    setEditRoom(key.room_number);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editSerial.trim() || !editRoom.trim()) return;
    updateKeyNumber.mutate({ id: editingId, serial_number: editSerial.trim(), room_number: editRoom.trim() });
  };

  const filteredKeyNumbers = keyNumbers.filter(k => 
    (k.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (k.room_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {showSummaryCard && (
        <Card 
          className="cursor-pointer transition-all hover:shadow-md border-primary/20 bg-card hover:bg-muted/30"
          onClick={() => setIsOpen(true)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                <Key className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-sm">Room Key Numbers</span>
                <span className="text-xs text-muted-foreground">Manage serial numbers for room keys</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                {keyNumbers.length} keys
              </span>
              <span className="text-xs text-primary font-medium">Open →</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Sheet open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) onClose?.(); }}>
        <SheetContent 
          side="right" 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-lg p-0"}
        >
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => { setIsOpen(false); onClose?.(); }} className="h-8 w-8 shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex flex-col text-left">
                    <SheetTitle className="text-base text-foreground font-bold">Room Key Numbers</SheetTitle>
                    <p className="text-xs text-muted-foreground">Manage serial numbers for room keys</p>
                  </div>
                </div>
                <div className="flex gap-1.5 items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={copyAll}
                    title="Copy all"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={editMode ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditMode(!editMode)}
                    title="Edit mode"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            {/* Search Filter Box */}
            <div className="px-4 py-2 border-b bg-background shrink-0">
              <Input
                type="text"
                placeholder="Search by serial number or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
              {isLoading ? (
                <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {filteredKeyNumbers.length === 0 ? (
                     <div className="text-sm text-muted-foreground text-center py-8">
                       No keys found matching "{searchQuery}"
                     </div>
                  ) : (
                    filteredKeyNumbers.map((key) => (
                      <div 
                        key={key.id} 
                        className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/20 text-sm hover:bg-muted/30 transition-colors"
                      >
                        {editingId === key.id ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <Input
                              value={editSerial}
                              onChange={(e) => setEditSerial(e.target.value)}
                              className="h-8 text-xs w-28"
                              placeholder="Serial"
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                              value={editRoom}
                              onChange={(e) => setEditRoom(e.target.value)}
                              className="h-8 text-xs w-20"
                              placeholder="Room"
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSaveEdit}>
                              <Check className="h-4 w-4 text-paid" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-primary/45" />
                              <span className="font-mono text-foreground font-medium">
                                <span className="text-muted-foreground">{key.serial_number}</span>
                                <span className="mx-2 text-muted-foreground/60">→</span>
                                <span className="font-semibold text-primary">{key.room_number}</span>
                              </span>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => copyToClipboard(key.serial_number, key.room_number)}
                                title="Copy mapping"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              {editMode && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleEdit(key)}
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    onClick={() => deleteKeyNumber.mutate(key.id)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}

                  <div className="flex items-center gap-1.5 pt-3 border-t mt-4 justify-between flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        value={newSerial}
                        onChange={(e) => setNewSerial(e.target.value)}
                        className="h-8 text-xs w-28"
                        placeholder="Serial #"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        value={newRoom}
                        onChange={(e) => setNewRoom(e.target.value)}
                        className="h-8 text-xs w-20"
                        placeholder="Room"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleAdd}
                        disabled={!newSerial.trim() || !newRoom.trim()}
                      >
                        <Plus className="h-5 w-5 text-paid" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs px-2 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                      onClick={() => setIsBulkOpen(true)}
                    >
                      Bulk Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-md w-[95%] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Add Key Numbers</DialogTitle>
            <DialogDescription>
              Paste serial numbers and room mappings. You can use arrows (→, {"->"}), hyphens (-), spaces, or commas as separators.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Example:&#10;2831317 -> 103&#10;2822934 -> 104&#10;3328825 - 105"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="min-h-[200px] font-mono text-sm mt-1"
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsBulkOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleBulkAdd}
              disabled={!bulkText.trim() || addBulkKeyNumbers.isPending}
            >
              {addBulkKeyNumbers.isPending ? 'Adding...' : 'Add All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
