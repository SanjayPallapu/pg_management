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
import { BookOpen, Settings, Plus, Trash2, X, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface Rule {
  id: string;
  title: string;
  titleTe?: string;
  description: string;
  descriptionTe?: string;
  details: string[];
  detailsTe?: string[];
}

export type RulesLanguage = 'en' | 'te';

const DEFAULT_RULES: Rule[] = [
  { id: '1', title: 'Meal Timings', titleTe: 'భోజన సమయాలు', description: 'Food service timings for the PG residents', descriptionTe: 'PG నివాసులకు భోజన సేవ సమయాలు', details: ['Breakfast (Tiffin): 7:30 AM – 9:00 AM', 'Lunch: 12:30 PM – 2:00 PM', 'Dinner: 7:30 PM – 9:00 PM', 'Note: If food gets over during the above timings, residents may inform the management. We will be happy to prepare food again, subject to availability.'], detailsTe: ['అల్పాహారం (టిఫిన్): 7:30 AM – 9:00 AM', 'భోజనం: 12:30 PM – 2:00 PM', 'రాత్రి భోజనం: 7:30 PM – 9:00 PM', 'గమనిక: పై సమయాల్లో ఆహారం అయిపోతే, నిర్వహణకు తెలియజేయండి. మేము మళ్ళీ తయారు చేస్తాము.'] },
  { id: '2', title: 'Night Gate Timing', titleTe: 'రాత్రి గేట్ సమయం', description: 'Main gate closure timing', descriptionTe: 'ప్రధాన గేట్ మూసివేయు సమయం', details: ['The main gate will be closed at 10:00 PM.'], detailsTe: ['ప్రధాన గేట్ రాత్రి 10:00 గంటలకు మూసివేయబడుతుంది.'] },
  { id: '3', title: 'Corridor Lights', titleTe: 'కారిడార్ లైట్లు', description: 'Corridor lighting schedule', descriptionTe: 'కారిడార్ లైటింగ్ షెడ్యూల్', details: ['Corridor lights will be switched off at 10:00 PM.'], detailsTe: ['కారిడార్ లైట్లు రాత్రి 10:00 గంటలకు ఆఫ్ చేయబడతాయి.'] },
  { id: '4', title: 'Room Cleaning', titleTe: 'గది శుభ్రపరచడం', description: 'Room maintenance schedule', descriptionTe: 'గది నిర్వహణ షెడ్యూల్', details: ['Rooms will be cleaned once a week.'], detailsTe: ['గదులు వారానికి ఒకసారి శుభ్రం చేయబడతాయి.'] },
  { id: '5', title: 'Visitors Policy', titleTe: 'సందర్శకుల విధానం', description: 'Rules regarding visitors and guests', descriptionTe: 'సందర్శకులు మరియు అతిథుల నియమాలు', details: ['Friends, relatives, or any outsiders are not allowed inside rooms.', 'Bringing any friend into your room without prior permission will result in a fine of ₹1000.'], detailsTe: ['స్నేహితులు, బంధువులు లేదా బయటి వ్యక్తులను గదుల్లోకి అనుమతించరు.', 'అనుమతి లేకుండా స్నేహితులను గదిలోకి తీసుకురావడం వల్ల ₹1000 జరిమానా విధించబడుతుంది.'] },
  { id: '6', title: 'Noise & Behavior', titleTe: 'శబ్దం & ప్రవర్తన', description: 'Community conduct expectations', descriptionTe: 'సమాజ నడవడిక అంచనాలు', details: ['Loud noise inside or outside the rooms is not permitted.', 'Do not disturb others.', "Respect other residents' privacy at all times."], detailsTe: ['గదులలో లేదా బయట పెద్ద శబ్దం అనుమతించబడదు.', 'ఇతరులను ఇబ్బంది పెట్టవద్దు.', 'ఇతర నివాసుల గోప్యతను ఎల్లప్పుడూ గౌరవించండి.'] },
  { id: '7', title: 'Rent Policy', titleTe: 'అద్దె విధానం', description: 'Rent payment obligations', descriptionTe: 'అద్దె చెల్లింపు బాధ్యతలు', details: ['Full monthly rent must be paid even if you stay outside or go home for any duration.'], detailsTe: ['మీరు ఎంత కాలం బయట ఉన్నా లేదా ఇంటికి వెళ్ళినా పూర్తి నెలవారీ అద్దె చెల్లించాలి.'] },
  { id: '8', title: 'Notice Period', titleTe: 'నోటీసు వ్యవధి', description: 'Requirement before vacating', descriptionTe: 'గది ఖాళీ చేయడానికి ముందు అవసరం', details: ['Residents must inform 15–30 days in advance before vacating the room.'], detailsTe: ['నివాసులు గది ఖాళీ చేయడానికి 15–30 రోజుల ముందుగా తెలియజేయాలి.'] },
  { id: '9', title: 'Security Deposit', titleTe: 'భద్రతా డిపాజిట్', description: 'Security deposit terms', descriptionTe: 'భద్రతా డిపాజిట్ నిబంధనలు', details: ['The security deposit is refundable at the time of vacating, subject to applicable deductions.'], detailsTe: ['భద్రతా డిపాజిట్ ఖాళీ చేసేటప్పుడు తిరిగి చెల్లించబడుతుంది, వర్తించే తగ్గింపులకు లోబడి.'] },
  { id: '10', title: 'Luggage Charges', titleTe: 'లగేజీ చార్జీలు', description: 'Extra luggage storage charges', descriptionTe: 'అదనపు లగేజీ నిల్వ చార్జీలు', details: ['Extra luggage storage will be charged ₹150 per day.'], detailsTe: ['అదనపు లగేజీ నిల్వకు రోజుకు ₹150 వసూలు చేయబడుతుంది.'] },
  { id: '11', title: 'Issues & Support', titleTe: 'సమస్యలు & సహాయం', description: 'How to report and resolve issues', descriptionTe: 'సమస్యలను ఎలా నివేదించాలి మరియు పరిష్కరించాలి', details: ['If you face any issues or problems during your stay, please inform the management.', 'We will review the matter and try to resolve it as early as possible.'], detailsTe: ['మీ బస సమయంలో ఏవైనా సమస్యలు ఎదురైతే, దయచేసి నిర్వహణకు తెలియజేయండి.', 'మేము విషయాన్ని సమీక్షించి, వీలైనంత త్వరగా పరిష్కరించడానికి ప్రయత్నిస్తాము.'] },
];

interface PGRulesCardProps {
  onEditableTemplate?: (rules: Rule[], language: RulesLanguage) => void;
}

export const PGRulesCard = ({ onEditableTemplate }: PGRulesCardProps) => {
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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <SheetTitle>PG Rules & Regulations</SheetTitle>
                <SheetDescription>Manage rules for your PG residents</SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language Toggle */}
              <div className="flex rounded-md border border-input overflow-hidden text-xs">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 font-medium transition-colors ${language === 'en' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('te')}
                  className={`px-2.5 py-1 font-medium transition-colors ${language === 'te' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}
                >
                  తెలుగు
                </button>
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
            </div>
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
