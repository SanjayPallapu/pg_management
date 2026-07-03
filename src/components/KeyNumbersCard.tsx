import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/proxyClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Key, Copy, Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { usePG } from '@/contexts/PGContext';

interface KeyNumber {
  id: string;
  serial_number: string;
  room_number: string;
}

export const KeyNumbersCard = () => {
  const queryClient = useQueryClient();
  const { currentPG } = usePG();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newSerial, setNewSerial] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSerial, setEditSerial] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  
  // Long press handling
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

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

  // Long press handlers
  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsExpanded(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleHeaderClick = () => {
    // Toggle on regular click as well for accessibility
    if (!isLongPress.current) {
      setIsExpanded(!isExpanded);
    }
    isLongPress.current = false;
  };

  return (
    <Card>
      <CardHeader 
        className="flex flex-row items-center justify-between p-4 pb-2 cursor-pointer select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onClick={handleHeaderClick}
      >
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          Room Key Numbers
          <span className="text-xs text-muted-foreground font-normal">
            ({keyNumbers.length})
          </span>
        </CardTitle>
        <div className="flex gap-1 items-center">
          {isExpanded && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); copyAll(); }}
                title="Copy all"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={editMode ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); setEditMode(!editMode); }}
                title="Edit mode"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="p-4 pt-0">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-1.5">
                  {keyNumbers.map((key) => (
                    <div key={key.id} className="flex items-center justify-between text-sm">
                      {editingId === key.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={editSerial}
                            onChange={(e) => setEditSerial(e.target.value)}
                            className="h-7 text-xs w-24"
                            placeholder="Serial"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            value={editRoom}
                            onChange={(e) => setEditRoom(e.target.value)}
                            className="h-7 text-xs w-14"
                            placeholder="Room"
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                            <Check className="h-3 w-3 text-paid" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-mono">
                            <span className="text-muted-foreground">{key.serial_number}</span>
                            <span className="mx-1.5 text-muted-foreground">→</span>
                            <span className="font-semibold">{key.room_number}</span>
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(key.serial_number, key.room_number)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {editMode && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleEdit(key)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => deleteKeyNumber.mutate(key.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Add new row in edit mode */}
                  {editMode && (
                    <div className="flex items-center gap-1.5 pt-2 border-t justify-between flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          value={newSerial}
                          onChange={(e) => setNewSerial(e.target.value)}
                          className="h-7 text-xs w-24"
                          placeholder="Serial #"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          value={newRoom}
                          onChange={(e) => setNewRoom(e.target.value)}
                          className="h-7 text-xs w-14"
                          placeholder="Room"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={handleAdd}
                          disabled={!newSerial.trim() || !newRoom.trim()}
                        >
                          <Plus className="h-4 w-4 text-paid" />
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                        onClick={() => setIsBulkOpen(true)}
                      >
                        Bulk Add
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

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
    </Card>
  );
};
