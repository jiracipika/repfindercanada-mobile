import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CachedPostalCode {
  id: number;
  postalCode: string;
  ridingName: string;
  province: string;
  source: string;
  confidence: string;
  manualOverride: boolean;
  notes: string | null;
  lastVerified: string;
}

export function AdminCorrections() {
  const [cache, setCache] = useState<CachedPostalCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCorrection, setNewCorrection] = useState({
    postalCode: '',
    ridingName: '',
    province: '',
    notes: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCache();
  }, []);

  const loadCache = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v2/admin/postal-code-cache');
      const data = await response.json();
      setCache(data.cache || []);
    } catch (error) {
      console.error('Failed to load cache:', error);
      toast({
        title: 'Error',
        description: 'Failed to load postal code cache',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCorrection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCorrection.postalCode || !newCorrection.ridingName || !newCorrection.province) {
      toast({
        title: 'Validation Error',
        description: 'Postal code, riding name, and province are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/v2/admin/postal-code-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCorrection),
      });

      if (!response.ok) {
        throw new Error('Failed to add correction');
      }

      toast({
        title: 'Success',
        description: `Correction added for ${newCorrection.postalCode}`,
      });

      setNewCorrection({ postalCode: '', ridingName: '', province: '', notes: '' });
      loadCache();
    } catch (error) {
      console.error('Failed to add correction:', error);
      toast({
        title: 'Error',
        description: 'Failed to add correction',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/v2/admin/export-corrections');
      const data = await response.json();

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `postal-code-corrections-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Exported ${data.count} corrections`,
      });
    } catch (error) {
      console.error('Failed to export:', error);
      toast({
        title: 'Error',
        description: 'Failed to export corrections',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/v2/admin/import-corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrections: data.corrections }),
      });

      const result = await response.json();

      toast({
        title: 'Import Completed',
        description: `Imported ${result.imported} corrections (${result.failed} failed)`,
      });

      loadCache();
    } catch (error) {
      console.error('Failed to import:', error);
      toast({
        title: 'Error',
        description: 'Failed to import corrections',
        variant: 'destructive',
      });
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    if (confidence === 'high') {
      return <Badge className="bg-green-500/10 text-green-600">High</Badge>;
    } else if (confidence === 'low') {
      return <Badge className="bg-amber-500/10 text-amber-600">Low</Badge>;
    } else {
      return <Badge className="bg-blue-500/10 text-blue-600">Medium</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Postal Code Corrections Admin</h1>
        <p className="text-muted-foreground">
          Manage postal code to riding mappings and corrections
        </p>
      </div>

      {/* Add New Correction */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Manual Correction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCorrection} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Postal Code</label>
                <Input
                  placeholder="M1C5E9"
                  value={newCorrection.postalCode}
                  onChange={(e) => setNewCorrection({ ...newCorrection, postalCode: e.target.value.toUpperCase() })}
                  maxLength={7}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Riding Name</label>
                <Input
                  placeholder="Scarborough—Guildwood—Rouge Park"
                  value={newCorrection.ridingName}
                  onChange={(e) => setNewCorrection({ ...newCorrection, ridingName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Province</label>
                <Input
                  placeholder="Ontario"
                  value={newCorrection.province}
                  onChange={(e) => setNewCorrection({ ...newCorrection, province: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
              <Input
                placeholder="Why this correction is needed..."
                value={newCorrection.notes}
                onChange={(e) => setNewCorrection({ ...newCorrection, notes: e.target.value })}
              />
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Add Correction
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Export/Import */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Corrections
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('import-file-input')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Corrections
            </Button>
            <input
              id="import-file-input"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cached Postal Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Cached Postal Codes ({cache.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : cache.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No postal codes cached yet
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {cache.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-semibold">{entry.postalCode}</span>
                      {entry.manualOverride && (
                        <Badge className="bg-purple-500/10 text-purple-600">Manual</Badge>
                      )}
                      {getConfidenceBadge(entry.confidence)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entry.ridingName}, {entry.province}
                    </div>
                    {entry.notes && (
                      <div className="text-xs text-muted-foreground mt-1 italic">
                        {entry.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.source.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
