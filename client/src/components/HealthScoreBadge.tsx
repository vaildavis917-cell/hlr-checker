import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Heart, HeartCrack, HeartPulse } from "lucide-react";
import t from "@/lib/i18n";

interface HealthScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function HealthScoreBadge({ score, showLabel = false, size = "md" }: HealthScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-700 border-green-300";
    if (score >= 60) return "bg-lime-100 text-lime-700 border-lime-300";
    if (score >= 40) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    if (score >= 20) return "bg-orange-100 text-orange-700 border-orange-300";
    return "bg-red-100 text-red-700 border-red-300";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return t.health.excellent;
    if (score >= 60) return t.health.good;
    if (score >= 40) return t.health.fair;
    if (score >= 20) return t.health.poor;
    return t.health.bad;
  };

  const getIcon = (score: number) => {
    const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
    if (score >= 60) return <Heart className={`${iconSize} fill-current`} />;
    if (score >= 30) return <HeartPulse className={iconSize} />;
    return <HeartCrack className={iconSize} />;
  };

  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${getScoreColor(score)} ${textSize} font-medium cursor-help`}
          >
            {getIcon(score)}
            <span className="ml-1">{score}</span>
            {showLabel && <span className="ml-1">({getScoreLabel(score)})</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{t.health.healthScore}: {score}/100</p>
            <p className="text-muted-foreground">{getScoreLabel(score)}</p>
            <div className="mt-2 text-xs space-y-1">
              <p>{t.health.basedOn}:</p>
              <ul className="list-disc list-inside">
                <li>{t.health.validity} (40 {t.health.pts})</li>
                <li>{t.health.reachability} (25 {t.health.pts})</li>
                <li>{t.health.portingStatus} (15 {t.health.pts})</li>
                <li>{t.health.roamingStatus} (10 {t.health.pts})</li>
                <li>{t.health.networkType} (10 {t.health.pts})</li>
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Progress bar variant for larger displays
export function HealthScoreBar({ score }: { score: number }) {
  const getBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-lime-500";
    if (score >= 40) return "bg-yellow-500";
    if (score >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${getBarColor(score)} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium w-8 text-right">{score}</span>
    </div>
  );
}
