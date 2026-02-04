import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Heart, HeartCrack, HeartPulse, Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface HealthScoreDetails {
  validNumber?: string | null;
  reachable?: string | null;
  ported?: string | null;
  roaming?: string | null;
  currentNetworkType?: string | null;
}

interface HealthScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  details?: HealthScoreDetails;
}

export default function HealthScoreBadge({ score, showLabel = false, size = "md", details }: HealthScoreBadgeProps) {
  const { t } = useLanguage();
  
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

  // Calculate individual scores based on actual values
  const calculateDetailedScores = () => {
    if (!details) return null;
    
    const scores = [];
    
    // Validity (40 pts)
    const isValid = details.validNumber === "valid";
    scores.push({
      label: t.health.validity,
      maxPts: 40,
      earned: isValid ? 40 : 0,
      value: isValid ? t.health.yes : t.health.no,
      positive: isValid
    });
    
    // Reachability (25 pts)
    const isReachable = details.reachable === "reachable";
    scores.push({
      label: t.health.reachability,
      maxPts: 25,
      earned: isReachable ? 25 : 0,
      value: isReachable ? t.health.yes : t.health.no,
      positive: isReachable
    });
    
    // Porting status (15 pts) - not ported is better
    const notPorted = details.ported === "assumed_not_ported" || details.ported === "not_ported";
    scores.push({
      label: t.health.portingStatus,
      maxPts: 15,
      earned: notPorted ? 15 : 0,
      value: notPorted ? t.health.notPorted : t.health.ported,
      positive: notPorted
    });
    
    // Roaming status (10 pts) - not roaming is better
    const notRoaming = details.roaming === "not_roaming";
    scores.push({
      label: t.health.roamingStatus,
      maxPts: 10,
      earned: notRoaming ? 10 : 0,
      value: notRoaming ? t.health.notRoaming : t.health.roaming,
      positive: notRoaming
    });
    
    // Network type (10 pts) - mobile is best
    const isMobile = details.currentNetworkType === "mobile";
    scores.push({
      label: t.health.networkType,
      maxPts: 10,
      earned: isMobile ? 10 : 0,
      value: details.currentNetworkType || t.health.unknown,
      positive: isMobile
    });
    
    return scores;
  };

  const detailedScores = calculateDetailedScores();

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
        <TooltipContent className="max-w-xs">
          <div className="text-sm">
            <p className="font-medium">{t.health.healthScore}: {score}/100</p>
            <p className="text-muted-foreground">{getScoreLabel(score)}</p>
            <div className="mt-2 text-xs space-y-1">
              {detailedScores ? (
                <>
                  <p className="font-medium mb-1">{t.health.breakdown}:</p>
                  {detailedScores.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {item.positive ? (
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                      )}
                      <span className="flex-1">{item.label}: {item.value}</span>
                      <span className={item.positive ? "text-green-600 font-medium" : "text-red-500"}>
                        {item.positive ? `+${item.earned}` : `0/${item.maxPts}`}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <p>{t.health.basedOn}:</p>
                  <ul className="list-disc list-inside">
                    <li>{t.health.validity} (40 {t.health.pts})</li>
                    <li>{t.health.reachability} (25 {t.health.pts})</li>
                    <li>{t.health.portingStatus} (15 {t.health.pts})</li>
                    <li>{t.health.roamingStatus} (10 {t.health.pts})</li>
                    <li>{t.health.networkType} (10 {t.health.pts})</li>
                  </ul>
                </>
              )}
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
