import { useEffect, useState } from 'react';
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
import { BookOpen, Settings, Plus, Trash2, X, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePG } from '@/contexts/PGContext';
import { DEFAULT_RULES, getStoredPGRules, getStoredRulesLanguage, saveStoredPGRules, saveStoredRulesLanguage, type Rule, type RulesLanguage } from '@/lib/pgRules';

interface PGRulesCardProps {
  onEditableTemplate?: (rules: Rule[], language: RulesLanguage) => void;
}

export const PGRulesCard = ({ onEditableTemplate }: PGRulesCardProps) => {
  const { currentPG } = usePG();
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const [editMode, setEditMode] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [language, setLanguage] = useState<RulesLanguage>('en');

  const getRuleTitle = (rule: Rule) => language === 'te' && rule.titleTe ? rule.titleTe : rule.title;
  const getRuleDescription = (rule: Rule) => language === 'te' && rule.descriptionTe ? rule.descriptionTe : rule.description;
  const getRuleDetails = (rule: Rule) => language === 'te' && rule.detailsTe ? rule.detailsTe : rule.details;

  useEffect(() => {
    setRules(getStoredPGRules(currentPG?.id));
    setLanguage(getStoredRulesLanguage(currentPG?.id));
    setEditingRule(null);
    setEditMode(false);
  }, [currentPG?.id]);

  const persistRules = (nextRules: Rule[]) => {
    setRules(nextRules);
    saveStoredPGRules(currentPG?.id, nextRules);
  };

  const handleLanguageChange = (nextLanguage: RulesLanguage) => {
    setLanguage(nextLanguage);
    saveStoredRulesLanguage(currentPG?.id, nextLanguage);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule({ ...rule });
  };

  const handleSaveRule = () => {
    if (!editingRule) return;
    if (!editingRule.title.trim()) {
      toast({ title: 'Error', description: 'Rule title cannot be empty' });
      return;
    }
    setShowSaveConfirm(true);
  };

  const confirmSaveRule = () => {
    if (!editingRule) return;

    const existingRule = rules.some((rule) => rule.id === editingRule.id);
    const nextRules = existingRule
      ? rules.map((rule) => (rule.id === editingRule.id ? editingRule : rule))
      : [...rules, editingRule];

    persistRules(nextRules);
    setEditingRule(null);
    setShowSaveConfirm(false);
    toast({ title: 'Success', description: 'Rule updated successfully' });
  };

  const handleAddRule = () => {
    const newRule: Rule = {
      id: Date.now().toString(),
      title: '',
      description: '',
      details: [''],
    };
    setEditingRule(newRule);
  };

  const handleDeleteRule = (id: string) => {
    persistRules(rules.filter(r => r.id !== id));
    setShowDeleteDialog(false);
    setRuleToDelete(null);
    toast({ title: 'Deleted', description: 'Rule removed successfully' });
  };

  const handleAddDetail = () => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      details: [...editingRule.details, ''],
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
        <SheetContent side="right" className="w-full md:w-2/3 flex flex-col p-0 [&>button]:hidden">
          {/* Clean Header */}
          <SheetHeader className="border-b px-4 py-4 space-y-0">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="h-9 w-9 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <BookOpen className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <SheetTitle className="text-base leading-tight">Rules & Regulations</SheetTitle>
                  <SheetDescription className="text-xs">{rules.length} rules • {language === 'te' ? 'తెలుగు' : 'English'}</SheetDescription>
                </div>
              </div>
              {!editMode ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMode(true)}
                  className="gap-1.5 shrink-0"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditMode(false);
                    setEditingRule(null);
                  }}
                  className="shrink-0"
                >
                  Done
                </Button>
              )}
            </div>

            {/* Language Toggle - prominent row */}
            <div className="grid grid-cols-2 gap-2 pt-3">
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLanguageChange('en')}
                className="h-9"
              >
                English
              </Button>
              <Button
                variant={language === 'te' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLanguageChange('te')}
                className="h-9"
              >
                తెలుగు Telugu
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-3 py-4">
              {editMode && editingRule ? (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  {/* English Fields */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">English</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rule Title</label>
                    <Input
                      value={editingRule.title}
                      onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                      placeholder="Enter rule title (English)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={editingRule.description}
                      onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                      placeholder="Enter description (English)"
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
                            placeholder={`Detail ${idx + 1} (English)`}
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

                  {/* Telugu Fields */}
                  <div className="border-t pt-3 mt-3 space-y-1">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">తెలుగు (Telugu)</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rule Title (Telugu)</label>
                    <Input
                      value={editingRule.titleTe || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, titleTe: e.target.value })}
                      placeholder="నియమం శీర్షిక"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description (Telugu)</label>
                    <Input
                      value={editingRule.descriptionTe || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, descriptionTe: e.target.value })}
                      placeholder="వివరణ"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Details (Telugu)</label>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (!editingRule) return;
                        const currentTe = editingRule.detailsTe || [];
                        setEditingRule({ ...editingRule, detailsTe: [...currentTe, ''] });
                      }} className="gap-1 h-7">
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(editingRule.detailsTe || []).map((detail, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Textarea
                            value={detail}
                            onChange={(e) => {
                              const newDetailsTe = [...(editingRule.detailsTe || [])];
                              newDetailsTe[idx] = e.target.value;
                              setEditingRule({ ...editingRule, detailsTe: newDetailsTe });
                            }}
                            placeholder={`వివరాలు ${idx + 1}`}
                            className="text-sm"
                            rows={2}
                          />
                          <Button size="sm" variant="ghost" onClick={() => {
                            const newDetailsTe = (editingRule.detailsTe || []).filter((_, i) => i !== idx);
                            setEditingRule({ ...editingRule, detailsTe: newDetailsTe });
                          }} className="h-fit">
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
                          <h3 className="font-semibold text-base">{getRuleTitle(rule)}</h3>
                          <p className="text-sm text-muted-foreground">{getRuleDescription(rule)}</p>
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
                      <ul className="space-y-2 ml-4">
                        {getRuleDetails(rule).map((detail, idx) => (
                          <li key={idx} className="text-base text-muted-foreground list-disc">{detail}</li>
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
                onClick={() => onEditableTemplate?.(rules, language)}
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
