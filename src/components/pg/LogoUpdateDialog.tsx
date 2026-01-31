import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Wand2, Loader2 } from 'lucide-react';
import { usePG } from '@/contexts/PGContext';
import { usePGSetup } from '@/hooks/usePGSetup';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LogoUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pgId: string | null;
}

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

export const LogoUpdateDialog = ({ open, onOpenChange, pgId }: LogoUpdateDialogProps) => {
  const { pgs, refreshPGs } = usePG();
  const { generateAILogo, uploadLogo, isGeneratingLogo } = usePGSetup();
  
  const [logoType, setLogoType] = useState<'upload' | 'generate'>('upload');
  const [logoStyle, setLogoStyle] = useState<string>('modern');
  const [logoColor, setLogoColor] = useState<string>('#8B5CF6');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const pg = pgs.find(p => p.id === pgId);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pg) return;

    const url = await uploadLogo(file, pg.name);
    if (url) {
      setLogoUrl(url);
      toast.success('Logo uploaded!');
    }
  };

  const handleGenerateLogo = async () => {
    if (!pg) return;

    const url = await generateAILogo(pg.name, logoStyle as any, logoColor);
    if (url) {
      setLogoUrl(url);
      toast.success('Logo generated!');
    }
  };

  const handleSave = async () => {
    if (!pgId || !logoUrl) {
      toast.error('Please upload or generate a logo first');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('pgs')
        .update({ logo_url: logoUrl })
        .eq('id', pgId);

      if (error) throw error;

      await refreshPGs();
      toast.success('Logo updated!');
      onOpenChange(false);
      setLogoUrl('');
    } catch (err) {
      console.error('Error updating logo:', err);
      toast.error('Failed to update logo');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Logo - {pg?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Logo Type</Label>
            <RadioGroup
              value={logoType}
              onValueChange={(v) => setLogoType(v as 'upload' | 'generate')}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upload" id="logo-upload" />
                <Label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Upload
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="generate" id="logo-generate" />
                <Label htmlFor="logo-generate" className="cursor-pointer flex items-center gap-2">
                  <Wand2 className="h-4 w-4" /> Generate AI
                </Label>
              </div>
            </RadioGroup>
          </div>

          {logoType === 'upload' ? (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {logoUrl ? (
                <div className="space-y-2">
                  <img 
                    src={logoUrl} 
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
                        logoStyle === style.id 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setLogoStyle(style.id)}
                    >
                      <CardContent className="p-3">
                        <p className="font-medium text-sm">{style.label}</p>
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
                        logoColor === color.id ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: color.id }}
                      onClick={() => setLogoColor(color.id)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {logoUrl ? (
                <div className="text-center space-y-2">
                  <img 
                    src={logoUrl} 
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
                  disabled={isGeneratingLogo}
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

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!logoUrl || isUpdating}
              className="flex-1"
            >
              {isUpdating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                'Save Logo'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
