import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Settings, Plus, Trash2, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Rule {
  id: string;
  title: string;
  description: string;
  details: string[];
}

const DEFAULT_RULES: Rule[] = [
  { id: '1', title: 'Meal Timings', description: 'Food service timings for the PG residents', details: ['Breakfast (Tiffin): 7:30 AM – 9:00 AM', 'Lunch: 12:30 PM – 2:00 PM', 'Dinner: 7:30 PM – 9:00 PM', 'Note: If food gets over during the above timings, residents may inform the management. We will be happy to prepare food again, subject to availability.'] },
  { id: '2', title: 'Night Gate Timing', description: 'Main gate closure timing', details: ['The main gate will be closed at 10:00 PM.'] },
  { id: '3', title: 'Corridor Lights', description: 'Corridor lighting schedule', details: ['Corridor lights will be switched off at 10:00 PM.'] },
  { id: '4', title: 'Room Cleaning', description: 'Room maintenance schedule', details: ['Rooms will be cleaned once a week.'] },
  { id: '5', title: 'Visitors Policy', description: 'Rules regarding visitors and guests', details: ['Friends, relatives, or any outsiders are not allowed inside rooms.', 'Bringing any friend into your room without prior permission will result in a fine of ₹1000.'] },
  { id: '6', title: 'Noise & Behavior', description: 'Community conduct expectations', details: ['Loud noise inside or outside the rooms is not permitted.', 'Do not disturb others.', "Respect other residents' privacy at all times."] },
  { id: '7', title: 'Rent Policy', description: 'Rent payment obligations', details: ['Full monthly rent must be paid even if you stay outside or go home for any duration.'] },
  { id: '8', title: 'Notice Period', description: 'Requirement before vacating', details: ['Residents must inform 15–30 days in advance before vacating the room.'] },
  { id: '9', title: 'Security Deposit', description: 'Security deposit terms', details: ['The security deposit is refundable at the time of vacating, subject to applicable deductions.'] },
  { id: '10', title: 'Luggage Charges', description: 'Extra luggage storage charges', details: ['Extra luggage storage will be charged ₹150 per day.'] },
  { id: '11', title: 'Issues & Support', description: 'How to report and resolve issues', details: ['If you face any issues or problems during your stay, please inform the management.', 'We will review the matter and try to resolve it as early as possible.'] },
];

interface PGRulesCardProps {
  onEditableTemplate?: (rules: Rule[]) => void;
}

export const PGRulesCard = ({ onEditableTemplate }: PGRulesCardProps) => {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const [editMode, setEditMode] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const handleEditRule = (rule: Rule) => {
    setEditingRule({ ...rule });
  };

  const handleSaveRule = () => {
    if (!editingRule) return;
    if (!editingRule.title.trim()) {
      toast({ title: 'Error', description: 'Rule title cannot be empty' });
      return;
    }
    // Show confirmation before saving
    setShowSaveConfirm(true);
  };

  const confirmSaveRule = () => {
    if (!editingRule) return;
    setRules(rules.map(r => r.id === editingRule.id ? editingRule : r));
    setEditingRule(null);
    setShowSaveConfirm(false);
    toast({ title: 'Success', description: 'Rule updated successfully' });
  };

  const handleAddRule = () => {
    const newRule: Rule = {
      id: Date.now().toString(),
      title: 'New Rule',
      description: 'Rule description',
      details: ['Detail 1'],
    };
    setRules([...rules, newRule]);
    setEditingRule(newRule);
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    setShowDeleteDialog(false);
    setRuleToDelete(null);
    toast({ title: 'Deleted', description: 'Rule removed successfully' });
  };

  const handleAddDetail = () => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      details: [...editingRule.details, 'New detail'],
    });
  };

  const handleUpdateDetail = (index: number, value: string) => {
    if (!editingRule) return;
    const newDetails = [...editingRule.details];
    newDetails[index] = value;
    setEditingRule({ ...editingRule, details: newDetails });
  };

  const handleRemoveDetail = (index: number) => {
    if (!editingRule) return;
    const newDetails = editingRule.details.filter((_, i) => i !== index);
    setEditingRule({ ...editingRule, details: newDetails });
  };

  return (
    <>
      <Card
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={() => setOpen(true)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              PG Rules & Regulations
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              {rules.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            View and manage PG rules and regulations for residents
          </p>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full md:w-2/3 flex flex-col">
          <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <div>
              <SheetTitle>PG Rules & Regulations</SheetTitle>
              <SheetDescription>Manage rules for your PG residents</SheetDescription>
            </div>
            {!editMode ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditMode(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditMode(false);
                  setEditingRule(null);
                }}
              >
                Done
              </Button>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 mt-4">
              {editMode && editingRule ? (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rule Title</label>
                    <Input
                      value={editingRule.title}
                      onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                      placeholder="Enter rule title"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={editingRule.description}
                      onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                      placeholder="Enter rule description"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Details</label>
                      <Button size="sm" variant="ghost" onClick={handleAddDetail} className="gap-1 h-7">
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {editingRule.details.map((detail, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Textarea
                            value={detail}
                            onChange={(e) => handleUpdateDetail(idx, e.target.value)}
                            placeholder={`Detail ${idx + 1}`}
                            className="text-sm"
                            rows={2}
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveDetail(idx)} className="h-fit">
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveRule} className="flex-1" size="sm">Save Rule</Button>
                    <Button variant="outline" onClick={() => setEditingRule(null)} size="sm" className="flex-1">Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  {rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 hover:bg-accent/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{rule.title}</h3>
                          <p className="text-xs text-muted-foreground">{rule.description}</p>
                        </div>
                        {editMode && (
                          <div className="flex gap-1 ml-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEditRule(rule)} className="h-7 w-7 p-0">
                              <Settings className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setRuleToDelete(rule.id); setShowDeleteDialog(true); }}
                              className="h-7 w-7 p-0"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <ul className="space-y-1 ml-4">
                        {rule.details.map((detail, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground list-disc">{detail}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {editMode && (
                    <Button onClick={handleAddRule} variant="outline" className="w-full gap-2" size="sm">
                      <Plus className="h-4 w-4" /> Add New Rule
                    </Button>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {!editMode && (
            <div className="border-t pt-4 mt-4">
              <Button
                onClick={() => onEditableTemplate?.(rules)}
                className="w-full gap-2"
                variant="default"
              >
                <BookOpen className="h-4 w-4" />
                View Template
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => ruleToDelete && handleDeleteRule(ruleToDelete)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save/Update Confirmation */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save changes to "{editingRule?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSaveRule}>Save Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};