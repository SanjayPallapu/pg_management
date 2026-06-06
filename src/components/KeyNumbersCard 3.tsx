import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/proxyClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      toast({ title: 'Key number added' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to add key', description: err?.message ?? String(err), variant: 'destructive' as any });
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
      toast({ title: 'Key number updated' });
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
      toast({ title: 'Key number deleted' });
    },
  });

  const copyToClipboard = (serial: string, room: string) => {
    navigator.clipboard.writeText(`${serial} - ${room}`);
    toast({ title: 'Copied to clipboard', description: `${serial} - ${room}` });
  };

  const copyAll = () => {
    const text = keyNumbers.map(k => `${k.serial_number} - ${k.room_number}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'All key numbers copied' });
  };

  const handleAdd = () => {
    if (!newSerial.trim() || !newRoom.trim()) return;
    addKeyNumber.mutate({ serial_number: newSerial.trim(), room_number: newRoom.trim() });
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
                    <div className="flex items-center gap-1 pt-2 border-t">
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
                  )}
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
