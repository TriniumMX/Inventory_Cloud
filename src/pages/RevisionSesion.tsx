import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, AlertTriangle, Pause, Trash2,
  ArrowRight, ArrowLeft, Zap, User, Building2,
} from "lucide-react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { ScanInput } from "@/components/revision/ScanInput";
import { SessionBoard } from "@/components/revision/SessionBoard";
import { SessionSummary } from "@/components/revision/SessionSummary";
import { toast } from "@/hooks/use-toast";
import {
  getSessionById, addScan, saveSession, clearSession,
  syncSessionToSupabase, finalizeSessionInSupabase,
  getActiveSessionsFromSupabase, analyzeSession,
  type RevisionSession,
} from "@/lib/revisionStore";
import { playScanFeedback, type ScanFeedback } from "@/lib/scanUtils";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Step = "scan" | "summary";

interface RecentScan {
  code: string;
  desc: string;
  type: ScanFeedback;
  ts: number;
}

export default function RevisionSesion() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("scan");
  const [session, setSession] = useState<RevisionSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [flashType, setFlashType] = useState<ScanFeedback | null>(null);

  useEffect(() => {
    if (!sessionId) { navigate("/revisiones"); return; }
    const local = getSessionById(sessionId);
    if (local) { setSession(local); setLoading(false); return; }
    if (user) {
      getActiveSessionsFromSupabase(user.id).then((remote) => {
        const found = remote.find((s) => s.id === sessionId);
        if (found) { saveSession(found); setSession(found); }
        else { toast({ title: "Sesión no encontrada", variant: "destructive" }); navigate("/revisiones"); }
        setLoading(false);
      });
    } else { setLoading(false); navigate("/revisiones"); }
  }, [sessionId, user]);

  const analysis = useMemo(() => session ? analyzeSession(session) : null, [session]);

  const handleScan = useCallback((code: string, _baseFeedback: ScanFeedback) => {
    if (!session || !sessionId) return;

    const expectedInvSet = new Set(session.expected.map((e) => e.inv));
    const expectedItem = session.expected.find((e) => e.inv === code);
    const alreadyScanned = session.scans.some((s) => s.inv === code);

    let feedback: ScanFeedback;

    if (alreadyScanned) {
      feedback = "warning";
      playScanFeedback(feedback);
      toast({ title: `Ya escaneado`, description: code, duration: 2000 });
      setFlashType("warning");
      setTimeout(() => setFlashType(null), 700);
      return;
    }

    feedback = expectedInvSet.has(code) ? "ok" : "error";

    if (feedback === "error") {
      toast({ title: `Extraño: ${code}`, description: "No pertenece a este resguardo", duration: 2500 });
    }

    playScanFeedback(feedback);
    if (navigator.vibrate) navigator.vibrate(feedback === "ok" ? 40 : [60, 40, 60]);

    setRecentScans((prev) => [
      { code, desc: expectedItem?.descripcion ?? "", type: feedback, ts: Date.now() },
      ...prev.slice(0, 6),
    ]);
    setFlashType(feedback);
    setTimeout(() => setFlashType(null), 700);

    const updated = addScan(sessionId, code);
    if (updated) {
      setSession(updated);
      if (user) syncSessionToSupabase(updated, user.id);
    }
  }, [session, sessionId, user]);

  const handlePause = () => {
    toast({ title: "Revisión pausada", description: "Puedes reanudarla desde el listado." });
    navigate("/revisiones");
  };

  const handleFinalize = () => setStep("summary");

  const handleComplete = async () => {
    if (session) { await finalizeSessionInSupabase(session.id); clearSession(session.id); }
    toast({ title: "Revisión completada", description: "La sesión ha sido finalizada." });
    navigate("/revisiones");
  };

  const handleCancel = async () => {
    if (!window.confirm("¿Cancelar? Se perderá el progreso de la sesión.")) return;
    if (session) { await finalizeSessionInSupabase(session.id); clearSession(session.id); }
    navigate("/revisiones");
  };

  if (loading) {
    return (
      <ProtectedPage requiredRole={3}>
        <div className="flex-1 flex flex-col">
          <Header breadcrumbs={[{ label: "Revisiones", href: "/revisiones" }, { label: "Cargando…" }]} />
          <main className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm">Cargando sesión…</p>
            </div>
          </main>
        </div>
      </ProtectedPage>
    );
  }

  if (!session) return null;

  const total = session.expected.length;
  const found = analysis?.found.size ?? 0;
  const missing = analysis?.missing.size ?? 0;
  const extra = analysis?.extra.size ?? 0;
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;

  const ResponsableIcon = session.target.responsableTipo === "Institucion" ? Building2 : User;

  return (
    <ProtectedPage requiredRole={3}>
      <div className="flex-1 flex flex-col">
        <Header
          breadcrumbs={[
            { label: "Revisiones", href: "/revisiones" },
            { label: step === "scan" ? "Escaneo Activo" : "Resumen Final" },
          ]}
        />

        <main className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="max-w-2xl mx-auto space-y-3">

            {/* ──── SCAN STEP ──── */}
            {step === "scan" && (
              <>
                {/* Progress Banner */}
                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ResponsableIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{session.target.responsableNombre ?? "Sin nombre"}</p>
                      <p className="text-[11px] text-muted-foreground">{session.target.responsableTipo}</p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-lg font-black text-primary">{pct}%</span>
                      <span className="text-[10px] text-muted-foreground">{found}/{total}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100
                          ? "linear-gradient(90deg,#10b981,#34d399)"
                          : "linear-gradient(90deg,#3b82f6,#6366f1)",
                      }}
                    />
                  </div>

                  {/* Stat pills */}
                  <div className="flex gap-2 mt-3">
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{found} OK</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      <span className="text-[11px] font-bold text-red-700 dark:text-red-400">{missing} faltantes</span>
                    </div>
                    {extra > 0 && (
                      <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{extra} extraños</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scan Zone — flashes on each scan */}
                <div
                  className={cn(
                    "rounded-2xl border-2 p-4 transition-all duration-300 shadow-sm",
                    flashType === "ok"      && "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-emerald-200 dark:shadow-emerald-900/40",
                    flashType === "error"   && "border-red-400 bg-red-50/60 dark:bg-red-950/30 shadow-red-200 dark:shadow-red-900/40",
                    flashType === "warning" && "border-amber-400 bg-amber-50/60 dark:bg-amber-950/30",
                    !flashType             && "border-border bg-card"
                  )}
                  style={{ boxShadow: flashType === "ok" ? "0 0 0 4px rgba(52,211,153,0.15)" : flashType === "error" ? "0 0 0 4px rgba(239,68,68,0.12)" : undefined }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className={cn("h-4 w-4 transition-colors", flashType === "ok" ? "text-emerald-500" : "text-muted-foreground")} />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Zona de Escaneo
                    </span>
                    {flashType === "ok" && (
                      <Badge className="ml-auto bg-emerald-500/15 text-emerald-600 border-emerald-400/30 text-[10px] animate-in fade-in duration-200">
                        ✓ Registrado
                      </Badge>
                    )}
                    {flashType === "error" && (
                      <Badge className="ml-auto bg-red-500/15 text-red-600 border-red-400/30 text-[10px] animate-in fade-in duration-200">
                        ✕ Extraño
                      </Badge>
                    )}
                    {flashType === "warning" && (
                      <Badge className="ml-auto bg-amber-500/15 text-amber-600 border-amber-400/30 text-[10px] animate-in fade-in duration-200">
                        ⚠ Duplicado
                      </Badge>
                    )}
                  </div>
                  <ScanInput onScan={handleScan} autoFocus />
                </div>

                {/* Live Feed */}
                {recentScans.length > 0 && (
                  <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Últimos escaneos</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{recentScans.length} recientes</span>
                    </div>
                    <div className="divide-y">
                      {recentScans.map((scan) => (
                        <div
                          key={scan.ts}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 animate-in slide-in-from-top-1 duration-300",
                            scan.type === "ok"      && "bg-emerald-50/40 dark:bg-emerald-950/10",
                            scan.type === "error"   && "bg-red-50/40 dark:bg-red-950/10",
                            scan.type === "warning" && "bg-amber-50/40 dark:bg-amber-950/10",
                          )}
                        >
                          <div className={cn(
                            "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0",
                            scan.type === "ok"      && "bg-emerald-500/15",
                            scan.type === "error"   && "bg-red-500/15",
                            scan.type === "warning" && "bg-amber-500/15",
                          )}>
                            {scan.type === "ok"      && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                            {scan.type === "error"   && <XCircle      className="h-3.5 w-3.5 text-red-500" />}
                            {scan.type === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold font-mono truncate">{scan.code}</p>
                            {scan.desc && <p className="text-[11px] text-muted-foreground truncate">{scan.desc}</p>}
                          </div>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {Math.round((Date.now() - scan.ts) / 1000)}s
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session Board (collapsed tabs) */}
                <SessionBoard session={session} />

                {/* Actions */}
                <div className="flex gap-2 pt-1 pb-4">
                  <Button variant="outline" onClick={handlePause} className="flex-1 rounded-xl h-11">
                    <Pause className="h-4 w-4 mr-2" /> Pausar
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleCancel} className="rounded-xl h-11 w-11 text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleFinalize} className="flex-1 rounded-xl h-11 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 shadow-md">
                    Finalizar <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}

            {/* ──── SUMMARY STEP ──── */}
            {step === "summary" && (
              <>
                <SessionSummary session={session} />
                <div className="flex gap-2 pb-4">
                  <Button variant="outline" onClick={() => setStep("scan")} className="flex-1 rounded-xl h-11">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Volver a escaneo
                  </Button>
                  <Button onClick={handleComplete} className="flex-1 rounded-xl h-11">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Completar y cerrar
                  </Button>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </ProtectedPage>
  );
}
