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
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { usePG } from '@/contexts/PGContext';
import { DEFAULT_RULES, getStoredPGRules, getStoredRulesLanguage, saveStoredPGRules, saveStoredRulesLanguage, type Rule, type RulesLanguage } from '@/lib/pgRules';

interface PGRulesCardProps {
  defaultOpen?: boolean;
  onClose?: () => void;
  onEditableTemplate?: (rules: Rule[], language: RulesLanguage) => void;
  showSummaryCard?: boolean;
}

export const PGRulesCard = ({ onEditableTemplate, defaultOpen = false, onClose, showSummaryCard = true }: PGRulesCardProps) => {
  const isMobile = useIsMobile();
  const { currentPG } = usePG();
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  useEffect(() => {
    const handleClose = () => {
      setOpen(false);
      onClose?.();
    };
    window.addEventListener('tab-click', handleClose);
    return () => window.removeEventListener('tab-click', handleClose);
  }, [onClose]);
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

  const handleAddDetailTe = () => {
    if (!editingRule) return;
    const currentTe = editingRule.detailsTe || [];
    setEditingRule({ ...editingRule, detailsTe: [...currentTe, ''] });
  };

  const handleUpdateDetailTe = (index: number, value: string) => {
    if (!editingRule) return;
    const newDetailsTe = [...(editingRule.detailsTe || [])];
    newDetailsTe[index] = value;
    setEditingRule({ ...editingRule, detailsTe: newDetailsTe });
  };

  const handleRemoveDetailTe = (index: number) => {
    if (!editingRule) return;
    const newDetailsTe = (editingRule.detailsTe || []).filter((_, i) => i !== index);
    setEditingRule({ ...editingRule, detailsTe: newDetailsTe });
  };

  return (
    <>
      {showSummaryCard && (
        <Card
          className="cursor-pointer transition-all hover:shadow-md border-primary/20 bg-card hover:bg-muted/30"
          onClick={() => setOpen(true)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-sm">PG Rules & Regulations</span>
                <span className="text-xs text-muted-foreground">View and manage PG rules and regulations for residents</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                {rules.length} rules
              </span>
              <span className="text-xs text-primary font-medium">View →</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) onClose?.(); }}>
        <SheetContent 
          side="right" 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}
        >
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0 space-y-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setOpen(false); onClose?.(); }}
                    className="h-8 w-8 shrink-0"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <BookOpen className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0 text-left">
                      <SheetTitle className="text-base leading-tight font-bold">Rules & Regulations</SheetTitle>
                      <SheetDescription className="text-xs">{rules.length} rules • {language === 'te' ? 'తెలుగు' : 'English'}</SheetDescription>
                    </div>
                  </div>
                </div>
                {!editMode ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditMode(true)}
                    className="gap-1.5 shrink-0 h-8 text-xs font-semibold"
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
                    className="shrink-0 h-8 text-xs font-semibold"
                  >
                    Done
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3">
                <Button
                  variant={language === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageChange('en')}
                  className="h-8 text-xs font-semibold"
                >
                  English
                </Button>
                <Button
                  variant={language === 'te' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageChange('te')}
                  className="h-8 text-xs font-semibold"
                >
                  తెలుగు Telugu
                </Button>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-1.5 py-4 bg-background">
              <div className="space-y-3 pb-12">
                {editMode && editingRule ? (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider text-left">English</p>
                    </div>
                    <div className="space-y-2 text-left">
                      <label className="text-sm font-medium">Rule Title</label>
                      <Input
                        value={editingRule.title}
                        onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                        placeholder="Enter rule title (English)"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        value={editingRule.description}
                        onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                        placeholder="Enter description (English)"
                      />
                    </div>
                    <div className="space-y-2 text-left">
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
                              placeholder="Detail point (English)"
                              className="text-sm flex-1"
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveDetail(idx)} className="h-10 w-10 text-destructive shrink-0">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-4 space-y-4 text-left">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider">Telugu (Optional)</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Rule Title (Telugu)</label>
                        <Input
                          value={editingRule.titleTe || ''}
                          onChange={(e) => setEditingRule({ ...editingRule, titleTe: e.target.value })}
                          placeholder="Enter rule title (Telugu)"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description (Telugu)</label>
                        <Input
                          value={editingRule.descriptionTe || ''}
                          onChange={(e) => setEditingRule({ ...editingRule, descriptionTe: e.target.value })}
                          placeholder="Enter description (Telugu)"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Details (Telugu)</label>
                          <Button size="sm" variant="ghost" onClick={handleAddDetailTe} className="gap-1 h-7">
                            <Plus className="h-3 w-3" /> Add
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(editingRule.detailsTe || []).map((detail, idx) => (
                            <div key={idx} className="flex gap-2">
                              <Textarea
                                value={detail}
                                onChange={(e) => handleUpdateDetailTe(idx, e.target.value)}
                                placeholder="Detail point (Telugu)"
                                className="text-sm flex-1"
                              />
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveDetailTe(idx)} className="h-10 w-10 text-destructive shrink-0">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t mt-4">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingRule(null)}>Cancel</Button>
                      <Button size="sm" className="flex-1" onClick={handleSaveRule} disabled={!editingRule.title.trim()}>Save Rule</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {rules.map((rule) => (
                      <div key={rule.id} className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/10 transition-colors text-left">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="font-semibold text-base leading-tight text-foreground">{getRuleTitle(rule)}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{getRuleDescription(rule)}</p>
                          </div>
                          {editMode && (
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleEditRule(rule)}>
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setRuleToDelete(rule.id); setShowDeleteDialog(true); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <ul className="space-y-1.5 pl-11">
                          {getRuleDetails(rule).map((detail, dIdx) => (
                            <li key={dIdx} className="text-sm text-foreground/80 leading-relaxed flex gap-2">
                              <span className="text-primary mt-1.5 shrink-0">•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {editMode && (
                      <Button onClick={handleAddRule} variant="outline" className="w-full gap-2 h-10 text-xs font-semibold" size="sm">
                        <Plus className="h-4 w-4" /> Add New Rule
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {!editMode && (
              <div className="border-t p-4 bg-background shrink-0">
                <Button
                  onClick={() => onEditableTemplate?.(rules, language)}
                  className="w-full gap-2 h-12 text-sm font-semibold"
                  size="lg"
                >
                  <BookOpen className="h-4 w-4" />
                  Preview & Share Template
                </Button>
              </div>
            )}
          </div>
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
