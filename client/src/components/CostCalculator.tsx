import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, AlertTriangle, Copy, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import t from "@/lib/i18n";

interface CostCalculatorProps {
  phoneNumbers: string[];
  onRemoveDuplicates?: () => void;
}

export default function CostCalculator({ phoneNumbers, onRemoveDuplicates }: CostCalculatorProps) {
  const analyzeQuery = trpc.hlr.analyzeNumbers.useMutation();

  // Analyze numbers when they change
  useMemo(() => {
    if (phoneNumbers.length > 0) {
      analyzeQuery.mutate({ phoneNumbers });
    }
  }, [phoneNumbers.join(",")]);

  if (phoneNumbers.length === 0) {
    return null;
  }

  const data = analyzeQuery.data;
  const isLoading = analyzeQuery.isPending;

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calculator className="h-4 w-4 animate-pulse" />
            <span className="text-sm">{t.cost.analyzing}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const hasDuplicates = data.duplicateCount > 0;

  return (
    <Card className={hasDuplicates ? "border-warning" : "border-dashed"}>
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Numbers Summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {data.uniqueCount} {t.cost.uniqueNumbers}
              </span>
            </div>

            {hasDuplicates && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                  <Copy className="h-3 w-3 mr-1" />
                  {data.duplicateCount} {t.cost.duplicates}
                </Badge>
                {onRemoveDuplicates && (
                  <button
                    onClick={onRemoveDuplicates}
                    className="text-xs text-primary hover:underline"
                  >
                    {t.cost.remove}
                  </button>
                )}
              </div>
            )}

            {!hasDuplicates && data.uniqueCount > 0 && (
              <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t.cost.noDuplicates}
              </Badge>
            )}
          </div>

          {/* Cost Estimate */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t.cost.estimatedCost}:</span>
            <span className="text-sm font-semibold">
              {data.estimatedCost.toFixed(2)} {data.currency}
            </span>
            <span className="text-xs text-muted-foreground">
              (€0.02/{t.cost.perNumber})
            </span>
          </div>
        </div>

        {/* Duplicate Details */}
        {hasDuplicates && data.duplicates.length > 0 && data.duplicates.length <= 5 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium text-orange-700">{t.cost.duplicatesFound}:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.duplicates.map((dup, i) => (
                <Badge key={i} variant="secondary" className="font-mono text-xs">
                  {dup.number} <span className="text-muted-foreground ml-1">×{dup.count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {hasDuplicates && data.duplicates.length > 5 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-orange-700">
                {data.duplicates.length} {t.cost.multipleAppearances}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
