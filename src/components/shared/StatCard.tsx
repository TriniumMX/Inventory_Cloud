import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  accentColor?: "primary" | "cyan" | "emerald" | "amber";
  breakdown?: Array<{ label: string; value: number | string }>;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading,
  accentColor = "primary",
  breakdown,
}: StatCardProps) {
  
  // Custom class mapping for visual accents inspired by the login page
  const accentStyles = {
    primary: {
      bg: "bg-blue-50/50 border-blue-100/80 text-blue-600",
      hover: "group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 group-hover:shadow-[0_0_12px_rgba(37,99,235,0.2)]",
      glow: "from-blue-500/5 to-transparent",
    },
    cyan: {
      bg: "bg-cyan-50/50 border-cyan-100/80 text-cyan-600",
      hover: "group-hover:bg-cyan-500 group-hover:text-white group-hover:border-cyan-500 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.2)]",
      glow: "from-cyan-500/5 to-transparent",
    },
    emerald: {
      bg: "bg-emerald-50/50 border-emerald-100/80 text-emerald-600",
      hover: "group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.2)]",
      glow: "from-emerald-500/5 to-transparent",
    },
    amber: {
      bg: "bg-amber-50/50 border-amber-100/80 text-amber-600",
      hover: "group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 group-hover:shadow-[0_0_12px_rgba(245,158,11,0.2)]",
      glow: "from-amber-500/5 to-transparent",
    }
  };

  const style = accentStyles[accentColor];

  return (
    <Card className="group hover:shadow-[0_15px_40px_rgba(15,23,42,0.04)] hover:scale-[1.01] hover:border-slate-200/80 transition-all duration-300 border-slate-100/90 bg-white/85 backdrop-blur-md rounded-2xl overflow-hidden relative shadow-[0_8px_30px_rgba(15,23,42,0.02)]">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0", style.glow)} />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 relative z-10 px-3 pt-3 pb-2 sm:px-5 sm:pt-5 sm:pb-3 lg:px-6 lg:pt-6">
        <CardTitle className="text-[9px] sm:text-[11px] lg:text-[12.5px] font-extrabold text-slate-400 tracking-wider uppercase group-hover:text-slate-600 transition-colors leading-tight pr-1">
          {title}
        </CardTitle>
        <div className={cn(
          "p-1.5 sm:p-2 lg:p-2.5 rounded-xl border flex items-center justify-center transition-all duration-300 flex-shrink-0",
          style.bg,
          style.hover
        )}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </CardHeader>

      <CardContent className="relative z-10 px-3 pb-3 sm:px-5 sm:pb-4 lg:px-6 lg:pb-5">
        {loading ? (
          <Skeleton className="h-6 w-16 sm:h-8 sm:w-20 lg:h-9 lg:w-24 rounded-lg" />
        ) : (
          <div className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-800 tracking-tight transition-colors">
            {value}
          </div>
        )}
        {description && (
          <p className="text-[9px] sm:text-[11px] lg:text-[12px] text-slate-500 mt-0.5 sm:mt-1 font-semibold">{description}</p>
        )}
        {breakdown && !loading && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {breakdown.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-500 bg-slate-100/80 border border-slate-200/60 rounded-md px-1.5 py-0.5"
              >
                <span className="text-slate-400">{item.label}</span>
                <span className="text-slate-700">{typeof item.value === 'number' ? item.value.toLocaleString('es-MX') : item.value}</span>
              </span>
            ))}
          </div>
        )}
        {trend && !loading && (
          <p className={cn(
            "text-[10px] sm:text-xs mt-2 sm:mt-2.5 font-bold flex items-center gap-1",
            trend.isPositive ? 'text-emerald-600' : 'text-rose-500'
          )}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}% desde el mes pasado</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
