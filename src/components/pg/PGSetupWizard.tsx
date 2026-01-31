import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building, Upload, Wand2, ChevronRight, ChevronLeft, Check, Loader2, Plus, Trash2, Database, Sparkles } from 'lucide-react';
import { PGBrandingData } from '@/types/pg';
import { usePGSetup } from '@/hooks/usePGSetup';
import { usePG } from '@/contexts/PGContext';
import { toast } from 'sonner';
import ammaLogo from '@/assets/amma-logo-transparent.png';

interface PGSetupWizardProps {
  onComplete: () => void;
  isAddingNew?: boolean;
}

type Step = 'migrate' | 'count' | 'branding' | 'structure' | 'complete';

const LOGO_STYLES = [
  { id: 'modern', label: 'Modern', description: 'Clean, contemporary design' },
  { id: 'minimal', label: 'Minimal', description: 'Simple and elegant' },
  { id: 'luxury', label: 'Luxury', description: 'Premium, sophisticated' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and welcoming' },
] as const;

const LOGO_COLORS = [
  { id: '#8B5CF6', name: 'Purple' },
  { id: '#3B82F6', name: 'Blue' },
  { id: '#10B981', name: 'Green' },
  { id: '#F59E0B', name: 'Orange' },
  { id: '#EF4444', name: 'Red' },
  { id: '#EC4899', name: 'Pink' },
];

export const PGSetupWizard = ({ onComplete, isAddingNew = false }: PGSetupWizardProps) => {
  const { subscription, canCreatePG } = usePG();
  const { createPG, generateAILogo, uploadLogo, isGeneratingLogo, checkExistingData, migrateExistingRooms, isMigrating } = usePGSetup();
  
  const [step, setStep] = useState<Step>(isAddingNew ? 'branding' : 'migrate');
  const [hasExistingData, setHasExistingData] = useState(false);
  const [existingRoomCount, setExistingRoomCount] = useState(0);
  const [isCheckingData, setIsCheckingData] = useState(!isAddingNew);
  
  const [pgCount, setPgCount] = useState(1);
  const [currentPgIndex, setCurrentPgIndex] = useState(0);
  const [pgs, setPgs] = useState<PGBrandingData[]>([{
    name: '',
    address: '',
    logoType: 'generate',
    logoStyle: 'modern',
    logoColor: '#8B5CF6',
    logoUrl: undefined,
    floors: 3,
    roomsPerFloor: 4,
  }]);
  const [isCreating, setIsCreating] = useState(false);

  // Check for existing data on mount
  useEffect(() => {
    if (!isAddingNew) {
      checkExistingData().then(({ hasExistingData, roomCount }) => {
        setHasExistingData(hasExistingData);
        setExistingRoomCount(roomCount);
        setIsCheckingData(false);
        
        // If no existing data, skip to count step
        if (!hasExistingData) {
          setStep('count');
        }
      });
    }
  }, [isAddingNew]);

  const maxPgs = subscription?.maxPgs ?? 1;
  const canAddMore = maxPgs === -1 || pgCount < maxPgs;

  const handlePgCountChange = (count: number) => {
    setPgCount(count);
    const newPgs = Array(count).fill(null).map((_, i) => 
      pgs[i] || {
        name: '',
        address: '',
        logoType: 'generate' as const,
        logoStyle: 'modern' as const,
        logoColor: '#8B5CF6',
        floors: 3,
        roomsPerFloor: 4,
      }
    );
    setPgs(newPgs);
  };

  const updateCurrentPg = (updates: Partial<PGBrandingData>) => {
    setPgs(prev => prev.map((pg, i) => 
      i === currentPgIndex ? { ...pg, ...updates } : pg
    ));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentPg = pgs[currentPgIndex];
    const url = await uploadLogo(file, currentPg.name || `pg-${currentPgIndex}`);
    if (url) {
      updateCurrentPg({ logoUrl: url });
      toast.success('Logo uploaded!');
    }
  };

  const handleGenerateLogo = async () => {
    const currentPg = pgs[currentPgIndex];
    if (!currentPg.name) {
      toast.error('Please enter PG name first');
      return;
    }

    const url = await generateAILogo(
      currentPg.name,
      currentPg.logoStyle || 'modern',
      currentPg.logoColor || '#8B5CF6'
    );
    if (url) {
      updateCurrentPg({ logoUrl: url });
      toast.success('Logo generated!');
    }
  };

  const handleMigrateExisting = async () => {
    const currentPg = pgs[0];
    if (!currentPg.name) {
      toast.error('Please enter PG name');
      return;
    }

    await migrateExistingRooms.mutateAsync({
      name: currentPg.name,
      address: currentPg.address,
      logoUrl: currentPg.logoUrl,
    });
    
    setStep('complete');
    setTimeout(onComplete, 1500);
  };

  const handleComplete = async () => {
    setIsCreating(true);
    try {
      for (const pg of pgs) {
        if (!pg.name) {
          toast.error('Please enter a name for all PGs');
          setIsCreating(false);
          return;
        }
        await createPG.mutateAsync(pg);
      }
      setStep('complete');
      setTimeout(onComplete, 1500);
    } catch (err) {
      console.error('Error creating PGs:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const currentPg = pgs[currentPgIndex];

  if (isCheckingData) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Checking for existing data...</p>
        </CardContent>
      </Card>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 'migrate':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                <Database className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Existing Data Found!</h2>
              <p className="text-muted-foreground mt-2">
                We found <strong>{existingRoomCount} rooms</strong> with existing tenant data.
              </p>
            </div>

            <Card className="border-primary">
              <CardContent className="pt-4">
                <div className="flex items-center gap-4 mb-4">
                  <img src={ammaLogo} alt="Amma Logo" className="h-16 w-16 object-contain" />
                  <div>
                    <h3 className="font-semibold">Amma Women's Hostel</h3>
                    <p className="text-sm text-muted-foreground">{existingRoomCount} rooms • 3 floors</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="pgName">PG Name</Label>
                    <Input
                      id="pgName"
                      value={currentPg.name}
                      onChange={(e) => updateCurrentPg({ name: e.target.value })}
                      placeholder="e.g., Amma Women's Hostel"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pgAddress">Address (Optional)</Label>
                    <Input
                      id="pgAddress"
                      value={currentPg.address || ''}
                      onChange={(e) => updateCurrentPg({ address: e.target.value })}
                      placeholder="Enter address"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleMigrateExisting}
                disabled={isMigrating || !currentPg.name}
                className="w-full"
              >
                {isMigrating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Migrating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Import Existing Data</>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setStep('count')}
                className="w-full"
              >
                Start Fresh Instead
              </Button>
            </div>
          </motion.div>
        );

      case 'count':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Building className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-2xl font-bold">How many PGs do you manage?</h2>
              <p className="text-muted-foreground mt-2">
                {maxPgs === -1 ? 'You can add unlimited PGs with Pro plan' : `Free plan allows ${maxPgs} PG`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePgCountChange(Math.max(1, pgCount - 1))}
                disabled={pgCount <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <div className="text-5xl font-bold text-primary w-20 text-center">
                {pgCount}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePgCountChange(pgCount + 1)}
                disabled={!canAddMore}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {!canAddMore && maxPgs !== -1 && (
              <p className="text-center text-amber-600 text-sm">
                Upgrade to Pro for unlimited PGs
              </p>
            )}

            <div className="flex justify-between mt-8">
              {hasExistingData && (
                <Button variant="outline" onClick={() => setStep('migrate')}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
              <Button onClick={() => setStep('branding')} className={!hasExistingData ? 'ml-auto' : ''}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        );

      case 'branding':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {pgs.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {pgs.map((pg, i) => (
                  <Button
                    key={i}
                    variant={i === currentPgIndex ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPgIndex(i)}
                  >
                    PG {i + 1}
                  </Button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="pgName">PG Name *</Label>
                <Input
                  id="pgName"
                  value={currentPg.name}
                  onChange={(e) => updateCurrentPg({ name: e.target.value })}
                  placeholder="e.g., Sunrise Women's Hostel"
                />
              </div>

              <div>
                <Label htmlFor="pgAddress">Address (Optional)</Label>
                <Input
                  id="pgAddress"
                  value={currentPg.address || ''}
                  onChange={(e) => updateCurrentPg({ address: e.target.value })}
                  placeholder="Enter PG address"
                />
              </div>

              <div>
                <Label>Logo</Label>
                <RadioGroup
                  value={currentPg.logoType}
                  onValueChange={(v) => updateCurrentPg({ logoType: v as 'upload' | 'generate' })}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="upload" id="upload" />
                    <Label htmlFor="upload" className="cursor-pointer flex items-center gap-2">
                      <Upload className="h-4 w-4" /> Upload
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="generate" id="generate" />
                    <Label htmlFor="generate" className="cursor-pointer flex items-center gap-2">
                      <Wand2 className="h-4 w-4" /> Generate AI
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {currentPg.logoType === 'upload' ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {currentPg.logoUrl ? (
                    <div className="space-y-2">
                      <img 
                        src={currentPg.logoUrl} 
                        alt="PG Logo" 
                        className="h-20 w-20 mx-auto object-contain rounded"
                      />
                      <Button variant="outline" size="sm" asChild>
                        <label className="cursor-pointer">
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                        </label>
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload logo</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Style</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {LOGO_STYLES.map((style) => (
                        <Card
                          key={style.id}
                          className={`cursor-pointer transition-all ${
                            currentPg.logoStyle === style.id 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => updateCurrentPg({ logoStyle: style.id })}
                        >
                          <CardContent className="p-3">
                            <p className="font-medium">{style.label}</p>
                            <p className="text-xs text-muted-foreground">{style.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Color</Label>
                    <div className="flex gap-2 mt-2">
                      {LOGO_COLORS.map((color) => (
                        <button
                          key={color.id}
                          className={`w-8 h-8 rounded-full transition-transform ${
                            currentPg.logoColor === color.id ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                          }`}
                          style={{ backgroundColor: color.id }}
                          onClick={() => updateCurrentPg({ logoColor: color.id })}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  {currentPg.logoUrl ? (
                    <div className="text-center space-y-2">
                      <img 
                        src={currentPg.logoUrl} 
                        alt="Generated Logo" 
                        className="h-24 w-24 mx-auto object-contain rounded"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleGenerateLogo}
                        disabled={isGeneratingLogo}
                      >
                        {isGeneratingLogo ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Regenerating...</>
                        ) : (
                          <>Regenerate</>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleGenerateLogo} 
                      disabled={isGeneratingLogo || !currentPg.name}
                      className="w-full"
                    >
                      {isGeneratingLogo ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                      ) : (
                        <><Wand2 className="h-4 w-4 mr-2" /> Generate Logo</>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between mt-8">
              {!isAddingNew && (
                <Button variant="outline" onClick={() => setStep('count')}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
              <Button 
                onClick={() => setStep('structure')}
                disabled={!currentPg.name}
                className={isAddingNew ? 'ml-auto' : ''}
              >
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        );

      case 'structure':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {pgs.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {pgs.map((pg, i) => (
                  <Button
                    key={i}
                    variant={i === currentPgIndex ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPgIndex(i)}
                  >
                    {pg.name || `PG ${i + 1}`}
                  </Button>
                ))}
              </div>
            )}

            <div className="text-center mb-6">
              <Building className="h-12 w-12 mx-auto text-primary mb-2" />
              <h3 className="text-lg font-semibold">Setup {currentPg.name || 'PG'} Structure</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="floors">Number of Floors</Label>
                <Input
                  id="floors"
                  type="number"
                  min={1}
                  max={10}
                  value={currentPg.floors}
                  onChange={(e) => updateCurrentPg({ floors: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="roomsPerFloor">Rooms per Floor</Label>
                <Input
                  id="roomsPerFloor"
                  type="number"
                  min={1}
                  max={20}
                  value={currentPg.roomsPerFloor}
                  onChange={(e) => updateCurrentPg({ roomsPerFloor: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  This will create <strong>{currentPg.floors * currentPg.roomsPerFloor}</strong> rooms 
                  ({currentPg.floors} floors × {currentPg.roomsPerFloor} rooms each)
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setStep('branding')}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={handleComplete}
                disabled={isCreating}
              >
                {isCreating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" /> Complete Setup</>
                )}
              </Button>
            </div>
          </motion.div>
        );

      case 'complete':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Setup Complete!</h2>
            <p className="text-muted-foreground mt-2">Your PG{pgs.length > 1 ? 's are' : ' is'} ready to use</p>
          </motion.div>
        );
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          {isAddingNew ? 'Add New PG' : 'PG Setup'}
        </CardTitle>
        <CardDescription>
          {step === 'migrate' && 'Import your existing data'}
          {step === 'count' && 'Tell us about your properties'}
          {step === 'branding' && 'Brand your PG'}
          {step === 'structure' && 'Define your PG structure'}
          {step === 'complete' && 'All done!'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
