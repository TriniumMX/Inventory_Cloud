import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, AlertTriangle, Loader2, Clock } from "lucide-react";
import type { RevisionSession, ScanRecord } from "@/lib/revisionStore";
import { analyzeSession } from "@/lib/revisionStore";
import { apiFetch } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

interface ExtraItemInfo {
  descripcion?: string;
  ultimoNomina?: string;
}

interface SessionBoardProps {
  session: RevisionSession;
}

function ItemCard({
  inv,
  desc,
  extra,
  badge,
  ts,
}: {
  inv: string;
  desc?: string;
  extra?: string;
  badge: React.ReactNode;
  ts?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-background hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[12px] font-bold truncate">{inv}</p>
        {desc && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{desc}</p>}
        {extra && <p className="text-[10px] text-muted-foreground/70 truncate">{extra}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {badge}
        {ts && (
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {new Date(ts).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}

export function SessionBoard({ session }: SessionBoardProps) {
  const analysis = analyzeSession(session);
  const [extraItemsInfo, setExtraItemsInfo] = useState<Map<string, ExtraItemInfo>>(new Map());
  const [loadingExtras, setLoadingExtras] = useState(false);

  useEffect(() => {
    const extraInvs = Array.from(analysis.extra);
    if (extraInvs.length === 0) return;
    setLoadingExtras(true);
    apiFetch<{ data: { numero_inventario: string; descripcion: string | null; ultimo_nomina: string | null }[] }>(
      `/api/revision/activos-info?nums=${extraInvs.map(encodeURIComponent).join(",")}`
    ).then((res) => {
      const map = new Map<string, ExtraItemInfo>();
      for (const item of res.data || []) {
        if (item.numero_inventario)
          map.set(item.numero_inventario, { descripcion: item.descripcion ?? undefined, ultimoNomina: item.ultimo_nomina ?? undefined });
      }
      setExtraItemsInfo(map);
    }).catch(console.error).finally(() => setLoadingExtras(false));
  }, [session.scans.length]);

  const scansByInv = new Map<string, ScanRecord[]>();
  for (const scan of session.scans) {
    if (!scansByInv.has(scan.inv)) scansByInv.set(scan.inv, []);
    scansByInv.get(scan.inv)!.push(scan);
  }

  const tabConfig = [
    {
      value: "ok",
      label: "OK",
      count: analysis.found.size,
      color: "text-emerald-600",
      activeColor: "data-[state=active]:text-emerald-600",
    },
    {
      value: "missing",
      label: "Faltantes",
      count: analysis.missing.size,
      color: "text-red-600",
      activeColor: "data-[state=active]:text-red-600",
    },
    {
      value: "extra",
      label: "Extraños",
      count: analysis.extra.size,
      color: "text-amber-600",
      activeColor: "data-[state=active]:text-amber-600",
    },
  ];

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <Tabs defaultValue="ok">
        <div className="px-3 pt-3 pb-2 border-b bg-muted/20">
          <TabsList className="grid grid-cols-3 h-9 bg-background/60 w-full">
            {tabConfig.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className={cn("text-xs font-bold rounded-lg gap-1", t.activeColor)}
              >
                {t.label}
                <span className={cn(
                  "inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-black",
                  t.value === "ok"      && "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
                  t.value === "missing" && "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400",
                  t.value === "extra"   && "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
                )}>
                  {t.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* OK */}
        <TabsContent value="ok" className="m-0">
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {Array.from(analysis.found).map((inv) => {
              const scans = scansByInv.get(inv) ?? [];
              const item = session.expected.find((e) => e.inv === inv);
              return (
                <ItemCard
                  key={inv}
                  inv={inv}
                  desc={item?.descripcion}
                  ts={scans[0]?.ts}
                  badge={
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-400/30 text-[9px] gap-0.5 px-1.5">
                      <CheckCircle2 className="h-2.5 w-2.5" /> OK
                    </Badge>
                  }
                />
              );
            })}
            {analysis.found.size === 0 && (
              <EmptyState icon={<CheckCircle2 className="h-6 w-6 text-muted-foreground/40" />} text="Ningún artículo escaneado aún" />
            )}
          </div>
        </TabsContent>

        {/* Missing */}
        <TabsContent value="missing" className="m-0">
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {Array.from(analysis.missing).map((inv) => {
              const item = session.expected.find((e) => e.inv === inv);
              return (
                <ItemCard
                  key={inv}
                  inv={inv}
                  desc={item?.descripcion}
                  badge={
                    <Badge variant="destructive" className="text-[9px] gap-0.5 px-1.5">
                      <AlertCircle className="h-2.5 w-2.5" /> Faltante
                    </Badge>
                  }
                />
              );
            })}
            {analysis.missing.size === 0 && (
              <EmptyState icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />} text="¡Todos los artículos han sido escaneados!" />
            )}
          </div>
        </TabsContent>

        {/* Extra */}
        <TabsContent value="extra" className="m-0">
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {loadingExtras && (
              <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Cargando información…</span>
              </div>
            )}
            {!loadingExtras && Array.from(analysis.extra).map((inv) => {
              const scans = scansByInv.get(inv) ?? [];
              const info = extraItemsInfo.get(inv);
              return (
                <ItemCard
                  key={inv}
                  inv={inv}
                  desc={info?.descripcion}
                  extra={info?.ultimoNomina ? `Responsable: ${info.ultimoNomina}` : undefined}
                  ts={scans[0]?.ts}
                  badge={
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400/30 text-[9px] gap-0.5 px-1.5">
                      <AlertTriangle className="h-2.5 w-2.5" /> Extraño
                    </Badge>
                  }
                />
              );
            })}
            {!loadingExtras && analysis.extra.size === 0 && (
              <EmptyState icon={<AlertTriangle className="h-6 w-6 text-muted-foreground/40" />} text="Sin artículos inesperados" />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      {icon}
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
