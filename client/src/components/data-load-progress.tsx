/**
 * Data Load Progress Component
 * Shows progress while loading representative data on app startup
 */

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Database, Download, CheckCircle2 } from 'lucide-react';
import type { DataLoadProgress } from '@/lib/data-loader';

interface DataLoadProgressProps {
  progress: DataLoadProgress | null;
  isComplete: boolean;
}

export function DataLoadProgressComponent({ progress, isComplete }: DataLoadProgressProps) {
  if (isComplete && !progress) {
    return null; // Don't show anything if complete
  }

  const progressPercent = progress ? (progress.loaded / progress.total) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <Database className="h-6 w-6 text-primary animate-pulse" />
            )}
            <h3 className="text-lg font-semibold">
              {isComplete ? 'Data Loaded' : 'Loading Representative Data'}
            </h3>
          </div>

          {progress && !isComplete && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{progress.status}</span>
                  <span className="font-medium">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Download className="h-3 w-3" />
                  <span>
                    Fetching official data from government sources...
                  </span>
                </div>
                <div className="mt-2">
                  Stage: {progress.stage} ({progress.loaded}/{progress.total})
                </div>
              </div>
            </>
          )}

          {isComplete && (
            <div className="text-sm text-green-600 dark:text-green-400">
              ✓ All representative data loaded successfully
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
